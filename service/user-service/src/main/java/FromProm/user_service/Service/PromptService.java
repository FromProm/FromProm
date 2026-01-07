package FromProm.user_service.Service;

import FromProm.user_service.DTO.PromptSaveRequest;
import com.fasterxml.jackson.databind.ObjectMapper; // 추가
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;
import software.amazon.awssdk.services.dynamodb.model.PutItemRequest;
import software.amazon.awssdk.services.sns.SnsClient;
import software.amazon.awssdk.services.sns.model.PublishRequest;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
@RequiredArgsConstructor
public class PromptService {

    private final DynamoDbClient dynamoDbClient;
    private final SnsClient snsClient;
    private final ObjectMapper objectMapper; // JSON 변환을 위해 추가
    private final String TABLE_NAME = "FromProm_Table";
    private final String SNS_TOPIC_ARN = "arn:aws:sns:ap-northeast-2:261595668962:fromprom-sns";

    public String createInitialPrompt(String userId, PromptSaveRequest dto) {
        String promptUuid = UUID.randomUUID().toString();
        String now = OffsetDateTime.now(ZoneOffset.UTC).format(DateTimeFormatter.ISO_INSTANT);

        Map<String, AttributeValue> item = new HashMap<>();

        // 기본 키 및 인덱스 키
        item.put("PK", AttributeValue.builder().s("PROMPT#" + promptUuid).build());
        item.put("SK", AttributeValue.builder().s("METADATA").build());
        item.put("PROMPT_INDEX_PK", AttributeValue.builder().s("USER_PROMPT_LIST").build());
        item.put("PROMPT_INDEX_SK", AttributeValue.builder().s("USER#" + userId + "#" + now).build());

        // 기본 정보
        item.put("type", AttributeValue.builder().s("PROMPT").build());
        item.put("create_user", AttributeValue.builder().s("USER#" + userId).build());
        item.put("title", AttributeValue.builder().s(dto.getTitle()).build());
        item.put("content", AttributeValue.builder().s(dto.getContent()).build());
        item.put("description", AttributeValue.builder().s(dto.getDescription()).build());
        item.put("prompt_type", AttributeValue.builder().s(dto.getPromptType()).build());
        item.put("model", AttributeValue.builder().s(dto.getModel()).build());

        // 예시 데이터 구조화
        List<AttributeValue> structuredExamples = new ArrayList<>();
        for (int i = 0; i < dto.getInputs().size(); i++) {
            Map<String, AttributeValue> exMap = new HashMap<>();
            exMap.put("index", AttributeValue.builder().n(String.valueOf(i)).build());
            exMap.put("input", AttributeValue.builder().m(Map.of(
                    "content", AttributeValue.builder().s(dto.getInputs().get(i)).build(),
                    "input_type", AttributeValue.builder().s("text").build()
            )).build());
            exMap.put("output", AttributeValue.builder().s("").build());
            structuredExamples.add(AttributeValue.builder().m(exMap).build());
        }
        item.put("examples", AttributeValue.builder().l(structuredExamples).build());

        // 상태 및 카운트 초기화
        item.put("status", AttributeValue.builder().s("PROCESSING").build());
        item.put("created_at", AttributeValue.builder().s(now).build());
        item.put("updated_at", AttributeValue.builder().s(now).build());
        item.put("like_count", AttributeValue.builder().n("0").build());
        item.put("comment_count", AttributeValue.builder().n("0").build());
        item.put("bookmark_count", AttributeValue.builder().n("0").build());
        item.put("is_public", AttributeValue.builder().bool(false).build());

        // 1. DynamoDB 저장 실행
        dynamoDbClient.putItem(PutItemRequest.builder()
                .tableName(TABLE_NAME)
                .item(item)
                .build());

        // 2. AI 서버로 상세 정보를 포함한 SNS 알림 보내기
        sendSnsNotification(userId, promptUuid, dto);

        return promptUuid;
    }

    private void sendSnsNotification(String userId, String promptUuid, PromptSaveRequest dto) {
        try {
            // AI 서버가 즉시 분석할 수 있도록 모든 데이터를 Map으로 구성
            Map<String, Object> messageMap = new HashMap<>();
            messageMap.put("userPk", "USER#" + userId);
            messageMap.put("promptPk", "PROMPT#" + promptUuid);
            messageMap.put("title", dto.getTitle());
            messageMap.put("content", dto.getContent());
            messageMap.put("description", dto.getDescription());
            messageMap.put("promptType", dto.getPromptType());
            messageMap.put("model", dto.getModel());
            messageMap.put("inputs", dto.getInputs()); // 사용자 입력 리스트 전체 포함

            // JSON 문자열로 변환
            String jsonMessage = objectMapper.writeValueAsString(messageMap);

            PublishRequest publishRequest = PublishRequest.builder()
                    .topicArn(SNS_TOPIC_ARN)
                    .message(jsonMessage)
                    .build();

            snsClient.publish(publishRequest);
            System.out.println("AI 서버로 전체 데이터 전송 성공: PROMPT#" + promptUuid);

        } catch (Exception e) {
            System.err.println("SNS 발송 실패: " + e.getMessage());
            e.printStackTrace();
        }
    }
}