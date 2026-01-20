package FromProm.user_service.DTO;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PromptPurchaseRequest {
    private String sellerSub;      // 판매자 ID
    private int promptPrice;       // 프롬프트 가격
    private String promptTitle;    // 프롬프트 제목
    private String promptId;       // 프롬프트 ID (선택사항)
}