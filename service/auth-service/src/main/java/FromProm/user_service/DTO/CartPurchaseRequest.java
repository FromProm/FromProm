package FromProm.user_service.DTO;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CartPurchaseRequest {
    private List<CartItem> items;
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CartItem {
        private String id;             // 프롬프트 ID (프론트엔드 CartItem.id)
        private String title;          // 프롬프트 제목
        private int price;             // 프롬프트 가격
        private String category;       // 카테고리
        private String sellerName;     // 판매자 이름
        private String description;    // 설명
        private double rating;         // 평점
        private String sellerSub;      // 판매자 USER ID (백엔드에서 필요)
    }
}