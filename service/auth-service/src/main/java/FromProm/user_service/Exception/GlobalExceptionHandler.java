package FromProm.user_service.Exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import software.amazon.awssdk.services.dynamodb.model.TransactionCanceledException;

// 프로젝트 전역에서 발생하는 에러를 한곳에서 관리하는 클래스
// 500에러를 400에러로 처리, body에 어떤 오류가 났는 지 출력
@RestControllerAdvice
public class GlobalExceptionHandler {
    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<String> handleRuntimeException(RuntimeException e) {
        return ResponseEntity.badRequest().body(e.getMessage());
    }

    @ExceptionHandler(TransactionCanceledException.class)
    public ResponseEntity<String> handleDynamoDbException(TransactionCanceledException e) {
        // ConditionCheckFailed 인지 확인 로직 추가 가능
        return ResponseEntity.status(HttpStatus.CONFLICT).body("이미 좋아요를 눌렀거나 처리할 수 없는 요청입니다.");
    }
}