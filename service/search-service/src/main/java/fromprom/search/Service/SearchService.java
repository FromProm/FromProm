package fromprom.search.Service;

import fromprom.search.DTO.PromptDocument;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.opensearch.client.opensearch.OpenSearchClient;
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
    private final OpenSearchClient openSearchClient;

    public List<PromptDocument> searchPrompts(String keyword) {
        List<PromptDocument> resultList = new ArrayList<>();
        String indexName = "prompts"; // OpenSearch 인덱스 이름

        try {
            // 1. 검색 요청 빌드
            SearchResponse<PromptDocument> response = openSearchClient.search(s -> s
                            .index(indexName)
                            .query(q -> q
                                    .multiMatch(m -> m
                                            .fields("title", "content") // 제목과 내용에서 검색
                                            .query(keyword)             // 사용자가 입력한 단어
                                            .fuzziness("AUTO")          // 오타 자동 보정 (ex: ciy -> city)
                                    )
                            )
                            .size(20) // 결과 20개만 가져오기
                    , PromptDocument.class // 결과를 매핑할 클래스
            );

            // 2. 결과 파싱
            for (Hit<PromptDocument> hit : response.hits().hits()) {
                PromptDocument doc = hit.source();
                if (doc != null) {
                    doc.setId(hit.id());       // 문서 ID 주입
                    doc.setScore(hit.score()); // 정확도 점수 주입
                    resultList.add(doc);
                }
            }

        } catch (IOException e) {
            log.error("OpenSearch 검색 실패: {}", e.getMessage());
            // 필요 시 커스텀 예외 던지기
        }

        return resultList;
    }
}
