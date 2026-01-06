package FromProm.user_service.Controller;

import FromProm.user_service.Service.LikeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/likes")
@RequiredArgsConstructor
public class LikeController {

    private final LikeService likeService;

    /**
     * 프롬프트 좋아요 등록
     * @param promptId 경로 변수 (예: p-999)
     * @param title 쿼리 파라미터 (리스트 조회용 조인 방지 데이터)
     * @param userId 헤더 (X-USER-SUB)
     */
    @PostMapping("/{promptId}")
    public ResponseEntity<String> addLike(
            @PathVariable String promptId,
            @RequestParam String title,
            @RequestHeader("X-USER-SUB") String userId) {

        likeService.addLike(userId, promptId, title);
        return ResponseEntity.ok("좋아요가 정상적으로 등록되었습니다.");
    }

    @DeleteMapping("/{promptId}")
    public ResponseEntity<String> deleteLike(
            @PathVariable String promptId,
            @RequestHeader("X-USER-SUB") String userId) {

        likeService.deleteLike(userId, promptId);
        return ResponseEntity.ok("좋아요가 취소되었습니다.");
    }
}