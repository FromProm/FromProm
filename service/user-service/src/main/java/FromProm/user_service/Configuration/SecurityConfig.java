package FromProm.user_service.Configuration;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
public class SecurityConfig {
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable()) // POST, PATCH 테스트를 위해 필수!
                .authorizeHttpRequests(auth -> auth
                        .anyRequest().permitAll() // 일단 모든 API를 인증 없이 허용 (테스트용)
                );
        return http.build();
    }
}
