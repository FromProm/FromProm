# CI/CD 파이프라인 설정 가이드

## 개요

GitLab CI/CD + ArgoCD를 활용한 자동 배포 파이프라인

### 아키텍처

```
┌─────────────────┐
│  Code Push      │
│  (GitLab)       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  GitLab CI/CD   │
│  - Build        │
│  - Test         │
│  - Push to ECR  │
│  - Update K8s   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Git Repository │
│  (Manifest 변경) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  ArgoCD         │
│  (Auto Sync)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  EKS Cluster    │
│  (Deployment)   │
└─────────────────┘
```

## 1. GitLab Runner 설정

### GitLab CI/CD 변수 설정

GitLab 프로젝트 → Settings → CI/CD → Variables에 다음 변수 추가:

| 변수명 | 설명 | 예시 |
|--------|------|------|
| `AWS_REGION` | AWS 리전 | `ap-northeast-2` |
| `S3_FRONT_BUCKET_NAME` | 프론트엔드 S3 버킷 | `fromprom-frontend` |
| `CLOUDFRONT_ID` | CloudFront 배포 ID | `E1234567890ABC` |
| `GITLAB_TOKEN` | GitLab Access Token | `glpat-xxxxx` |

### GitLab Token 생성

1. GitLab → User Settings → Access Tokens
2. Token name: `CI/CD Pipeline`
3. Scopes: `api`, `write_repository`
4. Create token 후 복사하여 CI/CD 변수에 추가

## 2. AWS 설정

### ECR Repository 생성

```bash
# Auth Service ECR
aws ecr create-repository \
  --repository-name fromprom/auth \
  --region ap-northeast-2

# Search Service ECR
aws ecr create-repository \
  --repository-name fromprom/search \
  --region ap-northeast-2
```

### GitLab Runner IAM Role 권한

GitLab Runner가 사용하는 IAM Role에 다음 권한 추가:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken",
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage",
        "ecr:PutImage",
        "ecr:InitiateLayerUpload",
        "ecr:UploadLayerPart",
        "ecr:CompleteLayerUpload"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::fromprom-frontend/*",
        "arn:aws:s3:::fromprom-frontend"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "cloudfront:CreateInvalidation"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "eks:DescribeCluster",
        "eks:ListClusters"
      ],
      "Resource": "*"
    }
  ]
}
```

## 3. ArgoCD 설정

### ArgoCD 설치 (이미 설치되어 있다면 스킵)

```bash
# ArgoCD 네임스페이스 생성
kubectl create namespace argocd

# ArgoCD 설치
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# ArgoCD CLI 설치 (선택사항)
curl -sSL -o argocd-linux-amd64 https://github.com/argoproj/argo-cd/releases/latest/download/argocd-linux-amd64
sudo install -m 555 argocd-linux-amd64 /usr/local/bin/argocd
rm argocd-linux-amd64
```

### ArgoCD Application 배포

```bash
# 1. ArgoCD Application YAML 파일 수정
# infra/argocd/auth-service-app.yaml
# infra/argocd/search-service-app.yaml
# → repoURL을 실제 GitLab 저장소 URL로 변경

# 2. Application 생성
kubectl apply -f infra/argocd/auth-service-app.yaml
kubectl apply -f infra/argocd/search-service-app.yaml

# 3. 상태 확인
kubectl get applications -n argocd
```

### ArgoCD GitLab 연동

```bash
# ArgoCD UI 접속
kubectl port-forward svc/argocd-server -n argocd 8080:443

# 초기 비밀번호 확인
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d
```

ArgoCD UI (https://localhost:8080):
1. Settings → Repositories → Connect Repo
2. Connection Method: `HTTPS`
3. Repository URL: `https://gitlab.com/your-group/your-project.git`
4. Username: `oauth2`
5. Password: GitLab Access Token

## 4. Kubernetes 리소스 생성

### ServiceAccount 생성

```bash
# Auth Service
kubectl create serviceaccount auth-service-sa

# Search Service
kubectl create serviceaccount search-service-sa
```

### IRSA (IAM Roles for Service Accounts) 설정

```bash
# Auth Service용 IAM Role 생성 및 연결
eksctl create iamserviceaccount \
  --name auth-service-sa \
  --namespace default \
  --cluster fromprom-cluster \
  --attach-policy-arn arn:aws:iam::aws:policy/AmazonCognitoPowerUser \
  --attach-policy-arn arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess \
  --attach-policy-arn arn:aws:iam::aws:policy/AmazonSNSFullAccess \
  --approve

# Search Service용 IAM Role 생성 및 연결
eksctl create iamserviceaccount \
  --name search-service-sa \
  --namespace default \
  --cluster fromprom-cluster \
  --attach-policy-arn arn:aws:iam::aws:policy/AmazonOpenSearchServiceFullAccess \
  --approve
```

## 5. 파이프라인 테스트

### Auth Service 테스트

```bash
# 1. 코드 변경
# service/auth-service/ 내 파일 수정

# 2. Commit & Push
git add service/auth-service/
git commit -m "test: trigger auth-service pipeline"
git push origin GitLab-Runner-Test

# 3. GitLab에서 파이프라인 확인
# https://gitlab.com/your-group/your-project/-/pipelines

# 4. 배포 확인
kubectl get pods -l app=auth-service
kubectl get deployment auth-service -o jsonpath='{.spec.template.spec.containers[0].image}'
```

### Search Service 테스트

```bash
# 1. 코드 변경
# service/search-service/ 내 파일 수정

# 2. Commit & Push
git add service/search-service/
git commit -m "test: trigger search-service pipeline"
git push origin GitLab-Runner-Test

# 3. 배포 확인
kubectl get pods -l app=search-service
kubectl get deployment search-service -o jsonpath='{.spec.template.spec.containers[0].image}'
```

### Frontend 테스트

```bash
# 1. 코드 변경
# service/front/ 내 파일 수정

# 2. Commit & Push
git add service/front/
git commit -m "test: trigger frontend pipeline"
git push origin GitLab-Runner-Test

# 3. 배포 확인
# https://fromprom.cloud 접속하여 변경사항 확인
```

## 6. 파이프라인 동작 흐름

### Auth Service / Search Service

1. **Build Stage**: 
   - 코드 변경 감지 (`service/auth-service/**` 또는 `service/search-service/**`)
   - Docker 이미지 빌드
   - ECR에 이미지 푸시 (태그: git commit SHA)

2. **Update Manifest Stage**:
   - K8s manifest 파일의 image 태그 업데이트
   - Git commit & push (메시지에 `[skip ci]` 포함하여 무한 루프 방지)

3. **ArgoCD Auto Sync**:
   - Git 저장소 변경 감지
   - EKS 클러스터에 자동 배포

### Frontend

1. **Build Stage**: 
   - 코드 변경 감지 (`service/front/**`)
   - npm build 실행

2. **Deploy Stage**:
   - S3에 빌드 결과물 업로드
   - CloudFront 캐시 무효화

## 7. 트러블슈팅

### Docker 빌드 실패

```bash
# GitLab Runner에서 Docker-in-Docker 확인
docker info

# ECR 로그인 테스트
aws ecr get-login-password --region ap-northeast-2 | docker login --username AWS --password-stdin 261595668962.dkr.ecr.ap-northeast-2.amazonaws.com
```

### Manifest 업데이트 실패

```bash
# GitLab Token 권한 확인
# Settings → CI/CD → Variables → GITLAB_TOKEN
# Scopes: api, write_repository 필요
```

### ArgoCD Sync 실패

```bash
# Application 상태 확인
kubectl get application auth-service -n argocd -o yaml

# 수동 sync
argocd app sync auth-service --force

# ArgoCD 로그 확인
kubectl logs -n argocd -l app.kubernetes.io/name=argocd-application-controller
```

### Pod 시작 실패

```bash
# Pod 로그 확인
kubectl logs -l app=auth-service

# Pod 상세 정보
kubectl describe pod -l app=auth-service

# ECR 이미지 pull 권한 확인
kubectl get serviceaccount auth-service-sa -o yaml
```

## 8. 모니터링

### GitLab 파이프라인 모니터링

- GitLab UI: `https://gitlab.com/your-group/your-project/-/pipelines`
- 각 stage별 로그 확인 가능

### ArgoCD 모니터링

```bash
# ArgoCD UI 접속
kubectl port-forward svc/argocd-server -n argocd 8080:443

# CLI로 상태 확인
argocd app list
argocd app get auth-service
argocd app get search-service
```

### Kubernetes 모니터링

```bash
# Pod 상태
kubectl get pods -l app=auth-service
kubectl get pods -l app=search-service

# Service 상태
kubectl get svc auth-service
kubectl get svc search-service

# 로그 확인
kubectl logs -f -l app=auth-service
kubectl logs -f -l app=search-service
```

## 9. 롤백

### ArgoCD를 통한 롤백

```bash
# 이전 버전으로 롤백
argocd app rollback auth-service

# 특정 revision으로 롤백
argocd app rollback auth-service <revision-number>
```

### Kubernetes를 통한 롤백

```bash
# Deployment 롤백
kubectl rollout undo deployment/auth-service
kubectl rollout undo deployment/search-service

# 롤백 상태 확인
kubectl rollout status deployment/auth-service
```

## 10. 참고 자료

- [GitLab CI/CD 문서](https://docs.gitlab.com/ee/ci/)
- [ArgoCD 문서](https://argo-cd.readthedocs.io/)
- [AWS ECR 문서](https://docs.aws.amazon.com/ecr/)
- [EKS 문서](https://docs.aws.amazon.com/eks/)
