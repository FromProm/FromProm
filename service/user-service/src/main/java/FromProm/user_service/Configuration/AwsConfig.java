package FromProm.user_service.Configuration;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.cognitoidentityprovider.CognitoIdentityProviderClient;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbEnhancedClient;

@Configuration
public class AwsConfig {
    @Value("${aws.region}")
    private String region;

    @Value("${aws.credentials.accessKey}")
    private String accessKey;

    @Value("${aws.credentials.secretKey}")
    private String secretKey;

    // 1. AWS 인증 정보 객체 생성
    private StaticCredentialsProvider getCredentials() {
        return StaticCredentialsProvider.create(
                AwsBasicCredentials.create(accessKey, secretKey)
        );
    }

    // 2. Cognito 연결 클라이언트
    @Bean
    public CognitoIdentityProviderClient cognitoClient() {
        return CognitoIdentityProviderClient.builder()
                .region(Region.of(region))
                .credentialsProvider(getCredentials())
                .build();
    }

    // 3. DynamoDB 연결 클라이언트 (기본)
    @Bean
    public DynamoDbClient dynamoDbClient() {
        return DynamoDbClient.builder()
                .region(Region.of(region))
                .credentialsProvider(getCredentials())
                .build();
    }

    // 4. DynamoDB Enhanced 클라이언트 (Entity 매핑용)
    @Bean
    public DynamoDbEnhancedClient enhancedClient() {
        return DynamoDbEnhancedClient.builder()
                .dynamoDbClient(dynamoDbClient())
                .build();
    }
}
