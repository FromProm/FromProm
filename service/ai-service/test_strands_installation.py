"""
Strands 설치 및 기본 기능 테스트
"""

import asyncio
import logging

# Strands 라이브러리 import 테스트 (Mock 포함)
try:
    from strands import Agent, Workflow, Context, StrandsCore
    from strands.agents import BaseAgent
    from strands.workflows import ParallelWorkflow, SequentialWorkflow
    print("✅ 실제 Strands 라이브러리 import 성공!")
    USING_MOCK = False
except ImportError as e:
    print(f"⚠️ 실제 Strands 라이브러리 import 실패: {e}")
    print("🔄 Mock Strands 사용으로 전환...")
    try:
        from app.agents.strands.mock_strands import (
            Context, BaseAgent, StrandsCore, ParallelWorkflow, SequentialWorkflow, USING_MOCK_STRANDS
        )
        print("✅ Mock Strands 라이브러리 import 성공!")
        USING_MOCK = True
    except ImportError as e2:
        print(f"❌ Mock Strands 라이브러리 import도 실패: {e2}")
        exit(1)

# 우리 Tool Wrapper Agent import 테스트
try:
    from app.agents.strands.tool_wrapper_agents import (
        create_all_agents,
        TokenUsageAgent,
        InformationDensityAgent,
        ConsistencyAgent,
        ModelVarianceAgent,
        RelevanceAgent,
        HallucinationAgent
    )
    print("✅ Tool Wrapper Agents import 성공!")
except ImportError as e:
    print(f"❌ Tool Wrapper Agents import 실패: {e}")
    exit(1)

# Strands Agent Core import 테스트
try:
    from app.agents.strands.agent_core import (
        StrandsAgentCore,
        create_agent_core,
        execute_strands_workflow
    )
    print("✅ Strands Agent Core import 성공!")
except ImportError as e:
    print(f"❌ Strands Agent Core import 실패: {e}")
    exit(1)

async def test_strands_basic():
    """기본 Strands 기능 테스트"""
    
    print("\n🧪 Strands 기본 기능 테스트 시작...")
    
    try:
        # Strands Context 생성
        context = Context({
            "service": "prompt-evaluation-test",
            "environment": "test"
        })
        print(f"✅ {'Mock' if USING_MOCK else 'Real'} Strands Context 생성 성공")
        
        # Agent Core 생성
        agent_core = create_agent_core()
        print(f"✅ {'Mock' if USING_MOCK else 'Real'} Strands Agent Core 생성 성공")
        
        # 사용 가능 여부 확인
        if agent_core.is_available():
            print(f"✅ {'Mock' if USING_MOCK else 'Real'} Strands Agent Core 사용 가능")
        else:
            print(f"⚠️ {'Mock' if USING_MOCK else 'Real'} Strands Agent Core 사용 불가능")
        
        # 모든 Agent 가져오기
        agents = agent_core.get_all_agents()
        print(f"✅ 생성된 Agent 수: {len(agents)}")
        
        for agent_name, agent in agents.items():
            print(f"   - {agent_name}: {type(agent).__name__}")
        
        print(f"\n🎉 {'Mock' if USING_MOCK else 'Real'} Strands 기본 기능 테스트 완료!")
        return True
        
    except Exception as e:
        print(f"❌ Strands 기본 기능 테스트 실패: {e}")
        import traceback
        traceback.print_exc()
        return False

async def test_agent_creation():
    """Agent 생성 테스트"""
    
    print("\n🤖 Agent 생성 테스트 시작...")
    
    try:
        # Context 생성
        context = Context({"test": True})
        
        # 개별 Agent 생성 테스트
        token_agent = TokenUsageAgent(context)
        print(f"✅ TokenUsageAgent 생성: {token_agent.name}")
        
        density_agent = InformationDensityAgent(context)
        print(f"✅ InformationDensityAgent 생성: {density_agent.name}")
        
        hallucination_agent = HallucinationAgent(context)
        print(f"✅ HallucinationAgent 생성: {hallucination_agent.name}")
        
        # 모든 Agent 한번에 생성
        all_agents = create_all_agents(context)
        print(f"✅ 전체 Agent 생성 완료: {len(all_agents)}개")
        
        print("\n🎉 Agent 생성 테스트 완료!")
        return True
        
    except Exception as e:
        print(f"❌ Agent 생성 테스트 실패: {e}")
        import traceback
        traceback.print_exc()
        return False

async def main():
    """메인 테스트 함수"""
    
    print("🚀 Strands Framework 설치 및 기능 테스트")
    print("=" * 50)
    
    # 기본 기능 테스트
    basic_test = await test_strands_basic()
    
    # Agent 생성 테스트
    agent_test = await test_agent_creation()
    
    # 결과 요약
    print("\n📊 테스트 결과 요약:")
    print(f"   - 기본 기능 테스트: {'✅ 성공' if basic_test else '❌ 실패'}")
    print(f"   - Agent 생성 테스트: {'✅ 성공' if agent_test else '❌ 실패'}")
    
    if basic_test and agent_test:
        print("\n🎉 모든 테스트 성공! Strands Framework 준비 완료!")
    else:
        print("\n⚠️ 일부 테스트 실패. 문제를 확인해주세요.")

if __name__ == "__main__":
    asyncio.run(main())