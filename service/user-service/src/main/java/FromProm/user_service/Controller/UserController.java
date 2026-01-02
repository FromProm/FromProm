package FromProm.user_service.Controller;

import FromProm.user_service.DTO.*;
import FromProm.user_service.Service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import software.amazon.awssdk.services.cognitoidentityprovider.model.AuthenticationResultType;

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

    // 토큰 재발급
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

    // 로그아웃
    @PostMapping("/logout")
    public ResponseEntity<String> logout(@RequestHeader("Authorization") String bearerToken) {
        try {
            // "Bearer " 뒤의 토큰 문자열만 추출
            // 토큰 앞 'Bearer'는 HTTP 인증의 **표준 규약(RFC 6750)임!
            String accessToken = bearerToken.substring(7);
            userService.logout(accessToken);
            return ResponseEntity.ok("성공적으로 로그아웃되었습니다. 모든 세션이 종료되었습니다.");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("로그아웃 실패: " + e.getMessage());
        }
    }

    //내 정보 찾기 (email, password, id)
    @GetMapping("/me")
    public ResponseEntity<?> getMyInfo(@RequestHeader("Authorization") String bearerToken) {
        try {
            String accessToken = bearerToken.substring(7).trim();
            UserResponse myInfo = userService.getMyInfo(accessToken);
            return ResponseEntity.ok(myInfo);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("정보 조회 실패: " + e.getMessage());
        }
    }

    //로그인 상황에서, 비밀번호 변경
    @PostMapping("/change-password")
    public ResponseEntity<String> changePassword(
            @RequestHeader("Authorization") String bearerToken,
            @RequestBody PasswordChangeRequest request) {
        try {
            String accessToken = bearerToken.substring(7).trim();
            userService.changePassword(accessToken, request);
            return ResponseEntity.ok("비밀번호가 성공적으로 변경되었습니다.");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("비밀번호 변경 실패: " + e.getMessage());
        }
    }

    // 1. 비밀번호 재설정 이메일 발송 요청
    @PostMapping("/forgot-password")
    public ResponseEntity<String> forgotPassword(@RequestBody Map<String, String> body) {
        try {
            String email = body.get("email"); // JSON 바디에서 추출
            userService.sendForgotPasswordCode(email);
            return ResponseEntity.ok("비밀번호 재설정 코드가 이메일로 발송되었습니다.");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("코드 발송 실패: " + e.getMessage());
        }
    }

    // 2. 코드 확인 후 비밀번호 최종 변경
    @PostMapping("/confirm-password")
    public ResponseEntity<String> confirmPassword(@RequestBody FromProm.user_service.DTO.ForgotPasswordRequest request) {
        try {
            userService.confirmNewPassword(request);
            return ResponseEntity.ok("비밀번호가 성공적으로 재설정되었습니다.");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("비밀번호 재설정 실패: " + e.getMessage());
        }
    }

    @PostMapping("/check-nickname")
    public ResponseEntity<Boolean> checkNickname(@RequestBody NicknameCheckRequest request) {
        // request.getNickname()으로 값을 꺼냅니다.
        boolean isExisted = userService.isNicknameDuplicated(request.getNickname());
        return ResponseEntity.ok(isExisted);
    }

    @PatchMapping("/profile")
    public ResponseEntity<?> updateProfile(
            // @AuthenticationPrincipal String userSub, // 나중에 복구할 것
            @RequestHeader("Authorization") String userSub, // 테스트용 임시 헤더
            @RequestBody UserProfileUpdateRequest request) {
        userService.updateProfile(userSub, request);
        return ResponseEntity.ok("프로필이 수정되었습니다.");
    }

    @DeleteMapping("/withdraw")
    public ResponseEntity<String> withdraw(@RequestHeader("Authorization") String userSub) {
        userService.withdraw(userSub);
        return ResponseEntity.ok("회원 탈퇴가 완료되었습니다. 그동안 이용해주셔서 감사합니다.");
    }

    @PostMapping("/credit/charge")
    public ResponseEntity<String> chargeCredit(
            @RequestHeader("Authorization") String userSub,
            @RequestBody CreditChargeRequest request
    ) {
        userService.chargeCredit(userSub, request.getAmount());
        return ResponseEntity.ok(request.getAmount() + "원이 성공적으로 충전되었습니다.");
    }

    @PostMapping("/credit/use")
    public ResponseEntity<String> useCredit(
            @RequestHeader("Authorization") String userSub,
            @RequestBody CreditUseRequest request
    ) {
        userService.useCredit(userSub, request);
        return ResponseEntity.ok(request.getAmount() + "원이 사용되었습니다.");
    }
}