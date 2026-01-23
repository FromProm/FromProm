package fromprom.search.DTO;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class PromptDocument {
    
    private String promptId;
    private String title;
    
    // OpenSearch 매핑: description (camelCase)
    private String description;
    
    // OpenSearch 매핑: content (camelCase)
    private String content;
    
    private String category;
    private String model;
    
    // OpenSearch 매핑: evaluationMetrics.promptType
    private String promptType;
    
    // OpenSearch 매핑: userId (camelCase)
    private String userId;
    
    // OpenSearch 매핑: nickname
    private String nickname;
    
    private String status;
    private Integer price;
    
    // OpenSearch 매핑: createdAt (camelCase)
    private String createdAt;
    
    // OpenSearch 매핑: updatedAt (camelCase)
    private String updatedAt;
    
    // OpenSearch 매핑: examplesS3Url (camelCase)
    private String examplesS3Url;

    // 통계 필드 (DynamoDB에서 가져옴, OpenSearch에는 없을 수 있음)
    private String likeCount;
    private String commentCount;
    private String bookmarkCount;
    
    private Boolean isPublic;
    
    // OpenSearch 매핑: evaluationMetrics (camelCase)
    private EvaluationMetrics evaluationMetrics;
    
    private List<Example> examples;
    
    // 검색 결과용 (OpenSearch에서 주입)
    private Double score;
    
    // 하위 호환성을 위한 getter (createUser -> userId)
    public String getCreateUser() {
        return userId;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class EvaluationMetrics {
        // OpenSearch 매핑: finalScore (camelCase)
        private Float finalScore;
        
        private Float relevance;
        private Float consistency;
        private Float hallucination;
        
        // OpenSearch 매핑: informationDensity (camelCase)
        private Float informationDensity;
        
        // OpenSearch 매핑: modelVariance (camelCase)
        private Float modelVariance;
        
        // OpenSearch 매핑: tokenUsage (camelCase)
        private Float tokenUsage;
        
        // OpenSearch 매핑: overallFeedback (camelCase)
        private String overallFeedback;
        
        // OpenSearch 매핑: promptType (camelCase)
        private String promptType;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Example {
        private Integer index;
        private ExampleInput input;
        private String output;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class ExampleInput {
        // OpenSearch 매핑: inputType (camelCase)
        private String inputType;
        private String content;
    }
}
