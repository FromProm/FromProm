# Amazon Bedrock AgentCore 배포 가이드

## 개요
이 서비스는 Amazon Bedrock AgentCore를 사용하여 배포됩니다.
AgentCore가 자동으로 컨테이너화, 서버 프로비저닝, 스케일링을 처리합니다.

## 사전 요구사항

1. AWS CLI 설정
```bash
aws configure
```

2. AgentCore Starter Toolkit 설치
```bash
pip install bedrock-agentcore-toolkit
```

3. S3 버킷 생성 (배포 패키지 저장용)
```bash
aws s3 mb s3://your-agentcore-bucket
```

## 배포 방법

### 방법 1: Direct Code Deployment (권장)

```bash
cd service/ai-service

# AgentCore 배포 (대화형)
agentcore deploy
```

대화형 프롬프트에서:
1. S3 버킷 선택
2. 배포 타입: `1 - Code Zip` 선택
3. 배포 완료 대기 (~30초)

### 방법 2: Container-based Deployment

복잡한 의존성이나 250MB 초과 시:

```bash
# Dockerfile 사용
agentcore deploy --type container
```

## 프로젝트 구조

```
service/ai-service/
├── agent.py              # AgentCore 진입점 (Strands Agent)
├── pyproject.toml        # 의존성 정의
├── app/
│   ├── agents/           # 평가 에이전트 로직
│   ├── orchestrator/     # 파이프라인 오케스트레이션
│   └── core/             # 스키마, 설정
└── (삭제 가능)
    ├── lambda/           # Lambda 관련 (AgentCore 사용 시 불필요)
    └── create_lambda_package.py
```

## Agent 사용법

배포 후 AgentCore Runtime에서 에이전트 호출:

```python
# 프롬프트 평가 요청
response = agent("type_a 프롬프트를 평가해줘. 프롬프트: '한국의 수도는?' 예시 입력: [{'content': '대한민국', 'input_type': 'text'}]")
```

### 사용 가능한 도구

1. `evaluate_prompt` - 프롬프트 품질 평가
2. `get_supported_models` - 지원 모델 목록
3. `get_evaluation_metrics` - 평가 지표 설명

## 환경 변수

`.env` 파일 또는 AgentCore 설정에서:

```
AWS_REGION=us-east-1
BEDROCK_MODEL_ID=anthropic.claude-3-5-sonnet-20240620-v1:0
```

## 로컬 테스트

```bash
# 의존성 설치
pip install -e ".[local]"

# 로컬 실행
python agent.py
```

## 삭제 가능한 파일들

AgentCore 배포 시 더 이상 필요 없는 파일:
- `lambda/` 폴더 전체
- `create_lambda_package.py`
- `deploy/lambda_tools.py`
- `LAMBDA_DEPLOYMENT_GUIDE.md`

## 참고 문서

- [AgentCore 공식 문서](https://docs.aws.amazon.com/bedrock/latest/userguide/agentcore.html)
- [Strands Agents SDK](https://github.com/strands-agents/strands-agents-sdk)
