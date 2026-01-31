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

    /**
     * 특정 사용자가 여러 프롬프트에 좋아요 했는지 일괄 확인
     * @return promptId -> isLiked 맵
     */
    public Map<String, Boolean> hasUserLikedBatch(String userId, List<String> promptIds) {
        Map<String, Boolean> likedMap = new HashMap<>();
        
        if (userId == null || userId.isEmpty() || promptIds == null || promptIds.isEmpty()) {
            return likedMap;
        }

        // 기본값 false로 초기화
        promptIds.forEach(id -> likedMap.put(id, false));

        String userPK = "USER#" + userId;

        try {
            // BatchGetItem 요청 생성 (최대 100개 제한)
            List<String> targetIds = promptIds.stream().distinct().limit(100).collect(Collectors.toList());
            
            List<Map<String, AttributeValue>> keys = targetIds.stream()
                    .map(promptId -> Map.of(
                            "PK", AttributeValue.builder().s(userPK).build(),
                            "SK", AttributeValue.builder().s("LIKE#PROMPT#" + promptId).build()
                    ))
                    .collect(Collectors.toList());

            KeysAndAttributes keysAndAttributes = KeysAndAttributes.builder()
                    .keys(keys)
                    .projectionExpression("SK")
                    .build();

            BatchGetItemResponse response = dynamoDbClient.batchGetItem(BatchGetItemRequest.builder()
                    .requestItems(Map.of(tableName, keysAndAttributes))
                    .build());

            // 결과 파싱 - 존재하는 항목만 true로 설정
            List<Map<String, AttributeValue>> items = response.responses().get(tableName);
            if (items != null) {
                for (Map<String, AttributeValue> item : items) {
                    String sk = item.get("SK").s();
                    String promptId = sk.replace("LIKE#PROMPT#", "");
                    likedMap.put(promptId, true);
                }
            }
        } catch (Exception e) {
            log.error("좋아요 일괄 확인 실패: {}", e.getMessage());
        }

        return likedMap;
    }

    /**
     * 특정 사용자가 여러 프롬프트를 북마크 했는지 일괄 확인
     * @return promptId -> isBookmarked 맵
     */
    public Map<String, Boolean> hasUserBookmarkedBatch(String userId, List<String> promptIds) {
        Map<String, Boolean> bookmarkedMap = new HashMap<>();
        
        if (userId == null || userId.isEmpty() || promptIds == null || promptIds.isEmpty()) {
            return bookmarkedMap;
        }

        // 기본값 false로 초기화
        promptIds.forEach(id -> bookmarkedMap.put(id, false));

        String userPK = "USER#" + userId;

        try {
            // BatchGetItem 요청 생성 (최대 100개 제한)
            List<String> targetIds = promptIds.stream().distinct().limit(100).collect(Collectors.toList());
            
            List<Map<String, AttributeValue>> keys = targetIds.stream()
                    .map(promptId -> Map.of(
                            "PK", AttributeValue.builder().s(userPK).build(),
                            "SK", AttributeValue.builder().s("BOOKMARK#PROMPT#" + promptId).build()
                    ))
                    .collect(Collectors.toList());

            KeysAndAttributes keysAndAttributes = KeysAndAttributes.builder()
                    .keys(keys)
                    .projectionExpression("SK")
                    .build();

            BatchGetItemResponse response = dynamoDbClient.batchGetItem(BatchGetItemRequest.builder()
                    .requestItems(Map.of(tableName, keysAndAttributes))
                    .build());

            // 결과 파싱 - 존재하는 항목만 true로 설정
            List<Map<String, AttributeValue>> items = response.responses().get(tableName);
            if (items != null) {
                for (Map<String, AttributeValue> item : items) {
                    String sk = item.get("SK").s();
                    String promptId = sk.replace("BOOKMARK#PROMPT#", "");
                    bookmarkedMap.put(promptId, true);
                }
            }
        } catch (Exception e) {
            log.error("북마크 일괄 확인 실패: {}", e.getMessage());
        }

        return bookmarkedMap;
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

    /**
     * 프롬프트 예시 입출력(examples) 조회
     * DynamoDB 구조: examples[].input.content (JSON string), examples[].output (string)
     */
    public List<Map<String, Object>> getPromptExamples(String promptId) {
        String promptPK = "PROMPT#" + promptId;
        List<Map<String, Object>> examples = new ArrayList<>();

        try {
            GetItemResponse response = dynamoDbClient.getItem(GetItemRequest.builder()
                    .tableName(tableName)
                    .key(Map.of(
                            "PK", AttributeValue.builder().s(promptPK).build(),
                            "SK", AttributeValue.builder().s("METADATA").build()
                    ))
                    .projectionExpression("examples")
                    .build());

            if (response.hasItem() && response.item().containsKey("examples")) {
                AttributeValue examplesAttr = response.item().get("examples");
                if (examplesAttr.l() != null) {
                    for (AttributeValue exampleAttr : examplesAttr.l()) {
                        if (exampleAttr.m() != null) {
                            Map<String, Object> example = new HashMap<>();
                            Map<String, AttributeValue> exampleMap = exampleAttr.m();
                            
                            // index 추출
                            if (exampleMap.containsKey("index") && exampleMap.get("index").n() != null) {
                                example.put("index", Integer.parseInt(exampleMap.get("index").n()));
                            }
                            
                            // input 추출 (중첩 구조: input.content, input.input_type)
                            if (exampleMap.containsKey("input") && exampleMap.get("input").m() != null) {
                                Map<String, AttributeValue> inputMap = exampleMap.get("input").m();
                                Map<String, Object> inputObj = new HashMap<>();
                                
                                if (inputMap.containsKey("content") && inputMap.get("content").s() != null) {
                                    inputObj.put("content", inputMap.get("content").s());
                                }
                                if (inputMap.containsKey("input_type") && inputMap.get("input_type").s() != null) {
                                    inputObj.put("inputType", inputMap.get("input_type").s());
                                }
                                
                                if (!inputObj.isEmpty()) {
                                    example.put("input", inputObj);
                                }
                            }
                            
                            // output 추출
                            if (exampleMap.containsKey("output") && exampleMap.get("output").s() != null) {
                                example.put("output", exampleMap.get("output").s());
                            }
                            
                            if (!example.isEmpty()) {
                                examples.add(example);
                            }
                        }
                    }
                }
            }
        } catch (Exception e) {
            log.error("프롬프트 예시 조회 실패: {}", e.getMessage());
        }

        return examples;
    }

    /**
     * 사용자 닉네임 조회 (userId로)
     */
    public String getUserNickname(String userId) {
        if (userId == null || userId.isEmpty()) {
            return null;
        }
        
        // userId가 "USER#" 접두사 없이 들어올 수 있으므로 정규화
        String userPK = userId.startsWith("USER#") ? userId : "USER#" + userId;

        try {
            GetItemResponse response = dynamoDbClient.getItem(GetItemRequest.builder()
                    .tableName(tableName)
                    .key(Map.of(
                            "PK", AttributeValue.builder().s(userPK).build(),
                            "SK", AttributeValue.builder().s("METADATA").build()
                    ))
                    .projectionExpression("nickname")
                    .build());

            if (response.hasItem()) {
                return getStringValue(response.item(), "nickname");
            }
        } catch (Exception e) {
            log.error("사용자 닉네임 조회 실패: {}", e.getMessage());
        }

        return null;
    }

    /**
     * 여러 사용자의 닉네임 일괄 조회 (N+1 문제 방지)
     */
    public Map<String, String> getUserNicknamesBatch(List<String> userIds) {
        Map<String, String> nicknameMap = new HashMap<>();

        if (userIds == null || userIds.isEmpty()) {
            return nicknameMap;
        }

        // 중복 제거 및 정규화
        List<String> uniqueUserIds = userIds.stream()
                .filter(id -> id != null && !id.isEmpty())
                .map(id -> id.startsWith("USER#") ? id : "USER#" + id)
                .distinct()
                .collect(Collectors.toList());

        if (uniqueUserIds.isEmpty()) {
            return nicknameMap;
        }

        try {
            // BatchGetItem 요청 생성
            List<Map<String, AttributeValue>> keys = uniqueUserIds.stream()
                    .map(id -> Map.of(
                            "PK", AttributeValue.builder().s(id).build(),
                            "SK", AttributeValue.builder().s("METADATA").build()
                    ))
                    .collect(Collectors.toList());

            KeysAndAttributes keysAndAttributes = KeysAndAttributes.builder()
                    .keys(keys)
                    .projectionExpression("PK, nickname")
                    .build();

            BatchGetItemResponse response = dynamoDbClient.batchGetItem(BatchGetItemRequest.builder()
                    .requestItems(Map.of(tableName, keysAndAttributes))
                    .build());

            // 결과 파싱
            List<Map<String, AttributeValue>> items = response.responses().get(tableName);
            if (items != null) {
                for (Map<String, AttributeValue> item : items) {
                    String pk = item.get("PK").s();
                    String nickname = getStringValue(item, "nickname");
                    nicknameMap.put(pk, nickname);
                    // USER# 없는 버전도 저장 (편의성)
                    nicknameMap.put(pk.replace("USER#", ""), nickname);
                }
            }
        } catch (Exception e) {
            log.error("사용자 닉네임 일괄 조회 실패: {}", e.getMessage());
        }

        return nicknameMap;
    }
}
