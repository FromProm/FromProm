package FromProm.user_service.DTO;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class UserSignUpRequest {
    private String email;    // 로그인할 이메일
    private String password;  // 비밀번호
    private String nickname;  // 서비스에서 사용할 닉네임
}
