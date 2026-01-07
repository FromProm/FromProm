package FromProm.user_service.Entity;

import lombok.*;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@DynamoDbBean
public class Like {
    private String PK;           // USER#sub-1234
    private String SK;           // LIKE#p-999
    private String gsi1Pk;       // USER_LIKES#sub-1234
    private String gsi1Sk;       // 2025-12-30T17:00:00Z
    private String type;         // LIKE
    private String targetPromptId;
    private String title;        // 리스트 조회 시 조인 방지를 위해 저장
    private String created_at;

    @DynamoDbPartitionKey
    @DynamoDbAttribute("PK")
    public String getPK() { return PK; }

    @DynamoDbSortKey
    @DynamoDbAttribute("SK")
    public String getSK() { return SK; }

    @DynamoDbSecondaryPartitionKey(indexNames = "GSI1")
    @DynamoDbAttribute("GSI1_PK")
    public String getGsi1Pk() { return gsi1Pk; }

    @DynamoDbSecondarySortKey(indexNames = "GSI1")
    @DynamoDbAttribute("GSI1_SK")
    public String getGsi1Sk() { return gsi1Sk; }
}
