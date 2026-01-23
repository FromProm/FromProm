package fromprom.search.DTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Comment {
    private String commentId;
    private String content;
    private String userId;
    private String nickname;
    private String createdAt;
    private String updatedAt;
}
