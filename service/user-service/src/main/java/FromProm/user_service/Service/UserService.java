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
import software.amazon.awssdk.services.cognitoidentityprovider.CognitoIdentityProviderClient;
import software.amazon.awssdk.services.cognitoidentityprovider.model.*;

import java.time.Instant;
import java.util.Map;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class UserService {
    private final CognitoIdentityProviderClient cognitoClient;
    private final UserRepository userRepository;
    private final CreditRepository creditRepository;

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

        SignUpResponse response = cognitoClient.signUp(signUpRequest);
        String userSub = response.userSub(); // Cognito가 생성한 고유 ID

        // 3. 가입 성공 후 Cognito에서 준 고유 ID(sub) 가져오기
        String now = Instant.now().toString(); // 현재 시간 생성

        // 4. DynamoDB에 프로필 정보 저장
        User newUser = User.builder()
                .PK("USER#" + userSub)        // 자동 생성: PK 형식 지정
                .SK("PROFILE")                // 자동 생성: 고정값
                .TYPE("USER")
                .email(request.getEmail())    // 입력값
                .nickname(request.getNickname()) // 입력값
                .credit(0)                 // 기본값 0
                .bio("") // 기본값
                .profileImage("https://default-image-url.com/user.png") // 기본값
                .createdAt(now)               // 자동 생성: 현재 시간
                .updatedAt(now)               // 자동 생성: 현재 시간
                .build();

        userRepository.save(newUser);
    }

    // 이메일 인증 확인
    public void confirmSignUp(UserConfirmRequest request) {
        ConfirmSignUpRequest confirmSignUpRequest = ConfirmSignUpRequest.builder()
                .clientId(clientId)
                .username(request.getEmail()) // 이메일을 로그인 ID로 설정했으므로 username에 email 입력
                .confirmationCode(request.getCode())
                .build();

        cognitoClient.confirmSignUp(confirmSignUpRequest);
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

    //내 정보 찾기 (email, password, id)
    public UserResponse getMyInfo(String accessToken) {
        // 1. AccessToken으로 Cognito 유저 정보 조회
        GetUserRequest getUserRequest = GetUserRequest.builder()
                .accessToken(accessToken)
                .build();

        GetUserResponse response = cognitoClient.getUser(getUserRequest);

        // 2. 응답 데이터 중 필요한 값(email, nickname)만 추출
        String email = response.userAttributes().stream()
                .filter(attr -> attr.name().equals("email"))
                .findFirst().map(attr -> attr.value()).orElse("");

        String nickname = response.userAttributes().stream()
                .filter(attr -> attr.name().equals("nickname"))
                .findFirst().map(attr -> attr.value()).orElse("");

        return UserResponse.builder()
                .email(email)
                .nickname(nickname)
                .PK(response.username()) // 여기서 username은 Cognito의 sub(UUID)
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
        user.setUpdatedAt(LocalDateTime.now().toString());
        userRepository.update(user);
    }

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
            System.out.println("DEBUG: 회원탈퇴 완료 (DB + Cognito) -> " + userSub);
        } catch (Exception e) {
            // Cognito 삭제 실패 시 예외 처리 (이미 삭제되었거나 권한 문제 등)
            throw new RuntimeException("Cognito 사용자 삭제 중 오류가 발생했습니다: " + e.getMessage());
        }
    }

    @Transactional
    public void chargeCredit(String userSub, int amount) {
        // 1. 유저 정보 조회
        User user = userRepository.findUser(userSub)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));

        // 2. 새로운 잔액 계산
        int oldBalance = user.getCredit();
        int newBalance = oldBalance + amount;

        // 3. 유저 엔티티 잔액 업데이트
        user.setCredit(newBalance);
        user.setUpdatedAt(LocalDateTime.now().toString());

        // 4. 내역(History) 객체 생성
        Credit history = Credit.builder()
                .PK(userSub)
                .SK("CREDIT#" + System.currentTimeMillis()) // 고유 타임스탬프
                .type("CREDIT")
                .amount(amount)
                .balance(newBalance)
                .description("크레딧 충전")
                .createdAt(LocalDateTime.now().toString())
                .build();

        // 5. DB 저장
        userRepository.update(user); // 유저 잔액 갱신
        creditRepository.save(history); // 내역 저장
    }

    @Transactional
    public void useCredit(String userSub, CreditUseRequest request) {
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
        user.setUpdatedAt(LocalDateTime.now().toString());

        // 5. 사용 내역(History) 객체 생성
        Credit history = Credit.builder()
                .PK(userSub)
                .SK("CREDIT#" + System.currentTimeMillis())
                .type("CREDIT")
                .amount(-request.getAmount()) // 사용은 음수(-)로 기록해서 구분
                .balance(newBalance)
                .description(request.getDescription())
                .createdAt(LocalDateTime.now().toString())
                .build();

        // 6. DB 저장
        userRepository.update(user);
        creditRepository.save(history);
    }
}
