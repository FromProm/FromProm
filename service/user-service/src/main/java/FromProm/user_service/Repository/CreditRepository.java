package FromProm.user_service.Repository;

import FromProm.user_service.Entity.Credit;
import org.springframework.stereotype.Repository;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbEnhancedClient;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbTable;
import software.amazon.awssdk.enhanced.dynamodb.TableSchema;
import software.amazon.awssdk.enhanced.dynamodb.model.QueryConditional;

import java.util.List;
import java.util.stream.Collectors;

@Repository
public class CreditRepository {
    private final DynamoDbTable<Credit> historyTable;
    private final DynamoDbEnhancedClient enhancedClient;

    public CreditRepository(DynamoDbEnhancedClient enhancedClient, DynamoDbEnhancedClient enhancedClient1) {
        // "FromProm_Table"은 동일하게 사용하되, Schema만 CreditHistory로 설정
        this.historyTable = enhancedClient.table("FromProm_Table",
                TableSchema.fromBean(Credit.class));
        this.enhancedClient = enhancedClient1;
    }

    public void save(Credit history) {
        historyTable.putItem(history);
    }

    public List<Credit> getCreditHistory(String userSub) {
        // 1. 테이블 스키마 설정
        DynamoDbTable<Credit> creditTable = enhancedClient.table("YourTableName", TableSchema.fromBean(Credit.class));

        // 2. Query 조건 설정
        // PK는 유저 ID와 일치하고, SK는 "CREDIT#"으로 시작하는 것들만 조회
        QueryConditional queryConditional = QueryConditional
                .sortBeginsWith(s -> s.partitionValue(userSub).sortValue("CREDIT#"));

        // 3. 실행 및 결과 반환
        return creditTable.query(r -> r.queryConditional(queryConditional)
                        .scanIndexForward(false)) // false: 최신순(내림차순) 정렬
                .items()
                .stream()
                .collect(Collectors.toList());
    }
}