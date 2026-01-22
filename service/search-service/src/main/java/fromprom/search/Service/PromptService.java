package fromprom.search.Service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.*;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PromptService {

    private final DynamoDbClient dynamoDbClient;
    
    @Value("${aws.dynamodb.table.name:FromProm_Table}")
    private String TABLE_NAME;

    /**
     * 프롬프트 상세 정보 조회 123
     */
    public Map<String, Object> getPromptDetail(String promptId) {
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
        
        return convertToPromptDetail(getResponse.item());
    }

    /**
     * 프롬프트의 좋아요/북마크/댓글 개수 조회
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
                .sorted((a, b) -> ((String) b.get("createdAt")).compareTo((String) a.get("createdAt")))
                .collect(Collectors.toList());
    }

    /**
     * 프롬프트 상세 + 댓글 + 통계 통합 조회
     */
    public Map<String, Object> getPromptDetailWithComments(String promptId) {
        Map<String, Object> result = new LinkedHashMap<>();
        
        Map<String, Object> detail = getPromptDetail(promptId);
        result.put("prompt", detail);
        
        List<Map<String, Object>> comments = getPromptComments(promptId);
        result.put("comments", comments);
        result.put("commentCount", comments.size());
        
        return result;
    }

    /**
     * 모든 프롬프트 목록 조회 (마켓플레이스용)
     */
    public List<Map<String, Object>> getAllPrompts(int limit) {
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
        summary.put("createUser", getStringValue(item, "create_user"));
        summary.put("likeCount", getNumberValue(item, "like_count"));
        summary.put("commentCount", getNumberValue(item, "comment_count"));
        summary.put("bookmarkCount", getNumberValue(item, "bookmark_count"));
        summary.put("isPublic", getBooleanValue(item, "is_public"));
        summary.put("created_at", getStringValue(item, "created_at"));
        
        return summary;
    }

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
        
        if (item.containsKey("examples") && item.get("examples").l() != null) {
            detail.put("examples", item.get("examples").l().stream()
                    .map(this::convertExample)
                    .collect(Collectors.toList()));
        }
        
        if (item.containsKey("evaluation_metrics") && item.get("evaluation_metrics").m() != null) {
            detail.put("evaluationMetrics", convertEvaluationMetrics(item.get("evaluation_metrics").m()));
        }
        
        return detail;
    }

    /**
     * evaluation_metrics 중첩 구조 파싱
     */
    private Map<String, Object> convertEvaluationMetrics(Map<String, AttributeValue> metricsMap) {
        Map<String, Object> result = new LinkedHashMap<>();
        
        // 최상위 레벨 지표들
        result.put("consistency", getStringFromAttr(metricsMap.get("consistency")));
        result.put("hallucination", getStringFromAttr(metricsMap.get("hallucination")));
        result.put("information_density", getStringFromAttr(metricsMap.get("information_density")));
        result.put("model_variance", getStringFromAttr(metricsMap.get("model_variance")));
        result.put("relevance", getStringFromAttr(metricsMap.get("relevance")));
        result.put("token_usage", getStringFromAttr(metricsMap.get("token_usage")));
        result.put("final_score", getStringFromAttr(metricsMap.get("final_score")));
        
        // feedback 중첩 객체 처리
        if (metricsMap.containsKey("feedback") && metricsMap.get("feedback").m() != null) {
            Map<String, AttributeValue> feedbackMap = metricsMap.get("feedback").m();
            Map<String, Object> feedback = new LinkedHashMap<>();
            
            feedback.put("final_score", getStringFromAttr(feedbackMap.get("final_score")));
            feedback.put("overall_feedback", getStringFromAttr(feedbackMap.get("overall_feedback")));
            feedback.put("prompt_type", getStringFromAttr(feedbackMap.get("prompt_type")));
            
            // individual_scores 중첩 객체 처리
            if (feedbackMap.containsKey("individual_scores") && feedbackMap.get("individual_scores").m() != null) {
                Map<String, AttributeValue> scoresMap = feedbackMap.get("individual_scores").m();
                Map<String, String> individualScores = new LinkedHashMap<>();
                
                individualScores.put("consistency", getStringFromAttr(scoresMap.get("consistency")));
                individualScores.put("hallucination", getStringFromAttr(scoresMap.get("hallucination")));
                individualScores.put("information_density", getStringFromAttr(scoresMap.get("information_density")));
                individualScores.put("model_variance", getStringFromAttr(scoresMap.get("model_variance")));
                individualScores.put("relevance", getStringFromAttr(scoresMap.get("relevance")));
                individualScores.put("token_usage", getStringFromAttr(scoresMap.get("token_usage")));
                
                feedback.put("individual_scores", individualScores);
            }
            
            result.put("feedback", feedback);
        }
        
        return result;
    }

    private String getStringFromAttr(AttributeValue attr) {
        if (attr == null) return "";
        if (attr.s() != null) return attr.s();
        if (attr.n() != null) return attr.n();
        return "";
    }

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
}
