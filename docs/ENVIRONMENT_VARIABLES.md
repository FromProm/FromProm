# 환경변수 설정 가이드

## 변경 사항 요약

하드코딩된 값들을 환경변수로 변경하여 보안과 유연성을 개선했습니다.

## 수정된 파일 목록

### Auth Service

**Java 파일:**
1. `service/auth-service/src/main/java/FromProm/user_service/Service/PromptService.java`
   - `SNS_TOPIC_ARN`: 하드코딩 → `@Value("${aws.sns.topic.arn}")`
   - `TABLE_NAME`: 하드코딩 → `@Value("${aws.dynamodb.table.name}")`

2. `service/auth-service/src/main/java/FromProm/user_service/Repository/UserRepository.java`
   - `TABLE_NAME`: 하드코딩 → 생성자 주입 + `@Value`

3. `service/auth-service/src/main/java/FromProm/user_service/Repository/PromptRepository.java`
   - `TABLE_NAME`: 하드코딩 → 생성자 주입 + `@Value`

4. `service/auth-service/src/main/java/FromProm/user_service/Service/InteractionService.java`
   - `TABLE_NAME`: 하드코딩 → `@Value("${aws.dynamodb.table.name}")`

**설정 파일:**
- `service/auth-service/src/main/resources/application.yml` (신규 생성)

**Kubernetes 파일:**
- `infra/k8s-manifests/auth-service.yaml` (환경변수 주입 추가)
- `infra/k8s-manifests/auth-service-config.yaml` (신규 생성)

### 인프라 파일

- `infra/k8s-manifests/create-secrets.sh` (신규 생성)
- `infra/k8s-manifests/README.md` (신규 생성)

---

## GitLab CI/CD 변수 (이미 설정됨 ✅)

| 변수명 | 설명 |
|--------|------|
| `AWS_ACCESS_KEY_ID` | AWS Access Key |
| `AWS_SECRET_ACCESS_KEY` | AWS Secret Key |
| `AWS_COGNITO_CLIENT_ID` | Cognito Client ID |
| `AWS_COGNITO_USER_POOL_ID` | Cognito User Pool ID |
| `AWS_DYNAMODB_TABLE_NAME` | DynamoDB 테이블명 |
| `AWS_REGION` | AWS 리전 |
| `AWS_SNS_TOPIC_ARN` | SNS Topic ARN |
| `CLOUDFRONT_ID` | CloudFront 배포 ID |
| `GITLAB_TOKEN` | GitLab Access Token |
| `S3_FRONT_BUCKET_NAME` | 프론트엔드 S3 버킷명 |

---

## 배포 전 필수 작업

### 1. Kubernetes Secret 생성

```bash
# EKS 클러스터 연결
aws eks update-kubeconfig --region ap-northeast-2 --name fromprom-cluster

# GitLab CI/CD 변수를 환경변수로 export (실제 값으로 교체)
export AWS_COGNITO_CLIENT_ID="your-client-id"
export AWS_COGNITO_USER_POOL_ID="your-pool-id"
export AWS_SNS_TOPIC_ARN="arn:aws:sns:ap-northeast-2:261595668962:testest"
export AWS_DYNAMODB_TABLE_NAME="FromProm_Table"

# Secret 생성 스크립트 실행
chmod +x infra/k8s-manifests/create-secrets.sh
./infra/k8s-manifests/create-secrets.sh
```

### 2. Secret 생성 확인

```bash
# Secret 목록 확인
kubectl get secrets

# Secret 상세 확인
kubectl describe secret auth-service-secrets
kubectl describe configmap auth-service-config
```

### 3. 배포 테스트

```bash
# Auth Service 코드 변경 후 push
git add service/auth-service/
git commit -m "refactor: migrate hardcoded values to environment variables"
git push origin GitLab-Runner-Test

# 파이프라인 확인
# GitLab → CI/CD → Pipelines

# Pod 상태 확인
kubectl get pods -l app=auth-service

# Pod 로그 확인
kubectl logs -f -l app=auth-service
```

---

## 환경변수 매핑

### Auth Service

| Java 코드 | application.yml | Kubernetes | GitLab CI/CD |
|-----------|-----------------|------------|--------------|
| `@Value("${aws.cognito.clientId}")` | `aws.cognito.clientId` | `AWS_COGNITO_CLIENT_ID` | `AWS_COGNITO_CLIENT_ID` |
| `@Value("${aws.cognito.userPoolId}")` | `aws.cognito.userPoolId` | `AWS_COGNITO_USER_POOL_ID` | `AWS_COGNITO_USER_POOL_ID` |
| `@Value("${aws.sns.topic.arn}")` | `aws.sns.topic.arn` | `AWS_SNS_TOPIC_ARN` | `AWS_SNS_TOPIC_ARN` |
| `@Value("${aws.dynamodb.table.name}")` | `aws.dynamodb.table.name` | `AWS_DYNAMODB_TABLE_NAME` | `AWS_DYNAMODB_TABLE_NAME` |

---

## 트러블슈팅

### Pod가 CrashLoopBackOff 상태일 때

```bash
# Pod 로그 확인
kubectl logs -l app=auth-service

# 일반적인 원인:
# 1. Secret이 생성되지 않음
# 2. 환경변수 이름이 잘못됨
# 3. application.yml의 변수명과 Kubernetes 환경변수명이 다름
```

### 환경변수 값 확인

```bash
# Pod 내부의 환경변수 확인
kubectl exec -it <pod-name> -- env | grep AWS

# Secret 값 확인 (base64 디코딩)
kubectl get secret auth-service-secrets -o jsonpath='{.data.cognito-client-id}' | base64 -d
```

### Secret 업데이트

```bash
# Secret 삭제
kubectl delete secret auth-service-secrets

# 새 값으로 재생성
kubectl create secret generic auth-service-secrets \
  --from-literal=cognito-client-id="new-value" \
  --from-literal=cognito-user-pool-id="new-value" \
  --from-literal=sns-topic-arn="new-value"

# Deployment 재시작
kubectl rollout restart deployment/auth-service
```

---

## 보안 권장사항

1. **Secret 관리**
   - Secret 파일을 Git에 커밋하지 마세요
   - `.gitignore`에 `application.yml` 추가 (이미 추가됨)
   - 실제 값은 Kubernetes Secret으로만 관리

2. **GitLab CI/CD 변수**
   - 민감한 변수는 "Masked" 옵션 활성화
   - "Protected" 옵션으로 main 브랜치에서만 사용

3. **AWS IAM**
   - ServiceAccount에 IRSA 설정
   - 최소 권한 원칙 적용

4. **정기 로테이션**
   - Cognito Client Secret 정기 변경
   - AWS Access Key 정기 로테이션

---

## 다음 단계

1. ✅ 하드코딩된 값 환경변수로 변경 (완료)
2. ⏳ Kubernetes Secret 생성 (수동 작업 필요)
3. ⏳ Auth Service 배포 테스트
4. ⏳ Search Service 배포 (OpenSearch 준비 후)
