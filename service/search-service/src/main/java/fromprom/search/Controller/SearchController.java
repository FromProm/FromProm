package fromprom.search.Controller;

import fromprom.search.DTO.PromptDocument;
import fromprom.search.Service.SearchService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/search")
@RequiredArgsConstructor
public class SearchController {
    private final SearchService searchService;

    // GET /api/search?keyword=neon
    @GetMapping
    public ResponseEntity<List<PromptDocument>> search(@RequestParam String keyword) {
        if (keyword == null || keyword.trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        List<PromptDocument> results = searchService.searchPrompts(keyword);
        return ResponseEntity.ok(results);
    }

}
