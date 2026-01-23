package fromprom.search.DTO;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class PromptDocument {
    
    private String promptId;
    private String title;
    private String description;
    private String content;
    private String category;
    private String model;
    private String nickname;
    private String userId;
    private String status;
    private Integer price;
    private String createdAt;
    private String updatedAt;
    private String examplesS3Url;
    
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
        private Float finalScore;
        private Float relevance;
        private Float consistency;
        private Float hallucination;
        private Float informationDensity;
        private Float modelVariance;
        private Float tokenUsage;
        private String promptType;
        private String overallFeedback;
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
        private String inputType;
        private String content;
    }
}
