package FromProm.user_service.Entity;

import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbBean;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbPartitionKey;

@Getter
@Setter
@NoArgsConstructor
@DynamoDbBean
public class User {
    private String id;   // Cognito의 sub
    private String email;
    private String nickname;
    private String createdAt;

    @DynamoDbPartitionKey
    public String getId() {
        return id;
    }

    public String getEmail() {
        return email;
    }

    public String getNickname() {
        return nickname;
    }

    public String getCreatedAt() {
        return createdAt;
    }

    // 서비스 로직에서 객체 생성을 편하게 하기 위한 생성자/메서드
    public User(String id, String email, String nickname, String createdAt) {
        this.id = id;
        this.email = email;
        this.nickname = nickname;
        this.createdAt = createdAt;
    }
}

