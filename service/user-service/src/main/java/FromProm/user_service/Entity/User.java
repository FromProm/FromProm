package FromProm.user_service.Entity;

import lombok.*;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbBean;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbPartitionKey;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbSortKey;

@Getter
@Setter
@ToString
@NoArgsConstructor
@AllArgsConstructor
@Builder
@DynamoDbBean
public class User {
    private String PK;   // Cognito의 sub
    private String SK;           // PROFILE
    private String TYPE;
    private String email;
    private String nickname;
    private int credit;
    private String bio;
    private String profileimage;
    private String createdAt;
    private String updatedAt;

    @DynamoDbPartitionKey
    public String getPK() { return PK; }

    @DynamoDbSortKey
    public String getSK() { return SK; }

    // 서비스 로직에서 객체 생성을 편하게 하기 위한 생성자/메서드
    public User(String PK, String SK, String email, String nickname, String credit, String bio) {
        this.PK = PK;
        this.SK = SK;
        this.email = email;
        this.nickname = nickname;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.bio = bio;
        this.profileimage = profileimage;
    }
}
