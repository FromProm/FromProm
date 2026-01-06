package FromProm.user_service.Service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbEnhancedClient;
import software.amazon.awssdk.services.cognitoidentityprovider.CognitoIdentityProviderClient;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.*;
import software.amazon.awssdk.services.cognitoidentityprovider.model.GetUserRequest;
import software.amazon.awssdk.services.cognitoidentityprovider.model.GetUserResponse;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class InteractionService {
    private final DynamoDbEnhancedClient enhancedClient;
    private final DynamoDbClient dynamoDbClient; // 일반 클라이언트 추가
    private final String TABLE_NAME = "FromProm_Table"; // 실제 테이블명으로 변경
    private final CognitoIdentityProviderClient cognitoClient;

    public void addLike(String userId, String promptId) {
        String now = OffsetDateTime.now(ZoneOffset.UTC)
                .format(DateTimeFormatter.ISO_INSTANT);

        // 1. Like 아이템 생성
        Map<String, AttributeValue> likeItem = new HashMap<>();
        likeItem.put("PK", AttributeValue.builder().s("USER#" + userId).build());
        likeItem.put("SK", AttributeValue.builder().s("LIKE#" + promptId).build());
        likeItem.put("LIKE_INDEX_PK", AttributeValue.builder().s("USER_LIKES#" + userId).build());
        likeItem.put("LIKE_INDEX_SK", AttributeValue.builder().s(now).build());
        likeItem.put("type", AttributeValue.builder().s("LIKE").build());
        likeItem.put("targetPromptId", AttributeValue.builder().s(promptId).build());
        //likeItem.put("title", AttributeValue.builder().s(promptTitle).build());
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

    // 북마크 등록
    public void addBookmark(String userId, String promptId) {
        String now = OffsetDateTime.now(ZoneOffset.UTC).format(DateTimeFormatter.ISO_INSTANT);

        Map<String, AttributeValue> bookmarkItem = new HashMap<>();
        bookmarkItem.put("PK", AttributeValue.builder().s("USER#" + userId).build());
        bookmarkItem.put("SK", AttributeValue.builder().s("BOOKMARK#" + promptId).build());
        bookmarkItem.put("BOOKMARK_INDEX_PK", AttributeValue.builder().s("USER_BOOKMARKS#" + userId).build());
        bookmarkItem.put("BOOKMARK_INDEX_SK", AttributeValue.builder().s(now).build());
        bookmarkItem.put("type", AttributeValue.builder().s("BOOKMARK").build());
        bookmarkItem.put("targetPromptId", AttributeValue.builder().s(promptId).build());
        //bookmarkItem.put("title", AttributeValue.builder().s(promptTitle).build());
        bookmarkItem.put("createdAt", AttributeValue.builder().s(now).build());

        dynamoDbClient.transactWriteItems(TransactWriteItemsRequest.builder()
                .transactItems(
                        TransactWriteItem.builder()
                                .put(Put.builder()
                                        .tableName(TABLE_NAME)
                                        .item(bookmarkItem)
                                        .conditionExpression("attribute_not_exists(PK)") // 중복 북마크 방지
                                        .build())
                                .build(),
                        TransactWriteItem.builder()
                                .update(Update.builder()
                                        .tableName(TABLE_NAME)
                                        .key(Map.of(
                                                "PK", AttributeValue.builder().s("PROMPT#" + promptId).build(),
                                                "SK", AttributeValue.builder().s("METADATA").build()
                                        ))
                                        .updateExpression("SET bookmarkCount = if_not_exists(bookmarkCount, :zero) + :inc")
                                        .expressionAttributeValues(Map.of(
                                                ":inc", AttributeValue.builder().n("1").build(),
                                                ":zero", AttributeValue.builder().n("0").build()
                                        ))
                                        .build())
                                .build()
                ).build());
    }

    // 북마크 취소
    public void deleteBookmark(String userId, String promptId) {
        dynamoDbClient.transactWriteItems(TransactWriteItemsRequest.builder()
                .transactItems(
                        TransactWriteItem.builder()
                                .delete(Delete.builder()
                                        .tableName(TABLE_NAME)
                                        .key(Map.of(
                                                "PK", AttributeValue.builder().s("USER#" + userId).build(),
                                                "SK", AttributeValue.builder().s("BOOKMARK#" + promptId).build()
                                        ))
                                        .conditionExpression("attribute_exists(PK)")
                                        .build())
                                .build(),
                        TransactWriteItem.builder()
                                .update(Update.builder()
                                        .tableName(TABLE_NAME)
                                        .key(Map.of(
                                                "PK", AttributeValue.builder().s("PROMPT#" + promptId).build(),
                                                "SK", AttributeValue.builder().s("METADATA").build()
                                        ))
                                        .updateExpression("SET bookmarkCount = bookmarkCount - :dec")
                                        .expressionAttributeValues(Map.of(
                                                ":dec", AttributeValue.builder().n("1").build(),
                                                ":zero", AttributeValue.builder().n("0").build()
                                        ))
                                        .conditionExpression("bookmarkCount > :zero")
                                        .build())
                                .build()
                ).build());
    }

    // 1. 댓글 작성
    public void addComment(String userId, String nickname, String promptId, String content) {
        String now = OffsetDateTime.now(ZoneOffset.UTC).format(DateTimeFormatter.ISO_INSTANT);
        String commentId = UUID.randomUUID().toString().substring(0, 8);
        // SK 설계: COMMENT#시간#ID (정렬용)
        String sk = "COMMENT#" + now + "#" + commentId;

        Map<String, AttributeValue> commentItem = new HashMap<>();
        commentItem.put("PK", AttributeValue.builder().s("PROMPT#" + promptId).build());
        commentItem.put("SK", AttributeValue.builder().s(sk).build());
        commentItem.put("Type", AttributeValue.builder().s("COMMENT").build());
        commentItem.put("content", AttributeValue.builder().s(content).build());
        commentItem.put("authorId", AttributeValue.builder().s(userId).build());
        commentItem.put("authorNickname", AttributeValue.builder().s(nickname).build());
        commentItem.put("updatedAt", AttributeValue.builder().s(now).build());

        dynamoDbClient.transactWriteItems(TransactWriteItemsRequest.builder()
                .transactItems(
                        TransactWriteItem.builder().put(Put.builder().tableName(TABLE_NAME).item(commentItem).build()).build(),
                        TransactWriteItem.builder().update(Update.builder()
                                .tableName(TABLE_NAME)
                                .key(Map.of("PK", AttributeValue.builder().s("PROMPT#" + promptId).build(),
                                        "SK", AttributeValue.builder().s("METADATA").build()))
                                .updateExpression("SET comment_count = if_not_exists(comment_count, :zero) + :inc")
                                .expressionAttributeValues(Map.of(":inc", AttributeValue.builder().n("1").build(),
                                        ":zero", AttributeValue.builder().n("0").build()))
                                .build()).build()
                ).build());
    }

    // 2. 댓글 수정
    public void updateComment(String promptId, String commentSk, String userId, String newContent) {
        String now = OffsetDateTime.now(ZoneOffset.UTC).format(DateTimeFormatter.ISO_INSTANT);

        dynamoDbClient.updateItem(UpdateItemRequest.builder()
                .tableName(TABLE_NAME)
                .key(Map.of("PK", AttributeValue.builder().s("PROMPT#" + promptId).build(),
                        "SK", AttributeValue.builder().s(commentSk).build()))
                // 본인 확인 조건 추가
                .conditionExpression("authorId = :userId")
                .updateExpression("SET content = :content, updatedAt = :now")
                .expressionAttributeValues(Map.of(
                        ":content", AttributeValue.builder().s(newContent).build(),
                        ":now", AttributeValue.builder().s(now).build(),
                        ":userId", AttributeValue.builder().s(userId).build()
                )).build());
    }

    // 3. 댓글 삭제
    public void deleteComment(String promptId, String commentSk, String userId) {
        dynamoDbClient.transactWriteItems(TransactWriteItemsRequest.builder()
                .transactItems(
                        TransactWriteItem.builder().delete(Delete.builder()
                                .tableName(TABLE_NAME)
                                .key(Map.of("PK", AttributeValue.builder().s("PROMPT#" + promptId).build(),
                                        "SK", AttributeValue.builder().s(commentSk).build()))
                                .conditionExpression("authorId = :userId")
                                .expressionAttributeValues(Map.of(":userId", AttributeValue.builder().s(userId).build()))
                                .build()).build(),
                        TransactWriteItem.builder().update(Update.builder()
                                .tableName(TABLE_NAME)
                                .key(Map.of("PK", AttributeValue.builder().s("PROMPT#" + promptId).build(),
                                        "SK", AttributeValue.builder().s("METADATA").build()))
                                .updateExpression("SET comment_count = comment_count - :dec")
                                .expressionAttributeValues(Map.of(":dec", AttributeValue.builder().n("1").build()))
                                .build()).build()
                ).build());
    }

    public String getUserIdFromToken(String accessToken) {
        // Bearer 문자열 제거 (만약 포함되어 있다면)
        String token = accessToken.startsWith("Bearer ") ? accessToken.substring(7) : accessToken;

        try {
            GetUserRequest userRequest = GetUserRequest.builder()
                    .accessToken(token)
                    .build();

            GetUserResponse userResponse = cognitoClient.getUser(userRequest);

            // Cognito에서 유저의 'sub' 혹은 'Username'을 반환합니다.
            // 일반적으로 Cognito에서 Username이 유저의 고유 식별자(UUID)인 경우가 많습니다.
            return userResponse.username();
        } catch (Exception e) {
            throw new RuntimeException("유효하지 않은 토큰입니다: " + e.getMessage());
        }
    }
}