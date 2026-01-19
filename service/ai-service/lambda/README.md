# Lambda Handler - SQS to AgentCore

## 개요

GUI에서 생성된 Lambda 함수에 붙여넣을 코드입니다.
SQS 메시지를 받아서 AgentCore로 전달하고, AgentCore에서 평가 + DynamoDB 저장을 수행합니다.

## 아키텍처

```
SQS 메시지
    ↓
Lambda (이 코드)
    ↓
AgentCore
    ↓
평가 + DynamoDB 저장
```

## 사용 방법

1. **Lambda 코드 업데이트**: `lambda_handler.py` 내용을 Lambda 콘솔에 붙여넣기
2. **환경 변수 설정**: `AGENT_ID` 설정
3. **IAM 권한 확인**: Bedrock AgentCore 호출 권한 필요
4. **AgentCore 배포**: `agent.py`에 DynamoDB 저장 기능 포함

## 자세한 가이드

[LAMBDA_SETUP.md](LAMBDA_SETUP.md) 참조

## 파일 설명

- `lambda_handler.py` - Lambda 함수 코드 (GUI에 붙여넣기)
- `requirements.txt` - 의존성 (boto3만 필요, Lambda에 기본 포함)
- `iam-policy.json` - Lambda 실행 역할에 필요한 IAM 정책
- `test_lambda.py` - 로컬 테스트 스크립트
- `test-events/` - 테스트용 SQS 메시지 예제
- `LAMBDA_SETUP.md` - 상세 설정 가이드

## 빠른 시작

### 1. Lambda 코드 업데이트

Lambda 콘솔에서 `lambda_handler.py` 내용 복사 → 붙여넣기 → Deploy

### 2. 환경 변수 설정

```
AGENT_ID = ai_service-rASjsT5Fh5
```

### 3. AgentCore 배포

```bash
cd service/ai-service
agentcore deploy
```

### 4. 테스트

SQS로 메시지 전송 후 DynamoDB 확인

## 주요 특징

- **경량**: boto3만 사용 (Lambda 기본 포함)
- **간단**: SQS 메시지 파싱 + AgentCore 호출만
- **DB 저장**: AgentCore(agent.py)에서 DynamoDB 저장 처리
- **에러 처리**: 실패 시 로그 기록 및 상태 반환
