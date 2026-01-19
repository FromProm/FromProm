package FromProm.user_service.Repository;

import FromProm.user_service.Entity.Like;
import FromProm.user_service.Entity.Prompt;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Repository;
import software.amazon.awssdk.enhanced.dynamodb.*;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.*;

import java.util.Map;

@Repository
public class PromptRepository {
    private final DynamoDbTable<Like> likeTable;
    private final DynamoDbTable<Prompt> promptTable;
    private final DynamoDbEnhancedClient enhancedClient;
    private final DynamoDbClient dynamoDbClient;
    
    @Value("${aws.dynamodb.table.name}")
    private String TABLE_NAME;

    public PromptRepository(DynamoDbEnhancedClient enhancedClient, DynamoDbClient dynamoDbClient,
                            @Value("${aws.dynamodb.table.name}") String tableName) {
        this.TABLE_NAME = tableName;
        this.enhancedClient = enhancedClient;
        this.dynamoDbClient = dynamoDbClient;
        this.likeTable = enhancedClient.table(tableName, TableSchema.fromBean(Like.class));
        this.promptTable = enhancedClient.table(tableName, TableSchema.fromBean(Prompt.class));
    }

    public void addLikeTransaction(Like like) {
        // Enhanced Client로 Like 객체를 DynamoDB 형식으로 변환
        Map<String, AttributeValue> likeItem = likeTable.tableSchema().itemToMap(like, true);

        dynamoDbClient.transactWriteItems(TransactWriteItemsRequest.builder()
                .transactItems(
                        // 1. 좋아요 내역 추가
                        TransactWriteItem.builder()
                                .put(Put.builder()
                                        .tableName(TABLE_NAME)
                                        .item(likeItem)
                                        .conditionExpression("attribute_not_exists(PK)")
                                        .build())
                                .build(),
                        // 2. 프롬프트 likeCount 증가
                        TransactWriteItem.builder()
                                .update(Update.builder()
                                        .tableName(TABLE_NAME)
                                        .key(Map.of(
                                                "PK", AttributeValue.builder().s("PROMPT#" + like.getTargetPromptId()).build(),
                                                "SK", AttributeValue.builder().s("METADATA").build()
                                        ))
                                        .updateExpression("SET likeCount = if_not_exists(likeCount, :zero) + :inc")
                                        .expressionAttributeValues(Map.of(
                                                ":inc", AttributeValue.builder().n("1").build(),
                                                ":zero", AttributeValue.builder().n("0").build()
                                        ))
                                        .build())
                                .build()
                )
                .build());
    }
}