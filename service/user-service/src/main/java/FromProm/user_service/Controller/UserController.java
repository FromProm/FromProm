package FromProm.user_service.Controller;

import FromProm.user_service.DTO.UserSignUpRequest;
import FromProm.user_service.Service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import FromProm.user_service.DTO.UserConfirmRequest;

import java.util.Map;

@RestController
@RequestMapping("/api/users") // 이 컨트롤러의 기본 주소
@RequiredArgsConstructor
public class UserController {
    private final UserService userService;

    // 회원가입 API: POST http://localhost:8080/api/users/signup
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

    @PostMapping("/confirm")
    public ResponseEntity<String> confirm(@RequestBody UserConfirmRequest request) {
        try {
            userService.confirmSignUp(request);
            return ResponseEntity.ok("이메일 인증이 완료되었습니다. 이제 로그인이 가능합니다.");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("인증 실패: " + e.getMessage());
        }
    }

    @PostMapping("/resend-code")
    public ResponseEntity<String> resend(@RequestBody Map<String, String> body) {
        userService.resendCode(body.get("email"));
        return ResponseEntity.ok("인증 코드가 재전송되었습니다.");
    }
}
