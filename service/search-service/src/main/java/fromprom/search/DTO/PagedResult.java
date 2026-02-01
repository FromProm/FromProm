package fromprom.search.DTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * 페이지네이션 결과를 담는 DTO
 * Cursor 기반 페이지네이션 지원
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PagedResult<T> {
    
    private List<T> items;
    
    // 다음 페이지 조회를 위한 커서 (마지막 항목의 정렬 값)
    private String nextCursor;
    
    // 다음 페이지 존재 여부
    private boolean hasNext;
    
    // 전체 개수 (선택적, 성능상 이유로 생략 가능)
    private Long totalCount;
    
    // 현재 페이지 크기
    private int size;
}
