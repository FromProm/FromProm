AWS Cloud School 11기 3조 최종프로젝트
## 프로젝트 실행 방법

### 사전 요구사항

- Node.js 18+
- Java 17+
- AWS 자격 증명 설정 (Cognito, DynamoDB 사용).

### Frontend (service/front)

```bash
cd service/front

# 의존성 설치
npm install

# 개발 서버 실행 (http://localhost:3000)
npm run dev

# 프로덕션 빌드
npm run build
```

### Backend (service/user-service)

```bash
cd service/user-service

# 빌드 및 실행
./gradlew bootRun
```

백엔드 서버는 기본적으로 `http://localhost:8080`에서 실행됩니다.
