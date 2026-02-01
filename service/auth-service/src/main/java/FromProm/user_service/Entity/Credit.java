package FromProm.user_service.Entity;

import lombok.*;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.*;

import java.util.List;

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
    private String user_description; // 내역 (예: "Credit Charge", "Prompt Purchase")
    private List<String> prompt_titles; // 구매한 프롬프트 타이틀 리스트 (여러 개 구매 시)
    private List<String> prompt_ids;    // 구매한 프롬프트 ID 리스트
    private String created_at;   // 생성 일시

    @DynamoDbPartitionKey
    @DynamoDbAttribute("PK")
    public String getPK() { return PK; }

    @DynamoDbSortKey
    @DynamoDbAttribute("SK")
    public String getSK() { return SK; }

    @DynamoDbAttribute("prompt_titles")
    public List<String> getPrompt_titles() { return prompt_titles; }

    @DynamoDbAttribute("prompt_ids")
    public List<String> getPrompt_ids() { return prompt_ids; }
}