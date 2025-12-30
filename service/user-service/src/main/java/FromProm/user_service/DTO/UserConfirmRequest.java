package FromProm.user_service.DTO;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class UserConfirmRequest {
    private String email;  // 이메일 로그인
    private String code;   // 이메일로 받은 6자리 인증번호
}