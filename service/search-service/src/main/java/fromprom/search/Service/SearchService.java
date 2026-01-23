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
                                                    .fields("title^3", "prompt_description^2", "prompt_content")
                                                    .query(keyword)
                                                    .fuzziness("AUTO")
                                            )
                                    )
                                    .should(sh -> sh.term(t -> t.field("status").value(FieldValue.of("ACTIVE"))))
                                    .should(sh -> sh.term(t -> t.field("status").value(FieldValue.of("completed"))))
                                    .minimumShouldMatch("1")
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
                                    .should(sh -> sh.term(t -> t.field("status").value(FieldValue.of("ACTIVE"))))
                                    .should(sh -> sh.term(t -> t.field("status").value(FieldValue.of("completed"))))
                                    .minimumShouldMatch("1")
                            )
                    )
                    .sort(sort -> sort.field(f -> f.field("created_at").order(SortOrder.Desc)))
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
                                    .should(sh -> sh.term(t -> t.field("status").value(FieldValue.of("ACTIVE"))))
                                    .should(sh -> sh.term(t -> t.field("status").value(FieldValue.of("completed"))))
                                    .minimumShouldMatch("1")
                            )
                    )
                    .sort(sort -> sort.field(f -> f.field("created_at").order(SortOrder.Desc)))
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
                                        .should(sh -> sh.term(t -> t.field("status").value(FieldValue.of("ACTIVE"))))
                                        .should(sh -> sh.term(t -> t.field("status").value(FieldValue.of("completed"))))
                                        .minimumShouldMatch("1");
                                
                                // 키워드 검색
                                if (keyword != null && !keyword.isEmpty()) {
                                    builder.must(m -> m
                                            .multiMatch(mm -> mm
                                                    .fields("title^3", "prompt_description^2", "prompt_content")
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
                    .sort(sort -> sort.field(f -> f.field("created_at").order(SortOrder.Desc)))
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
                            .bool(b -> b
                                    .should(sh -> sh.term(t -> t.field("status").value(FieldValue.of("ACTIVE"))))
                                    .should(sh -> sh.term(t -> t.field("status").value(FieldValue.of("completed"))))
                                    .minimumShouldMatch("1")
                            )
                    )
                    .sort(sort -> sort.field(f -> f.field("created_at").order(SortOrder.Desc)))
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
                                    .should(sh -> sh.term(t -> t.field("status").value(FieldValue.of("ACTIVE"))))
                                    .should(sh -> sh.term(t -> t.field("status").value(FieldValue.of("completed"))))
                                    .minimumShouldMatch("1")
                                    .must(m -> m.exists(e -> e.field("evaluation_metrics.final_score")))
                            )
                    )
                    .sort(sort -> sort.field(f -> f
                            .field("evaluation_metrics.final_score")
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
                            .term(t -> t.field("create_user").value(FieldValue.of(userId)))
                    )
                    .sort(sort -> sort.field(f -> f.field("created_at").order(SortOrder.Desc)))
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
}
