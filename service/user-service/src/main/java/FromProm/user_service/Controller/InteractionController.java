package FromProm.user_service.Controller;

import FromProm.user_service.DTO.CommentRequest;
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
            @RequestHeader("Authorization") String authHeader) { // Authorization 헤더 사용

        // 1. 토큰에서 실제 유저 ID 추출
        String userId = likeService.getUserIdFromToken(authHeader);
        // 2. 추출된 ID로 좋아요 로직 실행
        likeService.addLike(userId, promptId); // ID만 넘김
        return ResponseEntity.ok("좋아요 성공! (User: " + userId + ")");
    }

    @DeleteMapping("/{promptId}/like")
    public ResponseEntity<String> deleteLike(
            @PathVariable String promptId,
            @RequestHeader("Authorization") String authHeader) {

        // 1. 토큰에서 실제 Cognito sub(ID) 추출
        String userId = likeService.getUserIdFromToken(authHeader);

        // 2. 해당 유저 ID로 좋아요 취소 로직 실행
        likeService.deleteLike(userId, promptId);

        return ResponseEntity.ok("좋아요 취소 완료 (User: " + userId + ")");
    }

    // 북마크 등록
    @PostMapping("/{promptId}/bookmark")
    public ResponseEntity<String> addBookmark(
            @PathVariable String promptId,
            @RequestHeader("Authorization") String authHeader) {

        String userId = likeService.getUserIdFromToken(authHeader);
        likeService.addBookmark(userId, promptId);
        return ResponseEntity.ok("북마크 저장 완료 (User: " + userId + ")");
    }

    //북마크 취소
    @DeleteMapping("/{promptId}/bookmark")
    public ResponseEntity<String> deleteBookmark(
            @PathVariable String promptId,
            @RequestHeader("Authorization") String authHeader) {

        String userId = likeService.getUserIdFromToken(authHeader);
        likeService.deleteBookmark(userId, promptId);
        return ResponseEntity.ok("북마크 취소 완료");
    }

    @PostMapping("/{promptId}/comments")
    public ResponseEntity<String> addComment(@PathVariable String promptId, @RequestBody CommentRequest req, @RequestHeader("Authorization") String userId) {
        likeService.addComment(userId, "MyNickname", promptId, req.getContent());
        return ResponseEntity.ok("댓글 등록 완료");
    }

    @PatchMapping("/{promptId}/comments")
    public ResponseEntity<String> updateComment(@PathVariable String promptId, @RequestParam String commentSk, @RequestBody CommentRequest req, @RequestHeader("Authorization") String userId) {
        likeService.updateComment(promptId, commentSk, userId, req.getContent());
        return ResponseEntity.ok("댓글 수정 완료");
    }

    @DeleteMapping("/{promptId}/comments")
    public ResponseEntity<String> deleteComment(@PathVariable String promptId, @RequestParam String commentSk, @RequestHeader("Authorization") String userId) {
        likeService.deleteComment(promptId, commentSk, userId);
        return ResponseEntity.ok("댓글 삭제 완료");
    }
}