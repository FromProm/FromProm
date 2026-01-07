package FromProm.user_service.Repository;

import FromProm.user_service.Entity.User;
import org.springframework.stereotype.Repository;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbEnhancedClient;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbTable;
import software.amazon.awssdk.enhanced.dynamodb.TableSchema;
import software.amazon.awssdk.enhanced.dynamodb.model.QueryConditional;
import software.amazon.awssdk.enhanced.dynamodb.Key;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;
import software.amazon.awssdk.services.dynamodb.model.QueryRequest;
import software.amazon.awssdk.services.dynamodb.model.QueryResponse;

import java.util.Map;
import java.util.Optional;

@Repository
public class UserRepository {
    private final DynamoDbTable<User> userTable;

    // FromProm_Table : DynamoDB의 table명이랑 동일해야 함
    public UserRepository(DynamoDbEnhancedClient enhancedClient) {
        this.userTable = enhancedClient.table("FromProm_Table", TableSchema.fromBean(User.class));
    }

    public void save(User user) { userTable.putItem(user); }

    // PK와 SK로 정확히 유저 프로필 조회
    public Optional<User> findByPkAndSk(String pk, String sk) {
        return Optional.ofNullable(userTable.getItem(r -> r.key(k -> k.partitionValue(pk).sortValue(sk))));
    }

    // GSI를 이용한 닉네임 중복 체크 (GSI 이름은 콘솔 설정과 맞춰야 함)
    public boolean existsByNickname(String nickname) {
        if (nickname == null || nickname.trim().isEmpty()) {
            return false;
        }

        // GSI를 통해 쿼리한 결과의 전체 아이템 개수를 스트림으로 카운트
        return userTable.index("nickname-index")
                .query(q -> q.queryConditional(QueryConditional.keyEqualTo(k -> k.partitionValue(nickname))))
                .stream()
                .flatMap(page -> page.items().stream())
                .count() > 0;
    }

    public boolean existsByEmail(String email) {
        if (email == null || email.trim().isEmpty()) {
            return false;
        }

        // nickname-index와 동일하게 email-index를 조회합니다.
        return userTable.index("email-index")
                .query(q -> q.queryConditional(QueryConditional.keyEqualTo(k -> k.partitionValue(email))))
                .stream()
                .flatMap(page -> page.items().stream())
                .count() > 0;
    }

    public void update(User user) {
        // putItem은 동일한 PK/SK가 있으면 덮어쓰기(Upsert)로 동작합니다.
        userTable.putItem(user);
    }

    public Optional<User> findUser(String userSub) {
        return Optional.ofNullable(
                userTable.getItem(r -> r.key(k -> k
                        .partitionValue(userSub)
                        .sortValue("PROFILE")))
        );
    }

    public void deleteUser(String pk) {
        // PK와 SK("PROFILE")를 조합하여 삭제 키 생성
        Key key = Key.builder()
                .partitionValue(pk)
                .sortValue("PROFILE")
                .build();

        userTable.deleteItem(key);
    }
}