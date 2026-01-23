package fromprom.search.Service;

import fromprom.search.DTO.Comment;
import fromprom.search.DTO.PromptStats;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.*;

import java.util.*;
import java.util.stream.Collectors;

/**
 * DynamoDB에서 좋아요, 북마크, 댓글 데이터를 조회하는 서비스
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class InteractionService {

    private final DynamoDbClient dynamoDbClient;

    @Value("${aws.dynamodb.table.name:FromProm_Table}")
    private String tableName;

    /**
     * 프롬프트 통계 조회 (좋아요/북마크/댓글 + 기본 정보)
     */
    public PromptStats getPromptStats(String promptId) {
        String promptPK = "PROMPT#" + promptId;

        try {
            GetItemResponse response = dynamoDbClient.getItem(GetItemRequest.builder()
                    .tableName(tableName)
                    .key(Map.of(
                            "PK", AttributeValue.builder().s(promptPK).build(),
                            "SK", AttributeValue.builder().s("METADATA").build()
                    ))
                    .projectionExpression("like_count, bookmark_count, comment_count, title, prompt_description, model, prompt_content, create_user")
                    .build());

            if (response.hasItem()) {
                Map<String, AttributeValue> item = response.item();
                return PromptStats.builder()
                        .promptId(promptId)
                        .likeCount(getNumberValue(item, "like_count"))
                        .bookmarkCount(getNumberValue(item, "bookmark_count"))
                        .commentCount(getNumberValue(item, "comment_count"))
                        .title(getStringValue(item, "title"))
                        .description(getStringValue(item, "prompt_description"))
                        .model(getStringValue(item, "model"))
                        .content(getStringValue(item, "prompt_content"))
                        .createUser(getStringValue(item, "create_user"))
                        .build();
            }
        } catch (Exception e) {
            log.error("프롬프트 통계 조회 실패: {}", e.getMessage());
        }

        return PromptStats.builder()
                .promptId(promptId)
                .likeCount(0)
                .bookmarkCount(0)
                .commentCount(0)
                .build();
    }

    /**
     * 여러 프롬프트의 통계 일괄 조회
     */
    public Map<String, PromptStats> getPromptStatsBatch(List<String> promptIds) {
        Map<String, PromptStats> statsMap = new HashMap<>();

        if (promptIds == null || promptIds.isEmpty()) {
            return statsMap;
        }

        try {
            // BatchGetItem 요청 생성
            List<Map<String, AttributeValue>> keys = promptIds.stream()
                    .map(id -> Map.of(
                            "PK", AttributeValue.builder().s("PROMPT#" + id).build(),
                            "SK", AttributeValue.builder().s("METADATA").build()
                    ))
                    .collect(Collectors.toList());

            KeysAndAttributes keysAndAttributes = KeysAndAttributes.builder()
                    .keys(keys)
                    .projectionExpression("PK, like_count, bookmark_count, comment_count, title, prompt_description, model, prompt_content, create_user")
                    .build();

            BatchGetItemResponse response = dynamoDbClient.batchGetItem(BatchGetItemRequest.builder()
                    .requestItems(Map.of(tableName, keysAndAttributes))
                    .build());

            // 결과 파싱
            List<Map<String, AttributeValue>> items = response.responses().get(tableName);
            if (items != null) {
                for (Map<String, AttributeValue> item : items) {
                    String pk = item.get("PK").s();
                    String promptId = pk.replace("PROMPT#", "");
                    
                    statsMap.put(promptId, PromptStats.builder()
                            .promptId(promptId)
                            .likeCount(getNumberValue(item, "like_count"))
                            .bookmarkCount(getNumberValue(item, "bookmark_count"))
                            .commentCount(getNumberValue(item, "comment_count"))
                            .title(getStringValue(item, "title"))
                            .description(getStringValue(item, "prompt_description"))
                            .model(getStringValue(item, "model"))
                            .content(getStringValue(item, "prompt_content"))
                            .createUser(getStringValue(item, "create_user"))
                            .build());
                }
            }
        } catch (Exception e) {
            log.error("프롬프트 통계 일괄 조회 실패: {}", e.getMessage());
        }

        // 조회되지 않은 프롬프트는 기본값으로 채움
        for (String promptId : promptIds) {
            statsMap.putIfAbsent(promptId, PromptStats.builder()
                    .promptId(promptId)
                    .likeCount(0)
                    .bookmarkCount(0)
                    .commentCount(0)
                    .build());
        }

        return statsMap;
    }

    /**
     * 프롬프트 댓글 목록 조회
     */
    public List<Comment> getComments(String promptId) {
        String promptPK = "PROMPT#" + promptId;
        List<Comment> comments = new ArrayList<>();

        try {
            QueryResponse response = dynamoDbClient.query(QueryRequest.builder()
                    .tableName(tableName)
                    .keyConditionExpression("PK = :pk AND begins_with(SK, :skPrefix)")
                    .expressionAttributeValues(Map.of(
                            ":pk", AttributeValue.builder().s(promptPK).build(),
                            ":skPrefix", AttributeValue.builder().s("COMMENT#").build()
                    ))
                    .build());

            comments = response.items().stream()
                    .map(this::convertToComment)
                    .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
                    .collect(Collectors.toList());

        } catch (Exception e) {
            log.error("댓글 조회 실패: {}", e.getMessage());
        }

        return comments;
    }

    /**
     * 사용자가 좋아요한 프롬프트 ID 목록 조회
     */
    public List<String> getUserLikedPrompts(String userId) {
        String userPK = "USER#" + userId;
        List<String> likedPromptIds = new ArrayList<>();

        try {
            QueryResponse response = dynamoDbClient.query(QueryRequest.builder()
                    .tableName(tableName)
                    .keyConditionExpression("PK = :pk AND begins_with(SK, :skPrefix)")
                    .expressionAttributeValues(Map.of(
                            ":pk", AttributeValue.builder().s(userPK).build(),
                            ":skPrefix", AttributeValue.builder().s("LIKE#PROMPT#").build()
                    ))
                    .build());

            likedPromptIds = response.items().stream()
                    .map(item -> item.get("SK").s().replace("LIKE#PROMPT#", ""))
                    .collect(Collectors.toList());

        } catch (Exception e) {
            log.error("좋아요 목록 조회 실패: {}", e.getMessage());
        }

        return likedPromptIds;
    }

    /**
     * 사용자가 북마크한 프롬프트 ID 목록 조회
     */
    public List<String> getUserBookmarkedPrompts(String userId) {
        String userPK = "USER#" + userId;
        List<String> bookmarkedPromptIds = new ArrayList<>();

        try {
            QueryResponse response = dynamoDbClient.query(QueryRequest.builder()
                    .tableName(tableName)
                    .keyConditionExpression("PK = :pk AND begins_with(SK, :skPrefix)")
                    .expressionAttributeValues(Map.of(
                            ":pk", AttributeValue.builder().s(userPK).build(),
                            ":skPrefix", AttributeValue.builder().s("BOOKMARK#PROMPT#").build()
                    ))
                    .build());

            bookmarkedPromptIds = response.items().stream()
                    .map(item -> item.get("SK").s().replace("BOOKMARK#PROMPT#", ""))
                    .collect(Collectors.toList());

        } catch (Exception e) {
            log.error("북마크 목록 조회 실패: {}", e.getMessage());
        }

        return bookmarkedPromptIds;
    }

    /**
     * 특정 사용자가 특정 프롬프트에 좋아요 했는지 확인
     */
    public boolean hasUserLiked(String userId, String promptId) {
        String userPK = "USER#" + userId;
        String likeSK = "LIKE#PROMPT#" + promptId;

        try {
            GetItemResponse response = dynamoDbClient.getItem(GetItemRequest.builder()
                    .tableName(tableName)
                    .key(Map.of(
                            "PK", AttributeValue.builder().s(userPK).build(),
                            "SK", AttributeValue.builder().s(likeSK).build()
                    ))
                    .build());

            return response.hasItem();
        } catch (Exception e) {
            log.error("좋아요 확인 실패: {}", e.getMessage());
        }

        return false;
    }

    /**
     * 특정 사용자가 특정 프롬프트를 북마크 했는지 확인
     */
    public boolean hasUserBookmarked(String userId, String promptId) {
        String userPK = "USER#" + userId;
        String bookmarkSK = "BOOKMARK#PROMPT#" + promptId;

        try {
            GetItemResponse response = dynamoDbClient.getItem(GetItemRequest.builder()
                    .tableName(tableName)
                    .key(Map.of(
                            "PK", AttributeValue.builder().s(userPK).build(),
                            "SK", AttributeValue.builder().s(bookmarkSK).build()
                    ))
                    .build());

            return response.hasItem();
        } catch (Exception e) {
            log.error("북마크 확인 실패: {}", e.getMessage());
        }

        return false;
    }

    private Comment convertToComment(Map<String, AttributeValue> item) {
        return Comment.builder()
                .commentId(item.get("SK").s())
                .content(getStringValue(item, "comment_content"))
                .userId(getStringValue(item, "comment_user"))
                .nickname(getStringValue(item, "comment_user_nickname"))
                .createdAt(getStringValue(item, "created_at"))
                .updatedAt(getStringValue(item, "updated_at"))
                .build();
    }

    private String getStringValue(Map<String, AttributeValue> item, String key) {
        return item.containsKey(key) && item.get(key).s() != null ? item.get(key).s() : "";
    }

    private int getNumberValue(Map<String, AttributeValue> item, String key) {
        if (item.containsKey(key) && item.get(key).n() != null) {
            try {
                return Integer.parseInt(item.get(key).n());
            } catch (NumberFormatException e) {
                return 0;
            }
        }
        return 0;
    }
}
