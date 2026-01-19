"""
Lambda 핸들러 로컬 테스트 스크립트
"""

import json
import sys
from lambda_handler import lambda_handler


def test_get_models():
    """모델 목록 조회 테스트"""
    print("=" * 60)
    print("Test 1: Get Models")
    print("=" * 60)
    
    event = {
        "action": "get_models"
    }
    
    result = lambda_handler(event, None)
    print(json.dumps(result, indent=2, ensure_ascii=False))
    print()


def test_get_metrics():
    """평가 지표 조회 테스트"""
    print("=" * 60)
    print("Test 2: Get Metrics")
    print("=" * 60)
    
    event = {
        "action": "get_metrics"
    }
    
    result = lambda_handler(event, None)
    print(json.dumps(result, indent=2, ensure_ascii=False))
    print()


def test_evaluate_simple():
    """단순 평가 테스트"""
    print("=" * 60)
    print("Test 3: Evaluate Prompt (Simple Format)")
    print("=" * 60)
    
    event = {
        "action": "evaluate",
        "prompt": "다음 질문에 정확하고 상세한 답변을 제공해주세요.",
        "prompt_type": "type_a",
        "example_inputs": [
            {"content": "한국의 수도는?", "input_type": "text"},
            {"content": "지구에서 태양까지의 거리는?", "input_type": "text"}
        ],
        "repeat_count": 3
    }
    
    result = lambda_handler(event, None)
    print(json.dumps(result, indent=2, ensure_ascii=False))
    print()


def test_evaluate_dynamodb():
    """DynamoDB 형식 평가 테스트"""
    print("=" * 60)
    print("Test 4: Evaluate Prompt (DynamoDB Format)")
    print("=" * 60)
    
    event = {
        "PK": "PROMPT#test-uuid-123",
        "SK": "METADATA",
        "prompt_content": "다음 질문에 답변해주세요.",
        "prompt_type": "type_a",
        "examples": [
            {
                "index": 0,
                "input": {"content": "OpenAI가 GPT-4를 언제 발표했나요?", "input_type": "text"}
            },
            {
                "index": 1,
                "input": {"content": "물의 화학식은?", "input_type": "text"}
            }
        ],
        "model": "anthropic.claude-3-5-sonnet-20240620-v1:0",
        "status": "pending",
        "created_at": "2025-01-15T00:00:00Z"
    }
    
    result = lambda_handler(event, None)
    print(json.dumps(result, indent=2, ensure_ascii=False))
    print()


if __name__ == "__main__":
    print("\n🧪 Lambda Handler Local Test\n")
    
    # 주의: 실제 AgentCore 호출이 필요하므로 AWS 자격증명 필요
    print("⚠️  Warning: This test requires AWS credentials and AgentCore deployment")
    print("⚠️  Make sure AGENT_ID is set correctly in lambda_handler.py\n")
    
    try:
        test_get_models()
        test_get_metrics()
        
        # 실제 평가 테스트 (시간 소요)
        if len(sys.argv) > 1 and sys.argv[1] == "--full":
            test_evaluate_simple()
            test_evaluate_dynamodb()
        else:
            print("💡 Run with --full flag to test evaluation (takes 2-5 minutes)")
            print("   python test_lambda.py --full")
        
        print("✅ All tests completed!")
        
    except Exception as e:
        print(f"❌ Test failed: {str(e)}")
        import traceback
        traceback.print_exc()
