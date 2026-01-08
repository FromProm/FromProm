package FromProm.user_service.Service;

import FromProm.user_service.DTO.*;
import FromProm.user_service.Entity.Credit;
import FromProm.user_service.Entity.User;
import FromProm.user_service.Repository.CreditRepository;
import FromProm.user_service.Repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbEnhancedClient;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbTable;
import software.amazon.awssdk.enhanced.dynamodb.TableSchema;
import software.amazon.awssdk.enhanced.dynamodb.model.QueryConditional;
import software.amazon.awssdk.services.cognitoidentityprovider.CognitoIdentityProviderClient;
import software.amazon.awssdk.services.cognitoidentityprovider.model.*;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.time.LocalDateTime;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserService {
    private final CognitoIdentityProviderClient cognitoClient;
    private final UserRepository userRepository;
    private final CreditRepository creditRepository;
    private final DynamoDbEnhancedClient enhancedClient; // [추가 필요!] 빨간불 방지

    @Value("${aws.cognito.clientId}")
    private String clientId;

    @Value("${aws.cognito.userPoolId}")
    private String userPoolId;

    // 회원가입
    public void signUp(UserSignUpRequest request) {

        // 1. 닉네임 중복 체크
        if (userRepository.existsByNickname(request.getNickname())) {
            throw new RuntimeException("이미 사용 중인 닉네임입니다.");
        }

        // 2. Cognito 회원가입 요청
        SignUpRequest signUpRequest = SignUpRequest.builder()
                .clientId(clientId)
                .username(request.getEmail()) // 로그인 이메일
                .password(request.getPassword())
                .userAttributes(
                        AttributeType.builder().name("email").value(request.getEmail()).build(),
                        AttributeType.builder().name("nickname").value(request.getNickname()).build()
                )
                .build();

        cognitoClient.signUp(signUpRequest);

    }

    //이메일 중복 확인
    public boolean checkEmailDuplicate(String email) {
        // 공백 제거 등 기초적인 전처리 후 리포지토리 호출
        String cleanEmail = email.trim();
        return userRepository.existsByEmail(cleanEmail);
    }

    // 이메일 인증 확인
    public void confirmSignUp(UserConfirmRequest request) {
        // 1. Cognito 인증 확인 요청
        ConfirmSignUpRequest confirmSignUpRequest = ConfirmSignUpRequest.builder()
                .clientId(clientId)
                .username(request.getEmail()) // 이메일을 로그인 ID로 설정했으므로 username에 email 입력
                .confirmationCode(request.getCode())
                .build();

        cognitoClient.confirmSignUp(confirmSignUpRequest);

        // 2. 인증이 성공했다면, Cognito에서 'sub' 값을 가져오기 (PK 생성을 위함)
        AdminGetUserResponse cognitoUser = cognitoClient.adminGetUser(AdminGetUserRequest.builder()
                .userPoolId(userPoolId)
                .username(request.getEmail())
                .build());

        String userSub = cognitoUser.userAttributes().stream()
                .filter(attr -> attr.name().equals("sub"))
                .findFirst()
                .map(AttributeType::value)
                .orElseThrow(() -> new RuntimeException("Cognito에서 sub 정보를 찾을 수 없습니다."));

        String originalNickname = cognitoUser.userAttributes().stream()
                .filter(a -> a.name().equals("nickname")).findFirst().map(AttributeType::value).orElse("");

        // 3. DynamoDB에 유저 정보 저장
        User newUser = User.builder()
                .PK("USER#" + userSub)
                .SK("PROFILE")
                .type("USER")
                .email(request.getEmail())
                .nickname(originalNickname)
                .bio("")                                                // 기본값
                .profileImage("https://default-image-url.com/user.png") // 기본값
                .credit(0)
                .created_at(Instant.now().toString())               // 자동 생성: 현재 시간
                .updated_at(Instant.now().toString())               // 자동 생성: 현재 시간
                .build();

        userRepository.save(newUser);
    }

    // 이메일 인증코드 재전송
    public void resendCode(String email) {
        ResendConfirmationCodeRequest request = ResendConfirmationCodeRequest.builder()
                .clientId(clientId)
                .username(email)
                .build();

        cognitoClient.resendConfirmationCode(request);
    }

    // 로그인
    public AuthenticationResultType login(UserLoginRequest request) {
        InitiateAuthRequest authRequest = InitiateAuthRequest.builder()
                .clientId(clientId)
                .authFlow(AuthFlowType.USER_PASSWORD_AUTH) // 사용자 아이디/비번 방식
                .authParameters(Map.of(
                        "USERNAME", request.getEmail(),
                        "PASSWORD", request.getPassword()
                ))
                .build();

        InitiateAuthResponse response = cognitoClient.initiateAuth(authRequest);
        return response.authenticationResult();
    }

    // accessToken 재발급
    public AuthenticationResultType refreshAccessToken(String refreshToken) {
        InitiateAuthRequest authRequest = InitiateAuthRequest.builder()
                .clientId(clientId)
                .authFlow(AuthFlowType.REFRESH_TOKEN_AUTH)
                .authParameters(Map.of(
                        "REFRESH_TOKEN", refreshToken
                ))
                .build();

        InitiateAuthResponse response = cognitoClient.initiateAuth(authRequest);
        return response.authenticationResult();
    }

    // 로그아웃
    public void logout(String accessToken) {
        GlobalSignOutRequest signOutRequest = GlobalSignOutRequest.builder()
                .accessToken(accessToken)
                .build();

        cognitoClient.globalSignOut(signOutRequest);
    }

    //내 정보 찾기 (email, nickname, bio, credit)
    public UserResponse getMyInfo(String accessToken) {
        // 1. AccessToken으로 Cognito에서 'sub'(고유ID)와 'email' 가져오기
        GetUserRequest getUserRequest = GetUserRequest.builder()
                .accessToken(accessToken)
                .build();
        GetUserResponse response = cognitoClient.getUser(getUserRequest);

        String userSub = response.userAttributes().stream()
                .filter(attr -> attr.name().equals("sub"))
                .findFirst().map(attr -> attr.value()).orElse("");

        String email = response.userAttributes().stream()
                .filter(attr -> attr.name().equals("email"))
                .findFirst().map(attr -> attr.value()).orElse("");

        // 2. DynamoDB에서 해당 유저의 전체 데이터(nickname, bio, credit 등) 조회
        // PK 형식을 맞추기 위해 "USER#"를 붙여줍니다.
        User user = userRepository.findUser("USER#" + userSub)
                .orElseThrow(() -> new RuntimeException("DB에서 사용자 정보를 찾을 수 없습니다."));

        // 3. 최종 응답 생성
        return UserResponse.builder()
                .email(email)            // Cognito에서 가져온 값
                .nickname(user.getNickname()) // DB에서 가져온 값
                .bio(user.getBio())           // DB에서 가져온 값
                .credit(user.getCredit())     // DB에서 가져온 값
                .PK(user.getPK())             // DB에서 가져온 값
                .build();
    }

    //로그인 상황에서, 비밀번호 변경
    public void changePassword(String accessToken, PasswordChangeRequest request) {
        ChangePasswordRequest changePasswordRequest = ChangePasswordRequest.builder()
                .accessToken(accessToken)
                .previousPassword(request.getOldPassword())
                .proposedPassword(request.getNewPassword())
                .build();

        cognitoClient.changePassword(changePasswordRequest);
    }

    //비밀번호 찾기(재설정)
    // 1. 비밀번호 재설정 코드 발송
    public void sendForgotPasswordCode(String email) {
        software.amazon.awssdk.services.cognitoidentityprovider.model.ForgotPasswordRequest request =
                software.amazon.awssdk.services.cognitoidentityprovider.model.ForgotPasswordRequest.builder()
                        .clientId(clientId)
                        .username(email)
                        .build();
        cognitoClient.forgotPassword(request);
    }

    // 2. 코드 검증 및 새 비밀번호 설정
    public void confirmNewPassword(FromProm.user_service.DTO.ForgotPasswordRequest request) {
        ConfirmForgotPasswordRequest confirmRequest = ConfirmForgotPasswordRequest.builder()
                .clientId(clientId)
                .username(request.getEmail())
                .confirmationCode(request.getConfirmationCode())
                .password(request.getNewPassword())
                .build();
        cognitoClient.confirmForgotPassword(confirmRequest);
    }

    public boolean isNicknameDuplicated(String nickname) {
        return userRepository.existsByNickname(nickname);
    }

    @Transactional
    public void updateProfile(String userSub, UserProfileUpdateRequest request) {
        String now = LocalDateTime.now().toString();

        // 1. 기존 유저 정보 조회
        User user = userRepository.findUser(userSub)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));

        // 2. 닉네임 변경 시 중복 체크 (null이 아니고, 기존과 다를 때만)
        String newNickname = request.getNickname();
        if (newNickname != null && !newNickname.trim().isEmpty() && !newNickname.equals(user.getNickname())) {
            if (userRepository.existsByNickname(newNickname)) {
                throw new RuntimeException("이미 사용 중인 닉네임입니다.");
            }
            user.setNickname(newNickname);
        }

        // 3. 소개글 변경 (값이 있을 때만 반영)
        if (request.getBio() != null) {
            user.setBio(request.getBio());
        }

        // 4. 프로필 이미지 변경 (값이 있을 때만 반영)
        if (request.getProfileImage() != null) {
            user.setProfileImage(request.getProfileImage());
        }

        // 5. 업데이트 날짜 갱신 및 저장
        user.setUpdated_at(now);
        userRepository.update(user);
    }

    //회원 탈퇴
    @Transactional
    public void withdraw(String userSub) {
        // 1. DynamoDB 데이터 삭제 (PK: USER#uuid, SK: PROFILE)
        userRepository.deleteUser(userSub);

        // 2. Cognito 유저 삭제
        String pureUuid = userSub.replace("USER#", "");
        try {
            AdminDeleteUserRequest deleteUserRequest = AdminDeleteUserRequest.builder()
                    .userPoolId(userPoolId) // 주입받은 ID 사용
                    .username(pureUuid)     // userSub는 Cognito의 Username(uuid)과 동일
                    .build();

            cognitoClient.adminDeleteUser(deleteUserRequest);
        } catch (Exception e) {
            // Cognito 삭제 실패 시 예외 처리 (이미 삭제되었거나 권한 문제 등)
            throw new RuntimeException("Cognito 사용자 삭제 중 오류가 발생했습니다: " + e.getMessage());
        }
    }

    public void withdrawWithToken(String accessToken) {
        // 1. AccessToken으로 Cognito에서 'sub' 조회 (유저 본인 확인)
        GetUserRequest getUserRequest = GetUserRequest.builder()
                .accessToken(accessToken)
                .build();

        GetUserResponse response = cognitoClient.getUser(getUserRequest);

        String userSub = response.userAttributes().stream()
                .filter(attr -> attr.name().equals("sub"))
                .findFirst()
                .map(AttributeType::value)
                .orElseThrow(() -> new RuntimeException("사용자 ID를 찾을 수 없습니다."));

        // 2. 기존 withdraw 로직 호출 (PK 형식에 맞게 "USER#" 추가)
        withdraw("USER#" + userSub);
    }

    @Transactional
    public void chargeCredit(String userSub, int amount) {
        String now = LocalDateTime.now().toString();
        // 1. 유저 정보 조회
        User user = userRepository.findUser(userSub)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));

        // 2. 새로운 잔액 계산
        int oldBalance = user.getCredit();
        int newBalance = oldBalance + amount;

        // 3. 유저 엔티티 잔액 업데이트
        user.setCredit(newBalance);
        user.setUpdated_at(now);

        // 4. 내역(History) 객체 생성
        Credit history = Credit.builder()
                .PK(userSub)
                .SK("CREDIT#" + now) // 고유 타임스탬프
                .type("CREDIT")
                .amount(amount)
                .balance(newBalance)
                .user_description("크레딧 충전")
                .created_at(now)
                .build();

        // 5. DB 저장
        userRepository.update(user); // 유저 잔액 갱신
        creditRepository.save(history); // 내역 저장
    }

    @Transactional
    public void useCredit(String userSub, CreditUseRequest request) {
        String now = LocalDateTime.now().toString();

        // 1. 유저 정보 조회
        User user = userRepository.findUser(userSub)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));

        // 2. 잔액 검증
        if (user.getCredit() < request.getAmount()) {
            throw new RuntimeException("잔액이 부족합니다. 현재 잔액: " + user.getCredit());
        }

        // 3. 새로운 잔액 계산 (차감)
        int oldBalance = user.getCredit();
        int newBalance = oldBalance - request.getAmount();

        // 4. 유저 엔티티 잔액 업데이트
        user.setCredit(newBalance);
        user.setUpdated_at(now);

        // 5. 사용 내역(History) 객체 생성
        Credit history = Credit.builder()
                .PK(userSub)
                .SK("CREDIT#" + now)
                .type("CREDIT")
                .amount(-request.getAmount()) // 사용은 음수(-)로 기록해서 구분
                .balance(newBalance)
                .user_description(request.getUser_description())
                .created_at(now)
                .build();

        // 6. DB 저장
        userRepository.update(user);
        creditRepository.save(history);
    }

    public List<Credit> getCreditHistory(String userSub) {
        // 1. Enhanced Client를 사용하여 테이블 객체 선언
        // TableName은 실제 사용하시는 DynamoDB 테이블 이름을 넣으세요.
        DynamoDbTable<Credit> creditTable = enhancedClient.table("FromProm_Table", TableSchema.fromBean(Credit.class));

        // 2. 쿼리 조건: PK가 유저 ID이고, SK가 "CREDIT#"으로 시작하는 것들
        QueryConditional queryConditional = QueryConditional
                .sortBeginsWith(s -> s.partitionValue(userSub).sortValue("CREDIT#"));

        // 3. 최신순(scanIndexForward(false))으로 조회하여 리스트 반환
        return creditTable.query(r -> r.queryConditional(queryConditional)
                        .scanIndexForward(false))
                .items()
                .stream()
                .collect(Collectors.toList());
    }
}
