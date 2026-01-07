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
    private String createdAt;
    private String updatedAt;

    @DynamoDbPartitionKey
    @DynamoDbAttribute("PK")
    public String getPK() { return PK; }

    @DynamoDbSortKey
    @DynamoDbAttribute("SK")
    public String getSK() { return SK; }

    @DynamoDbAttribute("type")
    public String gettype() { return type; }

    // 닉네임 중복 체크를 위한 GSI 설정 (핵심 부분!)
    @DynamoDbSecondaryPartitionKey(indexNames = "nickname-index")
    @DynamoDbAttribute("nickname")
    public String getNickname() { return nickname; }

    @DynamoDbAttribute("email")
    public String getEmail() { return email; }

    @DynamoDbAttribute("credit")
    public int getCredit() { return credit; }

    @DynamoDbAttribute("bio")
    public String getBio() { return bio; }

    @DynamoDbAttribute("profileImage")
    public String getProfileImage() { return profileImage; }

    @DynamoDbAttribute("createdAt")
    public String getCreatedAt() { return createdAt; }

    @DynamoDbAttribute("updatedAt")
    public String getUpdatedAt() { return updatedAt; }
}