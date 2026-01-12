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
        likeItem.put("target_prompt_id", AttributeValue.builder().s(promptId).build());
        likeItem.put("created_at", AttributeValue.builder().s(now).build());

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
                                        .updateExpression("SET like_count = if_not_exists(like_count, :zero) + :inc")
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
        try {
            dynamoDbClient.transactWriteItems(TransactWriteItemsRequest.builder()
                    .transactItems(
                            // 1. 유저의 좋아요 기록 삭제
                            TransactWriteItem.builder()
                                    .delete(Delete.builder()
                                            .tableName(TABLE_NAME)
                                            .key(Map.of(
                                                    "PK", AttributeValue.builder().s("USER#" + userId).build(),
                                                    "SK", AttributeValue.builder().s("LIKE#" + promptId).build()
                                            ))
                                            // 기록이 있어야만 삭제 가능 (이미 취소된 경우 방지)
                                            .conditionExpression("attribute_exists(PK)")
                                            .build())
                                    .build(),

                            // 2. Prompt의 like_count 감소 (필드명 like_count로 통일)
                            TransactWriteItem.builder()
                                    .update(Update.builder()
                                            .tableName(TABLE_NAME)
                                            .key(Map.of(
                                                    "PK", AttributeValue.builder().s("PROMPT#" + promptId).build(),
                                                    "SK", AttributeValue.builder().s("METADATA").build()
                                            ))
                                            // 필드명이 없으면 0으로 간주하고 계산
                                            .updateExpression("SET like_count = like_count - :dec")
                                            .conditionExpression("attribute_exists(like_count) AND like_count > :zero")
                                            .expressionAttributeValues(Map.of(
                                                    ":dec", AttributeValue.builder().n("1").build(),
                                                    ":zero", AttributeValue.builder().n("0").build()
                                            ))
                                            // 0보다 클 때만 감소 가능
                                            .conditionExpression("like_count > :zero")
                                            .build())
                                    .build()
                    )
                    .build());
        } catch (TransactionCanceledException e) {
            // 어떤 조건이 실패했는지 로그 확인용
            System.err.println("트랜잭션 실패 원인: " + e.cancellationReasons());
            throw new RuntimeException("이미 좋아요를 취소했거나 처리할 수 없는 요청입니다.");
        }
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
        bookmarkItem.put("target_prompt_id", AttributeValue.builder().s(promptId).build());
        bookmarkItem.put("created_at", AttributeValue.builder().s(now).build());

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
                                        .updateExpression("SET bookmark_count = if_not_exists(bookmark_count, :zero) + :inc")
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
                                        .updateExpression("SET bookmark_count = bookmark_count - :dec")
                                        .expressionAttributeValues(Map.of(
                                                ":dec", AttributeValue.builder().n("1").build(),
                                                ":zero", AttributeValue.builder().n("0").build()
                                        ))
                                        .conditionExpression("bookmark_count > :zero")
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
        commentItem.put("type", AttributeValue.builder().s("COMMENT").build());
        commentItem.put("comment_content", AttributeValue.builder().s(content).build());
        commentItem.put("comment_user", AttributeValue.builder().s(userId).build());
        commentItem.put("comment_user_nickname", AttributeValue.builder().s(nickname).build());
        commentItem.put("created_at", AttributeValue.builder().s(now).build());
        commentItem.put("updated_at", AttributeValue.builder().s(now).build());

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
                .conditionExpression("comment_user = :userId")
                .updateExpression("SET comment_content = :content, updated_at = :now")
                .expressionAttributeValues(Map.of(
                        ":content", AttributeValue.builder().s(newContent).build(),
                        ":now", AttributeValue.builder().s(now).build(),
                        ":userId", AttributeValue.builder().s(userId).build()
                )).build());
    }

    // 3. 댓글 삭제
    public void deleteComment(String promptId, String commentSk, String userId) throws IllegalAccessException {
        // 1. 먼저 해당 댓글 아이템을 가져와봅니다.
        GetItemResponse getResponse = dynamoDbClient.getItem(GetItemRequest.builder()
                .tableName(TABLE_NAME)
                .key(Map.of(
                        "PK", AttributeValue.builder().s("PROMPT#" + promptId).build(),
                        "SK", AttributeValue.builder().s(commentSk).build()
                ))
                .build());

        // [체크 1] 아이템이 아예 없는 경우 (유효하지 않은 값)
        if (!getResponse.hasItem()) {
            throw new IllegalArgumentException("존재하지 않거나 이미 삭제된 댓글입니다. (유효한 SK값이 아님)");
        }

        String authorId = getResponse.item().get("comment_user").s();

        // [체크 2] 작성자가 일치하지 않는 경우 (권한 부족)
        if (!authorId.equals(userId)) {
            throw new IllegalAccessException("본인이 작성한 댓글만 삭제할 수 있습니다.");
        }

        // 2. 체크 통과 후 실제 삭제 트랜잭션 실행
        try {
            dynamoDbClient.transactWriteItems(TransactWriteItemsRequest.builder()
                    .transactItems(
                            TransactWriteItem.builder().delete(Delete.builder()
                                    .tableName(TABLE_NAME)
                                    .key(Map.of("PK", AttributeValue.builder().s("PROMPT#" + promptId).build(),
                                            "SK", AttributeValue.builder().s(commentSk).build()))
                                    .build()).build(),
                            TransactWriteItem.builder().update(Update.builder()
                                    .tableName(TABLE_NAME)
                                    .key(Map.of("PK", AttributeValue.builder().s("PROMPT#" + promptId).build(),
                                            "SK", AttributeValue.builder().s("METADATA").build()))
                                    .updateExpression("SET comment_count = comment_count - :dec")
                                    .conditionExpression("comment_count > :zero")
                                    .expressionAttributeValues(Map.of(
                                            ":dec", AttributeValue.builder().n("1").build(),
                                            ":zero", AttributeValue.builder().n("0").build()
                                    ))
                                    .build()).build()
                    ).build());
        } catch (Exception e) {
            throw new RuntimeException("댓글 삭제 중 오류가 발생했습니다.");
        }
    }

    //좋아요, 북마크 사용
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

    // 댓글 수정 시 사용
    public Map<String, String> getUserInfoFromToken(String accessToken) {
        String token = accessToken.startsWith("Bearer ") ? accessToken.substring(7) : accessToken;

        try {
            GetUserRequest userRequest = GetUserRequest.builder()
                    .accessToken(token)
                    .build();

            GetUserResponse userResponse = cognitoClient.getUser(userRequest);

            Map<String, String> userInfo = new HashMap<>();
            userInfo.put("userId", userResponse.username()); // sub (ID)

            // Cognito 속성 중 'nickname' 찾기
            String nickname = userResponse.userAttributes().stream()
                    .filter(attr -> attr.name().equals("nickname"))
                    .findFirst()
                    .map(attr -> attr.value())
                    .orElse("UnknownUser"); // 닉네임이 없을 경우 대비

            userInfo.put("nickname", nickname);

            return userInfo;
        } catch (Exception e) {
            throw new RuntimeException("Cognito 인증 실패: " + e.getMessage());
        }
    }
}