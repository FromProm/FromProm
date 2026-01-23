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
    
    @JsonProperty("prompt_description")
    private String description;
    
    @JsonProperty("prompt_content")
    private String content;
    
    private String category;
    private String model;
    
    @JsonProperty("prompt_type")
    private String promptType;
    
    @JsonProperty("create_user")
    private String createUser;
    
    private String status;
    private Integer price;
    
    @JsonProperty("created_at")
    private String createdAt;
    
    @JsonProperty("updated_at")
    private String updatedAt;
    
    @JsonProperty("examples_s3_url")
    private String examplesS3Url;

    @JsonProperty("like_count")
    private String likeCount;
    
    @JsonProperty("comment_count")
    private String commentCount;
    
    @JsonProperty("bookmark_count")
    private String bookmarkCount;
    
    @JsonProperty("is_public")
    private Boolean isPublic;
    
    @JsonProperty("evaluation_metrics")
    private EvaluationMetrics evaluationMetrics;
    
    private List<Example> examples;
    
    // 검색 결과용 (OpenSearch에서 주입)
    private Double score;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class EvaluationMetrics {
        @JsonProperty("final_score")
        private String finalScore;
        
        private String relevance;
        private String consistency;
        private String hallucination;
        
        @JsonProperty("information_density")
        private String informationDensity;
        
        @JsonProperty("model_variance")
        private String modelVariance;
        
        @JsonProperty("token_usage")
        private String tokenUsage;
        
        private Map<String, Object> feedback;
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
        @JsonProperty("input_type")
        private String inputType;
        private String content;
    }
}
