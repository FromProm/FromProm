# FromProm - AI 프롬프트 마켓플레이스

> AWS Cloud School 11기 3조 최종 프로젝트

AI 프롬프트를 거래할 수 있는 마켓플레이스 플랫폼입니다. 사용자가 등록한 프롬프트를 AI가 자동으로 평가하고, 품질 점수를 기반으로 거래가 이루어집니다.

## 🏗️ 아키텍처

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              CloudFront                                  │
│                         (fromprom.cloud)                                │
└─────────────────┬───────────────────────────────────┬───────────────────┘
                  │                                   │
                  ▼                                   ▼
         ┌───────────────┐                   ┌───────────────┐
         │   S3 Bucket   │                   │   EKS ALB     │
         │  (Frontend)   │                   │  (Backend)    │
         └───────────────┘                   └───────┬───────┘
                                                     │
                  ┌──────────────────────────────────┼──────────────────────┐
                  │                                  │                      │
                  ▼                                  ▼                      ▼
         ┌───────────────┐              ┌───────────────┐         ┌───────────────┐
         │ auth-service  │              │search-service │         │  ai-service   │
         │ (Spring Boot) │              │ (Spring Boot) │         │   (Python)    │
         └───────┬───────┘              └───────┬───────┘         └───────┬───────┘
                 │                              │                         │
                 ▼                              ▼                         ▼
         ┌───────────────┐              ┌───────────────┐         ┌───────────────┐
         │   Cognito     │              │  OpenSearch   │         │    Bedrock    │
         │   DynamoDB    │              │   DynamoDB    │         │  AgentCore    │
         └───────────────┘              └───────────────┘         └───────────────┘
```

## 📁 프로젝트 구조

```
FromProm/
├── service/
│   ├── front/              # React + TypeScript 프론트엔드
│   ├── auth-service/       # Spring Boot 인증/사용자 서비스
│   ├── search-service/     # Spring Boot 검색 서비스
│   └── ai-service/         # Python AI 평가 서비스
├── infra/
│   ├── terraform/          # AWS 인프라 IaC
│   └── k8s-manifests/      # Kubernetes 배포 매니페스트
└── docs/                   # 문서
```

## 🛠️ 기술 스택

| 영역 | 기술 |
|------|------|
| Frontend | React 18, TypeScript, Vite, TailwindCSS, Zustand, React Query |
| Backend | Spring Boot 3.x (Java 17), FastAPI (Python 3.11) |
| Database | DynamoDB (Single Table Design), OpenSearch |
| AI/ML | Amazon Bedrock, Bedrock AgentCore, Strands SDK |
| Infra | EKS, ECR, S3, CloudFront, Cognito, SES, SNS, SQS |
| DevOps | GitLab (Self-hosted), GitLab Runner, ArgoCD, SonarQube |
| IaC | Terraform |

## 🚀 서비스 설명

### Frontend (service/front)
- React + TypeScript 기반 SPA
- 프롬프트 마켓플레이스 UI
- 무한 스크롤, 낙관적 업데이트 적용
- S3 + CloudFront로 배포

### Auth Service (service/auth-service)
- 사용자 인증/인가 (Cognito 연동)
- 프롬프트 등록/관리
- 크레딧 충전/결제
- 좋아요, 북마크, 댓글 기능

### Search Service (service/search-service)
- OpenSearch 기반 전문 검색
- 카테고리/모델별 필터링
- 가격 범위 검색
- Cursor 기반 페이지네이션

### AI Service (service/ai-service)
- 프롬프트 품질 자동 평가
- 환각(Hallucination) 탐지
- 다중 모델 일관성 검증
- Bedrock AgentCore 배포

## 🔧 로컬 개발 환경

### 사전 요구사항
- Node.js 18+
- Java 17+
- Python 3.11+
- AWS CLI 설정

### Frontend
```bash
cd service/front
npm install
npm run dev
# http://localhost:5173
```

### Auth Service
```bash
cd service/auth-service
./gradlew bootRun
# http://localhost:8080
```

### Search Service
```bash
cd service/search-service
./gradlew bootRun
# http://localhost:8081
```

### AI Service
```bash
cd service/ai-service
pip install -e .
uvicorn app.main:app --reload
# http://localhost:8000
```

## 🔄 CI/CD 파이프라인

```
Code Push → GitLab CI/CD → ECR Push → Manifest Update → ArgoCD Sync → EKS Deploy
```

### 파이프라인 단계
1. **Build**: Docker 이미지 빌드 및 ECR 푸시
2. **Test**: 인프라 연결 테스트
3. **SAST**: SonarQube 정적 분석
4. **Deploy**: S3 배포 (Frontend) / Manifest 업데이트 (Backend)
5. **Update Manifest**: K8s manifest 이미지 태그 업데이트

### GitOps 워크플로우
- GitLab CI가 manifest 업데이트 후 커밋
- ArgoCD가 Git 변경 감지 후 자동 배포
- 롤백: `git revert` 또는 `argocd app rollback`

## 📊 주요 기능

### 프롬프트 평가 시스템
- **관련성 점수**: 프롬프트-응답 일치도
- **일관성 점수**: 다중 모델 응답 일관성
- **환각 탐지**: 사실 검증 기반 환각 점수
- **정보 밀도**: 응답의 정보량 평가
- **최종 점수**: 가중 평균 종합 점수

### 실시간 데이터 최적화
- 다층 캐싱 (인메모리, SQLite, DynamoDB)
- React Query 서버 상태 관리
- 낙관적 업데이트 (좋아요/북마크)
- Cursor 기반 페이지네이션

## 🔐 환경 변수

### Frontend (.env)
```env
VITE_API_BASE_URL=https://api.fromprom.cloud
```

### Backend (application-aws.yml)
```yaml
aws:
  region: ap-northeast-2
  cognito:
    user-pool-id: ${AWS_COGNITO_USERPOOLID}
    client-id: ${AWS_COGNITO_CLIENTID}
  dynamodb:
    table-name: FromProm_Table
```

자세한 환경 변수는 [docs/ENVIRONMENT_VARIABLES.md](docs/ENVIRONMENT_VARIABLES.md) 참조

## 📚 문서

- [CI/CD 설정 가이드](docs/CICD_SETUP.md)
- [환경 변수 설정](docs/ENVIRONMENT_VARIABLES.md)
- [GitLab Runner 설정](SELF_HOSTED_GITLAB_RUNNER_SETUP.md)
- [AI Service API 스펙](service/ai-service/API_SPEC.md)
- [AgentCore 배포 가이드](service/ai-service/AGENTCORE_DEPLOYMENT.md)

## 👥 팀원

AWS Cloud School 11기 3조 신의진, 김영동, 이찬종, 오지은, 고유나

## 📄 라이선스

This project is for educational purposes.
