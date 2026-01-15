#!/usr/bin/env python3
"""
환경설정 테스트 스크립트
.env 파일이 올바르게 로드되는지 확인
"""

import sys
import os
from pathlib import Path

# 프로젝트 루트를 Python 경로에 추가
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def test_env_loading():
    """환경변수 로딩 테스트"""
    print("=== 환경변수 로딩 테스트 ===")
    
    try:
        from app.core.config import settings
        
        print(f"✅ 설정 로드 성공")
        print(f"   - API Title: {settings.api_title}")
        print(f"   - API Version: {settings.api_version}")
        print(f"   - AWS Region (Bedrock): {settings.aws_region}")
        print(f"   - AWS Region (SQS/DDB): {settings.aws_region_sqs_ddb}")
        print(f"   - Mock Mode: {settings.mock_mode}")
        print(f"   - Agent Pipeline: {settings.use_agent_pipeline}")
        print(f"   - Storage Backend: {settings.storage_backend}")
        print(f"   - Cache Enabled: {settings.cache_enabled}")
        
        # AWS 자격증명 확인 (민감정보는 마스킹)
        aws_key = settings.aws_access_key_id
        if aws_key:
            masked_key = aws_key[:4] + "*" * (len(aws_key) - 8) + aws_key[-4:] if len(aws_key) > 8 else "*" * len(aws_key)
            print(f"   - AWS Access Key: {masked_key}")
        else:
            print(f"   - AWS Access Key: (비어있음 - Mock 모드에서는 정상)")
        
        # SQS URL 확인
        sqs_url = settings.sqs_queue_url
        if sqs_url:
            print(f"   - SQS Queue URL: {sqs_url}")
        else:
            print(f"   - SQS Queue URL: (비어있음 - API 테스트만 가능)")
        
        # Perplexity API 키 확인
        perplexity_keys = settings.perplexity_api_keys
        if perplexity_keys:
            print(f"   - Perplexity API Keys: {len(perplexity_keys)}개 설정됨")
        else:
            print(f"   - Perplexity API Keys: (비어있음 - 환각 탐지 제한적)")
        
        return True
        
    except Exception as e:
        print(f"❌ 설정 로드 실패: {str(e)}")
        return False

def test_context_initialization():
    """ExecutionContext 초기화 테스트"""
    print("\n=== ExecutionContext 초기화 테스트 ===")
    
    try:
        from app.orchestrator.context import ExecutionContext
        
        context = ExecutionContext()
        print(f"✅ ExecutionContext 생성 성공")
        
        # 어댑터 확인
        runner = context.get_runner()
        embedder = context.get_embedder()
        judge = context.get_judge()
        storage = context.get_storage()
        
        print(f"   - Runner: {type(runner).__name__}")
        print(f"   - Embedder: {type(embedder).__name__}")
        print(f"   - Judge: {type(judge).__name__}")
        print(f"   - Storage: {type(storage).__name__}")
        
        return True
        
    except Exception as e:
        print(f"❌ ExecutionContext 초기화 실패: {str(e)}")
        return False

def test_agent_pipeline():
    """Agent 파이프라인 로딩 테스트"""
    print("\n=== Agent 파이프라인 로딩 테스트 ===")
    
    try:
        from app.agents.agent_pipeline import AgentPipeline
        from app.agents.tools.tool_definitions import ALL_TOOLS
        from app.orchestrator.context import ExecutionContext
        
        context = ExecutionContext()
        pipeline = AgentPipeline(context)
        
        print(f"✅ Agent 파이프라인 생성 성공")
        print(f"   - 사용 가능한 Tool 수: {len(ALL_TOOLS)}개")
        
        # Tool 목록 출력
        tool_names = [tool["toolSpec"]["name"] for tool in ALL_TOOLS]
        print(f"   - Tool 목록:")
        for i, name in enumerate(tool_names, 1):
            print(f"     {i:2d}. {name}")
        
        return True
        
    except Exception as e:
        print(f"❌ Agent 파이프라인 로딩 실패: {str(e)}")
        return False

def test_api_server():
    """API 서버 시작 가능성 테스트"""
    print("\n=== API 서버 시작 테스트 ===")
    
    try:
        # FastAPI 앱 로딩 테스트
        from app.main import app
        
        print(f"✅ FastAPI 앱 로딩 성공")
        print(f"   - 앱 제목: {app.title}")
        print(f"   - 앱 버전: {app.version}")
        
        # 라우터 확인
        routes = [route.path for route in app.routes if hasattr(route, 'path')]
        print(f"   - 등록된 라우트 수: {len(routes)}개")
        
        return True
        
    except Exception as e:
        print(f"❌ API 서버 로딩 실패: {str(e)}")
        return False

def main():
    """메인 테스트 함수"""
    print("AI Service 환경설정 테스트")
    print("=" * 50)
    
    tests = [
        test_env_loading,
        test_context_initialization,
        test_agent_pipeline,
        test_api_server
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        if test():
            passed += 1
    
    print("\n" + "=" * 50)
    print(f"테스트 결과: {passed}/{total} 통과")
    
    if passed == total:
        print("🎉 모든 테스트 통과! AI 서비스 실행 준비 완료")
        print("\n다음 명령으로 서비스를 시작할 수 있습니다:")
        print("  python run.py                    # API 서버 시작")
        print("  python run_sqs_worker.py         # SQS Worker 시작 (SQS URL 설정 필요)")
        print("  python test_agent_tools.py       # Agent Tools 테스트")
    else:
        print("❌ 일부 테스트 실패. 설정을 확인해주세요.")
    
    return passed == total

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)