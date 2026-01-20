package FromProm.user_service.DTO;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreditChargeRequest {
    private int amount;           // 충전할 금액
    private String paymentMethod; // 결제 수단 (카드, 계좌이체 등)
    private String paymentId;     // 결제 ID (외부 결제 시스템 연동용)
}