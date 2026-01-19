#!/usr/bin/env python3
"""
Strands Framework 테스트 스크립트 (Supervisor Pattern)
"""

import asyncio
import logging

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def test_strands_supervisor_pattern():
    """Strands Supervisor Pattern 테스트"""
    try:
        from app.orchestrator.context import ExecutionContext
        from app.agents.agent_pipeline import AgentPipeline
        from app.core.schemas import JobCreateRequest, ExampleInput, PromptType, RecommendedModel
        
        print("🎯 Strands Supervisor Pattern 테스트 시작...")
        
        # Mock JobCreateRequest
        job_request = JobCreateRequest(
            prompt="한국의 경제 상황에 대해 설명해주세요.",
            example_inputs=[
                ExampleInput(content="한국 경제에 대해 알려주세요", input_type="text")
            ],
            prompt_type=PromptType.TYPE_A,
            recommended_model=RecommendedModel.CLAUDE_SONNET_4_5,
            repeat_count=2,
            title="Strands Supervisor Pattern 테스트",
            description="Claude Supervisor + Tool Workers + AI Worker 테스트",
            user_id="strands_test"
        )
        
        # ExecutionContext 생성
        context = ExecutionContext()
        
        # Agent Pipeline (Strands Supervisor Pattern) 실행
        pipeline = AgentPipeline(context)
        
        print("📊 Strands Framework 정보:")
        strands_info = pipeline.get_strands_info()
        for key, value in strands_info.items():
            if isinstance(value, list):
                print(f"   {key}:")
                for item in value:
                    print(f"     - {item}")
            else:
                print(f"   {key}: {value}")
        
        print("\n🚀 Strands Supervisor Pattern 실행 중...")
        result = await pipeline.run(job_request)
        
        print(f"\n✅ Strands Supervisor Pattern 실행 완료!")
        print(f"   최종 점수: {result.final_score}")
        print(f"   가중 점수: {result.weighted_scores}")
        
        # 개별 지표 확인
        metrics = {
            'token_usage': result.token_usage,
            'information_density': result.information_density,
            'consistency': result.consistency,
            'model_variance': result.model_variance,
            'hallucination': result.hallucination,
            'relevance': result.relevance
        }
        
        print(f"\n📊 Worker 결과:")
        for name, metric in metrics.items():
            if metric:
                worker_type = "AI Worker" if name == "hallucination" else "Tool Worker"
                bedrock_tool_use = metric.details.get('bedrock_tool_use', False)
                method = "Bedrock Tool Use" if bedrock_tool_use else "Traditional"
                print(f"   {name}: {metric.score} ({worker_type} - {method})")
            else:
                print(f"   {name}: None ❌")
        
        # 피드백 확인
        if hasattr(result, 'feedback') and result.feedback:
            print(f"\n💬 Supervisor 피드백:")
            feedback = result.feedback
            if isinstance(feedback, dict):
                is_bedrock_feedback = feedback.get('bedrock_tool_use', False)
                feedback_type = "Bedrock Tool Use Feedback" if is_bedrock_feedback else "Traditional Feedback"
                print(f"   피드백 타입: {feedback_type}")
                
                if 'overall_feedback' in feedback:
                    print(f"   종합 피드백: {feedback['overall_feedback'][:200]}...")
        
        print(f"\n🎉 Strands Supervisor Pattern 테스트 성공!")
        print(f"   - Supervisor: Claude (오케스트레이션)")
        print(f"   - Tool Workers: 5개 (계산 작업)")
        print(f"   - AI Worker: 1개 (환각 탐지)")
        print(f"   - Agent Core Ready: ✅")
        
    except Exception as e:
        print(f"❌ Strands Supervisor Pattern 테스트 실패: {e}")
        import traceback
        print(f"스택 트레이스:")
        print(traceback.format_exc())

async def test_bedrock_tool_agent():
    """BedrockToolAgent 직접 테스트"""
    try:
        from app.orchestrator.context import ExecutionContext
        from app.agents.bedrock_tool_agent import BedrockToolAgent
        from app.core.schemas import JobCreateRequest, ExampleInput, PromptType, RecommendedModel
        
        print("\n🔧 BedrockToolAgent 직접 테스트...")
        
        context = ExecutionContext()
        agent = BedrockToolAgent(context)
        
        job_request = JobCreateRequest(
            prompt="간단한 테스트 프롬프트입니다.",
            example_inputs=[
                ExampleInput(content="테스트 입력", input_type="text")
            ],
            prompt_type=PromptType.TYPE_B_TEXT,
            recommended_model=RecommendedModel.CLAUDE_SONNET_4_5,
            repeat_count=1,
            title="BedrockToolAgent 테스트",
            description="직접 Agent 테스트",
            user_id="direct_test"
        )
        
        print("   Claude Supervisor 실행 중...")
        result = await agent.evaluate_prompt(job_request)
        
        print(f"   ✅ 직접 테스트 완료 - 점수: {result.final_score}")
        
    except Exception as e:
        print(f"   ❌ BedrockToolAgent 테스트 실패: {e}")

async def main():
    print("=" * 70)
    print("🎯 Strands Framework - Supervisor Pattern 테스트")
    print("=" * 70)
    
    await test_bedrock_tool_agent()
    await test_strands_supervisor_pattern()

if __name__ == "__main__":
    asyncio.run(main())