# Self-Hosted GitLab (EKS)에서 AgentCore CI 설정 가이드

## 개요

자체 호스팅 GitLab (EKS에 설치)에서 GitLab Runner를 설정하고 AgentCore CI/CD 파이프라인을 실행하는 방법입니다.

## 아키텍처

```
Self-Hosted GitLab (EKS)
    ↓
GitLab Runner (Kubernetes Executor)
    ↓
EKS Cluster (Pod 생성)
    ↓
AgentCore Deploy
    ↓
AWS Bedrock AgentCore Runtime
```

## 1. 사전 준비

### 1.1 필수 요구사항

- Self-hosted GitLab 인스턴스 (EKS에 설치됨)
- EKS 클러스터 (Runner 실행용)
- kubectl 설치 및 EKS 클러스터 접근 가능
- Helm 3.x 설치
- AWS 자격증명 (AgentCore 배포용)

### 1.2 GitLab 버전 확인

```bash
# Self-hosted GitLab 버전 확인
# GitLab Admin Area → System Information에서 확인
# GitLab Runner 15.0 이상 필요
```

## 2. GitLab Runner 토큰 생성

### 2.1 Instance Runner 토큰 생성 (관리자 권한 필요)

1. Self-hosted GitLab 접속
2. **Admin Area** → **CI/CD** → **Runners**
3. **New instance runner** 클릭
4. 설정:
   - **Runner type**: Kubernetes
   - **Tags**: `agentcore`, `eks` (선택사항)
   - **Run untagged jobs**: 체크 (선택사항)
5. **Create runner** 클릭
6. **Runner authentication token** 복사 (중요!)

### 2.2 또는 Group/Project Runner 토큰

**Group Runner:**
1. Group → **Settings** → **CI/CD** → **Runners**
2. **New group runner** 클릭

**Project Runner:**
1. Project → **Settings** → **CI/CD** → **Runners**
2. **New project runner** 클릭

## 3. GitLab Runner Helm Chart 설치

### 3.1 Helm Repository 추가

```bash
helm repo add gitlab https://charts.gitlab.io
helm repo update
```

### 3.2 values.yaml 생성

```yaml
# gitlab-runner-values.yaml

gitlabUrl: https://your-gitlab-instance.com/  # Self-hosted GitLab URL
gitlabToken: <RUNNER_AUTHENTICATION_TOKEN>    # 2.1에서 복사한 토큰

runners:
  image: ubuntu:22.04
  tags:
    - agentcore
    - eks
  
  # Kubernetes Executor 설정
  kubernetes:
    host: https://your-eks-cluster-endpoint  # EKS API 엔드포인트
    namespace: gitlab-runner                  # Runner Pod 네임스페이스
    privileged: true                          # Docker 빌드 필요시
    
    # 리소스 제한
    cpu_request: "500m"
    cpu_limit: "2000m"
    memory_request: "512Mi"
    memory_limit: "2Gi"
    
    # 서비스 계정
    service_account: gitlab-runner
    
    # 이미지 풀 시크릿 (ECR 사용시)
    image_pull_secrets:
      - name: ecr-secret

# RBAC 설정
rbac:
  create: true
  serviceAccountName: gitlab-runner

# 보안 컨텍스트
securityContext:
  runAsUser: 100
  runAsGroup: 101
  fsGroup: 65534

# 리소스 제한
resources:
  limits:
    cpu: 1000m
    memory: 1Gi
  requests:
    cpu: 500m
    memory: 512Mi

# 환경 변수 (AWS 자격증명)
env:
  - name: AWS_REGION
    value: "us-west-2"  # AgentCore 리전
  - name: AWS_ACCESS_KEY_ID
    valueFrom:
      secretKeyRef:
        name: aws-credentials
        key: access-key-id
  - name: AWS_SECRET_ACCESS_KEY
    valueFrom:
      secretKeyRef:
        name: aws-credentials
        key: secret-access-key
```

### 3.3 AWS 자격증명 시크릿 생성

```bash
kubectl create namespace gitlab-runner

kubectl create secret generic aws-credentials \
  --from-literal=access-key-id=<YOUR_AWS_ACCESS_KEY> \
  --from-literal=secret-access-key=<YOUR_AWS_SECRET_KEY> \
  -n gitlab-runner
```

### 3.4 GitLab Runner 설치

```bash
helm install gitlab-runner gitlab/gitlab-runner \
  -f gitlab-runner-values.yaml \
  -n gitlab-runner
```

### 3.5 설치 확인

```bash
# Runner Pod 확인
kubectl get pods -n gitlab-runner

# Runner 로그 확인
kubectl logs -n gitlab-runner -l app=gitlab-runner -f

# Self-hosted GitLab에서 Runner 상태 확인
# Admin Area → CI/CD → Runners에서 "online" 상태 확인
```

## 4. Self-Hosted GitLab에서 Runner 연결 확인

### 4.1 GitLab UI에서 확인

1. **Admin Area** → **CI/CD** → **Runners**
2. 새로 생성된 Runner 확인
3. 상태: **online** (초록색)
4. **Tags**: `agentcore`, `eks` 표시

### 4.2 Runner 상세 정보

- **Runner ID**: 자동 생성
- **Authentication token**: 시크릿 (표시 안 됨)
- **Last contact**: 최근 연결 시간
- **Jobs**: 실행한 작업 수

## 5. AgentCore CI/CD 파이프라인 설정

### 5.1 .gitlab-ci.yml 수정

```yaml
# .gitlab-ci.yml

stages:
  - validate
  - deploy

variables:
  PIP_CACHE_DIR: "$CI_PROJECT_DIR/.cache/pip"
  AWS_REGION: "us-west-2"
  AGENTCORE_REGION: "us-west-2"

# Runner 태그 지정
default:
  tags:
    - agentcore
    - eks

validate:
  stage: validate
  image: python:3.11-slim
  
  before_script:
    - cd service/ai-service
    - pip install --no-cache-dir -e .
  
  script:
    - python3 -m py_compile app/**/*.py
    - pip check
  
  rules:
    - if: '$CI_COMMIT_BRANCH == "dev"'

deploy:
  stage: deploy
  image: python:3.11-slim
  
  before_script:
    - apt-get update && apt-get install -y --no-install-recommends git curl jq
    - pip install --no-cache-dir awscli-v2 bedrock-agentcore-starter-toolkit
    - aws sts get-caller-identity || exit 1
    - cd service/ai-service
    - pip install --no-cache-dir -e .
  
  script:
    - agentcore deploy
  
  environment:
    name: production
  
  rules:
    - if: '$CI_COMMIT_BRANCH == "dev"'
      when: manual
```

### 5.2 파이프라인 실행

1. Self-hosted GitLab 접속
2. Project → **CI/CD** → **Pipelines**
3. **Run pipeline** 클릭
4. **Branch**: `dev` 선택
5. **Run pipeline** 클릭
6. Pipeline 진행 상황 확인

## 6. 트러블슈팅

### 6.1 Runner가 "offline" 상태

**원인:**
- Runner Pod가 실행 중이 아님
- GitLab 인스턴스에 연결 불가
- 토큰 만료

**해결:**
```bash
# Runner Pod 상태 확인
kubectl get pods -n gitlab-runner

# Runner 로그 확인
kubectl logs -n gitlab-runner -l app=gitlab-runner

# Runner 재시작
helm upgrade gitlab-runner gitlab/gitlab-runner \
  -f gitlab-runner-values.yaml \
  -n gitlab-runner
```

### 6.2 파이프라인 실행 안 됨

**원인:**
- Runner 태그 미일치
- AWS 자격증명 오류
- 네트워크 연결 문제

**해결:**
```bash
# 1. Runner 태그 확인
kubectl describe pod -n gitlab-runner -l app=gitlab-runner

# 2. AWS 자격증명 확인
kubectl get secret aws-credentials -n gitlab-runner -o yaml

# 3. 파이프라인 로그 확인
# GitLab UI → Pipeline → Job logs
```

### 6.3 AgentCore 배포 실패

**원인:**
- AWS 권한 부족
- AgentCore 리전 미설정
- 모델 접근 권한 없음

**해결:**
```bash
# 1. AWS 권한 확인
aws iam get-user

# 2. AgentCore 권한 확인
aws bedrock-agentcore list-agent-runtimes

# 3. 모델 접근 확인
aws bedrock list-foundation-models --region us-west-2
```

### 6.4 Self-signed Certificate 오류

**원인:**
- Self-hosted GitLab이 자체 서명 인증서 사용

**해결:**
```bash
# values.yaml에 추가
gitlabUrl: https://your-gitlab-instance.com/
gitlabToken: <TOKEN>

# 또는 환경 변수로 설정
env:
  - name: GIT_SSL_NO_VERIFY
    value: "true"  # 개발 환경에서만 사용
```

## 7. 보안 고려사항

### 7.1 AWS 자격증명 관리

```bash
# 1. IAM 역할 사용 (권장)
# EKS Pod에 IAM 역할 연결 (IRSA)

# 2. 또는 시크릿 사용
kubectl create secret generic aws-credentials \
  --from-literal=access-key-id=<KEY> \
  --from-literal=secret-access-key=<SECRET> \
  -n gitlab-runner
```

### 7.2 Runner 격리

```yaml
# values.yaml
runners:
  kubernetes:
    namespace: gitlab-runner  # 전용 네임스페이스
    privileged: false         # 최소 권한
    
    # 네트워크 정책
    network_policy: true
```

### 7.3 RBAC 설정

```bash
# Runner 서비스 계정 권한 제한
kubectl create role gitlab-runner-role \
  --verb=create,get,list,watch,delete \
  --resource=pods,pods/log \
  -n gitlab-runner

kubectl create rolebinding gitlab-runner-binding \
  --role=gitlab-runner-role \
  --serviceaccount=gitlab-runner:gitlab-runner \
  -n gitlab-runner
```

## 8. 모니터링

### 8.1 Runner 메트릭

```bash
# Runner 상태 확인
kubectl get pods -n gitlab-runner -o wide

# Runner 리소스 사용량
kubectl top pods -n gitlab-runner

# Runner 이벤트 확인
kubectl describe pod -n gitlab-runner -l app=gitlab-runner
```

### 8.2 파이프라인 로그

```bash
# GitLab UI에서 확인
# Project → CI/CD → Pipelines → Job logs

# 또는 kubectl로 확인
kubectl logs -n gitlab-runner -l app=gitlab-runner -f
```

## 9. 참고 문서

- [GitLab Runner Kubernetes Executor](https://docs.gitlab.com/runner/executors/kubernetes/)
- [GitLab Runner Helm Chart](https://docs.gitlab.com/runner/install/kubernetes/)
- [Self-Hosted GitLab Installation](https://docs.gitlab.com/ee/install/)
- [AWS Bedrock AgentCore Deployment](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/)
- [GitLab Runner Registration](https://docs.gitlab.com/runner/register/)

## 10. 빠른 시작 체크리스트

- [ ] Self-hosted GitLab 인스턴스 준비
- [ ] EKS 클러스터 준비
- [ ] GitLab Runner 토큰 생성
- [ ] AWS 자격증명 시크릿 생성
- [ ] Helm Repository 추가
- [ ] values.yaml 작성
- [ ] GitLab Runner 설치
- [ ] Runner 상태 확인 (online)
- [ ] .gitlab-ci.yml 수정
- [ ] 파이프라인 실행
- [ ] AgentCore 배포 확인
