# Kubernetes Manifests

## 파일 구조

```
infra/k8s-manifests/
├── auth-service.yaml              # Auth Service Deployment & Service
├── auth-service-config.yaml       # Auth Service ConfigMap & Secret (템플릿)
├── search-service.yaml            # Search Service Deployment & Service
├── create-secrets.sh              # GitLab CI/CD 변수로 Secret 생성 스크립트
└── README.md                      # 이 파일
```

## 환경변수 설정

### Auth Service

| 환경변수 | 설명 | 소스 |
|---------|------|------|
| `AWS_REGION` | AWS 리전 | Hardcoded (ap-northeast-2) |
| `AWS_COGNITO_CLIENT_ID` | Cognito Client ID | Secret |
| `AWS_COGNITO_USER_POOL_ID` | Cognito User Pool ID | Secret |
| `AWS_SNS_TOPIC_ARN` | SNS Topic ARN | Secret |
| `AWS_DYNAMODB_TABLE_NAME` | DynamoDB 테이블명 | ConfigMap |

### Search Service

Search Service는 아직 환경변수 설정이 필요하지 않습니다. (OpenSearch 배포 시 추가 예정)

## 배포 방법

### 1. GitLab CI/CD 변수 설정

GitLab 프로젝트 → Settings → CI/CD → Variables에 다음 변수 추가:

**Auth Service:**
- `AWS_COGNITO_CLIENT_ID`
- `AWS_COGNITO_USER_POOL_ID`
- `AWS_SNS_TOPIC_ARN`
- `AWS_DYNAMODB_TABLE_NAME`

### 2. Kubernetes Secret 생성

#### 방법 A: 스크립트 사용 (추천)

```bash
# GitLab CI/CD 변수를 환경변수로 export
export AWS_COGNITO_CLIENT_ID="your-client-id"
export AWS_COGNITO_USER_POOL_ID="your-pool-id"
export AWS_SNS_TOPIC_ARN="your-sns-arn"
export AWS_DYNAMODB_TABLE_NAME="FromProm_Table"

# 스크립트 실행
chmod +x infra/k8s-manifests/create-secrets.sh
./infra/k8s-manifests/create-secrets.sh
```

#### 방법 B: 수동 생성

```bash
# Auth Service Secrets
kubectl create secret generic auth-service-secrets \
  --from-literal=cognito-client-id="your-client-id" \
  --from-literal=cognito-user-pool-id="your-pool-id" \
  --from-literal=sns-topic-arn="your-sns-arn"

# Auth Service ConfigMap
kubectl create configmap auth-service-config \
  --from-literal=dynamodb-table-name="FromProm_Table"
```

### 3. 서비스 배포

```bash
# Auth Service 배포
kubectl apply -f infra/k8s-manifests/auth-service.yaml

# Search Service 배포
kubectl apply -f infra/k8s-manifests/search-service.yaml
```

### 4. 배포 확인

```bash
# Pod 상태 확인
kubectl get pods -l app=auth-service
kubectl get pods -l app=search-service

# Secret 확인
kubectl get secrets
kubectl describe secret auth-service-secrets

# ConfigMap 확인
kubectl get configmaps
kubectl describe configmap auth-service-config

# 로그 확인
kubectl logs -f -l app=auth-service
kubectl logs -f -l app=search-service
```

## ArgoCD 연동

ArgoCD가 이 매니페스트 파일들을 자동으로 감지하고 배포합니다.

**주의사항:**
- Secret과 ConfigMap은 ArgoCD가 자동으로 생성하지 않습니다.
- 위의 "2. Kubernetes Secret 생성" 단계를 먼저 수동으로 실행해야 합니다.
- 또는 GitLab CI/CD 파이프라인에 Secret 생성 단계를 추가할 수 있습니다.

## 트러블슈팅

### Pod가 시작되지 않을 때

```bash
# Pod 상세 정보 확인
kubectl describe pod -l app=auth-service

# 일반적인 원인:
# 1. Secret이 생성되지 않음
# 2. Secret의 key 이름이 manifest와 다름
# 3. 환경변수 값이 잘못됨
```

### Secret 업데이트

```bash
# Secret 삭제 후 재생성
kubectl delete secret auth-service-secrets
kubectl create secret generic auth-service-secrets \
  --from-literal=cognito-client-id="new-value" \
  --from-literal=cognito-user-pool-id="new-value" \
  --from-literal=sns-topic-arn="new-value"

# Pod 재시작 (새 Secret 적용)
kubectl rollout restart deployment/auth-service
```

### ConfigMap 업데이트

```bash
# ConfigMap 삭제 후 재생성
kubectl delete configmap auth-service-config
kubectl create configmap auth-service-config \
  --from-literal=dynamodb-table-name="FromProm_Table"

# Pod 재시작
kubectl rollout restart deployment/auth-service
```

## 보안 고려사항

1. **Secret 관리**
   - Secret은 Git에 커밋하지 마세요
   - `auth-service-config.yaml`은 템플릿일 뿐입니다
   - 실제 값은 `create-secrets.sh` 스크립트나 수동으로 생성하세요

2. **GitLab CI/CD 변수**
   - 민감한 변수는 "Masked" 옵션 활성화
   - "Protected" 옵션으로 특정 브랜치에서만 사용 가능하도록 설정

3. **AWS IAM**
   - ServiceAccount에 IRSA(IAM Roles for Service Accounts) 설정
   - 최소 권한 원칙 적용
