package FromProm.user_service.Service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbEnhancedClient;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.*;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class LikeService {
    private final DynamoDbEnhancedClient enhancedClient;
    private final DynamoDbClient dynamoDbClient; // 일반 클라이언트 추가
    private final String TABLE_NAME = "FromProm_Table"; // 실제 테이블명으로 변경

    public void addLike(String userId, String promptId, String promptTitle) {
        String now = OffsetDateTime.now(ZoneOffset.UTC)
                .format(DateTimeFormatter.ISO_INSTANT);

        // 1. Like 아이템 생성
        Map<String, AttributeValue> likeItem = new HashMap<>();
        likeItem.put("PK", AttributeValue.builder().s("USER#" + userId).build());
        likeItem.put("SK", AttributeValue.builder().s("LIKE#" + promptId).build());
        likeItem.put("gsi1Pk", AttributeValue.builder().s("USER_LIKES#" + userId).build());
        likeItem.put("gsi1Sk", AttributeValue.builder().s(now).build());
        likeItem.put("type", AttributeValue.builder().s("LIKE").build());
        likeItem.put("targetPromptId", AttributeValue.builder().s(promptId).build());
        likeItem.put("title", AttributeValue.builder().s(promptTitle).build());
        likeItem.put("createdAt", AttributeValue.builder().s(now).build());

        // 2. 트랜잭션 실행
        dynamoDbClient.transactWriteItems(TransactWriteItemsRequest.builder()
                .transactItems(
                        // Like 생성 (중복 방지)
                        TransactWriteItem.builder()
                                .put(Put.builder()
                                        .tableName(TABLE_NAME)
                                        .item(likeItem)
                                        .conditionExpression("attribute_not_exists(PK)")
                                        .build())
                                .build(),
                        // Prompt의 likeCount 증가
                        TransactWriteItem.builder()
                                .update(Update.builder()
                                        .tableName(TABLE_NAME)
                                        .key(Map.of(
                                                "PK", AttributeValue.builder().s("PROMPT#" + promptId).build(),
                                                "SK", AttributeValue.builder().s("METADATA").build()
                                        ))
                                        .updateExpression("SET likeCount = if_not_exists(likeCount, :zero) + :inc")
                                        .expressionAttributeValues(Map.of(
                                                ":inc", AttributeValue.builder().n("1").build(),
                                                ":zero", AttributeValue.builder().n("0").build()
                                        ))
                                        .build())
                                .build()
                )
                .build());
    }

    public void deleteLike(String userId, String promptId) {
        // 1. 트랜잭션 실행
        dynamoDbClient.transactWriteItems(TransactWriteItemsRequest.builder()
                .transactItems(
                        // [Delete] 유저의 좋아요 기록 삭제
                        TransactWriteItem.builder()
                                .delete(Delete.builder()
                                        .tableName(TABLE_NAME)
                                        .key(Map.of(
                                                "PK", AttributeValue.builder().s("USER#" + userId).build(),
                                                "SK", AttributeValue.builder().s("LIKE#" + promptId).build()
                                        ))
                                        // 조건: 기록이 실제로 존재할 때만 삭제 (선택 사항)
                                        .conditionExpression("attribute_exists(PK)")
                                        .build())
                                .build(),

                        // [Update] Prompt의 likeCount 1 감소
                        TransactWriteItem.builder()
                                .update(Update.builder()
                                        .tableName(TABLE_NAME)
                                        .key(Map.of(
                                                "PK", AttributeValue.builder().s("PROMPT#" + promptId).build(),
                                                "SK", AttributeValue.builder().s("METADATA").build()
                                        ))
                                        // 0 미만으로 떨어지지 않게 방어 로직 추가
                                        .updateExpression("SET likeCount = likeCount - :dec")
                                        .expressionAttributeValues(Map.of(
                                                ":dec", AttributeValue.builder().n("1").build(),
                                                ":zero", AttributeValue.builder().n("0").build()
                                        ))
                                        // likeCount가 0보다 클 때만 감소 (데이터 무결성)
                                        .conditionExpression("likeCount > :zero")
                                        .build())
                                .build()
                )
                .build());
    }
}