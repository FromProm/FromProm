package FromProm.user_service.Service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
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
    private final CognitoIdentityProviderClient cognitoClient;
    
    @Value("${aws.dynamodb.table.name}")
    private String TABLE_NAME;

    public void addLike(String userId, String promptId) {
        String now = OffsetDateTime.now(ZoneOffset.UTC)
                .format(DateTimeFormatter.ISO_INSTANT);

        // 1. Like 아이템 생성 (SK 포맷: LIKE#PROMPT#{promptId})
        Map<String, AttributeValue> likeItem = new HashMap<>();
        likeItem.put("PK", AttributeValue.builder().s("USER#" + userId).build());
        likeItem.put("SK", AttributeValue.builder().s("LIKE#PROMPT#" + promptId).build());
        likeItem.put("LIKE_INDEX_PK", AttributeValue.builder().s("USER_LIKES#" + userId).build());
        likeItem.put("LIKE_INDEX_SK", AttributeValue.builder().s(now).build());
        likeItem.put("type", AttributeValue.builder().s("LIKE").build());
        likeItem.put("target_prompt_id", AttributeValue.builder().s(promptId).build());
        likeItem.put("created_at", AttributeValue.builder().s(now).build());

        // 먼저 좋아요 아이템 추가 (중복 방지)
        try {
            dynamoDbClient.putItem(PutItemRequest.builder()
                    .tableName(TABLE_NAME)
                    .item(likeItem)
                    .conditionExpression("attribute_not_exists(PK)")
                    .build());
        } catch (ConditionalCheckFailedException e) {
            throw new RuntimeException("이미 좋아요를 누른 프롬프트입니다.");
        }

        // METADATA의 like_count 증가 (문자열 타입으로 저장됨)
        try {
            GetItemResponse metadataResponse = dynamoDbClient.getItem(GetItemRequest.builder()
                    .tableName(TABLE_NAME)
                    .key(Map.of("PK", AttributeValue.builder().s("PROMPT#" + promptId).build(),
                            "SK", AttributeValue.builder().s("METADATA").build()))
                    .projectionExpression("like_count")
                    .build());
            
            int currentCount = 0;
            if (metadataResponse.hasItem() && metadataResponse.item().containsKey("like_count")) {
                AttributeValue countAttr = metadataResponse.item().get("like_count");
                if (countAttr.s() != null) {
                    currentCount = Integer.parseInt(countAttr.s());
                } else if (countAttr.n() != null) {
                    currentCount = Integer.parseInt(countAttr.n());
                }
            }
            
            dynamoDbClient.updateItem(UpdateItemRequest.builder()
                    .tableName(TABLE_NAME)
                    .key(Map.of("PK", AttributeValue.builder().s("PROMPT#" + promptId).build(),
                            "SK", AttributeValue.builder().s("METADATA").build()))
                    .updateExpression("SET like_count = :newCount")
                    .expressionAttributeValues(Map.of(":newCount", AttributeValue.builder().s(String.valueOf(currentCount + 1)).build()))
                    .build());
        } catch (Exception e) {
            System.err.println("like_count 업데이트 실패 (무시됨): " + e.getMessage());
        }
    }

    public void deleteLike(String userId, String promptId) {
        // 먼저 좋아요 기록 삭제
        try {
            dynamoDbClient.deleteItem(DeleteItemRequest.builder()
                    .tableName(TABLE_NAME)
                    .key(Map.of(
                            "PK", AttributeValue.builder().s("USER#" + userId).build(),
                            "SK", AttributeValue.builder().s("LIKE#PROMPT#" + promptId).build()
                    ))
                    .conditionExpression("attribute_exists(PK)")
                    .build());
        } catch (ConditionalCheckFailedException e) {
            throw new RuntimeException("이미 좋아요를 취소했거나 좋아요 기록이 없습니다.");
        }

        // METADATA의 like_count 감소 (문자열 타입으로 저장됨)
        try {
            GetItemResponse metadataResponse = dynamoDbClient.getItem(GetItemRequest.builder()
                    .tableName(TABLE_NAME)
                    .key(Map.of("PK", AttributeValue.builder().s("PROMPT#" + promptId).build(),
                            "SK", AttributeValue.builder().s("METADATA").build()))
                    .projectionExpression("like_count")
                    .build());
            
            int currentCount = 0;
            if (metadataResponse.hasItem() && metadataResponse.item().containsKey("like_count")) {
                AttributeValue countAttr = metadataResponse.item().get("like_count");
                if (countAttr.s() != null) {
                    currentCount = Integer.parseInt(countAttr.s());
                } else if (countAttr.n() != null) {
                    currentCount = Integer.parseInt(countAttr.n());
                }
            }
            
            int newCount = Math.max(0, currentCount - 1);
            dynamoDbClient.updateItem(UpdateItemRequest.builder()
                    .tableName(TABLE_NAME)
                    .key(Map.of("PK", AttributeValue.builder().s("PROMPT#" + promptId).build(),
                            "SK", AttributeValue.builder().s("METADATA").build()))
                    .updateExpression("SET like_count = :newCount")
                    .expressionAttributeValues(Map.of(":newCount", AttributeValue.builder().s(String.valueOf(newCount)).build()))
                    .build());
        } catch (Exception e) {
            System.err.println("like_count 감소 실패 (무시됨): " + e.getMessage());
        }
    }

    // 북마크 등록 (SK 포맷: BOOKMARK#PROMPT#{promptId})
    public void addBookmark(String userId, String promptId) {
        String now = OffsetDateTime.now(ZoneOffset.UTC).format(DateTimeFormatter.ISO_INSTANT);

        Map<String, AttributeValue> bookmarkItem = new HashMap<>();
        bookmarkItem.put("PK", AttributeValue.builder().s("USER#" + userId).build());
        bookmarkItem.put("SK", AttributeValue.builder().s("BOOKMARK#PROMPT#" + promptId).build());
        bookmarkItem.put("BOOKMARK_INDEX_PK", AttributeValue.builder().s("USER_BOOKMARKS#" + userId).build());
        bookmarkItem.put("BOOKMARK_INDEX_SK", AttributeValue.builder().s(now).build());
        bookmarkItem.put("type", AttributeValue.builder().s("BOOKMARK").build());
        bookmarkItem.put("target_prompt_id", AttributeValue.builder().s(promptId).build());
        bookmarkItem.put("created_at", AttributeValue.builder().s(now).build());

        // 먼저 북마크 아이템 추가 (중복 방지)
        try {
            dynamoDbClient.putItem(PutItemRequest.builder()
                    .tableName(TABLE_NAME)
                    .item(bookmarkItem)
                    .conditionExpression("attribute_not_exists(PK)")
                    .build());
        } catch (ConditionalCheckFailedException e) {
            throw new RuntimeException("이미 북마크한 프롬프트입니다.");
        }

        // METADATA의 bookmark_count 증가 (문자열 타입으로 저장됨)
        try {
            GetItemResponse metadataResponse = dynamoDbClient.getItem(GetItemRequest.builder()
                    .tableName(TABLE_NAME)
                    .key(Map.of("PK", AttributeValue.builder().s("PROMPT#" + promptId).build(),
                            "SK", AttributeValue.builder().s("METADATA").build()))
                    .projectionExpression("bookmark_count")
                    .build());
            
            int currentCount = 0;
            if (metadataResponse.hasItem() && metadataResponse.item().containsKey("bookmark_count")) {
                AttributeValue countAttr = metadataResponse.item().get("bookmark_count");
                if (countAttr.s() != null) {
                    currentCount = Integer.parseInt(countAttr.s());
                } else if (countAttr.n() != null) {
                    currentCount = Integer.parseInt(countAttr.n());
                }
            }
            
            dynamoDbClient.updateItem(UpdateItemRequest.builder()
                    .tableName(TABLE_NAME)
                    .key(Map.of("PK", AttributeValue.builder().s("PROMPT#" + promptId).build(),
                            "SK", AttributeValue.builder().s("METADATA").build()))
                    .updateExpression("SET bookmark_count = :newCount")
                    .expressionAttributeValues(Map.of(":newCount", AttributeValue.builder().s(String.valueOf(currentCount + 1)).build()))
                    .build());
        } catch (Exception e) {
            System.err.println("bookmark_count 업데이트 실패 (무시됨): " + e.getMessage());
        }
    }

    // 북마크 취소 (SK 포맷: BOOKMARK#PROMPT#{promptId})
    public void deleteBookmark(String userId, String promptId) {
        // 먼저 북마크 기록 삭제
        try {
            dynamoDbClient.deleteItem(DeleteItemRequest.builder()
                    .tableName(TABLE_NAME)
                    .key(Map.of(
                            "PK", AttributeValue.builder().s("USER#" + userId).build(),
                            "SK", AttributeValue.builder().s("BOOKMARK#PROMPT#" + promptId).build()
                    ))
                    .conditionExpression("attribute_exists(PK)")
                    .build());
        } catch (ConditionalCheckFailedException e) {
            throw new RuntimeException("이미 북마크를 취소했거나 북마크 기록이 없습니다.");
        }

        // METADATA의 bookmark_count 감소 (문자열 타입으로 저장됨)
        try {
            GetItemResponse metadataResponse = dynamoDbClient.getItem(GetItemRequest.builder()
                    .tableName(TABLE_NAME)
                    .key(Map.of("PK", AttributeValue.builder().s("PROMPT#" + promptId).build(),
                            "SK", AttributeValue.builder().s("METADATA").build()))
                    .projectionExpression("bookmark_count")
                    .build());
            
            int currentCount = 0;
            if (metadataResponse.hasItem() && metadataResponse.item().containsKey("bookmark_count")) {
                AttributeValue countAttr = metadataResponse.item().get("bookmark_count");
                if (countAttr.s() != null) {
                    currentCount = Integer.parseInt(countAttr.s());
                } else if (countAttr.n() != null) {
                    currentCount = Integer.parseInt(countAttr.n());
                }
            }
            
            int newCount = Math.max(0, currentCount - 1);
            dynamoDbClient.updateItem(UpdateItemRequest.builder()
                    .tableName(TABLE_NAME)
                    .key(Map.of("PK", AttributeValue.builder().s("PROMPT#" + promptId).build(),
                            "SK", AttributeValue.builder().s("METADATA").build()))
                    .updateExpression("SET bookmark_count = :newCount")
                    .expressionAttributeValues(Map.of(":newCount", AttributeValue.builder().s(String.valueOf(newCount)).build()))
                    .build());
        } catch (Exception e) {
            System.err.println("bookmark_count 감소 실패 (무시됨): " + e.getMessage());
        }
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

        // 먼저 댓글 아이템 추가
        dynamoDbClient.putItem(PutItemRequest.builder()
                .tableName(TABLE_NAME)
                .item(commentItem)
                .build());

        // METADATA의 comment_count 증가 시도 (문자열 타입으로 저장됨)
        try {
            // 현재 comment_count 값 조회
            GetItemResponse metadataResponse = dynamoDbClient.getItem(GetItemRequest.builder()
                    .tableName(TABLE_NAME)
                    .key(Map.of("PK", AttributeValue.builder().s("PROMPT#" + promptId).build(),
                            "SK", AttributeValue.builder().s("METADATA").build()))
                    .projectionExpression("comment_count")
                    .build());
            
            int currentCount = 0;
            if (metadataResponse.hasItem() && metadataResponse.item().containsKey("comment_count")) {
                AttributeValue countAttr = metadataResponse.item().get("comment_count");
                // 문자열 또는 숫자 타입 모두 처리
                if (countAttr.s() != null) {
                    currentCount = Integer.parseInt(countAttr.s());
                } else if (countAttr.n() != null) {
                    currentCount = Integer.parseInt(countAttr.n());
                }
            }
            
            // +1 한 값을 문자열로 저장
            dynamoDbClient.updateItem(UpdateItemRequest.builder()
                    .tableName(TABLE_NAME)
                    .key(Map.of("PK", AttributeValue.builder().s("PROMPT#" + promptId).build(),
                            "SK", AttributeValue.builder().s("METADATA").build()))
                    .updateExpression("SET comment_count = :newCount")
                    .expressionAttributeValues(Map.of(":newCount", AttributeValue.builder().s(String.valueOf(currentCount + 1)).build()))
                    .build());
        } catch (Exception e) {
            // METADATA 업데이트 실패는 무시 (댓글은 이미 추가됨)
            System.err.println("comment_count 업데이트 실패 (무시됨): " + e.getMessage());
        }
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

        // 2. 체크 통과 후 실제 삭제 실행
        try {
            // 먼저 댓글 삭제
            dynamoDbClient.deleteItem(DeleteItemRequest.builder()
                    .tableName(TABLE_NAME)
                    .key(Map.of("PK", AttributeValue.builder().s("PROMPT#" + promptId).build(),
                            "SK", AttributeValue.builder().s(commentSk).build()))
                    .build());
            
            // comment_count 감소 (문자열 타입으로 저장됨)
            GetItemResponse metadataResponse = dynamoDbClient.getItem(GetItemRequest.builder()
                    .tableName(TABLE_NAME)
                    .key(Map.of("PK", AttributeValue.builder().s("PROMPT#" + promptId).build(),
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
                    .key(Map.of("PK", AttributeValue.builder().s("PROMPT#" + promptId).build(),
                            "SK", AttributeValue.builder().s("METADATA").build()))
                    .updateExpression("SET comment_count = :newCount")
                    .expressionAttributeValues(Map.of(":newCount", AttributeValue.builder().s(String.valueOf(newCount)).build()))
                    .build());
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

    // 댓글 수정 시 사용 - DynamoDB에서 닉네임 조회
    public Map<String, String> getUserInfoFromToken(String accessToken) {
        String token = accessToken.startsWith("Bearer ") ? accessToken.substring(7) : accessToken;

        try {
            GetUserRequest userRequest = GetUserRequest.builder()
                    .accessToken(token)
                    .build();

            GetUserResponse userResponse = cognitoClient.getUser(userRequest);

            Map<String, String> userInfo = new HashMap<>();
            String userId = userResponse.username(); // sub (ID)
            userInfo.put("userId", userId);

            // DynamoDB에서 닉네임 조회
            String nickname = getNicknameFromDynamoDB(userId);
            userInfo.put("nickname", nickname);

            return userInfo;
        } catch (Exception e) {
            throw new RuntimeException("인증 실패: " + e.getMessage());
        }
    }

    // DynamoDB에서 사용자 닉네임 조회
    private String getNicknameFromDynamoDB(String userId) {
        try {
            GetItemResponse response = dynamoDbClient.getItem(GetItemRequest.builder()
                    .tableName(TABLE_NAME)
                    .key(Map.of(
                            "PK", AttributeValue.builder().s("USER#" + userId).build(),
                            "SK", AttributeValue.builder().s("PROFILE").build()
                    ))
                    .projectionExpression("nickname")
                    .build());

            if (response.hasItem() && response.item().containsKey("nickname")) {
                return response.item().get("nickname").s();
            }
        } catch (Exception e) {
            System.err.println("DynamoDB 닉네임 조회 실패: " + e.getMessage());
        }
        return "Unknown";
    }
}