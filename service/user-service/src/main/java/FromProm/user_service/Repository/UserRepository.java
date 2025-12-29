package FromProm.user_service.Repository;

import FromProm.user_service.Entity.User;
import org.springframework.stereotype.Repository;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbEnhancedClient;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbTable;
import software.amazon.awssdk.enhanced.dynamodb.TableSchema;
import software.amazon.awssdk.enhanced.dynamodb.model.PageIterable;

@Repository
public class UserRepository {
    private final DynamoDbTable<User> userTable;

    public UserRepository(DynamoDbEnhancedClient enhancedClient) {
        // "UserTable"은 실제 AWS DynamoDB 콘솔에서 생성한 테이블 이름과 일치해야 합니다.
        this.userTable = enhancedClient.table("UserTable", TableSchema.fromBean(User.class));
    }

    // 유저 저장 (회원가입 시 사용)
    public void save(User user) {
        userTable.putItem(user);
    }

    // 유저 조회 (프로필 조회 시 사용)
    public User findById(String id) {
        return userTable.getItem(r -> r.key(k -> k.partitionValue(id)));
    }
}