package FromProm.user_service.DTO;

import lombok.Data;
import lombok.Getter;

import java.util.List;

@Getter
public class PromptSaveRequest {
    private String title;
    private PromptType promptType; // type_a 등
    private Integer price;     // 가격
    private String model;      // AI 모델 및 버전
    private String description;
    private String content;
    private String nickname;   // 등록자 닉네임 (OpenSearch 동기화용)
    private List<InputDetail> inputs;
    private List<String> exampleOutputs;

    private List<ExampleSet> examples;

    @Data
    public static class ExampleSet {
        // 해당 예시 세트의 입력값들 (예: topic=GPT-4)
        private List<InputDetail> inputValues;
    }

    @Data
    public static class InputDetail {
        private String key;   // 예: "기사내용", "장르"
        private String value; // 예: "삼성전자 실적 발표...", "SF"
    }
}
