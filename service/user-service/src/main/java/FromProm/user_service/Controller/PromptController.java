package FromProm.user_service.Controller;

import FromProm.user_service.DTO.PromptSaveRequest;
import FromProm.user_service.Service.InteractionService;
import FromProm.user_service.Service.PromptService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/prompts/registration")
@RequiredArgsConstructor
public class PromptController {

    private final PromptService promptService;
    private final InteractionService interactionService; // 토큰 검증용

    @PostMapping
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
}