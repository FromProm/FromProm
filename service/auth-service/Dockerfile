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

# ADOT Java Agent 다운로드
ARG ADOT_AGENT_VERSION=2.11.5
ADD https://github.com/aws-observability/aws-otel-java-instrumentation/releases/download/v${ADOT_AGENT_VERSION}/aws-opentelemetry-agent.jar /opt/aws-opentelemetry-agent.jar

# builder 스테이지에서 생성된 jar 파일만 복사
COPY --from=builder /app/build/libs/*.jar app.jar

# 포트 설정
EXPOSE 8080

# OTEL 환경변수 기본값 설정
ENV OTEL_SERVICE_NAME=auth-service
ENV OTEL_TRACES_EXPORTER=otlp
ENV OTEL_METRICS_EXPORTER=otlp
ENV OTEL_LOGS_EXPORTER=none
ENV OTEL_PROPAGATORS=xray,tracecontext,baggage
ENV OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317
ENV OTEL_RESOURCE_ATTRIBUTES=service.namespace=fromprom

# ADOT Agent 활성화 여부 (기본: 비활성화, K8s에서 환경변수로 활성화)
ENV ENABLE_OTEL_AGENT=false

# 실행 (ENABLE_OTEL_AGENT에 따라 Agent 적용 여부 결정)
ENTRYPOINT ["sh", "-c", "if [ \"$ENABLE_OTEL_AGENT\" = \"true\" ]; then exec java -javaagent:/opt/aws-opentelemetry-agent.jar -jar app.jar; else exec java -jar app.jar; fi"]