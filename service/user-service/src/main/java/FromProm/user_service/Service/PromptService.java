package FromProm.user_service.Service;

import FromProm.user_service.DTO.PromptSaveRequest;
import FromProm.user_service.DTO.PromptType;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.*;
import software.amazon.awssdk.services.sns.SnsClient;
import software.amazon.awssdk.services.sns.model.PublishRequest;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PromptService {

    private final SnsClient snsClient;
    private final ObjectMapper objectMapper;
    private final DynamoDbClient dynamoDbClient;
    private final String SNS_TOPIC_ARN = "arn:aws:sns:ap-northeast-2:261595668962:testest";
    private final String TABLE_NAME = "FromProm_Table";

    public String createInitialPrompt(String userId, PromptSaveRequest dto) {
        String promptUuid = UUID.randomUUID().toString();
        String now = OffsetDateTime.now(ZoneOffset.UTC).format(DateTimeFormatter.ISO_INSTANT);

        Map<String, Object> fullPayload = new LinkedHashMap<>();

        // 1. 기본 정보 및 인덱스 설정
        fullPayload.put("PK", "PROMPT#" + promptUuid);
        fullPayload.put("SK", "METADATA");
        fullPayload.put("PROMPT_INDEX_PK", "USER_PROMPT_LIST");
        fullPayload.put("PROMPT_INDEX_SK", "USER#" + userId + "#" + now);
        fullPayload.put("type", "PROMPT");
        fullPayload.put("create_user", "USER#" + userId);
        fullPayload.put("title", dto.getTitle());
        fullPayload.put("content", dto.getContent());
        fullPayload.put("prompt_description", dto.getDescription());
        fullPayload.put("price", dto.getPrice());
        fullPayload.put("prompt_type", dto.getPromptType().name());

        // 2. 3가지 예시 시나리오 구조화
        List<Map<String, Object>> structuredExamples = new ArrayList<>();
        if (dto.getExamples() != null) {
            for (int i = 0; i < dto.getExamples().size(); i++) {
                PromptSaveRequest.ExampleSet exampleSet = dto.getExamples().get(i);

                // 헬퍼 메서드를 사용하여 JSON 문자열로 변환
                String jsonInputStr = serializeInputs(exampleSet.getInputValues());

                Map<String, Object> exMap = new LinkedHashMap<>();
                exMap.put("index", i);
                exMap.put("input", Map.of(
                        "content", jsonInputStr,
                        "input_type", "text"
                ));
                exMap.put("output", ""); // 요구사항: 출력값은 빈칸으로 고정
                structuredExamples.add(exMap);
            }
        }

        fullPayload.put("examples", structuredExamples);
        fullPayload.put("examples_s3_url", "");
        fullPayload.put("model", dto.getModel());

        // 3. 성능 지표 및 상태 초기화
        fullPayload.put("evaluation_metrics", createEmptyMetrics());
        fullPayload.put("status", "processing");
        fullPayload.put("created_at", now);
        fullPayload.put("updated_at", "");
        fullPayload.put("like_count", "0");
        fullPayload.put("comment_count", "0");
        fullPayload.put("bookmark_count", "0");
        fullPayload.put("is_public", false);

        sendSnsNotification(fullPayload);

        return promptUuid;
    }

    /**
     * 사용자가 등록한 프롬프트 목록 조회
     */
    public List<Map<String, Object>> getMyPrompts(String userId) {
        String userPK = "USER#" + userId;
        
        // create_user가 userPK인 모든 프롬프트 조회
        ScanRequest scanRequest = ScanRequest.builder()
                .tableName(TABLE_NAME)
                .filterExpression("create_user = :userId AND SK = :metadata")
                .expressionAttributeValues(Map.of(
                        ":userId", AttributeValue.builder().s(userPK).build(),
                        ":metadata", AttributeValue.builder().s("METADATA").build()
                ))
                .build();

        ScanResponse response = dynamoDbClient.scan(scanRequest);
        
        return response.items().stream()
                .map(this::convertToPromptSummary)
                .sorted((a, b) -> ((String) b.get("created_at")).compareTo((String) a.get("created_at"))) // 최신순
                .collect(Collectors.toList());
    }

    /**
     * 프롬프트 상세 정보 조회
     */
    public Map<String, Object> getPromptDetail(String promptId) {
        String promptPK = "PROMPT#" + promptId;
        
        // 프롬프트 메타데이터 조회
        GetItemResponse getResponse = dynamoDbClient.getItem(GetItemRequest.builder()
                .tableName(TABLE_NAME)
                .key(Map.of(
                        "PK", AttributeValue.builder().s(promptPK).build(),
                        "SK", AttributeValue.builder().s("METADATA").build()
                ))
                .build());
        
        if (!getResponse.hasItem()) {
            throw new RuntimeException("프롬프트를 찾을 수 없습니다.");
        }
        
        return convertToPromptDetail(getResponse.item());
    }

    /**
     * 프롬프트 Hard Delete
     */
    public void deletePrompt(String userId, String promptId) {
        String promptPK = "PROMPT#" + promptId;
        String userPK = "USER#" + userId;
        
        // 1. 프롬프트 존재 여부 및 본인 확인
        GetItemResponse getResponse = dynamoDbClient.getItem(GetItemRequest.builder()
                .tableName(TABLE_NAME)
                .key(Map.of(
                        "PK", AttributeValue.builder().s(promptPK).build(),
                        "SK", AttributeValue.builder().s("METADATA").build()
                ))
                .build());
        
        if (!getResponse.hasItem()) {
            throw new RuntimeException("프롬프트를 찾을 수 없습니다.");
        }
        
        // 본인 확인
        String createUser = getResponse.item().get("create_user").s();
        if (!createUser.equals(userPK)) {
            throw new RuntimeException("본인이 등록한 프롬프트만 삭제할 수 있습니다.");
        }
        
        // 2. 프롬프트 파티션의 모든 아이템 삭제 (METADATA, COMMENT# 등)
        deleteAllItemsByPK(promptPK);
        
        // 3. 이 프롬프트에 대한 모든 좋아요/북마크 삭제
        deletePromptInteractions(promptId);
    }

    /**
     * DynamoDB 아이템을 프롬프트 요약 정보로 변환
     */
    private Map<String, Object> convertToPromptSummary(Map<String, AttributeValue> item) {
        Map<String, Object> summary = new LinkedHashMap<>();
        
        String pk = item.get("PK").s();
        summary.put("promptId", pk.replace("PROMPT#", ""));
        summary.put("title", getStringValue(item, "title"));
        summary.put("description", getStringValue(item, "prompt_description"));
        summary.put("price", getNumberValue(item, "price"));
        summary.put("promptType", getStringValue(item, "prompt_type"));
        summary.put("model", getStringValue(item, "model"));
        summary.put("status", getStringValue(item, "status"));
        summary.put("likeCount", getNumberValue(item, "like_count"));
        summary.put("commentCount", getNumberValue(item, "comment_count"));
        summary.put("bookmarkCount", getNumberValue(item, "bookmark_count"));
        summary.put("isPublic", getBooleanValue(item, "is_public"));
        summary.put("created_at", getStringValue(item, "created_at"));
        
        return summary;
    }

    /**
     * DynamoDB 아이템을 프롬프트 상세 정보로 변환
     */
    private Map<String, Object> convertToPromptDetail(Map<String, AttributeValue> item) {
        Map<String, Object> detail = new LinkedHashMap<>();
        
        String pk = item.get("PK").s();
        detail.put("promptId", pk.replace("PROMPT#", ""));
        detail.put("title", getStringValue(item, "title"));
        detail.put("content", getStringValue(item, "content"));
        detail.put("description", getStringValue(item, "prompt_description"));
        detail.put("price", getNumberValue(item, "price"));
        detail.put("promptType", getStringValue(item, "prompt_type"));
        detail.put("model", getStringValue(item, "model"));
        detail.put("status", getStringValue(item, "status"));
        detail.put("createUser", getStringValue(item, "create_user"));
        detail.put("likeCount", getNumberValue(item, "like_count"));
        detail.put("commentCount", getNumberValue(item, "comment_count"));
        detail.put("bookmarkCount", getNumberValue(item, "bookmark_count"));
        detail.put("isPublic", getBooleanValue(item, "is_public"));
        detail.put("created_at", getStringValue(item, "created_at"));
        detail.put("updated_at", getStringValue(item, "updated_at"));
        
        // examples 처리
        if (item.containsKey("examples") && item.get("examples").l() != null) {
            detail.put("examples", item.get("examples").l().stream()
                    .map(this::convertExample)
                    .collect(Collectors.toList()));
        }
        
        // evaluation_metrics 처리
        if (item.containsKey("evaluation_metrics") && item.get("evaluation_metrics").m() != null) {
            Map<String, String> metrics = new LinkedHashMap<>();
            item.get("evaluation_metrics").m().forEach((k, v) -> metrics.put(k, v.s() != null ? v.s() : ""));
            detail.put("evaluationMetrics", metrics);
        }
        
        return detail;
    }

    /**
     * 프롬프트의 좋아요/북마크 개수 조회
     */
    public Map<String, Object> getPromptStats(String promptId) {
        String promptPK = "PROMPT#" + promptId;
        
        GetItemResponse getResponse = dynamoDbClient.getItem(GetItemRequest.builder()
                .tableName(TABLE_NAME)
                .key(Map.of(
                        "PK", AttributeValue.builder().s(promptPK).build(),
                        "SK", AttributeValue.builder().s("METADATA").build()
                ))
                .build());
        
        if (!getResponse.hasItem()) {
            throw new RuntimeException("프롬프트를 찾을 수 없습니다.");
        }
        
        Map<String, AttributeValue> item = getResponse.item();
        
        return Map.of(
            "promptId", promptId,
            "likeCount", getNumberValue(item, "like_count"),
            "bookmarkCount", getNumberValue(item, "bookmark_count"),
            "commentCount", getNumberValue(item, "comment_count")
        );
    }

    /**
     * 프롬프트에 달린 댓글 목록 조회
     */
    public List<Map<String, Object>> getPromptComments(String promptId) {
        String promptPK = "PROMPT#" + promptId;
        
        // SK가 COMMENT#로 시작하는 모든 아이템 조회
        QueryRequest queryRequest = QueryRequest.builder()
                .tableName(TABLE_NAME)
                .keyConditionExpression("PK = :pk AND begins_with(SK, :skPrefix)")
                .expressionAttributeValues(Map.of(
                        ":pk", AttributeValue.builder().s(promptPK).build(),
                        ":skPrefix", AttributeValue.builder().s("COMMENT#").build()
                ))
                .build();

        QueryResponse response = dynamoDbClient.query(queryRequest);
        
        return response.items().stream()
                .map(this::convertToComment)
                .sorted((a, b) -> ((String) b.get("createdAt")).compareTo((String) a.get("createdAt"))) // 최신순
                .collect(Collectors.toList());
    }

    /**
     * DynamoDB 아이템을 댓글 정보로 변환
     */
    private Map<String, Object> convertToComment(Map<String, AttributeValue> item) {
        Map<String, Object> comment = new LinkedHashMap<>();
        
        comment.put("commentId", item.get("SK").s());
        comment.put("content", getStringValue(item, "comment_content"));
        comment.put("userId", getStringValue(item, "comment_user"));
        comment.put("nickname", getStringValue(item, "comment_user_nickname"));
        comment.put("createdAt", getStringValue(item, "created_at"));
        comment.put("updatedAt", getStringValue(item, "updated_at"));
        
        return comment;
    }

    /**
     * 프롬프트 상세 + 댓글 + 통계 통합 조회
     */
    public Map<String, Object> getPromptDetailWithComments(String promptId) {
        Map<String, Object> result = new LinkedHashMap<>();
        
        // 프롬프트 상세 정보
        Map<String, Object> detail = getPromptDetail(promptId);
        result.put("prompt", detail);
        
        // 댓글 목록
        List<Map<String, Object>> comments = getPromptComments(promptId);
        result.put("comments", comments);
        result.put("commentCount", comments.size());
        
        return result;
    }

    /**
     * DB에 저장된 모든 프롬프트 조회 (테스트용)
     */
    public List<Map<String, Object>> getAllPrompts(int limit) {
        // DynamoDB scan은 limit이 스캔할 아이템 수를 제한하므로,
        // 필터링 후 원하는 개수를 얻으려면 페이지네이션 필요
        List<Map<String, Object>> results = new ArrayList<>();
        Map<String, AttributeValue> lastEvaluatedKey = null;
        
        do {
            ScanRequest.Builder scanBuilder = ScanRequest.builder()
                    .tableName(TABLE_NAME)
                    .filterExpression("SK = :metadata AND #type = :promptType")
                    .expressionAttributeNames(Map.of("#type", "type"))
                    .expressionAttributeValues(Map.of(
                            ":metadata", AttributeValue.builder().s("METADATA").build(),
                            ":promptType", AttributeValue.builder().s("PROMPT").build()
                    ));
            
            if (lastEvaluatedKey != null) {
                scanBuilder.exclusiveStartKey(lastEvaluatedKey);
            }
            
            ScanResponse response = dynamoDbClient.scan(scanBuilder.build());
            
            for (Map<String, AttributeValue> item : response.items()) {
                if (results.size() >= limit) break;
                results.add(convertToPromptSummary(item));
            }
            
            lastEvaluatedKey = response.lastEvaluatedKey();
        } while (lastEvaluatedKey != null && !lastEvaluatedKey.isEmpty() && results.size() < limit);
        
        return results;
    }

    private Map<String, Object> convertExample(AttributeValue exampleAttr) {
        Map<String, Object> example = new LinkedHashMap<>();
        if (exampleAttr.m() != null) {
            Map<String, AttributeValue> exMap = exampleAttr.m();
            example.put("index", exMap.containsKey("index") ? Integer.parseInt(exMap.get("index").n()) : 0);
            if (exMap.containsKey("input") && exMap.get("input").m() != null) {
                example.put("input", Map.of(
                        "content", getStringValue(exMap.get("input").m(), "content"),
                        "input_type", getStringValue(exMap.get("input").m(), "input_type")
                ));
            }
            example.put("output", exMap.containsKey("output") ? exMap.get("output").s() : "");
        }
        return example;
    }

    private String getStringValue(Map<String, AttributeValue> item, String key) {
        return item.containsKey(key) && item.get(key).s() != null ? item.get(key).s() : "";
    }

    private int getNumberValue(Map<String, AttributeValue> item, String key) {
        if (item.containsKey(key)) {
            if (item.get(key).n() != null) {
                return Integer.parseInt(item.get(key).n());
            } else if (item.get(key).s() != null) {
                try {
                    return Integer.parseInt(item.get(key).s());
                } catch (NumberFormatException e) {
                    return 0;
                }
            }
        }
        return 0;
    }

    private boolean getBooleanValue(Map<String, AttributeValue> item, String key) {
        return item.containsKey(key) && item.get(key).bool() != null && item.get(key).bool();
    }

    /**
     * 특정 PK의 모든 아이템 삭제
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
            
            dynamoDbClient.deleteItem(DeleteItemRequest.builder()
                    .tableName(TABLE_NAME)
                    .key(Map.of(
                            "PK", AttributeValue.builder().s(pk).build(),
                            "SK", AttributeValue.builder().s(sk).build()
                    ))
                    .build());
        }
    }

    /**
     * 특정 프롬프트에 대한 모든 좋아요/북마크 삭제
     */
    private void deletePromptInteractions(String promptId) {
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

    // 인풋 리스트를 JSON 문자열로 변환하는 헬퍼 메서드
    private String serializeInputs(List<PromptSaveRequest.InputDetail> inputs) {
        try {
            Map<String, String> inputMap = new HashMap<>();
            if (inputs != null) {
                for (PromptSaveRequest.InputDetail detail : inputs) {
                    inputMap.put(detail.getKey(), detail.getValue());
                }
            }
            return objectMapper.writeValueAsString(inputMap);
        } catch (Exception e) {
            return "{}";
        }
    }

    private Map<String, String> createEmptyMetrics() {
        Map<String, String> metrics = new LinkedHashMap<>();
        String[] fields = {"token_usage", "information_density", "consistency", "model_variance", "hallucination", "relevance", "final_score", "feedback"};
        for (String field : fields) {
            metrics.put(field, "");
        }
        return metrics;
    }

    private void sendSnsNotification(Map<String, Object> payload) {
        try {
            String jsonMessage = objectMapper.writeValueAsString(payload);
            snsClient.publish(PublishRequest.builder()
                    .topicArn(SNS_TOPIC_ARN)
                    .message(jsonMessage)
                    .build());
            System.out.println("[SNS 전송 완료] PK: " + payload.get("PK"));
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    /**
     * 테스트용 프롬프트 등록 (SNS 발송 테스트)
     */
    public String createTestPrompt(String userId, String title, String content, String description, int price, String model) {
        String promptUuid = UUID.randomUUID().toString();
        String now = OffsetDateTime.now(ZoneOffset.UTC).format(DateTimeFormatter.ISO_INSTANT);

        Map<String, Object> fullPayload = new LinkedHashMap<>();

        fullPayload.put("PK", "PROMPT#" + promptUuid);
        fullPayload.put("SK", "METADATA");
        fullPayload.put("PROMPT_INDEX_PK", "USER_PROMPT_LIST");
        fullPayload.put("PROMPT_INDEX_SK", "USER#" + userId + "#" + now);
        fullPayload.put("type", "PROMPT");
        fullPayload.put("create_user", "USER#" + userId);
        fullPayload.put("title", title);
        fullPayload.put("content", content);
        fullPayload.put("prompt_description", description);
        fullPayload.put("price", price);
        fullPayload.put("prompt_type", "type_a");
        fullPayload.put("examples", new ArrayList<>());
        fullPayload.put("examples_s3_url", "");
        fullPayload.put("model", model);
        fullPayload.put("evaluation_metrics", createEmptyMetrics());
        fullPayload.put("status", "processing");
        fullPayload.put("created_at", now);
        fullPayload.put("updated_at", "");
        fullPayload.put("like_count", "0");
        fullPayload.put("comment_count", "0");
        fullPayload.put("bookmark_count", "0");
        fullPayload.put("is_public", false);

        sendSnsNotification(fullPayload);

        return promptUuid;
    }
}