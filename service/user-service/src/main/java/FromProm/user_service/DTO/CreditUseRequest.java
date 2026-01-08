package FromProm.user_service.DTO;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor
public class CreditUseRequest {
    private int amount;        // 사용할 금액 (양수로 입력, 예: 3000)
    private String user_description; // 사용처 (예: "아이템 구매", "프리미엄 서비스")
}