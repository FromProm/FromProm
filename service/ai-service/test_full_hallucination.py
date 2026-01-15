#!/usr/bin/env python3
"""
전체 환각 탐지 파이프라인 테스트
"""

import asyncio
import logging

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def test_full_hallucination_detection():
    """전체 환각 탐지 파이프라인 테스트"""
    try:
        from app.orchestrator.context import ExecutionContext
        from app.orchestrator.stages.enhanced_judge_stage import EnhancedJudgeStage
        from app.core.schemas import ExampleInput
        
        print("🔍 전체 환각 탐지 파이프라인 테스트 시작...")
        
        # 테스트 데이터 (실제 SQS에서 받는 형식과 동일)
        test_execution_results = {
            'executions': [
                {
                    'input_index': 0,
                    'outputs': [
                        "2024년 한국의 GDP는 2조 달러를 넘어섰습니다. 이는 전년 대비 3.2% 성장한 수치입니다.",
                        "삼성전자는 2024년 3분기에 역대 최고 매출을 기록했습니다. 반도체 부문이 크게 성장했습니다.",
                        "BTS는 2024년 그래미 어워드에서 5개 부문을 수상했습니다. K-pop 역사상 최고 기록입니다."
                    ]
                }
            ]
        }
        
        test_inputs = [
            ExampleInput(content="한국 경제에 대해 설명해주세요", input_type="text")
        ]
        
        # ExecutionContext 생성
        context = ExecutionContext()
        
        # EnhancedJudgeStage 실행
        judge_stage = EnhancedJudgeStage(context)
        
        print("📊 Enhanced Judge Stage 실행 중...")
        result = await judge_stage.execute(test_inputs, test_execution_results)
        
        print(f"\n✅ 환각 탐지 완료!")
        print(f"   최종 점수: {result.score}")
        print(f"   점수 타입: {type(result.score)}")
        
        print(f"\n📋 상세 결과:")
        details = result.details
        for key, value in details.items():
            if key == 'claim_scores' and isinstance(value, list):
                print(f"   {key}: {len(value)}개 항목")
                for i, claim_score in enumerate(value, 1):
                    claim_text = claim_score.get('claim', 'N/A')
                    score = claim_score.get('score', 'N/A')
                    print(f"      {i}. [{score}점] {claim_text[:50]}...")
            else:
                print(f"   {key}: {value}")
        
        # 100점인 경우 원인 분석
        if result.score >= 99:
            print(f"\n⚠️  점수가 {result.score}점으로 매우 높습니다.")
            print("   가능한 원인:")
            
            claims_processed = details.get('claims_processed', 0)
            if claims_processed == 0:
                print("   ❌ Claim이 추출되지 않았습니다.")
                print("      - Claude가 Claim 추출에 실패")
                print("      - JSON 파싱 실패")
                print("      - 출력 텍스트에 검증 가능한 주장이 없다고 판단")
            else:
                print(f"   ✅ {claims_processed}개 Claim이 추출되었습니다.")
                print("   ❌ 하지만 모든 Claim이 높은 점수를 받았습니다.")
                print("      - MCP 검증이 제대로 작동하지 않음")
                print("      - Mock 데이터로 인한 높은 점수")
                
        elif result.score <= 1:
            print(f"\n⚠️  점수가 {result.score}점으로 매우 낮습니다.")
            print("   모든 Claim이 사실로 확인되어 환각이 거의 없다고 판단됨")
            
        else:
            print(f"\n✅ 정상적인 점수 범위입니다: {result.score}점")
        
    except Exception as e:
        print(f"❌ 전체 환각 탐지 테스트 실패: {e}")
        import traceback
        print(f"스택 트레이스:")
        print(traceback.format_exc())

async def main():
    print("=" * 60)
    print("🛠️  전체 환각 탐지 파이프라인 테스트")
    print("=" * 60)
    
    await test_full_hallucination_detection()

if __name__ == "__main__":
    asyncio.run(main())