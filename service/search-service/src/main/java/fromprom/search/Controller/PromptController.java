package fromprom.search.Controller;

import fromprom.search.Service.PromptService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * 프롬프트 조회 API (인증 불필요)
 * - 마켓플레이스 프롬프트 목록
 * - 프롬프트 상세 정보
 * - 프롬프트 통계 (좋아요/북마크/댓글 개수)
 * - 프롬프트 댓글 목록
 */
@RestController
@RequestMapping("/api/search/prompts")
@RequiredArgsConstructor
public class PromptController {

    private final PromptService promptService;

    /**
     * 모든 프롬프트 목록 조회 (마켓플레이스용)
     */
    @GetMapping("/all")
    public ResponseEntity<Map<String, Object>> getAllPrompts(
            @RequestParam(defaultValue = "50") int limit) {
        try {
            var prompts = promptService.getAllPrompts(limit);
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "prompts", prompts,
                "count", prompts.size()
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "message", e.getMessage()
            ));
        }
    }

    /**
     * 프롬프트 상세 정보 조회
     */
    @GetMapping("/{promptId}")
    public ResponseEntity<Map<String, Object>> getPromptDetail(
            @PathVariable String promptId) {
        try {
            var detail = promptService.getPromptDetail(promptId);
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "prompt", detail
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "message", e.getMessage()
            ));
        }
    }

    /**
     * 프롬프트 상세 + 댓글 목록 통합 조회
     */
    @GetMapping("/{promptId}/detail")
    public ResponseEntity<Map<String, Object>> getPromptDetailWithComments(
            @PathVariable String promptId) {
        try {
            var result = promptService.getPromptDetailWithComments(promptId);
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "data", result
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "message", e.getMessage()
            ));
        }
    }

    /**
     * 프롬프트 통계 조회 (좋아요/북마크/댓글 개수)
     */
    @GetMapping("/{promptId}/stats")
    public ResponseEntity<Map<String, Object>> getPromptStats(
            @PathVariable String promptId) {
        try {
            var stats = promptService.getPromptStats(promptId);
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "stats", stats
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "message", e.getMessage()
            ));
        }
    }

    /**
     * 프롬프트 댓글 목록 조회
     */
    @GetMapping("/{promptId}/comments")
    public ResponseEntity<Map<String, Object>> getPromptComments(
            @PathVariable String promptId) {
        try {
            var comments = promptService.getPromptComments(promptId);
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "comments", comments,
                "count", comments.size()
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "message", e.getMessage()
            ));
        }
    }
}
