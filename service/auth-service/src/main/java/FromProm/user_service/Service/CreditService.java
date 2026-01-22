package FromProm.user_service.Service;

import FromProm.user_service.DTO.CartPurchaseRequest;
import FromProm.user_service.DTO.PurchaseHistoryResponse;
import FromProm.user_service.Entity.Credit;
import FromProm.user_service.Entity.User;
import FromProm.user_service.Repository.CreditRepository;
import FromProm.user_service.Repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.cognitoidentityprovider.CognitoIdentityProviderClient;
import software.amazon.awssdk.services.cognitoidentityprovider.model.GetUserRequest;
import software.amazon.awssdk.services.cognitoidentityprovider.model.GetUserResponse;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CreditService {

    private final UserRepository userRepository;
    private final CreditRepository creditRepository;
    private final CognitoIdentityProviderClient cognitoClient;
    
    // 최대 보유 가능 크레딧 (1억P)
    private static final int MAX_CREDIT_LIMIT = 100_000_000;

    // 토큰에서 사용자 ID 추출 (기존 프로젝트 패턴과 동일)
    private String getUserIdFromToken(String authHeader) {
        // Bearer 문자열 제거
        String token = authHeader.startsWith("Bearer ") ? authHeader.substring(7) : authHeader;
        
        // Cognito에서 사용자 정보 조회
        GetUserRequest userRequest = GetUserRequest.builder()
                .accessToken(token)
                .build();
        
        GetUserResponse userResponse = cognitoClient.getUser(userRequest);
        
        // Cognito에서 sub 값 추출
        String userSub = userResponse.userAttributes().stream()
                .filter(attr -> attr.name().equals("sub"))
                .findFirst()
                .map(attr -> attr.value())
                .orElseThrow(() -> new RuntimeException("사용자 정보를 찾을 수 없습니다."));
        
        return "USER#" + userSub; // DynamoDB PK 형식으로 반환
    }

    // 크레딧 충전 (토큰 기반)
    public void chargeCredit(String authHeader, int amount) {
        String userSub = getUserIdFromToken(authHeader);
        
        User user = userRepository.findUser(userSub)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));

        int newBalance = user.getCredit() + amount;
        
        // 최대 보유량 체크
        if (newBalance > MAX_CREDIT_LIMIT) {
            throw new RuntimeException("최대 보유 가능 크레딧은 " + String.format("%,d", MAX_CREDIT_LIMIT) + "P입니다. " +
                    "현재 보유: " + String.format("%,d", user.getCredit()) + "P, " +
                    "충전 가능: " + String.format("%,d", MAX_CREDIT_LIMIT - user.getCredit()) + "P");
        }
        
        user.setCredit(newBalance);
        user.setUpdated_at(LocalDateTime.now().toString());

        String now = LocalDateTime.now().toString();
        String uniqueSK = "CREDIT#" + now + "#" + UUID.randomUUID().toString().substring(0, 8);

        Credit history = Credit.builder()
                .PK(userSub)
                .SK(uniqueSK)
                .type("CREDIT")
                .amount(amount)
                .balance(newBalance)
                .user_description("Credit Charge")
                .prompt_titles(null) // 충전 시에는 프롬프트 타이틀 없음
                .created_at(now)
                .build();

        userRepository.update(user);
        creditRepository.save(history);
    }

    // 내역 조회 (토큰 기반)
    public List<Credit> getCreditHistory(String authHeader) {
        String userSub = getUserIdFromToken(authHeader);
        return creditRepository.getCreditHistory(userSub);
    }

    // 내역 조회 (제한된 개수, 토큰 기반)
    public List<Credit> getCreditHistoryWithLimit(String authHeader, int limit) {
        String userSub = getUserIdFromToken(authHeader);
        return creditRepository.getCreditHistoryWithLimit(userSub, limit);
    }

    // 크레딧 잔액 조회 (토큰 기반)
    public int getUserCredit(String authHeader) {
        String userSub = getUserIdFromToken(authHeader);
        User user = userRepository.findUser(userSub)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));
        return user.getCredit();
    }

    // 프롬프트 구매 내역만 조회 (마이페이지용)
    public List<PurchaseHistoryResponse> getPurchaseHistory(String authHeader) {
        String userSub = getUserIdFromToken(authHeader);
        
        // 모든 크레딧 히스토리 조회
        List<Credit> allHistory = creditRepository.getCreditHistory(userSub);
        
        // 구매 내역만 필터링 (amount가 음수이고 prompt_titles가 있는 것)
        return allHistory.stream()
                .filter(credit -> credit.getAmount() < 0 && credit.getPrompt_titles() != null && !credit.getPrompt_titles().isEmpty())
                .map(this::convertToPurchaseHistoryResponse)
                .collect(java.util.stream.Collectors.toList());
    }
    
    // 페이징을 지원하는 구매 내역 조회
    public List<PurchaseHistoryResponse> getPurchaseHistoryWithLimit(String authHeader, int limit) {
        String userSub = getUserIdFromToken(authHeader);
        
        // 제한된 개수로 크레딧 히스토리 조회
        List<Credit> limitedHistory = creditRepository.getCreditHistoryWithLimit(userSub, limit * 2); // 구매 내역만 필터링할 것이므로 여유있게
        
        // 구매 내역만 필터링하고 제한된 개수만 반환
        return limitedHistory.stream()
                .filter(credit -> credit.getAmount() < 0 && credit.getPrompt_titles() != null && !credit.getPrompt_titles().isEmpty())
                .limit(limit)
                .map(this::convertToPurchaseHistoryResponse)
                .collect(java.util.stream.Collectors.toList());
    }
    
    // Credit 엔티티를 PurchaseHistoryResponse로 변환
    private PurchaseHistoryResponse convertToPurchaseHistoryResponse(Credit credit) {
        List<String> promptTitles = credit.getPrompt_titles();
        int itemCount = promptTitles.size();
        boolean isCartPurchase = itemCount > 1;
        
        // 표시용 제목 생성
        String displayTitle = isCartPurchase ? 
                String.format("프롬프트 %d개", itemCount) : 
                promptTitles.get(0);
        
        // 표시용 설명 생성
        String displayDescription = isCartPurchase ?
                String.join(", ", promptTitles) :
                promptTitles.get(0);
        
        return PurchaseHistoryResponse.builder()
                .transactionId(credit.getSK())
                .purchaseType(isCartPurchase ? "CART" : "SINGLE")
                .totalAmount(Math.abs(credit.getAmount())) // 음수를 양수로 변환
                .itemCount(itemCount)
                .promptTitles(promptTitles)
                .purchaseDate(credit.getCreated_at())
                .balanceAfter(credit.getBalance())
                .displayTitle(displayTitle)
                .displayDescription(displayDescription)
                .build();
    }
    public void transferCreditForPromptPurchase(String buyerAuthHeader, String sellerSub, int promptPrice, String promptTitle) {
        String buyerSub = getUserIdFromToken(buyerAuthHeader);
        
        // 1. 구매자와 판매자 정보 조회
        User buyer = userRepository.findUser(buyerSub)
                .orElseThrow(() -> new RuntimeException("구매자를 찾을 수 없습니다."));
        User seller = userRepository.findUser(sellerSub)
                .orElseThrow(() -> new RuntimeException("판매자를 찾을 수 없습니다."));

        // 2. 구매자 잔액 확인
        if (buyer.getCredit() < promptPrice) {
            throw new RuntimeException("잔액이 부족합니다. 현재 잔액: " + buyer.getCredit() + ", 필요 금액: " + promptPrice);
        }

        String now = LocalDateTime.now().toString();
        
        // 3. 구매자 크레딧 차감
        int buyerNewBalance = buyer.getCredit() - promptPrice;
        buyer.setCredit(buyerNewBalance);
        buyer.setUpdated_at(now);

        // 4. 판매자 크레딧 증가 (최대 보유량 체크)
        int sellerNewBalance = seller.getCredit() + promptPrice;
        if (sellerNewBalance > MAX_CREDIT_LIMIT) {
            sellerNewBalance = MAX_CREDIT_LIMIT; // 최대치로 제한
        }
        seller.setCredit(sellerNewBalance);
        seller.setUpdated_at(now);

        // 5. 구매자 크레딧 히스토리 저장 (단일 프롬프트)
        String buyerUniqueSK = "CREDIT#" + now + "#" + UUID.randomUUID().toString().substring(0, 8);
        Credit buyerHistory = Credit.builder()
                .PK(buyerSub)
                .SK(buyerUniqueSK)
                .type("CREDIT")
                .amount(-promptPrice)
                .balance(buyerNewBalance)
                .user_description("Prompt Purchase")
                .prompt_titles(List.of(promptTitle)) // 단일 프롬프트도 리스트로 저장
                .created_at(now)
                .build();

        // 6. 판매자 크레딧 히스토리 저장 (단일 프롬프트)
        String sellerUniqueSK = "CREDIT#" + now + "#" + UUID.randomUUID().toString().substring(0, 8);
        Credit sellerHistory = Credit.builder()
                .PK(sellerSub)
                .SK(sellerUniqueSK)
                .type("CREDIT")
                .amount(promptPrice)
                .balance(sellerNewBalance)
                .user_description("Prompt Sale")
                .prompt_titles(List.of(promptTitle)) // 단일 프롬프트도 리스트로 저장
                .created_at(now)
                .build();

        try {
            // 7. 모든 변경사항을 DynamoDB에 저장
            userRepository.update(buyer);
            userRepository.update(seller);
            creditRepository.save(buyerHistory);
            creditRepository.save(sellerHistory);
        } catch (Exception e) {
            throw new RuntimeException("프롬프트 구매 처리 중 오류가 발생했습니다: " + e.getMessage());
        }
    }

    // 장바구니 일괄 구매 (토큰 기반)
    public void purchaseCart(String authHeader, CartPurchaseRequest request) {
        String buyerSub = getUserIdFromToken(authHeader);
        
        // 1. 총 구매 금액 계산
        int totalPrice = request.getItems().stream()
                .mapToInt(CartPurchaseRequest.CartItem::getPrice)
                .sum();
        
        // 2. 구매자 정보 조회 및 잔액 확인
        User buyer = userRepository.findUser(buyerSub)
                .orElseThrow(() -> new RuntimeException("구매자를 찾을 수 없습니다."));
        
        if (buyer.getCredit() < totalPrice) {
            throw new RuntimeException("잔액이 부족합니다. 현재 잔액: " + buyer.getCredit() + ", 필요 금액: " + totalPrice);
        }
        
        String now = LocalDateTime.now().toString();
        
        // 3. 구매자 크레딧 차감
        int buyerNewBalance = buyer.getCredit() - totalPrice;
        buyer.setCredit(buyerNewBalance);
        buyer.setUpdated_at(now);
        
        // 4. 프롬프트 타이틀 리스트 생성
        List<String> promptTitles = request.getItems().stream()
                .map(CartPurchaseRequest.CartItem::getTitle)
                .collect(java.util.stream.Collectors.toList());
        
        // 5. 구매자 크레딧 히스토리 저장
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
        
        // 6. 판매자별로 그룹화하여 크레딧 증가 처리
        Map<String, List<CartPurchaseRequest.CartItem>> sellerGroups = request.getItems().stream()
                .collect(java.util.stream.Collectors.groupingBy(CartPurchaseRequest.CartItem::getSellerSub));
        
        try {
            // 7. 구매자 정보 업데이트
            userRepository.update(buyer);
            creditRepository.save(buyerHistory);
            
            // 8. 각 판매자별로 크레딧 증가 처리
            for (Map.Entry<String, List<CartPurchaseRequest.CartItem>> entry : sellerGroups.entrySet()) {
                String sellerSub = entry.getKey();
                List<CartPurchaseRequest.CartItem> sellerItems = entry.getValue();
                
                // 판매자별 총 수익 계산
                int sellerEarnings = sellerItems.stream()
                        .mapToInt(CartPurchaseRequest.CartItem::getPrice)
                        .sum();
                
                // 판매자별 프롬프트 타이틀 리스트
                List<String> sellerPromptTitles = sellerItems.stream()
                        .map(CartPurchaseRequest.CartItem::getTitle)
                        .collect(java.util.stream.Collectors.toList());
                
                // 판매자 정보 조회 및 크레딧 증가 (최대 보유량 체크)
                User seller = userRepository.findUser(sellerSub)
                        .orElseThrow(() -> new RuntimeException("판매자를 찾을 수 없습니다: " + sellerSub));
                
                int sellerNewBalance = seller.getCredit() + sellerEarnings;
                if (sellerNewBalance > MAX_CREDIT_LIMIT) {
                    sellerNewBalance = MAX_CREDIT_LIMIT; // 최대치로 제한
                }
                seller.setCredit(sellerNewBalance);
                seller.setUpdated_at(now);
                
                // 판매자 크레딧 히스토리 저장
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
        } catch (Exception e) {
            throw new RuntimeException("장바구니 구매 처리 중 오류가 발생했습니다: " + e.getMessage());
        }
    }


}