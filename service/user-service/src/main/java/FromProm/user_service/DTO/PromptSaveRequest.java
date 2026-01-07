package FromProm.user_service.DTO;

import lombok.Getter;

import java.util.List;

@Getter
public class PromptSaveRequest {
    private String title;
    private String promptType; // type_a 등
    private Integer price;     // 가격
    private String model;      // AI 모델 및 버전
    private String description;
    private String content;
    private List<String> inputs; // 예시 입력 3개 (문자열 리스트)
}
