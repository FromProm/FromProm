package FromProm.user_service.DTO;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor
public class CreditChargeRequest {
    private int amount; // 충전할 금액
}