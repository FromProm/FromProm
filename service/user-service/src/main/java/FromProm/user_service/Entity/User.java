package FromProm.user_service.Entity;

import lombok.*;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.*;

@Getter
@Setter
@ToString
@NoArgsConstructor
@AllArgsConstructor
@Builder
@DynamoDbBean
public class User {
    private String PK;   // Cognito의 sub (USER#id)
    private String SK;   // PROFILE
    private String type;
    private String email;
    private String nickname;
    private int credit;
    private String bio;
    private String profileImage;
    private String created_at;
    private String updated_at;

    @DynamoDbPartitionKey
    @DynamoDbAttribute("PK")
    public String getPK() { return PK; }

    @DynamoDbSortKey
    @DynamoDbAttribute("SK")
    public String getSK() { return SK; }

    @DynamoDbAttribute("type")
    public String gettype() { return type; }

    // 이메일 중복 체크를 위한 GSI 설정
    @DynamoDbSecondaryPartitionKey(indexNames = "email-index") // 콘솔의 GSI 이름과 일치시켜야 함
    @DynamoDbAttribute("email")
    public String getEmail() { return email; }

    // 닉네임 중복 체크를 위한 GSI 설정
    @DynamoDbSecondaryPartitionKey(indexNames = "nickname-index")
    @DynamoDbAttribute("nickname")
    public String getNickname() { return nickname; }

    @DynamoDbAttribute("credit")
    public int getCredit() { return credit; }

    @DynamoDbAttribute("bio")
    public String getBio() { return bio; }

    @DynamoDbAttribute("profile_image")
    public String getProfileImage() { return profileImage; }

    @DynamoDbAttribute("created_at")
    public String getCreatedAt() { return created_at; }

    @DynamoDbAttribute("updated_at")
    public String getUpdatedAt() { return updated_at; }
}