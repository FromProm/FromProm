package FromProm.user_service.DTO;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class UserResponse {
    private String email;
    private String nickname;
    private String bio;
    private int credit;
    private String PK;
}
