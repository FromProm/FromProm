"""
AWS Lambda Handler - SQS 메시지를 AgentCore로 전달
AgentCore에서 평가 + DB 저장 수행
"""

import json
import boto3
import os
from botocore.config import Config

# 환경변수
AGENT_ARN = os.environ.get('AGENT_ARN', '')

# boto3 Config (타임아웃 15분)
config = Config(
    read_timeout=900,
    connect_timeout=10
)

# AWS 클라이언트
bedrock_agentcore = boto3.client('bedrock-agentcore', region_name='us-east-1', config=config)


def lambda_handler(event, context):
    """SQS 메시지를 받아 AgentCore로 전달"""
    print(f"Received {len(event['Records'])} messages from SQS")
    
    results = []
    
    for record in event['Records']:
        try:
            # SQS 메시지 body 파싱
            message_body = json.loads(record['body'])
            prompt_id = message_body.get('PK', 'unknown')
            print(f"Processing: {prompt_id}")
            
            # AgentCore 호출
            result = call_agentcore(message_body)
            
            results.append({
                'messageId': record.get('messageId'),
                'promptId': prompt_id,
                'status': 'completed'
            })
            
            print(f"AgentCore completed: {prompt_id}")
            
        except Exception as e:
            print(f"Error: {str(e)}")
            import traceback
            traceback.print_exc()
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


def call_agentcore(message_body):
    """AgentCore 호출"""
    print(f"Calling AgentCore...")
    print(f"Agent ARN: {AGENT_ARN}")
    
    response = bedrock_agentcore.invoke_agent_runtime(
        agentRuntimeArn=AGENT_ARN,
        qualifier='DEFAULT',
        payload=json.dumps(message_body)
    )
    
    print("AgentCore response received")
    
    # 응답 내용 파싱해서 로그 찍기
    if 'response' in response:
        result_parts = []
        for event in response['response']:
            if isinstance(event, bytes):
                result_parts.append(event.decode('utf-8'))
        result = json.loads(''.join(result_parts)) if result_parts else {}
        print(f"Result: {json.dumps(result, ensure_ascii=False)[:500]}")
        return result
    
    return response
