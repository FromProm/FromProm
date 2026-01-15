#!/usr/bin/env python3
"""
Supervisor Pattern 테스트 스크립트
"""

import asyncio
import logging

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def test_supervisor_pattern():
    """Supervisor Pattern 테스트"""
    try:
        from app.orchestrator.context import ExecutionContext
        from app.agents.agent_pipeline import AgentPipeline
        from app.core.schemas import JobCreateRequest, ExampleInput, PromptType, RecommendedModel
        
        print("🎯 Supervisor Pattern 테스트 시작...")
        
        # Mock JobCreateRequest
        job_request = JobCreateRequest(
            prompt="한국의 경제 상황에 대해 설명해주세요.",
            example_inputs=[
                ExampleInput(content="한국 경제에 대해 알려주세요", input_type="text")
            ],
            prompt_type=PromptType.TYPE_A,
            recommended_model=RecommendedModel.CLAUDE_SONNET_4_5,
            repeat_count=2,
            title="Supervisor Pattern 테스트",
            description="6개 전문 AI Agent 테스트",
            user_id="supervisor_test"
        )
        
        # ExecutionContext 생성
        context = ExecutionContext()
        
        # Agent Pipeline (Supervisor Pattern) 실행
        pipeline = AgentPipeline(context)
        
        print("📊 Supervisor Pattern 정보:")
        supervisor_info = pipeline.get_supervisor_info()
        for key, value in supervisor_info.items():
            print(f"   {key}: {value}")
        
        print("\n🚀 Supervisor Pattern 실행 중...")
        result = await pipeline.run(job_request)
        
        print(f"\n✅ Supervisor Pattern 실행 완료!")
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
        
        print(f"\n📊 전문 AI Agent 결과:")
        for name, metric in metrics.items():
            if metric:
                print(f"   {name}: {metric.score} (Agent: {metric.details.get('agent', 'Unknown')})")
            else:
                print(f"   {name}: None ❌")
        
        # 피드백 확인
        if hasattr(result, 'feedback') and result.feedback:
            print(f"\n💬 Supervisor 피드백:")
            feedback = result.feedback
            if isinstance(feedback, dict):
                for key, value in feedback.items():
                    if key == 'overall_feedback':
                        print(f"   종합 피드백: {value[:200]}...")
                    else:
                        print(f"   {key}: {value}")
        
    except Exception as e:
        print(f"❌ Supervisor Pattern 테스트 실패: {e}")
        import traceback
        print(f"스택 트레이스:")
        print(traceback.format_exc())

async def main():
    print("=" * 60)
    print("🎯 Supervisor Pattern 테스트")
    print("=" * 60)
    
    await test_supervisor_pattern()

if __name__ == "__main__":
    asyncio.run(main())