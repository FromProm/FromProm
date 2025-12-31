package FromProm.user_service.Repository;

import FromProm.user_service.Entity.User;
import org.springframework.stereotype.Repository;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbEnhancedClient;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbTable;
import software.amazon.awssdk.enhanced.dynamodb.TableSchema;
import java.util.Optional;

@Repository
public class UserRepository {
    private final DynamoDbTable<User> FromPromTable;

    // FromProm_Table : DynamoDB의 table명이랑 동일해야 함
    public UserRepository(DynamoDbEnhancedClient enhancedClient) {
        this.FromPromTable = enhancedClient.table("FromProm_Table", TableSchema.fromBean(User.class));
    }

    public void save(User user) { FromPromTable.putItem(user); }
}