# AI Service 배포 가이드

## 아키텍처

```
SQS 메시지
    ↓
Lambda (GUI에서 생성)
    ↓
AgentCore
    ↓
agent.py
    ↓
1. 평가 수행 (2-5분)
2. DynamoDB 저장
```

## 구성 요소

### 1. Lambda (GUI에서 생성)
- SQS 메시지 수신
- 메시지 파싱
- AgentCore 호출

### 2. AgentCore (agent.py)
- 프롬프트 평가 (6개 지표)
- DynamoDB 저장
- 결과 반환

## 배포 단계

### 1단계: AgentCore 배포

```bash
cd service/ai-service
agentcore deploy
```

배포 후 Agent ID 확인:
```bash
cat .bedrock_agentcore.yaml | grep agent_id
# 출력: agent_id: ai_service-rASjsT5Fh5
```

### 2단계: Lambda 설정

GUI에서 생성된 Lambda에 코드 붙여넣기:

1. Lambda 콘솔 열기
2. 함수 선택
3. `lambda_handler.py` 코드 복사 → 붙여넣기
4. 환경 변수 설정: `AGENT_ID=ai_service-rASjsT5Fh5`
5. IAM 권한 확인

**자세한 가이드**: [lambda/LAMBDA_SETUP.md](lambda/LAMBDA_SETUP.md)

## 데이터 흐름

### 1. 백엔드 → SQS

```json
{
  "PK": "PROMPT#uuid",
  "SK": "METADATA",
  "prompt_content": "프롬프트 내용",
  "prompt_type": "type_a",
  "examples": [...],
  "status": "pending"
}
```

### 2. Lambda → AgentCore

Lambda가 SQS 메시지를 받아서 AgentCore로 전달

### 3. AgentCore → DynamoDB

평가 완료 후 DynamoDB 업데이트:
```json
{
  "PK": "PROMPT#uuid",
  "status": "completed",
  "evaluation_metrics": {
    "token_usage": 85,
    "information_density": 90,
    "consistency": 88,
    "model_variance": 82,
    "hallucination": 95,
    "relevance": 90,
    "final_score": 88.3
  },
  "examples": [
    {
      "index": 0,
      "input": {...},
      "output": "평가 결과 출력"
    }
  ]
}
```

## 필요한 IAM 권한

### Lambda 실행 역할

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock-agentcore-runtime:InvokeAgent"
      ],
      "Resource": "arn:aws:bedrock-agentcore:us-east-1:*:runtime/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "sqs:ReceiveMessage",
        "sqs:DeleteMessage",
        "sqs:GetQueueAttributes"
      ],
      "Resource": "arn:aws:sqs:*:*:*"
    }
  ]
}
```

### AgentCore 실행 역할

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel"
      ],
      "Resource": "arn:aws:bedrock:*:*:*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:UpdateItem",
        "dynamodb:PutItem"
      ],
      "Resource": "arn:aws:dynamodb:*:*:table/Prompts"
    }
  ]
}
```

## 테스트

### SQS 메시지 전송

```bash
aws sqs send-message \
  --queue-url https://sqs.REGION.amazonaws.com/ACCOUNT/QUEUE \
  --message-body '{
    "PK": "PROMPT#test-123",
    "SK": "METADATA",
    "prompt_content": "다음 질문에 답변해주세요.",
    "prompt_type": "type_a",
    "examples": [
      {
        "index": 0,
        "input": {"content": "한국의 수도는?", "input_type": "text"}
      }
    ],
    "status": "pending"
  }'
```

### 로그 확인

```bash
# Lambda 로그
aws logs tail /aws/lambda/YOUR_FUNCTION_NAME --follow

# AgentCore 로그
# AgentCore 콘솔에서 확인
```

### DynamoDB 확인

1. DynamoDB 콘솔 열기
2. "Prompts" 테이블 선택
3. `PROMPT#test-123` 항목 확인
4. `status`가 "completed"로 변경되었는지 확인
5. `evaluation_metrics` 필드 확인

## 비용 예상 (월 1000회 평가)

| 항목 | 비용 |
|------|------|
| Lambda | ~$0.50 |
| AgentCore | ~$1.50 |
| SQS | ~$0.01 |
| DynamoDB | ~$0.10 |
| **총** | **~$2.11/월** |

## 성능

- **평가 시간**: 2-5분 (복잡도에 따라)
- **Lambda 실행 시간**: 2-5분 (AgentCore 대기)
- **동시 처리**: Lambda 동시성 제한 적용

## 문제 해결

### AgentCore 호출 실패

```bash
# Lambda 환경 변수 확인
aws lambda get-function-configuration \
  --function-name YOUR_FUNCTION_NAME \
  --query 'Environment.Variables.AGENT_ID'

# AgentCore 상태 확인
cd service/ai-service
agentcore status
```

### DynamoDB 저장 실패

AgentCore 실행 역할에 DynamoDB 권한 추가:

```bash
# .bedrock_agentcore.yaml에서 execution_role 확인
cat .bedrock_agentcore.yaml | grep execution_role

# IAM 콘솔에서 해당 역할에 DynamoDB 권한 추가
```

### 타임아웃

Lambda 타임아웃 증가:

```bash
aws lambda update-function-configuration \
  --function-name YOUR_FUNCTION_NAME \
  --timeout 600
```

## 참고 문서

- [lambda/LAMBDA_SETUP.md](lambda/LAMBDA_SETUP.md) - Lambda 설정 가이드
- [lambda/README.md](lambda/README.md) - Lambda 개요
- [AGENTCORE_DEPLOYMENT.md](AGENTCORE_DEPLOYMENT.md) - AgentCore 배포
- [README.md](README.md) - 프로젝트 개요
