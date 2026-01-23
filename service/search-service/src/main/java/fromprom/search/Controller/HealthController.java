package fromprom.search.Controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
public class HealthController {

    @GetMapping("/healthy")
    public ResponseEntity<Map<String, String>> healthCheck() {
        return ResponseEntity.ok(Map.of(
            "status", "UP",
            "service", "search-service"
        ));
    }

    @GetMapping("/ready")
    public ResponseEntity<Map<String, String>> readinessCheck() {
        return ResponseEntity.ok(Map.of(
            "status", "READY",
            "service", "search-service"
        ));
    }
}
