#!/usr/bin/env python3
"""
환각 탐지 시스템 테스트 스크립트
Claude의 Claim 추출과 MCP 활용이 제대로 작동하는지 확인
"""

import asyncio
import sys
import os

# 프로젝트 루트를 Python 경로에 추가
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.orchestrator.context import ExecutionContext
from app.orchestrator.stages.enhanced_judge_stage import EnhancedJudgeStage
from app.core.schemas import ExampleInput

async def test_hallucination_detection():
    """환각 탐지 시스템 테스트"""
    print("=== Enhanced Hallucination Detection Test ===")
    
    context = ExecutionContext()
    await context.initialize()
    
    try:
        judge_stage = EnhancedJudgeStage(context)
        
        # 테스트용 실행 결과 (사실과 허구가 섞인 내용)
        test_execution_results = {
            "executions": [
                {
                    "input_index": 0,
                    "outputs": [
                        "OpenAI는 2023년 3월 14일에 GPT-4를 공식 발표했습니다.",  # 사실
                        "GPT-4는 1조 개의 파라미터를 가지고 있습니다.",  # 허구 (실제로는 공개되지 않음)
                        "ChatGPT는 2022년 11월 30일에 출시되었습니다.",  # 사실
                        "OpenAI의 CEO는 일론 머스크입니다.",  # 허구 (Sam Altman임)
                        "GPT-4는 멀티모달 모델로 텍스트와 이미지를 처리할 수 있습니다."  # 사실
                    ]
                },
                {
                    "input_index": 1,
                    "outputs": [
                        "2024년 노벨 물리학상은 존 홉필드와 제프리 힌턴이 수상했습니다.",  # 사실
                        "제프리 힌턴은 구글에서 30년간 근무했습니다.",  # 허구
                        "딥러닝은 1980년대에 처음 개발되었습니다.",  # 부분적 사실
                        "인공신경망은 인간의 뇌를 100% 모방한 기술입니다.",  # 허구
                        "머신러닝은 인공지능의 한 분야입니다."  # 사실
                    ]
                }
            ]
        }
        
        # 테스트용 예시 입력
        example_inputs = [
            ExampleInput(content="OpenAI와 GPT-4에 대해 알려주세요", input_type="text"),
            ExampleInput(content="2024년 노벨 물리학상에 대해 설명해주세요", input_type="text")
        ]
        
        print("Testing with mixed factual and fictional content...")
        print("Expected: Should detect some false claims and give a score < 100")
        
        # 환각 탐지 실행
        result = await judge_stage.execute(example_inputs, test_execution_results)
        
        print(f"\n=== Results ===")
        print(f"Final Score: {result.score}/100")
        print(f"Details: {result.details}")
        
        # 상세 분석
        details = result.details
        if 'claims_processed' in details:
            print(f"\nClaims Processed: {details['claims_processed']}")
            
        if 'claim_scores' in details:
            print(f"\nIndividual Claim Scores:")
            for i, claim_score in enumerate(details['claim_scores']):
                claim_text = claim_score.get('claim', 'Unknown')[:100]
                score = claim_score.get('score', 0)
                reasoning = claim_score.get('reasoning', 'No reasoning')[:150]
                print(f"  {i+1}. [{score:5.1f}] {claim_text}...")
                print(f"      Reasoning: {reasoning}")
        
        # 결과 해석
        if result.score == 100.0:
            if details.get('claims_processed', 0) == 0:
                print(f"\n⚠️  WARNING: No claims were extracted!")
                print(f"   This suggests the claim extraction process failed.")
            else:
                print(f"\n⚠️  WARNING: Perfect score despite mixed content!")
                print(f"   This suggests the scoring process may have issues.")
        elif result.score > 80:
            print(f"\n✅ GOOD: High score suggests mostly factual content")
        elif result.score > 50:
            print(f"\n⚠️  MIXED: Medium score suggests some questionable claims")
        else:
            print(f"\n❌ POOR: Low score suggests many false claims detected")
        
    except Exception as e:
        print(f"Test failed: {str(e)}")
        import traceback
        traceback.print_exc()
    
    finally:
        await context.cleanup()

async def main():
    """메인 테스트 함수"""
    print("Enhanced Hallucination Detection Test")
    print("=" * 50)
    
    await test_hallucination_detection()
    
    print("\nTest completed!")

if __name__ == "__main__":
    asyncio.run(main())