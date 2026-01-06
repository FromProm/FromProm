package FromProm.user_service.Repository;

import FromProm.user_service.Entity.Credit;
import org.springframework.stereotype.Repository;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbEnhancedClient;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbTable;
import software.amazon.awssdk.enhanced.dynamodb.TableSchema;

@Repository
public class CreditRepository {
    private final DynamoDbTable<Credit> historyTable;

    public CreditRepository(DynamoDbEnhancedClient enhancedClient) {
        // "FromProm_Table"은 동일하게 사용하되, Schema만 CreditHistory로 설정
        this.historyTable = enhancedClient.table("FromProm_Table",
                TableSchema.fromBean(Credit.class));
    }

    public void save(Credit history) {
        historyTable.putItem(history);
    }
}