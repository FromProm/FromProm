package FromProm.user_service.Service;

import FromProm.user_service.DTO.PromptSaveRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;
import software.amazon.awssdk.services.dynamodb.model.PutItemRequest;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
@RequiredArgsConstructor
public class PromptService {

    private final DynamoDbClient dynamoDbClient; // 빨간불 해결
//    private final SnsClient snsClient; // SNS 알림용 추가
    private final String TABLE_NAME = "FromProm_Table"; // 테이블명 정의
    private final String SNS_TOPIC_ARN = "arn:aws:sns:ap-northeast-2:YOUR_ACCOUNT_ID:YourTopicName"; // SNS ARN 입력

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
        item.put("model", AttributeValue.builder().s(dto.getModel()).build()); // 프론트 선택 모델

        // 예시 데이터 구조화
        List<AttributeValue> structuredExamples = new ArrayList<>();
        for (int i = 0; i < dto.getInputs().size(); i++) {
            Map<String, AttributeValue> exMap = new HashMap<>();
            exMap.put("index", AttributeValue.builder().n(String.valueOf(i)).build());
            exMap.put("input", AttributeValue.builder().m(Map.of(
                    "content", AttributeValue.builder().s(dto.getInputs().get(i)).build(),
                    "input_type", AttributeValue.builder().s("text").build()
            )).build());
            exMap.put("output", AttributeValue.builder().s("").build()); // AI 분석 전이므로 빈값
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

//        // 2. AI 서버로 SNS 알림 보내기
//        sendSnsNotification(userId, promptUuid);
        return promptUuid;
    }

//    private void sendSnsNotification(String userId, String promptUuid) {
//        // AI 서버가 받을 메시지 포맷 (JSON)
//        String message = String.format("{\"userPk\": \"USER#%s\", \"promptPk\": \"PROMPT#%s\"}",
//                userId, promptUuid);
//
//        PublishRequest publishRequest = PublishRequest.builder()
//                .topicArn(SNS_TOPIC_ARN)
//                .message(message)
//                .build();
//
//        snsClient.publish(publishRequest);
//    }
}
