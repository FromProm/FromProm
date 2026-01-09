package FromProm.user_service.Controller;

import FromProm.user_service.DTO.PromptSaveRequest;
import FromProm.user_service.Service.InteractionService;
import FromProm.user_service.Service.PromptService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/prompts")
@RequiredArgsConstructor
public class PromptController {

    private final PromptService promptService;
    private final InteractionService interactionService; // 토큰 검증용

    @PostMapping("/registration")
    public ResponseEntity<String> createPrompt(
            @RequestBody PromptSaveRequest request,
            @RequestHeader("Authorization") String authHeader) {

        // 1. 쿠키(토큰) 검사 및 유저 ID 추출
        // InteractionService에 만들어둔 유저 추출 로직 재활용
        String userId = interactionService.getUserIdFromToken(authHeader);

        // 2. DB 1차 저장 및 AI 서버 SNS 알림 실행
        String promptUuid = promptService.createInitialPrompt(userId, request);

        // 3. 결과 응답 (생성된 ID 반환)
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
     * - 프롬프트 상세 정보
     * - 좋아요/북마크/댓글 개수
     * - 댓글 목록
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

    /**
     * 프롬프트 삭제 (Hard Delete)
     * - 본인이 등록한 프롬프트만 삭제 가능
     * - 프롬프트 메타데이터, 댓글, 좋아요, 북마크 모두 삭제
     */
    @DeleteMapping("/{promptId}")
    public ResponseEntity<Map<String, Object>> deletePrompt(
            @PathVariable String promptId,
            @RequestHeader("Authorization") String authHeader) {
        try {
            // 1. 토큰에서 유저 ID 추출
            String userId = interactionService.getUserIdFromToken(authHeader);

            // 2. 프롬프트 삭제 (본인 확인 포함)
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