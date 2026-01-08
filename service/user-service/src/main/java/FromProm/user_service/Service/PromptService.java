package FromProm.user_service.Service;

import FromProm.user_service.DTO.PromptSaveRequest;
import FromProm.user_service.DTO.PromptType;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.sns.SnsClient;
import software.amazon.awssdk.services.sns.model.PublishRequest;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
@RequiredArgsConstructor
public class PromptService {

    private final SnsClient snsClient;
    private final ObjectMapper objectMapper;
    private final String SNS_TOPIC_ARN = "arn:aws:sns:ap-northeast-2:261595668962:fromprom-sns";

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
        fullPayload.put("description", dto.getDescription());
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
        fullPayload.put("like_count", 0); // 숫자형으로 변경 권장
        fullPayload.put("comment_count", 0);
        fullPayload.put("bookmark_count", 0);
        fullPayload.put("is_public", false);

        sendSnsNotification(fullPayload);

        return promptUuid;
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
}