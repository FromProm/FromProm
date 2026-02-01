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
     * 키워드 검색 - 최적화됨 + 페이지네이션
     * GET /api/search?keyword=마케팅&size=20&cursor=xxx
     */
    @GetMapping
    public ResponseEntity<Map<String, Object>> search(
            @RequestParam String keyword,
            @RequestParam(required = false) String userId,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String cursor) {
        if (keyword == null || keyword.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "message", "검색어를 입력해주세요"
            ));
        }

        // 페이지네이션 적용
        SearchService.PagedSearchResult pagedResult = searchService.searchPromptsPaged(keyword.trim(), size, cursor);
        List<PromptDocument> results = pagedResult.getItems();
        
        // 닉네임이 없는 프롬프트의 userId 수집하여 일괄 조회
        List<String> userIdsNeedingNickname = results.stream()
                .filter(p -> p.getNickname() == null || p.getNickname().isEmpty())
                .map(PromptDocument::getUserId)
                .filter(id -> id != null && !id.isEmpty())
                .distinct()
                .collect(Collectors.toList());
        Map<String, String> nicknameMap = userIdsNeedingNickname.isEmpty() 
                ? new HashMap<>() 
                : interactionService.getUserNicknamesBatch(userIdsNeedingNickname);
        
        // 좋아요/북마크 여부 일괄 조회
        List<String> promptIds = results.stream()
                .map(PromptDocument::getPromptId)
                .filter(id -> id != null)
                .collect(Collectors.toList());
        Map<String, Boolean> likedMap = new HashMap<>();
        Map<String, Boolean> bookmarkedMap = new HashMap<>();
        if (userId != null && !userId.isEmpty() && !promptIds.isEmpty()) {
            likedMap = interactionService.hasUserLikedBatch(userId, promptIds);
            bookmarkedMap = interactionService.hasUserBookmarkedBatch(userId, promptIds);
        }
        
        // OpenSearch 데이터 기반으로 결과 생성
        final Map<String, Boolean> finalLikedMap = likedMap;
        final Map<String, Boolean> finalBookmarkedMap = bookmarkedMap;
        List<Map<String, Object>> enrichedResults = results.stream()
                .map(prompt -> enrichPromptFromOpenSearchBatch(prompt, nicknameMap, finalLikedMap, finalBookmarkedMap))
                .collect(Collectors.toList());

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("prompts", enrichedResults);
        response.put("count", enrichedResults.size());
        response.put("hasNext", pagedResult.isHasNext());
        if (pagedResult.getNextCursor() != null) {
            response.put("nextCursor", pagedResult.getNextCursor());
        }
        
        return ResponseEntity.ok(response);
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
     * 전체 프롬프트 목록 (마켓플레이스용) - 최적화됨
     * OpenSearch에서 통계 데이터 포함하여 조회 (DynamoDB 조회 최소화)
     * GET /api/search/all
     */
    @GetMapping("/all")
    public ResponseEntity<Map<String, Object>> getAllPrompts(
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String userId,
            @RequestParam(required = false) String cursor) {

        // 페이지네이션 적용
        SearchService.PagedSearchResult pagedResult = searchService.getAllPromptsPaged(size, cursor);
        List<PromptDocument> results = pagedResult.getItems();
        
        // 닉네임이 없는 프롬프트의 userId 수집하여 일괄 조회
        List<String> userIdsNeedingNickname = results.stream()
                .filter(p -> p.getNickname() == null || p.getNickname().isEmpty())
                .map(PromptDocument::getUserId)
                .filter(id -> id != null && !id.isEmpty())
                .distinct()
                .collect(Collectors.toList());
        Map<String, String> nicknameMap = userIdsNeedingNickname.isEmpty() 
                ? new HashMap<>() 
                : interactionService.getUserNicknamesBatch(userIdsNeedingNickname);
        
        // 좋아요/북마크 여부 일괄 조회 (로그인한 경우만)
        List<String> promptIds = results.stream()
                .map(PromptDocument::getPromptId)
                .filter(id -> id != null)
                .collect(Collectors.toList());
        Map<String, Boolean> likedMap = new HashMap<>();
        Map<String, Boolean> bookmarkedMap = new HashMap<>();
        if (userId != null && !userId.isEmpty() && !promptIds.isEmpty()) {
            likedMap = interactionService.hasUserLikedBatch(userId, promptIds);
            bookmarkedMap = interactionService.hasUserBookmarkedBatch(userId, promptIds);
        }
        
        // OpenSearch 데이터 기반으로 결과 생성 (통계는 OpenSearch에서 가져옴)
        final Map<String, Boolean> finalLikedMap = likedMap;
        final Map<String, Boolean> finalBookmarkedMap = bookmarkedMap;
        List<Map<String, Object>> enrichedResults = results.stream()
                .map(prompt -> enrichPromptFromOpenSearchBatch(prompt, nicknameMap, finalLikedMap, finalBookmarkedMap))
                .collect(Collectors.toList());

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("prompts", enrichedResults);
        response.put("count", enrichedResults.size());
        response.put("hasNext", pagedResult.isHasNext());
        if (pagedResult.getNextCursor() != null) {
            response.put("nextCursor", pagedResult.getNextCursor());
        }
        
        return ResponseEntity.ok(response);
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
        
        // 닉네임 조회
        Map<String, String> nicknameMap = new HashMap<>();
        if (prompt.getNickname() == null || prompt.getNickname().isEmpty()) {
            String nickname = interactionService.getUserNickname(prompt.getUserId());
            if (nickname != null) {
                nicknameMap.put(prompt.getUserId(), nickname);
            }
        }
        
        Map<String, Object> enrichedPrompt = enrichPromptWithStats(prompt, stats, userId, nicknameMap);
        
        return ResponseEntity.ok(Map.of(
            "success", true,
            "prompt", enrichedPrompt
        ));
    }

    /**
     * 프롬프트 상세 + 댓글 통합 조회!
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
        
        // DynamoDB에서 통계, 댓글, 예시 입출력 가져오기
        PromptStats stats = interactionService.getPromptStats(promptId);
        List<Comment> comments = interactionService.getComments(promptId);
        List<Map<String, Object>> examples = interactionService.getPromptExamples(promptId);
        
        // 닉네임 조회
        Map<String, String> nicknameMap = new HashMap<>();
        if (prompt.getNickname() == null || prompt.getNickname().isEmpty()) {
            String nickname = interactionService.getUserNickname(prompt.getUserId());
            if (nickname != null) {
                nicknameMap.put(prompt.getUserId(), nickname);
            }
        }
        
        Map<String, Object> enrichedPrompt = enrichPromptWithStats(prompt, stats, userId, nicknameMap);
        
        // examples를 enrichedPrompt에 추가 (DynamoDB에서 가져온 데이터 우선)
        if (!examples.isEmpty()) {
            enrichedPrompt.put("examples", examples);
        }
        
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
     * 사용자별 프롬프트 조회 - 최적화됨
     * GET /api/search/user/{userId}
     */
    @GetMapping("/user/{userId}")
    public ResponseEntity<Map<String, Object>> getPromptsByUser(
            @PathVariable String userId,
            @RequestParam(defaultValue = "20") int size) {

        List<PromptDocument> results = searchService.getPromptsByUserId(userId, size);
        
        // 닉네임이 없는 프롬프트의 userId 수집하여 일괄 조회
        List<String> userIdsNeedingNickname = results.stream()
                .filter(p -> p.getNickname() == null || p.getNickname().isEmpty())
                .map(PromptDocument::getUserId)
                .filter(id -> id != null && !id.isEmpty())
                .distinct()
                .collect(Collectors.toList());
        Map<String, String> nicknameMap = userIdsNeedingNickname.isEmpty() 
                ? new HashMap<>() 
                : interactionService.getUserNicknamesBatch(userIdsNeedingNickname);
        
        // 좋아요/북마크 여부 일괄 조회
        List<String> promptIds = results.stream()
                .map(PromptDocument::getPromptId)
                .filter(id -> id != null)
                .collect(Collectors.toList());
        Map<String, Boolean> likedMap = new HashMap<>();
        Map<String, Boolean> bookmarkedMap = new HashMap<>();
        if (!promptIds.isEmpty()) {
            likedMap = interactionService.hasUserLikedBatch(userId, promptIds);
            bookmarkedMap = interactionService.hasUserBookmarkedBatch(userId, promptIds);
        }
        
        final Map<String, Boolean> finalLikedMap = likedMap;
        final Map<String, Boolean> finalBookmarkedMap = bookmarkedMap;
        List<Map<String, Object>> enrichedResults = results.stream()
                .map(prompt -> enrichPromptFromOpenSearchBatch(prompt, nicknameMap, finalLikedMap, finalBookmarkedMap))
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
        
        // 닉네임이 없는 프롬프트의 userId 수집하여 일괄 조회
        List<String> userIdsNeedingNickname = prompts.stream()
                .filter(p -> p.getNickname() == null || p.getNickname().isEmpty())
                .map(PromptDocument::getUserId)
                .filter(id -> id != null && !id.isEmpty())
                .distinct()
                .collect(Collectors.toList());
        Map<String, String> nicknameMap = userIdsNeedingNickname.isEmpty() 
                ? new HashMap<>() 
                : interactionService.getUserNicknamesBatch(userIdsNeedingNickname);
        
        // 좋아요/북마크 여부 일괄 조회
        List<String> promptIds = prompts.stream()
                .map(PromptDocument::getPromptId)
                .filter(id -> id != null)
                .collect(Collectors.toList());
        Map<String, Boolean> likedMap = new HashMap<>();
        Map<String, Boolean> bookmarkedMap = new HashMap<>();
        if (!promptIds.isEmpty()) {
            likedMap = interactionService.hasUserLikedBatch(userId, promptIds);
            bookmarkedMap = interactionService.hasUserBookmarkedBatch(userId, promptIds);
        }
        
        final Map<String, Boolean> finalLikedMap = likedMap;
        final Map<String, Boolean> finalBookmarkedMap = bookmarkedMap;
        List<Map<String, Object>> enrichedResults = prompts.stream()
                .map(prompt -> enrichPromptFromOpenSearchBatch(prompt, nicknameMap, finalLikedMap, finalBookmarkedMap))
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
        
        // 닉네임이 없는 프롬프트의 userId 수집하여 일괄 조회
        List<String> userIdsNeedingNickname = prompts.stream()
                .filter(p -> p.getNickname() == null || p.getNickname().isEmpty())
                .map(PromptDocument::getUserId)
                .filter(id -> id != null && !id.isEmpty())
                .distinct()
                .collect(Collectors.toList());
        Map<String, String> nicknameMap = userIdsNeedingNickname.isEmpty() 
                ? new HashMap<>() 
                : interactionService.getUserNicknamesBatch(userIdsNeedingNickname);
        
        // 좋아요/북마크 여부 일괄 조회
        List<String> promptIds = prompts.stream()
                .map(PromptDocument::getPromptId)
                .filter(id -> id != null)
                .collect(Collectors.toList());
        Map<String, Boolean> likedMap = new HashMap<>();
        Map<String, Boolean> bookmarkedMap = new HashMap<>();
        if (!promptIds.isEmpty()) {
            likedMap = interactionService.hasUserLikedBatch(userId, promptIds);
            bookmarkedMap = interactionService.hasUserBookmarkedBatch(userId, promptIds);
        }
        
        final Map<String, Boolean> finalLikedMap = likedMap;
        final Map<String, Boolean> finalBookmarkedMap = bookmarkedMap;
        List<Map<String, Object>> enrichedResults = prompts.stream()
                .map(prompt -> enrichPromptFromOpenSearchBatch(prompt, nicknameMap, finalLikedMap, finalBookmarkedMap))
                .collect(Collectors.toList());

        return ResponseEntity.ok(Map.of(
            "success", true,
            "prompts", enrichedResults,
            "count", enrichedResults.size()
        ));
    }

    /**
     * 사용자가 댓글 남긴 프롬프트 목록
     * GET /api/search/user/{userId}/comments
     */
    @GetMapping("/user/{userId}/comments")
    public ResponseEntity<Map<String, Object>> getUserCommentedPrompts(
            @PathVariable String userId,
            @RequestParam(defaultValue = "20") int size) {

        List<String> commentedPromptIds = interactionService.getUserCommentedPrompts(userId);
        
        // OpenSearch에서 프롬프트 정보 가져오기
        List<PromptDocument> prompts = commentedPromptIds.stream()
                .limit(size)
                .map(searchService::getPromptById)
                .filter(p -> p != null)
                .collect(Collectors.toList());
        
        // 닉네임이 없는 프롬프트의 userId 수집하여 일괄 조회
        List<String> userIdsNeedingNickname = prompts.stream()
                .filter(p -> p.getNickname() == null || p.getNickname().isEmpty())
                .map(PromptDocument::getUserId)
                .filter(id -> id != null && !id.isEmpty())
                .distinct()
                .collect(Collectors.toList());
        Map<String, String> nicknameMap = userIdsNeedingNickname.isEmpty() 
                ? new HashMap<>() 
                : interactionService.getUserNicknamesBatch(userIdsNeedingNickname);
        
        // 좋아요/북마크 여부 일괄 조회
        List<String> promptIds = prompts.stream()
                .map(PromptDocument::getPromptId)
                .filter(id -> id != null)
                .collect(Collectors.toList());
        Map<String, Boolean> likedMapComments = new HashMap<>();
        Map<String, Boolean> bookmarkedMapComments = new HashMap<>();
        if (!promptIds.isEmpty()) {
            likedMapComments = interactionService.hasUserLikedBatch(userId, promptIds);
            bookmarkedMapComments = interactionService.hasUserBookmarkedBatch(userId, promptIds);
        }
        
        final Map<String, Boolean> finalLikedMapComments = likedMapComments;
        final Map<String, Boolean> finalBookmarkedMapComments = bookmarkedMapComments;
        List<Map<String, Object>> enrichedCommentsResults = prompts.stream()
                .map(prompt -> enrichPromptFromOpenSearchBatch(prompt, nicknameMap, finalLikedMapComments, finalBookmarkedMapComments))
                .collect(Collectors.toList());

        return ResponseEntity.ok(Map.of(
            "success", true,
            "prompts", enrichedCommentsResults,
            "count", enrichedCommentsResults.size()
        ));
    }

    /**
     * OpenSearch 프롬프트 데이터에 DynamoDB 통계 및 기본 정보 병합
     * DynamoDB 데이터를 우선 사용 (더 정확한 원본 데이터)
     * @deprecated 상세 페이지용으로만 사용, 목록 조회는 enrichPromptFromOpenSearch 사용
     */
    private Map<String, Object> enrichPromptWithStats(PromptDocument prompt, PromptStats stats, String userId, Map<String, String> nicknameMap) {
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
        
        // 닉네임: OpenSearch에 있으면 사용, 없으면 nicknameMap에서 조회
        String nickname = prompt.getNickname();
        if (nickname == null || nickname.isEmpty()) {
            // nicknameMap에서 조회 (USER# 접두사 있는 버전과 없는 버전 모두 시도)
            String promptUserId = prompt.getUserId();
            if (promptUserId != null && nicknameMap != null) {
                nickname = nicknameMap.get(promptUserId);
                if (nickname == null) {
                    nickname = nicknameMap.get(promptUserId.replace("USER#", ""));
                }
            }
        }
        result.put("nickname", nickname);
        
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
            result.put("likeCount", prompt.getLikeCount() != null ? prompt.getLikeCount() : 0);
            result.put("bookmarkCount", prompt.getBookmarkCount() != null ? prompt.getBookmarkCount() : 0);
            result.put("commentCount", prompt.getCommentCount() != null ? prompt.getCommentCount() : 0);
        }
        
        // 사용자별 좋아요/북마크 여부
        if (userId != null && !userId.isEmpty() && prompt.getPromptId() != null) {
            result.put("isLiked", interactionService.hasUserLiked(userId, prompt.getPromptId()));
            result.put("isBookmarked", interactionService.hasUserBookmarked(userId, prompt.getPromptId()));
        }
        
        return result;
    }

    /**
     * OpenSearch 데이터만으로 프롬프트 정보 구성 (최적화됨)
     * 목록 조회용 - DynamoDB 통계 조회 없이 OpenSearch 데이터 사용
     * @deprecated enrichPromptFromOpenSearchBatch 사용 권장
     */
    private Map<String, Object> enrichPromptFromOpenSearch(PromptDocument prompt, String userId, Map<String, String> nicknameMap) {
        Map<String, Object> result = new HashMap<>();
        
        result.put("promptId", prompt.getPromptId());
        result.put("title", prompt.getTitle() != null ? prompt.getTitle() : "제목 없음");
        result.put("description", prompt.getDescription() != null ? prompt.getDescription() : "");
        result.put("content", prompt.getContent());
        result.put("category", prompt.getCategory());
        result.put("model", prompt.getModel() != null ? prompt.getModel() : "AI Model");
        result.put("promptType", prompt.getPromptType());
        result.put("userId", prompt.getUserId());
        
        // 닉네임: OpenSearch에 있으면 사용, 없으면 nicknameMap에서 조회
        String nickname = prompt.getNickname();
        if ((nickname == null || nickname.isEmpty()) && nicknameMap != null) {
            String promptUserId = prompt.getUserId();
            if (promptUserId != null) {
                nickname = nicknameMap.get(promptUserId);
                if (nickname == null) {
                    nickname = nicknameMap.get(promptUserId.replace("USER#", ""));
                }
            }
        }
        result.put("nickname", nickname);
        
        result.put("status", prompt.getStatus());
        result.put("price", prompt.getPrice());
        result.put("createdAt", prompt.getCreatedAt());
        result.put("evaluationMetrics", prompt.getEvaluationMetrics());
        result.put("isPublic", prompt.getIsPublic());
        
        if (prompt.getScore() != null) {
            result.put("score", prompt.getScore());
        }
        
        // OpenSearch에서 통계 데이터 가져오기 (Lambda에서 동기화됨)
        result.put("likeCount", prompt.getLikeCount() != null ? prompt.getLikeCount() : 0);
        result.put("bookmarkCount", prompt.getBookmarkCount() != null ? prompt.getBookmarkCount() : 0);
        result.put("commentCount", prompt.getCommentCount() != null ? prompt.getCommentCount() : 0);
        
        // 사용자별 좋아요/북마크 여부 (DynamoDB 조회 필요)
        if (userId != null && !userId.isEmpty() && prompt.getPromptId() != null) {
            result.put("isLiked", interactionService.hasUserLiked(userId, prompt.getPromptId()));
            result.put("isBookmarked", interactionService.hasUserBookmarked(userId, prompt.getPromptId()));
        }
        
        return result;
    }

    /**
     * OpenSearch 데이터 + 일괄 조회된 좋아요/북마크 정보로 프롬프트 구성 (완전 최적화)
     * N+1 문제 해결 - 모든 데이터를 미리 일괄 조회하여 전달
     */
    private Map<String, Object> enrichPromptFromOpenSearchBatch(
            PromptDocument prompt, 
            Map<String, String> nicknameMap,
            Map<String, Boolean> likedMap,
            Map<String, Boolean> bookmarkedMap) {
        
        Map<String, Object> result = new HashMap<>();
        
        result.put("promptId", prompt.getPromptId());
        result.put("title", prompt.getTitle() != null ? prompt.getTitle() : "제목 없음");
        result.put("description", prompt.getDescription() != null ? prompt.getDescription() : "");
        result.put("content", prompt.getContent());
        result.put("category", prompt.getCategory());
        result.put("model", prompt.getModel() != null ? prompt.getModel() : "AI Model");
        result.put("promptType", prompt.getPromptType());
        result.put("userId", prompt.getUserId());
        
        // 닉네임: OpenSearch에 있으면 사용, 없으면 nicknameMap에서 조회
        String nickname = prompt.getNickname();
        if ((nickname == null || nickname.isEmpty()) && nicknameMap != null) {
            String promptUserId = prompt.getUserId();
            if (promptUserId != null) {
                nickname = nicknameMap.get(promptUserId);
                if (nickname == null) {
                    nickname = nicknameMap.get(promptUserId.replace("USER#", ""));
                }
            }
        }
        result.put("nickname", nickname);
        
        result.put("status", prompt.getStatus());
        result.put("price", prompt.getPrice());
        result.put("createdAt", prompt.getCreatedAt());
        result.put("evaluationMetrics", prompt.getEvaluationMetrics());
        result.put("isPublic", prompt.getIsPublic());
        
        if (prompt.getScore() != null) {
            result.put("score", prompt.getScore());
        }
        
        // OpenSearch에서 통계 데이터 가져오기
        result.put("likeCount", prompt.getLikeCount() != null ? prompt.getLikeCount() : 0);
        result.put("bookmarkCount", prompt.getBookmarkCount() != null ? prompt.getBookmarkCount() : 0);
        result.put("commentCount", prompt.getCommentCount() != null ? prompt.getCommentCount() : 0);
        
        // 일괄 조회된 좋아요/북마크 여부 사용 (N+1 문제 해결)
        String promptId = prompt.getPromptId();
        if (promptId != null) {
            result.put("isLiked", likedMap.getOrDefault(promptId, false));
            result.put("isBookmarked", bookmarkedMap.getOrDefault(promptId, false));
        }
        
        return result;
    }

    /**
     * 사용자의 모든 프롬프트 닉네임 업데이트 (내부 API)
     * PUT /api/search/user/{userId}/nickname
     */
    @PutMapping("/user/{userId}/nickname")
    public ResponseEntity<Map<String, Object>> updateUserPromptsNickname(
            @PathVariable String userId,
            @RequestBody Map<String, String> request) {
        
        String newNickname = request.get("nickname");
        if (newNickname == null || newNickname.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "message", "닉네임을 입력해주세요"
            ));
        }
        
        int updatedCount = searchService.updateUserPromptsNickname(userId, newNickname);
        
        return ResponseEntity.ok(Map.of(
            "success", true,
            "message", "프롬프트 닉네임 업데이트 완료",
            "updatedCount", updatedCount
        ));
    }
}
