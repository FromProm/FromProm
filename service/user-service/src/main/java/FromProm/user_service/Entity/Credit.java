package FromProm.user_service.Entity;

import lombok.*;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@DynamoDbBean // DynamoDB 테이블과 매핑하기 위해 필수!
public class Credit {
    private String PK;          // USER#uuid
    private String SK;          // CREDIT#timestamp
    private String type;        // CREDIT_HISTORY
    private int amount;         // 변동 금액 (+5000, -3000 등)
    private int balance;        // 변동 후 잔액
    private String description; // 내역 (예: "포인트 충전", "아이템 구매")
    private String createdAt;   // 생성 일시

    @DynamoDbPartitionKey
    @DynamoDbAttribute("PK")
    public String getPK() { return PK; }

    @DynamoDbSortKey
    @DynamoDbAttribute("SK")
    public String getSK() { return SK; }
}