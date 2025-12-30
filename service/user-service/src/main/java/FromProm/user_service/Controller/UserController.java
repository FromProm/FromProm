package FromProm.user_service.Controller;

import FromProm.user_service.DTO.UserLoginRequest;
import FromProm.user_service.DTO.UserSignUpRequest;
import FromProm.user_service.Service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import FromProm.user_service.DTO.UserConfirmRequest;
import software.amazon.awssdk.services.cognitoidentityprovider.model.AuthenticationResultType;
import software.amazon.awssdk.services.cognitoidentityprovider.model.InitiateAuthResponse;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/users") // 이 컨트롤러의 기본 주소
@RequiredArgsConstructor
public class UserController {
    private final UserService userService;

    // 회원가입
    @PostMapping("/signup")
    public ResponseEntity<String> signUp(@RequestBody UserSignUpRequest request) {
        try {
            userService.signUp(request);
            return ResponseEntity.ok("회원가입이 성공적으로 완료되었습니다.");
        } catch (Exception e) {
            // 에러 발생 시 에러 메시지 반환
            return ResponseEntity.badRequest().body("회원가입 실패: " + e.getMessage());
        }
    }

    // 이메일 인증 확인
    @PostMapping("/confirm")
    public ResponseEntity<String> confirm(@RequestBody UserConfirmRequest request) {
        try {
            userService.confirmSignUp(request);
            return ResponseEntity.ok("이메일 인증이 완료되었습니다. 이제 로그인이 가능합니다.");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("인증 실패: " + e.getMessage());
        }
    }

    //이메일 인증코드 재전송
    @PostMapping("/resend-code")
    public ResponseEntity<String> resend(@RequestBody Map<String, String> body) {
        userService.resendCode(body.get("email"));
        return ResponseEntity.ok("인증 코드가 재전송되었습니다.");
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody UserLoginRequest request) {
        try {
            AuthenticationResultType result = userService.login(request);

            // 중요: 객체를 직접 던지지 말고 Map에 담아서 JSON 응답이 잘 생성되게 합니다.
            Map<String, String> tokens = new HashMap<>();
            tokens.put("accessToken", result.accessToken());
            tokens.put("idToken", result.idToken());
            tokens.put("refreshToken", result.refreshToken());
            tokens.put("expiresIn", result.expiresIn().toString());

            return ResponseEntity.ok(tokens);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인 실패: " + e.getMessage());
        }
    }

    @PostMapping("/refresh")
    public ResponseEntity<?> refresh(@RequestBody Map<String, String> body) {
        try {
            String refreshToken = body.get("refreshToken");
            AuthenticationResultType result = userService.refreshAccessToken(refreshToken);

            Map<String, String> tokens = new HashMap<>();
            tokens.put("accessToken", result.accessToken());
            tokens.put("idToken", result.idToken());
            // 주의: RefreshToken은 보안상 새로 내려주지 않을 수도 있습니다(기존 것 재사용).
            if (result.refreshToken() != null) {
                tokens.put("refreshToken", result.refreshToken());
            }
            tokens.put("expiresIn", result.expiresIn().toString());

            return ResponseEntity.ok(tokens);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("토큰 갱신 실패: " + e.getMessage());
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<String> logout(@RequestHeader("Authorization") String bearerToken) {
        try {
            // "Bearer " 뒤의 토큰 문자열만 추출
            String accessToken = bearerToken.substring(7);
            userService.logout(accessToken);
            return ResponseEntity.ok("성공적으로 로그아웃되었습니다. 모든 세션이 종료되었습니다.");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("로그아웃 실패: " + e.getMessage());
        }
    }
}
