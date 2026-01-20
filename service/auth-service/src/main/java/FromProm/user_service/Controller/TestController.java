package FromProm.user_service.Controller;

import FromProm.user_service.Entity.Credit;
import FromProm.user_service.Entity.User;
import FromProm.user_service.Repository.CreditRepository;
import FromProm.user_service.Repository.UserRepository;
import FromProm.user_service.Service.InteractionService;
import FromProm.user_service.Service.PromptService;
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
    private final PromptService promptService;
    private final InteractionService interactionService;

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

    // 테스트용 Hard Delete (Cognito 제외, DB만 삭제)
    @DeleteMapping("/hard-delete/{userSub}")
    public ResponseEntity<Map<String, Object>> testHardDelete(@PathVariable String userSub) {
        try {
            // Hard Delete 실행 (DB만, Cognito는 제외)
            userRepository.hardDeleteUser(userSub);
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "사용자와 관련된 모든 데이터가 삭제되었습니다.",
                "deletedUser", userSub
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "message", e.getMessage()
            ));
        }
    }

    // 테스트용 내 프롬프트 목록 조회 (토큰 없이)
    @GetMapping("/prompts/my/{userSub}")
    public ResponseEntity<Map<String, Object>> testGetMyPrompts(@PathVariable String userSub) {
        try {
            var prompts = promptService.getMyPrompts(userSub);
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "count", prompts.size(),
                "prompts", prompts
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "message", e.getMessage()
            ));
        }
    }

    // 테스트용 프롬프트 삭제 (토큰 없이)
    @DeleteMapping("/prompts/{promptId}")
    public ResponseEntity<Map<String, Object>> testDeletePrompt(
            @PathVariable String promptId,
            @RequestParam String userSub) {
        try {
            promptService.deletePrompt(userSub, promptId);
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "프롬프트가 삭제되었습니다.",
                "deletedPromptId", promptId
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "message", e.getMessage()
            ));
        }
    }

    // 테스트용 좋아요 추가 (토큰 없이)
    @PostMapping("/like")
    public ResponseEntity<Map<String, Object>> testAddLike(@RequestBody Map<String, Object> request) {
        try {
            String userSub = (String) request.get("userSub");
            String promptId = (String) request.get("promptId");
            
            interactionService.addLike(userSub, promptId);
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "좋아요가 추가되었습니다.",
                "userSub", userSub,
                "promptId", promptId
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "message", e.getMessage()
            ));
        }
    }

    // 테스트용 북마크 추가 (토큰 없이)
    @PostMapping("/bookmark")
    public ResponseEntity<Map<String, Object>> testAddBookmark(@RequestBody Map<String, Object> request) {
        try {
            String userSub = (String) request.get("userSub");
            String promptId = (String) request.get("promptId");
            
            interactionService.addBookmark(userSub, promptId);
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "북마크가 추가되었습니다.",
                "userSub", userSub,
                "promptId", promptId
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "message", e.getMessage()
            ));
        }
    }

    // 테스트용 댓글 추가 (토큰 없이)
    @PostMapping("/comment")
    public ResponseEntity<Map<String, Object>> testAddComment(@RequestBody Map<String, Object> request) {
        try {
            String userSub = (String) request.get("userSub");
            String nickname = (String) request.get("nickname");
            String promptId = (String) request.get("promptId");
            String content = (String) request.get("content");
            
            interactionService.addComment(userSub, nickname, promptId, content);
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "댓글이 추가되었습니다.",
                "userSub", userSub,
                "promptId", promptId,
                "content", content
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "message", e.getMessage()
            ));
        }
    }

    // 테스트용 프롬프트 등록 (토큰 없이, SNS 발송 테스트)
    @PostMapping("/prompts/register")
    public ResponseEntity<Map<String, Object>> testRegisterPrompt(@RequestBody Map<String, Object> request) {
        try {
            String userSub = (String) request.get("userSub");
            String title = (String) request.get("title");
            String content = (String) request.getOrDefault("content", "테스트 프롬프트 내용");
            String description = (String) request.getOrDefault("description", "테스트 설명");
            Integer price = (Integer) request.getOrDefault("price", 1000);
            String model = (String) request.getOrDefault("model", "anthropic.claude-3-5-sonnet-20240620-v1:0");
            
            // PromptSaveRequest를 JSON으로 직접 생성해서 PromptService 호출
            // PromptService.createInitialPrompt 내부 로직을 직접 호출
            String promptId = promptService.createTestPrompt(userSub, title, content, description, price, model);
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "프롬프트 등록 및 SNS 발송 완료",
                "promptId", promptId,
                "userSub", userSub,
                "title", title
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "message", e.getMessage()
            ));
        }
    }
}