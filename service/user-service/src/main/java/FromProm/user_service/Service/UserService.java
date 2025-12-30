package FromProm.user_service.Service;

import FromProm.user_service.DTO.UserSignUpRequest;
import FromProm.user_service.Entity.User;
import FromProm.user_service.Repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.cognitoidentityprovider.CognitoIdentityProviderClient;
import software.amazon.awssdk.services.cognitoidentityprovider.model.*;
import FromProm.user_service.DTO.UserConfirmRequest;

import java.time.Instant;

@Service
@RequiredArgsConstructor
public class UserService {
    private final CognitoIdentityProviderClient cognitoClient;
    private final UserRepository userRepository;

    @Value("${aws.cognito.clientId}")
    private String clientId;

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

    public void confirmSignUp(UserConfirmRequest request) {
        ConfirmSignUpRequest confirmSignUpRequest = ConfirmSignUpRequest.builder()
                .clientId(clientId)
                .username(request.getEmail()) // 이메일을 로그인 ID로 설정했으므로 username에 email 입력
                .confirmationCode(request.getCode())
                .build();

        cognitoClient.confirmSignUp(confirmSignUpRequest);
    }

    // UserService.java에 추가
    public void resendCode(String email) {
        ResendConfirmationCodeRequest request = ResendConfirmationCodeRequest.builder()
                .clientId(clientId)
                .username(email)
                .build();

        cognitoClient.resendConfirmationCode(request);
    }
}
