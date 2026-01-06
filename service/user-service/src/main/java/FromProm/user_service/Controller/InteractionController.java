package FromProm.user_service.Controller;

import FromProm.user_service.Service.InteractionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/prompts")
@RequiredArgsConstructor
public class InteractionController {

    private final InteractionService likeService;

    // 좋아요
    @PostMapping("/{promptId}/like")
    public ResponseEntity<String> addLike(
            @PathVariable String promptId,
            @RequestParam String title,
            @RequestHeader("X-USER-SUB") String userId) {

        likeService.addLike(userId, promptId, title);
        return ResponseEntity.ok("좋아요가 정상적으로 등록되었습니다.");
    }

    @DeleteMapping("/{promptId}/like")
    public ResponseEntity<String> deleteLike(
            @PathVariable String promptId,
            @RequestHeader("X-USER-SUB") String userId) {

        likeService.deleteLike(userId, promptId);
        return ResponseEntity.ok("좋아요가 취소되었습니다.");
    }

    // 북마크 등록
    @PostMapping("/{promptId}/bookmark")
    public ResponseEntity<String> addBookmark(
            @PathVariable String promptId,
            @RequestParam String title,
            @RequestHeader("X-USER-SUB") String userId) {
        likeService.addBookmark(userId, promptId, title);
        return ResponseEntity.ok("북마크에 저장되었습니다.");
    }

    // 북마크 취소
    @DeleteMapping("/{promptId}/bookmark")
    public ResponseEntity<String> deleteBookmark(
            @PathVariable String promptId,
            @RequestHeader("X-USER-SUB") String userId) {
        likeService.deleteBookmark(userId, promptId);
        return ResponseEntity.ok("북마크가 취소되었습니다.");
    }
}