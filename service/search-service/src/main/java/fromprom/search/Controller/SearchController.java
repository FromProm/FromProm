package fromprom.search.Controller;

import fromprom.search.DTO.Comment;
import fromprom.search.DTO.PromptDocument;
import fromprom.search.DTO.PromptStats;
import fromprom.search.Service.InteractionService;
import fromprom.search.Service.SearchService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/search")
@RequiredArgsConstructor
public class SearchController {
    
    private final SearchService searchService;
    private final InteractionService interactionService;

    /**
     * 키워드 검색
     * GET /api/search?keyword=마케팅
     */
    @GetMapping
    public ResponseEntity<Map<String, Object>> search(
            @RequestParam String keyword,
            @RequestParam(required = false) String userId) {
        if (keyword == null || keyword.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "message", "검색어를 입력해주세요"
            ));
        }

        List<PromptDocument> results = searchService.searchPrompts(keyword.trim());
        
        // DynamoDB에서 통계 정보 가져오기
        List<String> promptIds = results.stream()
                .map(PromptDocument::getPromptId)
                .collect(Collectors.toList());
        Map<String, PromptStats> statsMap = interactionService.getPromptStatsBatch(promptIds);
        
        // 결과에 통계 정보 병합
        List<Map<String, Object>> enrichedResults = results.stream()
                .map(prompt -> enrichPromptWithStats(prompt, statsMap.get(prompt.getPromptId()), userId))
                .collect(Collectors.toList());

        return ResponseEntity.ok(Map.of(
            "success", true,
            "prompts", enrichedResults,
            "count", enrichedResults.size()
        ));
    }

    /**
     * 고급 검색 (필터 포함)
     * GET /api/search/advanced?keyword=코드&category=CODE_REVIEW&model=Claude&minPrice=0&maxPrice=5000
     */
    @GetMapping("/advanced")
    public ResponseEntity<Map<String, Object>> advancedSearch(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String model,
            @RequestParam(required = false) Integer minPrice,
            @RequestParam(required = false) Integer maxPrice,
            @RequestParam(defaultValue = "20") int size) {

        List<PromptDocument> results = searchService.advancedSearch(
                keyword, category, model, minPrice, maxPrice, size);
        
        return ResponseEntity.ok(Map.of(
            "success", true,
            "prompts", results,
            "count", results.size()
        ));
    }

    /**
     * 카테고리별 검색
     * GET /api/search/category/MARKETING
     */
    @GetMapping("/category/{category}")
    public ResponseEntity<Map<String, Object>> searchByCategory(
            @PathVariable String category,
            @RequestParam(defaultValue = "20") int size) {

        List<PromptDocument> results = searchService.searchByCategory(category, size);
        return ResponseEntity.ok(Map.of(
            "success", true,
            "prompts", results,
            "count", results.size()
        ));
    }

    /**
     * 모델별 검색
     * GET /api/search/model/Claude
     */
    @GetMapping("/model/{model}")
    public ResponseEntity<Map<String, Object>> searchByModel(
            @PathVariable String model,
            @RequestParam(defaultValue = "20") int size) {

        List<PromptDocument> results = searchService.searchByModel(model, size);
        return ResponseEntity.ok(Map.of(
            "success", true,
            "prompts", results,
            "count", results.size()
        ));
    }

    /**
     * 전체 프롬프트 목록 (마켓플레이스용)
     * GET /api/search/all
     */
    @GetMapping("/all")
    public ResponseEntity<Map<String, Object>> getAllPrompts(
            @RequestParam(defaultValue = "50") int size,
            @RequestParam(required = false) String userId) {

        List<PromptDocument> results = searchService.getAllPrompts(size);
        
        // DynamoDB에서 통계 정보 가져오기
        List<String> promptIds = results.stream()
                .map(PromptDocument::getPromptId)
                .collect(Collectors.toList());
        Map<String, PromptStats> statsMap = interactionService.getPromptStatsBatch(promptIds);
        
        // 결과에 통계 정보 병합
        List<Map<String, Object>> enrichedResults = results.stream()
                .map(prompt -> enrichPromptWithStats(prompt, statsMap.get(prompt.getPromptId()), userId))
                .collect(Collectors.toList());

        return ResponseEntity.ok(Map.of(
            "success", true,
            "prompts", enrichedResults,
            "count", enrichedResults.size()
        ));
    }

    /**
     * 프롬프트 상세 조회
     * GET /api/search/prompt/{promptId}
     */
    @GetMapping("/prompt/{promptId}")
    public ResponseEntity<Map<String, Object>> getPromptById(
            @PathVariable String promptId,
            @RequestParam(required = false) String userId) {
        PromptDocument prompt = searchService.getPromptById(promptId);
        
        if (prompt == null) {
            return ResponseEntity.notFound().build();
        }
        
        // DynamoDB에서 통계 정보 가져오기
        PromptStats stats = interactionService.getPromptStats(promptId);
        Map<String, Object> enrichedPrompt = enrichPromptWithStats(prompt, stats, userId);
        
        return ResponseEntity.ok(Map.of(
            "success", true,
            "prompt", enrichedPrompt
        ));
    }

    /**
     * 프롬프트 상세 + 댓글 통합 조회
     * GET /api/search/prompt/{promptId}/detail
     */
    @GetMapping("/prompt/{promptId}/detail")
    public ResponseEntity<Map<String, Object>> getPromptDetail(
            @PathVariable String promptId,
            @RequestParam(required = false) String userId) {
        PromptDocument prompt = searchService.getPromptById(promptId);
        
        if (prompt == null) {
            return ResponseEntity.notFound().build();
        }
        
        // DynamoDB에서 통계 및 댓글 가져오기
        PromptStats stats = interactionService.getPromptStats(promptId);
        List<Comment> comments = interactionService.getComments(promptId);
        
        Map<String, Object> enrichedPrompt = enrichPromptWithStats(prompt, stats, userId);
        
        return ResponseEntity.ok(Map.of(
            "success", true,
            "prompt", enrichedPrompt,
            "comments", comments,
            "commentCount", comments.size()
        ));
    }

    /**
     * 프롬프트 통계 조회 (좋아요/북마크/댓글 개수)
     * GET /api/search/prompt/{promptId}/stats
     */
    @GetMapping("/prompt/{promptId}/stats")
    public ResponseEntity<Map<String, Object>> getPromptStats(
            @PathVariable String promptId,
            @RequestParam(required = false) String userId) {
        
        PromptStats stats = interactionService.getPromptStats(promptId);
        
        Map<String, Object> result = new HashMap<>();
        result.put("promptId", promptId);
        result.put("likeCount", stats.getLikeCount());
        result.put("bookmarkCount", stats.getBookmarkCount());
        result.put("commentCount", stats.getCommentCount());
        
        // 사용자 ID가 있으면 좋아요/북마크 여부 확인
        if (userId != null && !userId.isEmpty()) {
            result.put("isLiked", interactionService.hasUserLiked(userId, promptId));
            result.put("isBookmarked", interactionService.hasUserBookmarked(userId, promptId));
        }
        
        return ResponseEntity.ok(Map.of(
            "success", true,
            "stats", result
        ));
    }

    /**
     * 프롬프트 댓글 목록 조회
     * GET /api/search/prompt/{promptId}/comments
     */
    @GetMapping("/prompt/{promptId}/comments")
    public ResponseEntity<Map<String, Object>> getPromptComments(@PathVariable String promptId) {
        List<Comment> comments = interactionService.getComments(promptId);
        
        return ResponseEntity.ok(Map.of(
            "success", true,
            "comments", comments,
            "count", comments.size()
        ));
    }

    /**
     * 인기 프롬프트 (평가 점수 기준)
     * GET /api/search/top-rated
     */
    @GetMapping("/top-rated")
    public ResponseEntity<Map<String, Object>> getTopRatedPrompts(
            @RequestParam(defaultValue = "10") int size) {

        List<PromptDocument> results = searchService.getTopRatedPrompts(size);
        return ResponseEntity.ok(Map.of(
            "success", true,
            "prompts", results,
            "count", results.size()
        ));
    }

    /**
     * 사용자별 프롬프트 조회
     * GET /api/search/user/{userId}
     */
    @GetMapping("/user/{userId}")
    public ResponseEntity<Map<String, Object>> getPromptsByUser(
            @PathVariable String userId,
            @RequestParam(defaultValue = "20") int size) {

        List<PromptDocument> results = searchService.getPromptsByUserId(userId, size);
        
        // DynamoDB에서 통계 정보 가져오기
        List<String> promptIds = results.stream()
                .map(PromptDocument::getPromptId)
                .collect(Collectors.toList());
        Map<String, PromptStats> statsMap = interactionService.getPromptStatsBatch(promptIds);
        
        List<Map<String, Object>> enrichedResults = results.stream()
                .map(prompt -> enrichPromptWithStats(prompt, statsMap.get(prompt.getPromptId()), userId))
                .collect(Collectors.toList());

        return ResponseEntity.ok(Map.of(
            "success", true,
            "prompts", enrichedResults,
            "count", enrichedResults.size()
        ));
    }

    /**
     * 사용자가 좋아요한 프롬프트 목록
     * GET /api/search/user/{userId}/likes
     */
    @GetMapping("/user/{userId}/likes")
    public ResponseEntity<Map<String, Object>> getUserLikedPrompts(
            @PathVariable String userId,
            @RequestParam(defaultValue = "20") int size) {

        List<String> likedPromptIds = interactionService.getUserLikedPrompts(userId);
        
        // OpenSearch에서 프롬프트 정보 가져오기
        List<PromptDocument> prompts = likedPromptIds.stream()
                .limit(size)
                .map(searchService::getPromptById)
                .filter(p -> p != null)
                .collect(Collectors.toList());
        
        // 통계 정보 병합
        Map<String, PromptStats> statsMap = interactionService.getPromptStatsBatch(
                prompts.stream().map(PromptDocument::getPromptId).collect(Collectors.toList()));
        
        List<Map<String, Object>> enrichedResults = prompts.stream()
                .map(prompt -> enrichPromptWithStats(prompt, statsMap.get(prompt.getPromptId()), userId))
                .collect(Collectors.toList());

        return ResponseEntity.ok(Map.of(
            "success", true,
            "prompts", enrichedResults,
            "count", enrichedResults.size()
        ));
    }

    /**
     * 사용자가 북마크한 프롬프트 목록
     * GET /api/search/user/{userId}/bookmarks
     */
    @GetMapping("/user/{userId}/bookmarks")
    public ResponseEntity<Map<String, Object>> getUserBookmarkedPrompts(
            @PathVariable String userId,
            @RequestParam(defaultValue = "20") int size) {

        List<String> bookmarkedPromptIds = interactionService.getUserBookmarkedPrompts(userId);
        
        // OpenSearch에서 프롬프트 정보 가져오기
        List<PromptDocument> prompts = bookmarkedPromptIds.stream()
                .limit(size)
                .map(searchService::getPromptById)
                .filter(p -> p != null)
                .collect(Collectors.toList());
        
        // 통계 정보 병합
        Map<String, PromptStats> statsMap = interactionService.getPromptStatsBatch(
                prompts.stream().map(PromptDocument::getPromptId).collect(Collectors.toList()));
        
        List<Map<String, Object>> enrichedResults = prompts.stream()
                .map(prompt -> enrichPromptWithStats(prompt, statsMap.get(prompt.getPromptId()), userId))
                .collect(Collectors.toList());

        return ResponseEntity.ok(Map.of(
            "success", true,
            "prompts", enrichedResults,
            "count", enrichedResults.size()
        ));
    }

    /**
     * OpenSearch 프롬프트 데이터에 DynamoDB 통계 및 기본 정보 병합
     * DynamoDB 데이터를 우선 사용 (더 정확한 원본 데이터)
     */
    private Map<String, Object> enrichPromptWithStats(PromptDocument prompt, PromptStats stats, String userId) {
        Map<String, Object> result = new HashMap<>();
        
        // 기본 ID
        result.put("promptId", prompt.getPromptId());
        
        // DynamoDB 데이터 우선 사용, 없으면 OpenSearch 데이터 사용
        result.put("title", (stats != null && stats.getTitle() != null && !stats.getTitle().isEmpty()) 
                ? stats.getTitle() : (prompt.getTitle() != null ? prompt.getTitle() : "제목 없음"));
        result.put("description", (stats != null && stats.getDescription() != null && !stats.getDescription().isEmpty()) 
                ? stats.getDescription() : (prompt.getDescription() != null ? prompt.getDescription() : ""));
        result.put("content", (stats != null && stats.getContent() != null && !stats.getContent().isEmpty()) 
                ? stats.getContent() : prompt.getContent());
        result.put("model", (stats != null && stats.getModel() != null && !stats.getModel().isEmpty()) 
                ? stats.getModel() : (prompt.getModel() != null ? prompt.getModel() : "AI Model"));
        
        // OpenSearch 데이터
        result.put("category", prompt.getCategory());
        result.put("promptType", prompt.getPromptType());
        result.put("userId", prompt.getUserId());
        result.put("nickname", prompt.getNickname());
        result.put("status", prompt.getStatus());
        result.put("price", prompt.getPrice());
        result.put("createdAt", prompt.getCreatedAt());
        result.put("updatedAt", prompt.getUpdatedAt());
        result.put("examplesS3Url", prompt.getExamplesS3Url());
        result.put("evaluationMetrics", prompt.getEvaluationMetrics());
        result.put("examples", prompt.getExamples());
        result.put("isPublic", prompt.getIsPublic());
        
        if (prompt.getScore() != null) {
            result.put("score", prompt.getScore());
        }
        
        // DynamoDB 통계 데이터
        if (stats != null) {
            result.put("likeCount", stats.getLikeCount());
            result.put("bookmarkCount", stats.getBookmarkCount());
            result.put("commentCount", stats.getCommentCount());
        } else {
            result.put("likeCount", prompt.getLikeCount() != null ? prompt.getLikeCount() : "0");
            result.put("bookmarkCount", prompt.getBookmarkCount() != null ? prompt.getBookmarkCount() : "0");
            result.put("commentCount", prompt.getCommentCount() != null ? prompt.getCommentCount() : "0");
        }
        
        // 사용자별 좋아요/북마크 여부
        if (userId != null && !userId.isEmpty() && prompt.getPromptId() != null) {
            result.put("isLiked", interactionService.hasUserLiked(userId, prompt.getPromptId()));
            result.put("isBookmarked", interactionService.hasUserBookmarked(userId, prompt.getPromptId()));
        }
        
        return result;
    }
}
