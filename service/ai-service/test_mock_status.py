"""
현재 Mock 상태 확인 테스트
"""

import asyncio
import logging

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def check_strands_status():
    """Strands Framework 상태 확인"""
    
    print("🔍 Strands Framework 상태 확인...")
    
    try:
        from strands import Agent, Workflow, Context, StrandsCore
        print("✅ 실제 Strands 라이브러리 import 성공!")
        return "REAL"
    except ImportError as e:
        print(f"⚠️ 실제 Strands 라이브러리 import 실패: {e}")
        try:
            from app.agents.strands.mock_strands import Context, StrandsCore, USING_MOCK_STRANDS
            print("✅ Mock Strands 라이브러리 사용 중")
            return "MOCK"
        except ImportError as e2:
            print(f"❌ Mock Strands도 실패: {e2}")
            return "FAILED"

def check_cohere_status():
    """Cohere Reranker 상태 확인"""
    
    print("\n🔍 Cohere Reranker 상태 확인...")
    
    try:
        from app.adapters.reranker.cohere_reranker import CohereReranker
        print("✅ Cohere Reranker 클래스 import 성공!")
        
        # 실제 인스턴스 생성 테스트
        reranker = CohereReranker()
        print("✅ Cohere Reranker 인스턴스 생성 성공!")
        return "REAL"
        
    except Exception as e:
        print(f"❌ Cohere Reranker 실패: {e}")
        return "FAILED"

def check_mcp_status():
    """MCP 클라이언트 상태 확인"""
    
    print("\n🔍 MCP 클라이언트 상태 확인...")
    
    try:
        from app.adapters.mcp.mcp_client import MCPClient
        print("✅ MCP 클라이언트 import 성공!")
        
        # 실제 인스턴스 생성 테스트
        mcp_client = MCPClient()
        print("✅ MCP 클라이언트 인스턴스 생성 성공!")
        return "REAL"
        
    except Exception as e:
        print(f"❌ MCP 클라이언트 실패: {e}")
        return "FAILED"

def check_bedrock_status():
    """AWS Bedrock 상태 확인"""
    
    print("\n🔍 AWS Bedrock 상태 확인...")
    
    try:
        from app.adapters.runner.bedrock_runner import BedrockRunner
        print("✅ Bedrock Runner import 성공!")
        
        # 실제 인스턴스 생성 테스트
        runner = BedrockRunner()
        print("✅ Bedrock Runner 인스턴스 생성 성공!")
        return "REAL"
        
    except Exception as e:
        print(f"❌ Bedrock Runner 실패: {e}")
        return "FAILED"

async def main():
    """메인 테스트 함수"""
    
    print("🚀 Mock 상태 종합 확인")
    print("=" * 50)
    
    # 각 컴포넌트 상태 확인
    strands_status = check_strands_status()
    cohere_status = check_cohere_status()
    mcp_status = check_mcp_status()
    bedrock_status = check_bedrock_status()
    
    # 결과 요약
    print("\n📊 Mock 상태 요약:")
    print(f"   - Strands Framework: {'🟡 Mock 사용' if strands_status == 'MOCK' else '✅ 실제 구현' if strands_status == 'REAL' else '❌ 실패'}")
    print(f"   - Cohere Reranker: {'✅ 실제 구현' if cohere_status == 'REAL' else '❌ 실패'}")
    print(f"   - MCP 클라이언트: {'✅ 실제 구현' if mcp_status == 'REAL' else '❌ 실패'}")
    print(f"   - AWS Bedrock: {'✅ 실제 구현' if bedrock_status == 'REAL' else '❌ 실패'}")
    
    # Mock 사용 중인 부분
    mock_components = []
    if strands_status == "MOCK":
        mock_components.append("Strands Framework (DLL 호환성 문제)")
    
    if mock_components:
        print(f"\n🟡 Mock 사용 중인 부분: {len(mock_components)}개")
        for component in mock_components:
            print(f"   - {component}")
    else:
        print("\n✅ 모든 컴포넌트가 실제 구현 사용 중!")
    
    # 실제 구현 사용 중인 부분
    real_components = []
    if cohere_status == "REAL":
        real_components.append("Cohere Reranker (AWS Bedrock)")
    if mcp_status == "REAL":
        real_components.append("MCP 클라이언트 (환각 탐지)")
    if bedrock_status == "REAL":
        real_components.append("AWS Bedrock (Claude)")
    
    if real_components:
        print(f"\n✅ 실제 구현 사용 중인 부분: {len(real_components)}개")
        for component in real_components:
            print(f"   - {component}")

if __name__ == "__main__":
    asyncio.run(main())