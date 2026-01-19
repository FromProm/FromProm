package FromProm.user_service.Repository;

import FromProm.user_service.Entity.Credit;
import org.springframework.stereotype.Repository;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbEnhancedClient;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbTable;
import software.amazon.awssdk.enhanced.dynamodb.Key;
import software.amazon.awssdk.enhanced.dynamodb.TableSchema;
import software.amazon.awssdk.enhanced.dynamodb.model.QueryConditional;
import software.amazon.awssdk.enhanced.dynamodb.model.QueryEnhancedRequest;

import java.util.List;
import java.util.stream.Collectors;

@Repository
public class CreditRepository {
    private final DynamoDbTable<Credit> creditTable;
    private final DynamoDbEnhancedClient enhancedClient;
    private final String TABLE_NAME = "FromProm_Table";

    public CreditRepository(DynamoDbEnhancedClient enhancedClient) {
        this.enhancedClient = enhancedClient;
        this.creditTable = enhancedClient.table(TABLE_NAME, TableSchema.fromBean(Credit.class));
    }

    // 크레딧 히스토리 저장
    public void save(Credit history) {
        creditTable.putItem(history);
    }

    // 사용자별 크레딧 히스토리 조회 (최신순)
    public List<Credit> getCreditHistory(String userSub) {
        QueryConditional queryConditional = QueryConditional
                .sortBeginsWith(s -> s.partitionValue(userSub).sortValue("CREDIT#"));

        return creditTable.query(r -> r.queryConditional(queryConditional)
                        .scanIndexForward(false)) // 최신순 정렬
                .items()
                .stream()
                .collect(Collectors.toList());
    }

    // 사용자별 크레딧 히스토리 조회 (페이징)
    public List<Credit> getCreditHistoryWithLimit(String userSub, int limit) {
        QueryConditional queryConditional = QueryConditional
                .sortBeginsWith(s -> s.partitionValue(userSub).sortValue("CREDIT#"));

        QueryEnhancedRequest queryRequest = QueryEnhancedRequest.builder()
                .queryConditional(queryConditional)
                .scanIndexForward(false)
                .limit(limit)
                .build();

        return creditTable.query(queryRequest)
                .items()
                .stream()
                .collect(Collectors.toList());
    }

    // 특정 기간 크레딧 히스토리 조회
    public List<Credit> getCreditHistoryByDateRange(String userSub, String startDate, String endDate) {
        QueryConditional queryConditional = QueryConditional
                .sortBetween(
                    Key.builder().partitionValue(userSub).sortValue("CREDIT#" + startDate).build(),
                    Key.builder().partitionValue(userSub).sortValue("CREDIT#" + endDate).build()
                );

        return creditTable.query(r -> r.queryConditional(queryConditional)
                        .scanIndexForward(false))
                .items()
                .stream()
                .collect(Collectors.toList());
    }
}