package FromProm.user_service.Service;

import FromProm.user_service.DTO.CreditUseRequest;
import FromProm.user_service.Entity.Credit;
import FromProm.user_service.Entity.User;
import FromProm.user_service.Repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbEnhancedClient;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbTable;
import software.amazon.awssdk.enhanced.dynamodb.TableSchema;
import software.amazon.awssdk.enhanced.dynamodb.model.QueryConditional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CreditService {

    private final DynamoDbEnhancedClient enhancedClient;
    private final UserRepository userRepository;
    private final String TABLE_NAME = "FromProm_Table"; // 실제 테이블명으로 수정

    // 1. 크레딧 충전
    public void chargeCredit(String userSub, int amount) {
        User user = userRepository.findUser(userSub)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));

        int newBalance = user.getCredit() + amount;
        user.setCredit(newBalance);
        user.setUpdated_at(LocalDateTime.now().toString());

        String now = LocalDateTime.now().toString();
        String uniqueSK = "CREDIT#" + now + "#" + UUID.randomUUID().toString().substring(0, 8);

        Credit history = Credit.builder()
                .PK(userSub)
                .SK(uniqueSK)
                .type("CREDIT")
                .amount(amount)
                .balance(newBalance)
                .user_description("크레딧 충전")
                .created_at(now)
                .build();

        userRepository.update(user);
        saveCreditHistory(history);
    }

    // 2. 크레딧 사용
    public void useCredit(String userSub, CreditUseRequest request) {
        User user = userRepository.findUser(userSub)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));

        if (user.getCredit() < request.getAmount()) {
            throw new RuntimeException("잔액이 부족합니다. 현재 잔액: " + user.getCredit());
        }

        int newBalance = user.getCredit() - request.getAmount();
        user.setCredit(newBalance);
        user.setUpdated_at(LocalDateTime.now().toString());

        String now = LocalDateTime.now().toString();
        String uniqueSK = "CREDIT#" + now + "#" + UUID.randomUUID().toString().substring(0, 8);

        Credit history = Credit.builder()
                .PK(userSub)
                .SK(uniqueSK)
                .type("CREDIT")
                .amount(-request.getAmount())
                .balance(newBalance)
                .user_description(request.getUser_description())
                .created_at(now)
                .build();

        userRepository.update(user);
        saveCreditHistory(history);
    }

    // 3. 내역 조회
    public List<Credit> getCreditHistory(String userSub) {
        DynamoDbTable<Credit> creditTable = enhancedClient.table(TABLE_NAME, TableSchema.fromBean(Credit.class));

        QueryConditional queryConditional = QueryConditional
                .sortBeginsWith(s -> s.partitionValue(userSub).sortValue("CREDIT#"));

        return creditTable.query(r -> r.queryConditional(queryConditional).scanIndexForward(false))
                .items().stream().collect(Collectors.toList());
    }

    // 내부 저장 로직 전용
    private void saveCreditHistory(Credit history) {
        DynamoDbTable<Credit> creditTable = enhancedClient.table(TABLE_NAME, TableSchema.fromBean(Credit.class));
        creditTable.putItem(history);
    }

    //크레딧 잔액 조회
    public int getUserCredit(String userSub) {
        User user = userRepository.findUser(userSub)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));
        return user.getCredit();
    }
}