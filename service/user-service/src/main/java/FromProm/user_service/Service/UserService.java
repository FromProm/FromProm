package FromProm.user_service.Service;

import FromProm.user_service.DTO.UserLoginRequest;
import FromProm.user_service.DTO.UserSignUpRequest;
import FromProm.user_service.Entity.User;
import FromProm.user_service.Repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import FromProm.user_service.DTO.UserConfirmRequest;
import software.amazon.awssdk.services.cognitoidentityprovider.model.InitiateAuthRequest;
import software.amazon.awssdk.services.cognitoidentityprovider.model.InitiateAuthResponse;
import software.amazon.awssdk.services.cognitoidentityprovider.model.AuthFlowType;
import software.amazon.awssdk.services.cognitoidentityprovider.CognitoIdentityProviderClient;
import software.amazon.awssdk.services.cognitoidentityprovider.model.*;
import software.amazon.awssdk.services.cognitoidentityprovider.model.AuthenticationResultType;
import software.amazon.awssdk.services.cognitoidentityprovider.model.GlobalSignOutRequest;

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

    public void logout(String accessToken) {
        GlobalSignOutRequest signOutRequest = GlobalSignOutRequest.builder()
                .accessToken(accessToken)
                .build();

        cognitoClient.globalSignOut(signOutRequest);
    }
}
