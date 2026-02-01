package FromProm.user_service.Repository;

import FromProm.user_service.Entity.User;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Repository;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbEnhancedClient;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbTable;
import software.amazon.awssdk.enhanced.dynamodb.TableSchema;
import software.amazon.awssdk.enhanced.dynamodb.model.QueryConditional;
import software.amazon.awssdk.enhanced.dynamodb.Key;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Repository
public class UserRepository {
    private final DynamoDbTable<User> userTable;
    private final DynamoDbClient dynamoDbClient;
    
    @Value("${aws.dynamodb.table.name}")
    private String TABLE_NAME;

    // FromProm_Table : DynamoDB의 table명이랑 동일해야 함
    public UserRepository(DynamoDbEnhancedClient enhancedClient, DynamoDbClient dynamoDbClient, 
                          @Value("${aws.dynamodb.table.name}") String tableName) {
        this.TABLE_NAME = tableName;
        this.userTable = enhancedClient.table(tableName, TableSchema.fromBean(User.class));
        this.dynamoDbClient = dynamoDbClient;
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

    /**
     * Hard Delete: 사용자와 관련된 모든 데이터 삭제
     * - USER#{userId} 파티션의 모든 아이템 (PROFILE, LIKE#, BOOKMARK#, CREDIT#)
     * - 사용자가 작성한 댓글들
     * - 사용자가 등록한 프롬프트들
     */
    public void hardDeleteUser(String userSub) {
        // userSub는 "USER#xxx" 형태가 아닌 순수 ID일 수 있음
        String userId = userSub.startsWith("USER#") ? userSub.replace("USER#", "") : userSub;
        String userPK = "USER#" + userId;
        
        // 1. USER#{userId} 파티션의 모든 아이템 삭제 (PROFILE, LIKE, BOOKMARK, CREDIT)
        deleteAllItemsByPK(userPK);
        
        // 2. 사용자가 작성한 댓글 삭제 (모든 PROMPT에서 comment_user가 userId인 것)
        deleteUserComments(userId);
        
        // 3. 사용자가 등록한 프롬프트 삭제
        deleteUserPrompts(userId);
    }

    /**
     * 특정 PK의 모든 아이템 삭제
     * - LIKE#, BOOKMARK# 삭제 시 해당 프롬프트의 카운트도 감소
     */
    private void deleteAllItemsByPK(String pk) {
        QueryRequest queryRequest = QueryRequest.builder()
                .tableName(TABLE_NAME)
                .keyConditionExpression("PK = :pk")
                .expressionAttributeValues(Map.of(":pk", AttributeValue.builder().s(pk).build()))
                .build();

        QueryResponse response = dynamoDbClient.query(queryRequest);
        
        for (Map<String, AttributeValue> item : response.items()) {
            String sk = item.get("SK").s();
            
            // LIKE# 삭제 시 프롬프트의 like_count 감소
            if (sk.startsWith("LIKE#")) {
                String promptId = sk.replace("LIKE#", "");
                try {
                    dynamoDbClient.transactWriteItems(TransactWriteItemsRequest.builder()
                            .transactItems(
                                    TransactWriteItem.builder()
                                            .delete(Delete.builder()
                                                    .tableName(TABLE_NAME)
                                                    .key(Map.of(
                                                            "PK", AttributeValue.builder().s(pk).build(),
                                                            "SK", AttributeValue.builder().s(sk).build()
                                                    ))
                                                    .build())
                                            .build(),
                                    TransactWriteItem.builder()
                                            .update(Update.builder()
                                                    .tableName(TABLE_NAME)
                                                    .key(Map.of(
                                                            "PK", AttributeValue.builder().s("PROMPT#" + promptId).build(),
                                                            "SK", AttributeValue.builder().s("METADATA").build()
                                                    ))
                                                    .updateExpression("SET like_count = if_not_exists(like_count, :zero) - :dec")
                                                    .expressionAttributeValues(Map.of(
                                                            ":dec", AttributeValue.builder().n("1").build(),
                                                            ":zero", AttributeValue.builder().n("0").build()
                                                    ))
                                                    .build())
                                            .build()
                            )
                            .build());
                } catch (Exception e) {
                    System.err.println("좋아요 삭제 실패: " + pk + "/" + sk + " - " + e.getMessage());
                }
            }
            // BOOKMARK# 삭제 시 프롬프트의 bookmark_count 감소
            else if (sk.startsWith("BOOKMARK#")) {
                String promptId = sk.replace("BOOKMARK#", "");
                try {
                    dynamoDbClient.transactWriteItems(TransactWriteItemsRequest.builder()
                            .transactItems(
                                    TransactWriteItem.builder()
                                            .delete(Delete.builder()
                                                    .tableName(TABLE_NAME)
                                                    .key(Map.of(
                                                            "PK", AttributeValue.builder().s(pk).build(),
                                                            "SK", AttributeValue.builder().s(sk).build()
                                                    ))
                                                    .build())
                                            .build(),
                                    TransactWriteItem.builder()
                                            .update(Update.builder()
                                                    .tableName(TABLE_NAME)
                                                    .key(Map.of(
                                                            "PK", AttributeValue.builder().s("PROMPT#" + promptId).build(),
                                                            "SK", AttributeValue.builder().s("METADATA").build()
                                                    ))
                                                    .updateExpression("SET bookmark_count = if_not_exists(bookmark_count, :zero) - :dec")
                                                    .expressionAttributeValues(Map.of(
                                                            ":dec", AttributeValue.builder().n("1").build(),
                                                            ":zero", AttributeValue.builder().n("0").build()
                                                    ))
                                                    .build())
                                            .build()
                            )
                            .build());
                } catch (Exception e) {
                    System.err.println("북마크 삭제 실패: " + pk + "/" + sk + " - " + e.getMessage());
                }
            }
            // 일반 아이템 삭제 (PROFILE, CREDIT# 등)
            else {
                dynamoDbClient.deleteItem(DeleteItemRequest.builder()
                        .tableName(TABLE_NAME)
                        .key(Map.of(
                                "PK", AttributeValue.builder().s(pk).build(),
                                "SK", AttributeValue.builder().s(sk).build()
                        ))
                        .build());
            }
        }
    }

    /**
     * 사용자가 작성한 모든 댓글 삭제
     * - 모든 PROMPT#에서 comment_user가 userId인 댓글 찾아서 삭제
     * - 해당 프롬프트의 comment_count 감소
     */
    private void deleteUserComments(String userId) {
        // Scan으로 comment_user가 userId인 모든 댓글 찾기
        ScanRequest scanRequest = ScanRequest.builder()
                .tableName(TABLE_NAME)
                .filterExpression("comment_user = :userId AND begins_with(SK, :commentPrefix)")
                .expressionAttributeValues(Map.of(
                        ":userId", AttributeValue.builder().s(userId).build(),
                        ":commentPrefix", AttributeValue.builder().s("COMMENT#").build()
                ))
                .build();

        ScanResponse response = dynamoDbClient.scan(scanRequest);
        
        for (Map<String, AttributeValue> item : response.items()) {
            String promptPK = item.get("PK").s();
            String commentSK = item.get("SK").s();
            
            try {
                // 댓글 삭제
                dynamoDbClient.deleteItem(DeleteItemRequest.builder()
                        .tableName(TABLE_NAME)
                        .key(Map.of(
                                "PK", AttributeValue.builder().s(promptPK).build(),
                                "SK", AttributeValue.builder().s(commentSK).build()
                        ))
                        .build());
                
                // comment_count 감소 (문자열 타입으로 저장됨)
                GetItemResponse metadataResponse = dynamoDbClient.getItem(GetItemRequest.builder()
                        .tableName(TABLE_NAME)
                        .key(Map.of("PK", AttributeValue.builder().s(promptPK).build(),
                                "SK", AttributeValue.builder().s("METADATA").build()))
                        .projectionExpression("comment_count")
                        .build());
                
                int currentCount = 0;
                if (metadataResponse.hasItem() && metadataResponse.item().containsKey("comment_count")) {
                    AttributeValue countAttr = metadataResponse.item().get("comment_count");
                    if (countAttr.s() != null) {
                        currentCount = Integer.parseInt(countAttr.s());
                    } else if (countAttr.n() != null) {
                        currentCount = Integer.parseInt(countAttr.n());
                    }
                }
                
                int newCount = Math.max(0, currentCount - 1);
                dynamoDbClient.updateItem(UpdateItemRequest.builder()
                        .tableName(TABLE_NAME)
                        .key(Map.of("PK", AttributeValue.builder().s(promptPK).build(),
                                "SK", AttributeValue.builder().s("METADATA").build()))
                        .updateExpression("SET comment_count = :newCount")
                        .expressionAttributeValues(Map.of(":newCount", AttributeValue.builder().s(String.valueOf(newCount)).build()))
                        .build());
            } catch (Exception e) {
                // 개별 댓글 삭제 실패해도 계속 진행
                System.err.println("댓글 삭제 실패: " + promptPK + "/" + commentSK + " - " + e.getMessage());
            }
        }
    }

    /**
     * 사용자가 등록한 모든 프롬프트 삭제
     * - create_user가 USER#{userId}인 프롬프트 찾아서 삭제
     * - 프롬프트의 모든 관련 데이터도 삭제 (METADATA, 댓글 등)
     */
    private void deleteUserPrompts(String userId) {
        String userPK = "USER#" + userId;
        
        // Scan으로 create_user가 userPK인 모든 프롬프트 찾기
        ScanRequest scanRequest = ScanRequest.builder()
                .tableName(TABLE_NAME)
                .filterExpression("create_user = :userId AND SK = :metadata")
                .expressionAttributeValues(Map.of(
                        ":userId", AttributeValue.builder().s(userPK).build(),
                        ":metadata", AttributeValue.builder().s("METADATA").build()
                ))
                .build();

        ScanResponse response = dynamoDbClient.scan(scanRequest);
        
        for (Map<String, AttributeValue> item : response.items()) {
            String promptPK = item.get("PK").s(); // PROMPT#{promptId}
            
            // 해당 프롬프트의 모든 아이템 삭제 (METADATA, COMMENT# 등)
            deleteAllItemsByPK(promptPK);
            
            // 이 프롬프트에 대한 다른 사용자들의 좋아요/북마크도 삭제
            deletePromptInteractions(promptPK);
        }
    }

    /**
     * 특정 프롬프트에 대한 모든 좋아요/북마크 삭제
     */
    private void deletePromptInteractions(String promptPK) {
        String promptId = promptPK.replace("PROMPT#", "");
        
        // LIKE#{promptId}와 BOOKMARK#{promptId}를 가진 모든 아이템 삭제
        ScanRequest scanRequest = ScanRequest.builder()
                .tableName(TABLE_NAME)
                .filterExpression("SK = :likeSK OR SK = :bookmarkSK")
                .expressionAttributeValues(Map.of(
                        ":likeSK", AttributeValue.builder().s("LIKE#" + promptId).build(),
                        ":bookmarkSK", AttributeValue.builder().s("BOOKMARK#" + promptId).build()
                ))
                .build();

        ScanResponse response = dynamoDbClient.scan(scanRequest);
        
        for (Map<String, AttributeValue> item : response.items()) {
            String pk = item.get("PK").s();
            String sk = item.get("SK").s();
            
            dynamoDbClient.deleteItem(DeleteItemRequest.builder()
                    .tableName(TABLE_NAME)
                    .key(Map.of(
                            "PK", AttributeValue.builder().s(pk).build(),
                            "SK", AttributeValue.builder().s(sk).build()
                    ))
                    .build());
        }
    }
}