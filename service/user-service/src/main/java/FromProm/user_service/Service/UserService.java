package FromProm.user_service.Service;

import FromProm.user_service.DTO.*;
import FromProm.user_service.Entity.User;
import FromProm.user_service.Repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.cognitoidentityprovider.model.InitiateAuthRequest;
import software.amazon.awssdk.services.cognitoidentityprovider.model.InitiateAuthResponse;
import software.amazon.awssdk.services.cognitoidentityprovider.model.AuthFlowType;
import software.amazon.awssdk.services.cognitoidentityprovider.CognitoIdentityProviderClient;
import software.amazon.awssdk.services.cognitoidentityprovider.model.*;
import software.amazon.awssdk.services.cognitoidentityprovider.model.AuthenticationResultType;
import software.amazon.awssdk.services.cognitoidentityprovider.model.GlobalSignOutRequest;
import software.amazon.awssdk.services.cognitoidentityprovider.model.GetUserRequest;
import software.amazon.awssdk.services.cognitoidentityprovider.model.GetUserResponse;
import software.amazon.awssdk.services.cognitoidentityprovider.model.ChangePasswordRequest;
import software.amazon.awssdk.services.cognitoidentityprovider.model.ForgotPasswordRequest;
import software.amazon.awssdk.services.cognitoidentityprovider.model.ConfirmForgotPasswordRequest;

import java.time.Instant;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class UserService {
    private final CognitoIdentityProviderClient cognitoClient;
    private final UserRepository userRepository;

    @Value("${aws.cognito.clientId}")
    private String clientId;

    // 회원가입
    public void signUp(UserSignUpRequest request) {
        // 1. Cognito 회원가입 요청
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

        // 2. 가입 성공 후 Cognito에서 준 고유 ID(sub) 가져오기
        String userSub = response.userSub();

        // 3. DynamoDB에 프로필 정보 저장
        User newUser = new User(
                userSub, // id(PK)
                request.getEmail(), // email
                request.getNickname(), //nickname
                Instant.now().toString() //createdAt
        );

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
                .authFlow(AuthFlowType.REFRESH_TOKEN_AUTH) // 흐름이 다릅니다!
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

    //내 정보 찾기 (email, password, id)// 내 정보 조회
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
                .id(response.username()) // 여기서 username은 Cognito의 sub(UUID)입니다.
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
}
