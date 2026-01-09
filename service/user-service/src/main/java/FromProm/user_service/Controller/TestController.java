package FromProm.user_service.Controller;

import FromProm.user_service.Entity.Credit;
import FromProm.user_service.Entity.User;
import FromProm.user_service.Repository.CreditRepository;
import FromProm.user_service.Repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/test")
@RequiredArgsConstructor
public class TestController {

    private final UserRepository userRepository;
    private final CreditRepository creditRepository;

    // 테스트용 사용자 생성
    @PostMapping("/create-user")
    public ResponseEntity<Map<String, Object>> createTestUser(@RequestBody Map<String, Object> request) {
        try {
            String userSub = (String) request.get("userSub");
            String email = (String) request.get("email");
            String nickname = (String) request.get("nickname");
            Integer initialCredit = (Integer) request.getOrDefault("credit", 0);

            User user = User.builder()
                    .PK(userSub)
                    .SK("PROFILE")
                    .type("USER")
                    .email(email)
                    .nickname(nickname)
                    .credit(initialCredit)
                    .bio("테스트 사용자")
                    .profileImage("")
                    .created_at(LocalDateTime.now().toString())
                    .updated_at(LocalDateTime.now().toString())
                    .build();

            userRepository.save(user);

            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "테스트 사용자가 생성되었습니다.",
                "userSub", userSub,
                "credit", initialCredit
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "message", e.getMessage()
            ));
        }
    }

    // 테스트용 사용자 조회
    @GetMapping("/user/{userSub}")
    public ResponseEntity<Map<String, Object>> getTestUser(@PathVariable String userSub) {
        try {
            User user = userRepository.findUser(userSub)
                    .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));

            return ResponseEntity.ok(Map.of(
                "success", true,
                "user", Map.of(
                    "userSub", user.getPK(),
                    "email", user.getEmail(),
                    "nickname", user.getNickname(),
                    "credit", user.getCredit()
                )
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "message", e.getMessage()
            ));
        }
    }

    // 테스트용 크레딧 충전 (토큰 없이 테스트, DB 저장 포함)
    @PostMapping("/charge")
    public ResponseEntity<Map<String, Object>> testChargeCredit(@RequestBody Map<String, Object> request) {
        try {
            String userSub = (String) request.get("userSub");
            Integer amount = (Integer) request.get("amount");

            // 사용자 조회
            User user = userRepository.findUser(userSub)
                    .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));

            String now = LocalDateTime.now().toString();
            
            // 크레딧 증가
            int newBalance = user.getCredit() + amount;
            user.setCredit(newBalance);
            user.setUpdated_at(now);

            // 크레딧 히스토리 저장 (DB에 저장!)
            String uniqueSK = "CREDIT#" + now + "#" + UUID.randomUUID().toString().substring(0, 8);
            Credit history = Credit.builder()
                    .PK(userSub)
                    .SK(uniqueSK)
                    .type("CREDIT")
                    .amount(amount)
                    .balance(newBalance)
                    .user_description("Credit Charge")
                    .prompt_titles(null)
                    .created_at(now)
                    .build();

            // DB 저장
            userRepository.update(user);
            creditRepository.save(history);

            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "크레딧이 충전되었습니다.",
                "amount", amount,
                "newBalance", newBalance
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "message", e.getMessage()
            ));
        }
    }

    // 테스트용 단일 프롬프트 구매 (토큰 없이 테스트, DB 저장 포함)
    @PostMapping("/purchase")
    public ResponseEntity<Map<String, Object>> testPurchasePrompt(@RequestBody Map<String, Object> request) {
        try {
            String buyerSub = (String) request.get("buyerSub");
            String sellerSub = (String) request.get("sellerSub");
            Integer price = (Integer) request.get("price");
            String title = (String) request.get("title");

            // 구매자 조회
            User buyer = userRepository.findUser(buyerSub)
                    .orElseThrow(() -> new RuntimeException("구매자를 찾을 수 없습니다."));

            // 판매자 조회
            User seller = userRepository.findUser(sellerSub)
                    .orElseThrow(() -> new RuntimeException("판매자를 찾을 수 없습니다."));

            // 잔액 확인
            if (buyer.getCredit() < price) {
                throw new RuntimeException("잔액이 부족합니다. 현재 잔액: " + buyer.getCredit() + ", 필요 금액: " + price);
            }

            String now = LocalDateTime.now().toString();

            // 구매자 크레딧 차감
            int buyerNewBalance = buyer.getCredit() - price;
            buyer.setCredit(buyerNewBalance);
            buyer.setUpdated_at(now);

            // 판매자 크레딧 증가
            int sellerNewBalance = seller.getCredit() + price;
            seller.setCredit(sellerNewBalance);
            seller.setUpdated_at(now);

            // 구매자 크레딧 히스토리 저장
            String buyerUniqueSK = "CREDIT#" + now + "#" + UUID.randomUUID().toString().substring(0, 8);
            Credit buyerHistory = Credit.builder()
                    .PK(buyerSub)
                    .SK(buyerUniqueSK)
                    .type("CREDIT")
                    .amount(-price)
                    .balance(buyerNewBalance)
                    .user_description("Prompt Purchase")
                    .prompt_titles(List.of(title))
                    .created_at(now)
                    .build();

            // 판매자 크레딧 히스토리 저장
            String sellerUniqueSK = "CREDIT#" + now + "#" + UUID.randomUUID().toString().substring(0, 8);
            Credit sellerHistory = Credit.builder()
                    .PK(sellerSub)
                    .SK(sellerUniqueSK)
                    .type("CREDIT")
                    .amount(price)
                    .balance(sellerNewBalance)
                    .user_description("Prompt Sale")
                    .prompt_titles(List.of(title))
                    .created_at(now)
                    .build();

            // DB 저장
            userRepository.update(buyer);
            userRepository.update(seller);
            creditRepository.save(buyerHistory);
            creditRepository.save(sellerHistory);

            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "프롬프트 구매가 완료되었습니다.",
                "title", title,
                "price", price,
                "buyerNewBalance", buyerNewBalance,
                "sellerNewBalance", sellerNewBalance
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "message", e.getMessage()
            ));
        }
    }

    // 테스트용 장바구니 구매 (토큰 없이 테스트, DB 저장 포함)
    @PostMapping("/cart-purchase")
    public ResponseEntity<Map<String, Object>> testCartPurchase(@RequestBody Map<String, Object> request) {
        try {
            String buyerSub = (String) request.get("buyerSub");
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> items = (List<Map<String, Object>>) request.get("items");
            
            // 총 구매 금액 계산
            int totalPrice = items.stream()
                    .mapToInt(item -> (Integer) item.get("price"))
                    .sum();
            
            // 구매자 정보 조회 및 잔액 확인
            User buyer = userRepository.findUser(buyerSub)
                    .orElseThrow(() -> new RuntimeException("구매자를 찾을 수 없습니다."));
            
            if (buyer.getCredit() < totalPrice) {
                throw new RuntimeException("잔액이 부족합니다. 현재 잔액: " + buyer.getCredit() + ", 필요 금액: " + totalPrice);
            }
            
            String now = LocalDateTime.now().toString();
            
            // 구매자 크레딧 차감
            int buyerNewBalance = buyer.getCredit() - totalPrice;
            buyer.setCredit(buyerNewBalance);
            buyer.setUpdated_at(now);
            
            // 프롬프트 타이틀 리스트 생성
            List<String> promptTitles = items.stream()
                    .map(item -> (String) item.get("title"))
                    .collect(Collectors.toList());
            
            // 구매자 크레딧 히스토리 저장 (DB에 저장!)
            String buyerUniqueSK = "CREDIT#" + now + "#" + UUID.randomUUID().toString().substring(0, 8);
            Credit buyerHistory = Credit.builder()
                    .PK(buyerSub)
                    .SK(buyerUniqueSK)
                    .type("CREDIT")
                    .amount(-totalPrice)
                    .balance(buyerNewBalance)
                    .user_description("Cart Purchase")
                    .prompt_titles(promptTitles)
                    .created_at(now)
                    .build();
            
            // 구매자 정보 업데이트 및 히스토리 저장
            userRepository.update(buyer);
            creditRepository.save(buyerHistory);
            
            // 판매자별로 그룹화하여 크레딧 증가 처리
            Map<String, List<Map<String, Object>>> sellerGroups = items.stream()
                    .collect(Collectors.groupingBy(item -> (String) item.get("sellerSub")));
            
            for (Map.Entry<String, List<Map<String, Object>>> entry : sellerGroups.entrySet()) {
                String sellerSub = entry.getKey();
                List<Map<String, Object>> sellerItems = entry.getValue();
                
                // 판매자별 총 수익 계산
                int sellerEarnings = sellerItems.stream()
                        .mapToInt(item -> (Integer) item.get("price"))
                        .sum();
                
                // 판매자별 프롬프트 타이틀 리스트
                List<String> sellerPromptTitles = sellerItems.stream()
                        .map(item -> (String) item.get("title"))
                        .collect(Collectors.toList());
                
                // 판매자 정보 조회 및 크레딧 증가
                User seller = userRepository.findUser(sellerSub)
                        .orElseThrow(() -> new RuntimeException("판매자를 찾을 수 없습니다: " + sellerSub));
                
                int sellerNewBalance = seller.getCredit() + sellerEarnings;
                seller.setCredit(sellerNewBalance);
                seller.setUpdated_at(now);
                
                // 판매자 크레딧 히스토리 저장 (DB에 저장!)
                String sellerUniqueSK = "CREDIT#" + now + "#" + UUID.randomUUID().toString().substring(0, 8);
                Credit sellerHistory = Credit.builder()
                        .PK(sellerSub)
                        .SK(sellerUniqueSK)
                        .type("CREDIT")
                        .amount(sellerEarnings)
                        .balance(sellerNewBalance)
                        .user_description("Prompt Sales")
                        .prompt_titles(sellerPromptTitles)
                        .created_at(now)
                        .build();
                
                userRepository.update(seller);
                creditRepository.save(sellerHistory);
            }
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "장바구니 구매가 완료되었습니다.",
                "totalPrice", totalPrice,
                "itemCount", items.size(),
                "promptTitles", promptTitles,
                "buyerNewBalance", buyerNewBalance
            ));
            
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "message", e.getMessage()
            ));
        }
    }

    // 테스트용 크레딧 히스토리 조회
    @GetMapping("/history/{userSub}")
    public ResponseEntity<Map<String, Object>> getTestCreditHistory(@PathVariable String userSub) {
        try {
            List<Credit> history = creditRepository.getCreditHistory(userSub);
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "history", history,
                "count", history.size()
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "message", e.getMessage()
            ));
        }
    }

    // 테스트용 구매 내역만 조회 (마이페이지용)
    @GetMapping("/purchases/{userSub}")
    public ResponseEntity<Map<String, Object>> getTestPurchaseHistory(@PathVariable String userSub) {
        try {
            List<Credit> allHistory = creditRepository.getCreditHistory(userSub);
            
            // 구매 내역만 필터링 (amount가 음수이고 prompt_titles가 있는 것)
            List<Map<String, Object>> purchases = allHistory.stream()
                    .filter(credit -> credit.getAmount() < 0 && credit.getPrompt_titles() != null && !credit.getPrompt_titles().isEmpty())
                    .map(credit -> {
                        List<String> titles = credit.getPrompt_titles();
                        int itemCount = titles.size();
                        boolean isCart = itemCount > 1;
                        
                        return Map.<String, Object>of(
                            "transactionId", credit.getSK(),
                            "purchaseType", isCart ? "CART" : "SINGLE",
                            "totalAmount", Math.abs(credit.getAmount()),
                            "itemCount", itemCount,
                            "promptTitles", titles,
                            "purchaseDate", credit.getCreated_at(),
                            "balanceAfter", credit.getBalance(),
                            "displayTitle", isCart ? "프롬프트 " + itemCount + "개" : titles.get(0)
                        );
                    })
                    .collect(Collectors.toList());
            
            // 통계 계산
            int totalPurchases = purchases.size();
            int totalSpent = purchases.stream().mapToInt(p -> (Integer) p.get("totalAmount")).sum();
            int totalItems = purchases.stream().mapToInt(p -> (Integer) p.get("itemCount")).sum();
            
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
}