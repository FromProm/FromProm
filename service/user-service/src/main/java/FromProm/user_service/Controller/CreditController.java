package FromProm.user_service.Controller;

import FromProm.user_service.DTO.CreditChargeRequest;
import FromProm.user_service.DTO.CreditUseRequest;
import FromProm.user_service.DTO.UserResponse;
import FromProm.user_service.Entity.Credit;
import FromProm.user_service.Service.CreditService;
import FromProm.user_service.Service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/users/credit") // 크레딧 전용 경로
@RequiredArgsConstructor
public class CreditController {

    private final CreditService creditService;
    private final UserService userService;

    // 1. 크레딧 충전
    @PostMapping("/charge")
    public ResponseEntity<String> chargeCredit(
            @RequestHeader("Authorization") String bearerToken,
            @RequestBody CreditChargeRequest request) {
        try {
            String userSub = getUserSubFromToken(bearerToken);
            creditService.chargeCredit(userSub, request.getAmount());
            return ResponseEntity.ok(request.getAmount() + "원이 성공적으로 충전되었습니다.");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("충전 실패: " + e.getMessage());
        }
    }

    // 2. 크레딧 사용
    @PostMapping("/use")
    public ResponseEntity<String> useCredit(
            @RequestHeader("Authorization") String bearerToken,
            @RequestBody CreditUseRequest request) {
        try {
            String userSub = getUserSubFromToken(bearerToken);
            creditService.useCredit(userSub, request);
            return ResponseEntity.ok(request.getAmount() + "원이 사용되었습니다.");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("사용 실패: " + e.getMessage());
        }
    }

    // 3. 내역 조회
    @GetMapping("/history")
    public ResponseEntity<?> getMyCreditHistory(@RequestHeader("Authorization") String bearerToken) {
        try {
            String userSub = getUserSubFromToken(bearerToken);
            List<Credit> history = creditService.getCreditHistory(userSub);
            return ResponseEntity.ok(history);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("조회 실패: " + e.getMessage());
        }
    }

    // 중복되는 토큰 추출 로직을 공통 메서드로 분리
    private String getUserSubFromToken(String bearerToken) {
        String accessToken = bearerToken.substring(7).trim();
        UserResponse userInfo = userService.getMyInfo(accessToken);
        return userInfo.getPK();
    }

    @GetMapping("/balance")
    public ResponseEntity<?> getMyBalance(@RequestHeader("Authorization") String bearerToken) {
        try {
            // 공통 메서드를 사용하여 userSub 추출
            String userSub = getUserSubFromToken(bearerToken);

            // 잔액 조회
            int balance = creditService.getUserCredit(userSub);

            return ResponseEntity.ok(java.util.Map.of("balance", balance));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("잔액 조회 실패: " + e.getMessage());
        }
    }
}