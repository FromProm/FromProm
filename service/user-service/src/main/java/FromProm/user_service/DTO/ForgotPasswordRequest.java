package FromProm.user_service.DTO;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ForgotPasswordRequest {
    private String email;
    private String confirmationCode; // 이메일로 받은 6자리 코드
    private String newPassword;
}
