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
    private String LIKE_INDEX_PK;       // USER_LIKES#sub-1234
    private String LIKE_INDEX_SK;       // 2025-12-30T17:00:00Z
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

    @DynamoDbSecondaryPartitionKey(indexNames = "like-index")
    @DynamoDbAttribute("LIKE_INDEX_PK")
    public String getLIKE_INDEX_PK() { return LIKE_INDEX_PK; }

    @DynamoDbSecondarySortKey(indexNames = "like-index")
    @DynamoDbAttribute("LIKE_INDEX_SK")
    public String getLIKE_INDEX_SK() { return LIKE_INDEX_SK; }
}
