# 1단계: 빌드 스테이지
FROM gradle:8.5-jdk17 AS builder

WORKDIR /app

# 설정 파일만 먼저 복사
COPY build.gradle settings.gradle gradlew ./
COPY gradle ./gradle

# [수정] 실행 권한 부여 (Git에서 권한이 누락되어도 빌드가 가능하게 함)
RUN chmod +x ./gradlew

# [최적화] 의존성 라이브러리만 먼저 다운로드 (소스 변경 시 시간 단축)
RUN ./gradlew dependencies --no-daemon || true

# 소스 코드 복사
COPY src ./src

# 빌드 실행
RUN ./gradlew bootJar --no-daemon

# 2단계: 실행 스테이지
FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

# builder 스테이지에서 생성된 jar 파일만 복사
COPY --from=builder /app/build/libs/*.jar app.jar

# 포트 설정
EXPOSE 8080

# 실행
ENTRYPOINT ["java", "-jar", "app.jar"]
