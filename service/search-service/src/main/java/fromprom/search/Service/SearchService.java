package fromprom.search.Service;

import fromprom.search.DTO.PromptDocument;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.opensearch.client.json.JsonData;
import org.opensearch.client.opensearch.OpenSearchClient;
import org.opensearch.client.opensearch._types.FieldValue;
import org.opensearch.client.opensearch._types.SortOrder;
import org.opensearch.client.opensearch._types.query_dsl.BoolQuery;
import org.opensearch.client.opensearch.core.SearchResponse;
import org.opensearch.client.opensearch.core.search.Hit;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class SearchService {
    
    private static final String INDEX_NAME = "prompts";
    private final OpenSearchClient openSearchClient;

    /**
     * 키워드로 프롬프트 검색 (title, description, content 필드)
     */
    public List<PromptDocument> searchPrompts(String keyword) {
        List<PromptDocument> resultList = new ArrayList<>();

        try {
            SearchResponse<PromptDocument> response = openSearchClient.search(s -> s
                    .index(INDEX_NAME)
                    .query(q -> q
                            .bool(b -> b
                                    .must(m -> m
                                            .multiMatch(mm -> mm
                                                    .fields("title^3", "description^2", "content")
                                                    .query(keyword)
                                                    .fuzziness("AUTO")
                                            )
                                    )
                                    .filter(f -> f.term(t -> t.field("status").value(FieldValue.of("completed"))))
                            )
                    )
                    .size(20),
                    PromptDocument.class
            );

            for (Hit<PromptDocument> hit : response.hits().hits()) {
                PromptDocument doc = hit.source();
                if (doc != null) {
                    doc.setPromptId(hit.id());
                    doc.setScore(hit.score());
                    resultList.add(doc);
                }
            }

        } catch (IOException e) {
            log.error("OpenSearch 검색 실패: {}", e.getMessage());
        }

        return resultList;
    }

    /**
     * 카테고리별 프롬프트 검색
     */
    public List<PromptDocument> searchByCategory(String category, int size) {
        List<PromptDocument> resultList = new ArrayList<>();

        try {
            SearchResponse<PromptDocument> response = openSearchClient.search(s -> s
                    .index(INDEX_NAME)
                    .query(q -> q
                            .bool(b -> b
                                    .must(m -> m.term(t -> t.field("category").value(FieldValue.of(category))))
                                    .filter(f -> f.term(t -> t.field("status").value(FieldValue.of("completed"))))
                            )
                    )
                    .sort(sort -> sort.field(f -> f.field("createdAt").order(SortOrder.Desc)))
                    .size(size),
                    PromptDocument.class
            );

            for (Hit<PromptDocument> hit : response.hits().hits()) {
                PromptDocument doc = hit.source();
                if (doc != null) {
                    doc.setPromptId(hit.id());
                    resultList.add(doc);
                }
            }

        } catch (IOException e) {
            log.error("카테고리 검색 실패: {}", e.getMessage());
        }

        return resultList;
    }

    /**
     * 모델별 프롬프트 검색
     */
    public List<PromptDocument> searchByModel(String model, int size) {
        List<PromptDocument> resultList = new ArrayList<>();

        try {
            SearchResponse<PromptDocument> response = openSearchClient.search(s -> s
                    .index(INDEX_NAME)
                    .query(q -> q
                            .bool(b -> b
                                    .must(m -> m.term(t -> t.field("model").value(FieldValue.of(model))))
                                    .filter(f -> f.term(t -> t.field("status").value(FieldValue.of("completed"))))
                            )
                    )
                    .sort(sort -> sort.field(f -> f.field("createdAt").order(SortOrder.Desc)))
                    .size(size),
                    PromptDocument.class
            );

            for (Hit<PromptDocument> hit : response.hits().hits()) {
                PromptDocument doc = hit.source();
                if (doc != null) {
                    doc.setPromptId(hit.id());
                    resultList.add(doc);
                }
            }

        } catch (IOException e) {
            log.error("모델 검색 실패: {}", e.getMessage());
        }

        return resultList;
    }

    /**
     * 고급 검색 (키워드 + 필터)
     */
    public List<PromptDocument> advancedSearch(String keyword, String category, String model, 
                                                Integer minPrice, Integer maxPrice, int size) {
        List<PromptDocument> resultList = new ArrayList<>();

        try {
            SearchResponse<PromptDocument> response = openSearchClient.search(s -> s
                    .index(INDEX_NAME)
                    .query(q -> q
                            .bool(b -> {
                                BoolQuery.Builder builder = b
                                        .filter(f -> f.term(t -> t.field("status").value(FieldValue.of("completed"))));
                                
                                // 키워드 검색
                                if (keyword != null && !keyword.isEmpty()) {
                                    builder.must(m -> m
                                            .multiMatch(mm -> mm
                                                    .fields("title^3", "description^2", "content")
                                                    .query(keyword)
                                                    .fuzziness("AUTO")
                                            )
                                    );
                                }
                                
                                // 카테고리 필터
                                if (category != null && !category.isEmpty()) {
                                    builder.filter(f -> f.term(t -> t.field("category").value(FieldValue.of(category))));
                                }
                                
                                // 모델 필터
                                if (model != null && !model.isEmpty()) {
                                    builder.filter(f -> f.term(t -> t.field("model").value(FieldValue.of(model))));
                                }
                                
                                // 가격 범위 필터
                                if (minPrice != null || maxPrice != null) {
                                    builder.filter(f -> f
                                            .range(r -> {
                                                r.field("price");
                                                if (minPrice != null) r.gte(JsonData.of(minPrice));
                                                if (maxPrice != null) r.lte(JsonData.of(maxPrice));
                                                return r;
                                            })
                                    );
                                }
                                
                                return builder;
                            })
                    )
                    .sort(sort -> sort.field(f -> f.field("createdAt").order(SortOrder.Desc)))
                    .size(size),
                    PromptDocument.class
            );

            for (Hit<PromptDocument> hit : response.hits().hits()) {
                PromptDocument doc = hit.source();
                if (doc != null) {
                    doc.setPromptId(hit.id());
                    doc.setScore(hit.score());
                    resultList.add(doc);
                }
            }

        } catch (IOException e) {
            log.error("고급 검색 실패: {}", e.getMessage());
        }

        return resultList;
    }

    /**
     * 전체 프롬프트 목록 조회 (최신순으로)
     */
    public List<PromptDocument> getAllPrompts(int size) {
        List<PromptDocument> resultList = new ArrayList<>();

        try {
            SearchResponse<PromptDocument> response = openSearchClient.search(s -> s
                    .index(INDEX_NAME)
                    .query(q -> q
                            .term(t -> t.field("status").value(FieldValue.of("completed")))
                    )
                    .sort(sort -> sort.field(f -> f.field("createdAt").order(SortOrder.Desc)))
                    .size(size),
                    PromptDocument.class
            );

            for (Hit<PromptDocument> hit : response.hits().hits()) {
                PromptDocument doc = hit.source();
                if (doc != null) {
                    doc.setPromptId(hit.id());
                    resultList.add(doc);
                }
            }

        } catch (IOException e) {
            log.error("전체 프롬프트 조회 실패: {}", e.getMessage());
        }

        return resultList;
    }

    /**
     * 전체 프롬프트 목록 조회 (Cursor 기반 페이지네이션)
     * @param size 페이지 크기
     * @param cursor 이전 페이지의 마지막 createdAt 값 (첫 페이지는 null)
     * @return 프롬프트 목록과 다음 커서
     */
    public PagedSearchResult getAllPromptsPaged(int size, String cursor) {
        List<PromptDocument> resultList = new ArrayList<>();
        String nextCursor = null;
        boolean hasNext = false;

        try {
            // size + 1개를 조회하여 다음 페이지 존재 여부 확인
            int fetchSize = size + 1;
            
            SearchResponse<PromptDocument> response;
            
            if (cursor != null && !cursor.isEmpty()) {
                // 커서가 있으면 search_after 사용
                final String cursorValue = cursor;
                response = openSearchClient.search(s -> s
                        .index(INDEX_NAME)
                        .query(q -> q
                                .term(t -> t.field("status").value(FieldValue.of("completed")))
                        )
                        .sort(sort -> sort.field(f -> f.field("createdAt").order(SortOrder.Desc)))
                        .sort(sort -> sort.field(f -> f.field("_id").order(SortOrder.Desc)))
                        .searchAfter(List.of(cursorValue, ""))
                        .size(fetchSize),
                        PromptDocument.class
                );
            } else {
                // 첫 페이지
                response = openSearchClient.search(s -> s
                        .index(INDEX_NAME)
                        .query(q -> q
                                .term(t -> t.field("status").value(FieldValue.of("completed")))
                        )
                        .sort(sort -> sort.field(f -> f.field("createdAt").order(SortOrder.Desc)))
                        .sort(sort -> sort.field(f -> f.field("_id").order(SortOrder.Desc)))
                        .size(fetchSize),
                        PromptDocument.class
                );
            }

            List<Hit<PromptDocument>> hits = response.hits().hits();
            
            // 다음 페이지 존재 여부 확인
            if (hits.size() > size) {
                hasNext = true;
                hits = hits.subList(0, size);
            }

            for (Hit<PromptDocument> hit : hits) {
                PromptDocument doc = hit.source();
                if (doc != null) {
                    doc.setPromptId(hit.id());
                    resultList.add(doc);
                }
            }
            
            // 다음 커서 설정 (마지막 항목의 createdAt)
            if (!resultList.isEmpty() && hasNext) {
                PromptDocument lastDoc = resultList.get(resultList.size() - 1);
                nextCursor = lastDoc.getCreatedAt();
            }

        } catch (IOException e) {
            log.error("전체 프롬프트 페이지네이션 조회 실패: {}", e.getMessage());
        }

        return new PagedSearchResult(resultList, nextCursor, hasNext);
    }

    /**
     * 키워드 검색 (Cursor 기반 페이지네이션)
     */
    public PagedSearchResult searchPromptsPaged(String keyword, int size, String cursor) {
        List<PromptDocument> resultList = new ArrayList<>();
        String nextCursor = null;
        boolean hasNext = false;

        try {
            int fetchSize = size + 1;
            
            SearchResponse<PromptDocument> response;
            
            if (cursor != null && !cursor.isEmpty()) {
                final String cursorValue = cursor;
                response = openSearchClient.search(s -> s
                        .index(INDEX_NAME)
                        .query(q -> q
                                .bool(b -> b
                                        .must(m -> m
                                                .multiMatch(mm -> mm
                                                        .fields("title^3", "description^2", "content")
                                                        .query(keyword)
                                                        .fuzziness("AUTO")
                                                )
                                        )
                                        .filter(f -> f.term(t -> t.field("status").value(FieldValue.of("completed"))))
                                )
                        )
                        .sort(sort -> sort.field(f -> f.field("_score").order(SortOrder.Desc)))
                        .sort(sort -> sort.field(f -> f.field("createdAt").order(SortOrder.Desc)))
                        .searchAfter(List.of(cursorValue, ""))
                        .size(fetchSize),
                        PromptDocument.class
                );
            } else {
                response = openSearchClient.search(s -> s
                        .index(INDEX_NAME)
                        .query(q -> q
                                .bool(b -> b
                                        .must(m -> m
                                                .multiMatch(mm -> mm
                                                        .fields("title^3", "description^2", "content")
                                                        .query(keyword)
                                                        .fuzziness("AUTO")
                                                )
                                        )
                                        .filter(f -> f.term(t -> t.field("status").value(FieldValue.of("completed"))))
                                )
                        )
                        .sort(sort -> sort.field(f -> f.field("_score").order(SortOrder.Desc)))
                        .sort(sort -> sort.field(f -> f.field("createdAt").order(SortOrder.Desc)))
                        .size(fetchSize),
                        PromptDocument.class
                );
            }

            List<Hit<PromptDocument>> hits = response.hits().hits();
            
            if (hits.size() > size) {
                hasNext = true;
                hits = hits.subList(0, size);
            }

            for (Hit<PromptDocument> hit : hits) {
                PromptDocument doc = hit.source();
                if (doc != null) {
                    doc.setPromptId(hit.id());
                    doc.setScore(hit.score());
                    resultList.add(doc);
                }
            }
            
            if (!resultList.isEmpty() && hasNext) {
                PromptDocument lastDoc = resultList.get(resultList.size() - 1);
                nextCursor = lastDoc.getCreatedAt();
            }

        } catch (IOException e) {
            log.error("키워드 검색 페이지네이션 실패: {}", e.getMessage());
        }

        return new PagedSearchResult(resultList, nextCursor, hasNext);
    }

    /**
     * 페이지네이션 결과를 담는 내부 클래스
     */
    @lombok.Data
    @lombok.AllArgsConstructor
    public static class PagedSearchResult {
        private List<PromptDocument> items;
        private String nextCursor;
        private boolean hasNext;
    }

    /**
     * 프롬프트 상세 조회 (ID로)
     */
    public PromptDocument getPromptById(String promptId) {
        try {
            var response = openSearchClient.get(g -> g
                    .index(INDEX_NAME)
                    .id(promptId),
                    PromptDocument.class
            );

            if (response.found() && response.source() != null) {
                PromptDocument doc = response.source();
                doc.setPromptId(response.id());
                return doc;
            }

        } catch (IOException e) {
            log.error("프롬프트 조회 실패: {}", e.getMessage());
        }

        return null;
    }

    /**
     * 인기 프롬프트 조회 (평가 점수 기준)
     */
    public List<PromptDocument> getTopRatedPrompts(int size) {
        List<PromptDocument> resultList = new ArrayList<>();

        try {
            SearchResponse<PromptDocument> response = openSearchClient.search(s -> s
                    .index(INDEX_NAME)
                    .query(q -> q
                            .bool(b -> b
                                    .filter(f -> f.term(t -> t.field("status").value(FieldValue.of("completed"))))
                                    .must(m -> m.exists(e -> e.field("evaluationMetrics.finalScore")))
                            )
                    )
                    .sort(sort -> sort.field(f -> f
                            .field("evaluationMetrics.finalScore")
                            .order(SortOrder.Desc)))
                    .size(size),
                    PromptDocument.class
            );

            for (Hit<PromptDocument> hit : response.hits().hits()) {
                PromptDocument doc = hit.source();
                if (doc != null) {
                    doc.setPromptId(hit.id());
                    resultList.add(doc);
                }
            }

        } catch (IOException e) {
            log.error("인기 프롬프트 조회 실패: {}", e.getMessage());
        }

        return resultList;
    }

    /**
     * 사용자별 프롬프트 조회
     */
    public List<PromptDocument> getPromptsByUserId(String userId, int size) {
        List<PromptDocument> resultList = new ArrayList<>();

        try {
            SearchResponse<PromptDocument> response = openSearchClient.search(s -> s
                    .index(INDEX_NAME)
                    .query(q -> q
                            .term(t -> t.field("userId").value(FieldValue.of(userId)))
                    )
                    .sort(sort -> sort.field(f -> f.field("createdAt").order(SortOrder.Desc)))
                    .size(size),
                    PromptDocument.class
            );

            for (Hit<PromptDocument> hit : response.hits().hits()) {
                PromptDocument doc = hit.source();
                if (doc != null) {
                    doc.setPromptId(hit.id());
                    resultList.add(doc);
                }
            }

        } catch (IOException e) {
            log.error("사용자 프롬프트 조회 실패: {}", e.getMessage());
        }

        return resultList;
    }

    /**
     * 사용자의 모든 프롬프트 닉네임 업데이트
     */
    public int updateUserPromptsNickname(String userId, String newNickname) {
        int updatedCount = 0;

        try {
            // 1. 해당 사용자의 모든 프롬프트 조회
            SearchResponse<PromptDocument> response = openSearchClient.search(s -> s
                    .index(INDEX_NAME)
                    .query(q -> q
                            .term(t -> t.field("userId").value(FieldValue.of(userId)))
                    )
                    .size(1000),
                    PromptDocument.class
            );

            // 2. 각 프롬프트의 nickname 필드 업데이트
            for (Hit<PromptDocument> hit : response.hits().hits()) {
                try {
                    openSearchClient.update(u -> u
                            .index(INDEX_NAME)
                            .id(hit.id())
                            .doc(java.util.Map.of("nickname", newNickname)),
                            PromptDocument.class
                    );
                    updatedCount++;
                    log.info("OpenSearch 프롬프트 닉네임 업데이트 완료: {}", hit.id());
                } catch (IOException e) {
                    log.error("OpenSearch 프롬프트 닉네임 업데이트 실패: {} - {}", hit.id(), e.getMessage());
                }
            }

        } catch (IOException e) {
            log.error("사용자 프롬프트 조회 실패: {}", e.getMessage());
        }

        return updatedCount;
    }
}
