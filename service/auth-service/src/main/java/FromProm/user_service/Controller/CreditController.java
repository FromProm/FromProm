package FromProm.user_service.Controller;

import FromProm.user_service.DTO.CartPurchaseRequest;
import FromProm.user_service.DTO.CreditChargeRequest;
import FromProm.user_service.DTO.PromptPurchaseRequest;
import FromProm.user_service.DTO.PurchaseHistoryResponse;
import FromProm.user_service.Entity.Credit;
import FromProm.user_service.Service.CreditService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/credit")
@RequiredArgsConstructor
public class CreditController {

    private final CreditService creditService;

    // 크레딧 잔액 조회 (토큰 기반)
    @GetMapping("/balance")
    public ResponseEntity<Map<String, Object>> getCreditBalance(@RequestHeader("Authorization") String authHeader) {
        try {
            int balance = creditService.getUserCredit(authHeader);
            return ResponseEntity.ok(Map.of(
                "success", true,
                "balance", balance
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "message", e.getMessage()
            ));
        }
    }

    // 크레딧 충전 (토큰 기반)
    @PostMapping("/charge")
    public ResponseEntity<Map<String, Object>> chargeCredit(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody CreditChargeRequest request) {
        try {
            creditService.chargeCredit(authHeader, request.getAmount());
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "크레딧이 성공적으로 충전되었습니다.",
                "amount", request.getAmount()
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "message", e.getMessage()
            ));
        }
    }

    // 단일 프롬프트 구매 (크레딧 이동, 토큰 기반)
    @PostMapping("/purchase")
    public ResponseEntity<Map<String, Object>> purchasePrompt(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody PromptPurchaseRequest request) {
        try {
            creditService.transferCreditForPromptPurchase(
                authHeader, 
                request.getSellerSub(), 
                request.getPromptPrice(), 
                request.getPromptTitle(),
                request.getPromptId()
            );
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "프롬프트 구매가 완료되었습니다.",
                "promptTitle", request.getPromptTitle(),
                "promptId", request.getPromptId() != null ? request.getPromptId() : "",
                "price", request.getPromptPrice()
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "message", e.getMessage()
            ));
        }
    }

    // 장바구니 일괄 구매 (크레딧 이동, 토큰 기반)
    @PostMapping("/purchase/cart")
    public ResponseEntity<Map<String, Object>> purchaseCart(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody CartPurchaseRequest request) {
        try {
            creditService.purchaseCart(authHeader, request);
            
            int totalPrice = request.getItems().stream()
                    .mapToInt(CartPurchaseRequest.CartItem::getPrice)
                    .sum();
            
            List<String> promptTitles = request.getItems().stream()
                    .map(CartPurchaseRequest.CartItem::getTitle)
                    .collect(java.util.stream.Collectors.toList());
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "장바구니 구매가 완료되었습니다.",
                "totalPrice", totalPrice,
                "itemCount", request.getItems().size(),
                "promptTitles", promptTitles
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "message", e.getMessage()
            ));
        }
    }

    // 프롬프트 구매 내역만 조회 (마이페이지용)
    @GetMapping("/history/purchases")
    public ResponseEntity<Map<String, Object>> getPurchaseHistory(@RequestHeader("Authorization") String authHeader) {
        try {
            List<PurchaseHistoryResponse> purchases = creditService.getPurchaseHistory(authHeader);
            
            // 통계 정보 계산
            int totalPurchases = purchases.size();
            int totalSpent = purchases.stream()
                    .mapToInt(PurchaseHistoryResponse::getTotalAmount)
                    .sum();
            int totalItems = purchases.stream()
                    .mapToInt(PurchaseHistoryResponse::getItemCount)
                    .sum();
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "purchases", purchases,
                "statistics", Map.of(
                    "totalPurchases", totalPurchases,
                    "totalSpent", totalSpent,
                    "totalItems", totalItems
                )
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "message", e.getMessage()
            ));
        }
    }

    // 프롬프트 구매 내역 조회 (페이징)
    @GetMapping("/history/purchases/recent")
    public ResponseEntity<Map<String, Object>> getRecentPurchases(
            @RequestHeader("Authorization") String authHeader,
            @RequestParam(defaultValue = "10") int limit) {
        try {
            List<PurchaseHistoryResponse> purchases = creditService.getPurchaseHistoryWithLimit(authHeader, limit);
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "purchases", purchases,
                "limit", limit,
                "count", purchases.size()
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "message", e.getMessage()
            ));
        }
    }

    // 전체 크레딧 히스토리 조회 (충전/사용 모두 포함)
    @GetMapping("/history")
    public ResponseEntity<Map<String, Object>> getCreditHistory(@RequestHeader("Authorization") String authHeader) {
        try {
            List<Credit> history = creditService.getCreditHistory(authHeader);
            return ResponseEntity.ok(Map.of(
                "success", true,
                "history", history
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "message", e.getMessage()
            ));
        }
    }

}