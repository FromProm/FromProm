package FromProm.user_service.DTO;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PurchaseHistoryResponse {
    private String transactionId;      // 거래 ID (SK)
    private String purchaseType;       // "SINGLE" 또는 "CART"
    private int totalAmount;           // 총 구매 금액
    private int itemCount;             // 구매한 프롬프트 개수
    private List<String> promptTitles; // 구매한 프롬프트 제목들
    private List<String> promptIds;    // 구매한 프롬프트 ID들
    private String purchaseDate;       // 구매 일시
    private int balanceAfter;          // 구매 후 잔액
    
    // 프론트엔드 표시용 추가 정보
    private String displayTitle;       // 표시용 제목 (단일: 제목, 다중: "프롬프트 N개")
    private String displayDescription; // 표시용 설명
}