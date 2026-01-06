package FromProm.user_service.Controller;

import FromProm.user_service.DTO.CommentRequest;
import FromProm.user_service.Service.InteractionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

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
    public ResponseEntity<String> addComment(
            @PathVariable String promptId,
            @RequestBody CommentRequest req,
            @RequestHeader("Authorization") String authHeader) {

        // 1. 토큰에서 ID와 닉네임을 한 번에 가져옴
        Map<String, String> userInfo = likeService.getUserInfoFromToken(authHeader);
        String userId = userInfo.get("userId");
        String nickname = userInfo.get("nickname");

        // 2. DB에 저장 (이미 있는 닉네임 사용)
        likeService.addComment(userId, nickname, promptId, req.getContent());

        return ResponseEntity.ok("댓글 등록 완료 (작성자: " + nickname + ")");
    }

    @PatchMapping("/{promptId}/comments")
    public ResponseEntity<String> updateComment(
            @PathVariable String promptId,
            @RequestBody CommentRequest req,
            @RequestHeader("Authorization") String authHeader) { // 변수명 변경

        String userId = likeService.getUserIdFromToken(authHeader); // ID 추출 로직 추가
        likeService.updateComment(promptId, req.getCommentSK(), userId, req.getContent());
        return ResponseEntity.ok("댓글 수정 완료");
    }

    // 삭제 (Delete)
    @DeleteMapping("/{promptId}/comments/{commentSk}") // URL 경로에 commentSk 추가
    public ResponseEntity<String> deleteComment(
            @PathVariable String promptId,
            @PathVariable String commentSk, // PathVariable로 변경
            @RequestHeader("Authorization") String authHeader) throws IllegalAccessException {

        // 1. 토큰에서 ID 추출
        String userId = likeService.getUserIdFromToken(authHeader);

        // 2. 삭제 로직 실행
        likeService.deleteComment(promptId, commentSk, userId);

        return ResponseEntity.ok("댓글 삭제 완료");
    }
}