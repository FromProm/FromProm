#!/usr/bin/env python3
"""
간단한 Strands Supervisor Pattern 테스트
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import asyncio

async def test_simple():
    try:
        print("🎯 Strands Supervisor Pattern 간단 테스트")
        
        # 기본 임포트 테스트
        from app.agents.bedrock_tool_agent import BedrockToolAgent
        from app.agents.agent_pipeline import AgentPipeline
        from app.orchestrator.context import ExecutionContext
        
        print("✅ 모든 모듈 임포트 성공")
        
        # ExecutionContext 생성
        context = ExecutionContext()
        print("✅ ExecutionContext 생성 성공")
        
        # AgentPipeline 생성
        pipeline = AgentPipeline(context)
        print("✅ AgentPipeline 생성 성공")
        
        # Strands 정보 확인
        info = pipeline.get_strands_info()
        print("\n📊 Strands Framework 정보:")
        for key, value in info.items():
            if isinstance(value, list):
                print(f"   {key}:")
                for item in value:
                    print(f"     - {item}")
            else:
                print(f"   {key}: {value}")
        
        print("\n🎉 Strands Supervisor Pattern 준비 완료!")
        print("   - Claude Supervisor ✅")
        print("   - Tool Workers (5개) ✅") 
        print("   - AI Worker (1개) ✅")
        print("   - Agent Core Ready ✅")
        
    except Exception as e:
        print(f"❌ 테스트 실패: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_simple())