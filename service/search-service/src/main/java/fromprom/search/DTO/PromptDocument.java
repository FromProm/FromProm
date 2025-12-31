package fromprom.search.DTO;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class PromptDocument {
    private String id;
    private String title;
    private String content;
    private String nickname;
    private Integer likeCount;
    private String createdAt;
    private Double score;
}
