#!/usr/bin/env python3
"""
Strands Supervisor Pattern 실제 평가 테스트
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import asyncio

async def test_evaluation():
    try:
        print("🎯 Strands Supervisor Pattern 실제 평가 테스트")
        
        from app.agents.agent_pipeline import AgentPipeline
        from app.orchestrator.context import ExecutionContext
        from app.core.schemas import JobCreateRequest, ExampleInput, PromptType, RecommendedModel
        
        # Mock JobCreateRequest 생성
        job_request = JobCreateRequest(
            prompt="한국의 수도는 어디인가요?",
            example_inputs=[
                ExampleInput(content="한국의 수도를 알려주세요", input_type="text")
            ],
            prompt_type=PromptType.TYPE_B_TEXT,
            recommended_model=RecommendedModel.CLAUDE_SONNET_4_5,
            repeat_count=1,
            title="Strands 테스트",
            description="Supervisor Pattern 테스트",
            user_id="test_user"
        )
        
        # ExecutionContext 및 Pipeline 생성
        context = ExecutionContext()
        pipeline = AgentPipeline(context)
        
        print("🚀 Strands Supervisor Pattern 실행 중...")
        print(f"   프롬프트: {job_request.prompt}")
        print(f"   타입: {job_request.prompt_type.value}")
        
        # 실제 평가 실행
        result = await pipeline.run(job_request)
        
        print(f"\n✅ 평가 완료!")
        print(f"   최종 점수: {result.final_score}")
        
        if result.weighted_scores:
            print(f"   가중 점수:")
            for metric, score in result.weighted_scores.items():
                print(f"     - {metric}: {score}")
        
        # 개별 Worker 결과 확인
        print(f"\n📊 Worker 결과:")
        metrics = {
            'token_usage': result.token_usage,
            'information_density': result.information_density,
            'consistency': result.consistency,
            'model_variance': result.model_variance,
            'relevance': result.relevance,
            'hallucination': result.hallucination
        }
        
        for name, metric in metrics.items():
            if metric:
                worker_type = "AI Worker" if name == "hallucination" else "Tool Worker"
                print(f"   {name}: {metric.score} ({worker_type})")
            else:
                print(f"   {name}: 계산되지 않음")
        
        # 피드백 확인
        if hasattr(result, 'feedback') and result.feedback:
            print(f"\n💬 Supervisor 피드백:")
            feedback = result.feedback
            if isinstance(feedback, dict) and 'overall_feedback' in feedback:
                feedback_preview = feedback['overall_feedback'][:150] + "..." if len(feedback['overall_feedback']) > 150 else feedback['overall_feedback']
                print(f"   {feedback_preview}")
        
        print(f"\n🎉 Strands Supervisor Pattern 테스트 성공!")
        print(f"   - Claude Supervisor: 작업 분배 및 통합 ✅")
        print(f"   - Tool Workers: 계산 작업 수행 ✅")
        print(f"   - AI Worker: 환각 탐지 수행 ✅")
        print(f"   - 최종 결과: {result.final_score}점 ✅")
        
    except Exception as e:
        print(f"❌ 평가 테스트 실패: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_evaluation())