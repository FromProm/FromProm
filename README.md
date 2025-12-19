AWS Cloud School 11기 3조 최종프로젝트

prompt-market-monorepo/
├── .github/                    # GitHub Actions (CI: 테스트/린트)
│   └── workflows/
│       ├── frontend-ci.yml
│       ├── backend-auth-ci.yml
│       └── ...
│
├── apps/                       # 실제 서비스 코드들이 모이는 곳
│   ├── frontend/               # [Next.js] 웹 프론트엔드 (통합)
│   │   ├── src/
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   ├── auth-service/           # [Spring/Nest] 회원/인증 서비스
│   │   ├── src/
│   │   └── Dockerfile
│   │
│   ├── market-service/         # [Spring/Nest] 상품/주문/검색 서비스
│   │   ├── src/
│   │   └── Dockerfile
│   │
│   └── ai-worker/              # [Python] 프롬프트 평가 및 실행 에이전트
│       ├── src/
│       ├── requirements.txt
│       └── Dockerfile
│
├── infra/                      # 인프라 및 배포 관련 코드
│   ├── terraform/              # [Terraform] AWS 리소스 생성 코드
│   │   ├── main.tf             # VPC, EKS, RDS, ECR 등 정의
│   │   ├── variables.tf
│   │   └── outputs.tf
│   │
│   └── k8s-manifests/          # [K8s] ArgoCD가 바라볼 배포 명세서 (Kustomize 추천)
│       ├── base/               # 공통 설정 (Deployment, Service 기본 틀)
│       │   ├── frontend/
│       │   ├── auth/
│       │   └── ...
│       └── overlays/           # 환경별 설정 (실제 배포용)
│           └── dev/            # 개발 환경
│               ├── kustomization.yaml
│               ├── frontend-patch.yaml   # 이미지 태그 변경은 여기서 일어남
│               └── ...
│
├── Jenkinsfile                 # [Jenkins] 빌드 및 이미지 푸시 파이프라인 스크립트
└── README.md                   # 프로젝트 설명 및 실행 가이드
