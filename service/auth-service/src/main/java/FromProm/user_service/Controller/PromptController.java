package FromProm.user_service.Controller;

import FromProm.user_service.DTO.PromptSaveRequest;
import FromProm.user_service.Service.InteractionService;
import FromProm.user_service.Service.PromptService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * 프롬프트 관리 API (인증 필요)
 * - 프롬프트 등록
 * - 내 프롬프트 목록 조회
 * - 프롬프트 삭제
 * 
 * 참고: 프롬프트 조회 API (상세, 통계, 댓글)는 search-service로 이동됨
 * - GET /api/search/prompts/all
 * - GET /api/search/prompts/{promptId}
 * - GET /api/search/prompts/{promptId}/detail
 * - GET /api/search/prompts/{promptId}/stats
 * - GET /api/search/prompts/{promptId}/comments
 */
@RestController
@RequestMapping("/api/prompts")
@RequiredArgsConstructor
public class PromptController {

    private final PromptService promptService;
    private final InteractionService interactionService;

    /**
     * 프롬프트 등록
     */
    @PostMapping("/registration")
    public ResponseEntity<String> createPrompt(
            @RequestBody PromptSaveRequest request,
            @RequestHeader("Authorization") String authHeader) {

        String userId = interactionService.getUserIdFromToken(authHeader);
        String promptUuid = promptService.createInitialPrompt(userId, request);

        return ResponseEntity.ok("프롬프트 등록 프로세스가 시작되었습니다. (ID: " + promptUuid + ", 상태: processing)");
    }

    /**
     * 내가 등록한 프롬프트 목록 조회
     */
    @GetMapping("/my")
    public ResponseEntity<Map<String, Object>> getMyPrompts(
            @RequestHeader("Authorization") String authHeader) {
        try {
            String userId = interactionService.getUserIdFromToken(authHeader);
            var prompts = promptService.getMyPrompts(userId);
            
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
     * 프롬프트 삭제 (Hard Delete)
     * - 본인이 등록한 프롬프트만 삭제 가능
     */
    @DeleteMapping("/{promptId}")
    public ResponseEntity<Map<String, Object>> deletePrompt(
            @PathVariable String promptId,
            @RequestHeader("Authorization") String authHeader) {
        try {
            String userId = interactionService.getUserIdFromToken(authHeader);
            promptService.deletePrompt(userId, promptId);

            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "프롬프트가 삭제되었습니다.",
                "deletedPromptId", promptId
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "message", e.getMessage()
            ));
        }
    }
}