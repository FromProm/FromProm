package fromprom.search.DTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PromptStats {
    private String promptId;
    private int likeCount;
    private int bookmarkCount;
    private int commentCount;
}
