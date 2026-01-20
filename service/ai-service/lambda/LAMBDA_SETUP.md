# Lambda 설정 가이드 (GUI에서 생성된 Lambda용)

## 개요

이미 AWS GUI에서 생성된 Lambda 함수에 코드를 붙여넣는 방식입니다.

## 아키텍처

```
SQS 메시지 도착
    ↓
Lambda (GUI에서 생성됨)
    ↓
메시지 파싱 & AgentCore 호출
    ↓
AgentCore (agent.py 실행)
    ↓
1. 평가 수행
2. DynamoDB 저장
```

## 1단계: Lambda 함수 코드 업데이트

### Lambda 콘솔에서:

1. AWS Lambda 콘솔 열기
2. 생성된 Lambda 함수 선택
3. "Code" 탭 선택
4. `lambda_function.py` 파일 내용을 아래 코드로 교체:

```python
"""
AWS Lambda Handler - SQS 메시지를 AgentCore로 전달
AgentCore에서 평가 + DB 저장 수행
"""

import json
import logging
import boto3
import os

logger = logging.getLogger()
logger.setLevel(logging.INFO)

# AgentCore 클라이언트 초기화
bedrock_agentcore = boto3.client('bedrock-agentcore-runtime', region_name='us-east-1')

# 환경 변수에서 Agent ID 가져오기
AGENT_ID = os.environ.get('AGENT_ID', 'ai_service-rASjsT5Fh5')


def lambda_handler(event, context):
    """
    SQS 메시지를 받아서 AgentCore로 전달
    
    SQS 메시지 형식:
    {
        "Records": [
            {
                "body": "{...DynamoDB 레코드...}"
            }
        ]
    }
    """
    logger.info(f"Received SQS event with {len(event.get('Records', []))} messages")
    
    results = []
    
    for record in event.get('Records', []):
        try:
            # SQS 메시지 body 파싱
            message_body = json.loads(record['body'])
            logger.info(f"Processing message: {message_body.get('PK', 'unknown')}")
            
            # AgentCore 호출
            response = bedrock_agentcore.invoke_agent(
                agentId=AGENT_ID,
                inputText=json.dumps(message_body),
                enableTrace=False
            )
            
            # 응답 스트림 읽기
            result = ""
            for event_chunk in response.get('completion', []):
                if 'chunk' in event_chunk:
                    chunk_data = event_chunk['chunk']
                    if 'bytes' in chunk_data:
                        result += chunk_data['bytes'].decode('utf-8')
            
            logger.info(f"AgentCore completed for: {message_body.get('PK', 'unknown')}")
            results.append({
                'messageId': record.get('messageId'),
                'status': 'success'
            })
            
        except Exception as e:
            logger.error(f"Failed to process message: {str(e)}")
            results.append({
                'messageId': record.get('messageId'),
                'status': 'failed',
                'error': str(e)
            })
    
    return {
        'statusCode': 200,
        'body': json.dumps({
            'processed': len(results),
            'results': results
        })
    }
```

5. "Deploy" 버튼 클릭

## 2단계: 환경 변수 설정

Lambda 콘솔에서:

1. "Configuration" 탭 선택
2. "Environment variables" 선택
3. "Edit" 클릭
4. 환경 변수 추가:
   - Key: `AGENT_ID`
   - Value: `ai_service-rASjsT5Fh5` (AgentCore에서 배포한 Agent ID)

5. "Save" 클릭

**참고**: S3 버킷 이름은 agent.py에서 환경 변수로 설정되어 있습니다 (`S3_BUCKET=prompt-eval-bucket`)

## 3단계: IAM 권한 확인

Lambda 실행 역할에 다음 권한 필요:

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

### IAM 권한 추가 방법:

1. Lambda 콘솔 → "Configuration" → "Permissions"
2. "Execution role" 클릭 (IAM 콘솔로 이동)
3. "Add permissions" → "Create inline policy"
4. JSON 탭에서 위 정책 붙여넣기
5. "Review policy" → 이름 입력 → "Create policy"

## 4단계: SQS 트리거 확인

Lambda 콘솔에서:

1. "Configuration" → "Triggers" 확인
2. SQS 트리거가 연결되어 있는지 확인
3. Batch size: 1 권장 (한 번에 하나씩 처리)

## 5단계: Lambda 설정 확인

### 권장 설정:

- **Timeout**: 300초 (5분) - 평가 작업 시간 고려
- **Memory**: 512 MB
- **Runtime**: Python 3.11 이상

### 설정 변경:

1. "Configuration" → "General configuration"
2. "Edit" 클릭
3. Timeout: 300초
4. Memory: 512 MB
5. "Save" 클릭

## 6단계: AgentCore 배포 (agent.py)

AgentCore에 DynamoDB 저장 기능이 포함된 agent.py 배포:

```bash
cd service/ai-service
agentcore deploy
```

## 7단계: 테스트

### SQS로 테스트 메시지 전송:

```bash
aws sqs send-message \
  --queue-url https://sqs.REGION.amazonaws.com/ACCOUNT_ID/QUEUE_NAME \
  --message-body '{
    "PK": "PROMPT#test-123",
    "SK": "METADATA",
    "prompt_content": "다음 질문에 답변해주세요.",
    "prompt_type": "type_a",
    "examples": [
      {
        "index": 0,
        "input": {
          "content": "한국의 수도는?",
          "input_type": "text"
        }
      }
    ],
    "model": "anthropic.claude-3-5-sonnet-20240620-v1:0",
    "status": "pending",
    "created_at": "2025-01-15T00:00:00Z"
  }'
```

### CloudWatch Logs 확인:

```bash
aws logs tail /aws/lambda/YOUR_LAMBDA_FUNCTION_NAME --follow
```

예상 로그:
```
Received SQS event with 1 messages
Processing message: PROMPT#test-123
AgentCore completed for: PROMPT#test-123
```

### DynamoDB 확인:

1. DynamoDB 콘솔 열기 (서울 리전)
2. "FromProm_Table" 테이블 선택
3. "Explore table items" 클릭
4. `PROMPT#test-123` 항목 확인
5. `evaluation_metrics` 필드에 평가 결과 확인
6. `status`가 "completed"로 변경되었는지 확인
7. `examples_s3_url` 필드 확인

### S3 확인:

1. S3 콘솔 열기 (US East 리전)
2. "fromprom-s3" 버킷 선택
3. `prompts/test-123/` 폴더 확인
4. `examples.json` 파일 확인
5. 이미지 타입인 경우 `images/` 폴더 확인

## 문제 해결

### AgentCore 호출 실패

**증상**: `bedrock-agentcore-runtime:InvokeAgent` 권한 오류

**해결**:
1. Lambda 실행 역할 확인
2. IAM 정책에 `bedrock-agentcore-runtime:InvokeAgent` 권한 추가

### DynamoDB 저장 실패

**증상**: 평가는 완료되었지만 DynamoDB에 저장 안 됨

**해결**:
1. AgentCore의 실행 역할에 DynamoDB 권한 확인
2. `.bedrock_agentcore.yaml`에서 execution_role 확인
3. 해당 역할에 DynamoDB 권한 추가:

```json
{
  "Effect": "Allow",
  "Action": [
    "dynamodb:UpdateItem",
    "dynamodb:PutItem"
  ],
  "Resource": "arn:aws:dynamodb:ap-northeast-2:*:table/Prompts"
}
```

### S3 저장 실패

**증상**: DynamoDB는 업데이트되었지만 S3에 파일이 없음

**해결**:
1. AgentCore의 실행 역할에 S3 권한 확인
2. 해당 역할에 S3 권한 추가:

```json
{
  "Effect": "Allow",
  "Action": [
    "s3:PutObject",
    "s3:GetObject"
  ],
  "Resource": "arn:aws:s3:::prompt-eval-bucket/prompts/*"
}
```

3. S3 버킷이 존재하는지 확인:

```bash
aws s3 ls s3://fromprom-s3/
```

4. 버킷이 없으면 생성:

```bash
aws s3 mb s3://fromprom-s3 --region us-east-1
```

### 타임아웃

**증상**: Task timed out after 300.00 seconds

**해결**:
1. Lambda Timeout 증가 (최대 900초)
2. 또는 agent.py에서 `repeat_count` 감소 (5 → 3)

## 전체 흐름 요약

```
1. 백엔드가 SQS에 메시지 전송
   {
     "PK": "PROMPT#uuid",
     "prompt_content": "...",
     "status": "pending"
   }

2. Lambda가 SQS 메시지 수신
   - 메시지 파싱
   - AgentCore 호출

3. AgentCore (agent.py) 실행
   - 평가 수행 (2-5분)
   - DynamoDB 업데이트:
     * status: "completed"
     * evaluation_metrics: {...}
     * examples[].output: "..." (텍스트) 또는 null (이미지)
     * examples_s3_url: S3 경로
   - S3 저장:
     * prompts/{prompt_id}/examples.json
     * prompts/{prompt_id}/images/output_*.png (이미지 타입)

4. 백엔드가 DynamoDB에서 결과 조회
   - status가 "completed"인지 확인
   - evaluation_metrics 사용
   - examples_s3_url에서 S3 데이터 조회
```

## 참고

- Lambda 함수 이름: GUI에서 생성한 이름 사용
- SQS 큐 이름: 백엔드에서 사용하는 큐 이름
- DynamoDB 테이블: "FromProm_Table" (서울 리전, agent.py에서 하드코딩)
- S3 버킷: "fromprom-s3" (US East 리전, agent.py에서 하드코딩)
- AgentCore Agent ID: `.bedrock_agentcore.yaml`에서 확인

## S3 폴더 구조

### 텍스트 타입 (type_a, type_b_text)

```
s3://fromprom-s3/
└── prompts/
    └── {prompt_id}/
        └── examples.json
```

### 이미지 타입 (type_b_image)

```
s3://fromprom-s3/
└── prompts/
    └── {prompt_id}/
        ├── examples.json
        └── images/
            ├── output_0.png
            ├── output_1.png
            └── output_2.png
```
