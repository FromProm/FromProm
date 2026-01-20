#!/usr/bin/env python3
"""
JSON 파싱 문제 직접 테스트
"""

import asyncio
import logging
import json
import re

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def test_claude_json_response():
    """Claude JSON 응답 테스트"""
    try:
        from app.orchestrator.context import ExecutionContext
        
        context = ExecutionContext()
        judge = context.get_judge()
        
        test_prompt = """다음 텍스트들에서 사실 검증이 가능한 구체적인 주장(claim)들을 추출하고, 각 주장이 어떤 분야에 속하는지 분류해주세요.

텍스트들:
1. 2024년 한국의 GDP는 2조 달러를 넘어섰습니다.
2. 삼성전자는 2024년 3분기에 역대 최고 매출을 기록했습니다.

분류 기준:
- current_events: 시사, 최신 사건, 뉴스
- history_people: 역사적 사실, 인물 정보, 정의
- science_research: 과학적 사실, 연구 결과, 수식
- domestic_policy: 국내 정책, 법률, 제도
- academic_paper: 학술 논문, 연구 논문
- dictionary_term: 사전적 정의, 용어 설명

각 주장을 다음 JSON 형식으로만 출력해주세요. 다른 설명이나 텍스트는 포함하지 마세요:

[
  {
    "claim": "구체적인 주장 내용",
    "domain": "분야_코드",
    "confidence": 0.9
  }
]

중요: 
- JSON 배열만 출력하세요
- 추가 설명이나 코멘트는 절대 포함하지 마세요
- 유효한 JSON 형식을 엄격히 준수하세요"""

        print("🔍 Claude에게 JSON 응답 요청 중...")
        response = await judge.analyze_text(test_prompt)
        
        print(f"📊 Claude 응답 분석:")
        print(f"   길이: {len(response)} 문자")
        print(f"   줄 수: {len(response.split(chr(10)))} 줄")
        
        print(f"\n📝 Claude 응답 전체:")
        print("=" * 60)
        print(response)
        print("=" * 60)
        
        # JSON 파싱 시도
        print(f"\n🔍 JSON 파싱 시도...")
        
        # 방법 1: 정규식으로 JSON 추출
        json_match = re.search(r'\[.*?\]', response, re.DOTALL)
        if json_match:
            json_text = json_match.group().strip()
            print(f"✅ JSON 패턴 발견")
            print(f"   추출된 JSON 길이: {len(json_text)} 문자")
            print(f"   추출된 JSON:")
            print("-" * 40)
            print(json_text)
            print("-" * 40)
            
            # 문자별 분석 (269번째 문자 주변)
            if len(json_text) > 269:
                print(f"\n🔍 269번째 문자 주변 분석:")
                start = max(0, 269 - 20)
                end = min(len(json_text), 269 + 20)
                print(f"   위치 {start}-{end}: '{json_text[start:end]}'")
                print(f"   269번째 문자: '{json_text[269]}' (ASCII: {ord(json_text[269])})")
            
            # 줄별 분석 (14번째 줄)
            lines = json_text.split('\n')
            print(f"\n📋 줄별 분석 (총 {len(lines)}줄):")
            for i, line in enumerate(lines, 1):
                marker = " ← 14번째 줄" if i == 14 else ""
                print(f"   {i:2d}: '{line}'{marker}")
            
            try:
                parsed_data = json.loads(json_text)
                print(f"\n✅ JSON 파싱 성공!")
                print(f"   파싱된 항목 수: {len(parsed_data)}")
                for i, item in enumerate(parsed_data, 1):
                    claim = item.get('claim', 'N/A')
                    domain = item.get('domain', 'N/A')
                    print(f"   {i}. [{domain}] {claim[:50]}...")
                    
            except json.JSONDecodeError as e:
                print(f"\n❌ JSON 파싱 실패!")
                print(f"   에러: {e}")
                print(f"   에러 위치: line {getattr(e, 'lineno', 'N/A')}, column {getattr(e, 'colno', 'N/A')}")
                print(f"   에러 문자 위치: {getattr(e, 'pos', 'N/A')}")
                
                # 에러 위치 주변 분석
                if hasattr(e, 'pos') and e.pos is not None:
                    error_pos = e.pos
                    start = max(0, error_pos - 20)
                    end = min(len(json_text), error_pos + 20)
                    print(f"\n🔍 에러 위치 주변 분석:")
                    print(f"   위치 {start}-{end}: '{json_text[start:end]}'")
                    if error_pos < len(json_text):
                        print(f"   에러 문자: '{json_text[error_pos]}' (ASCII: {ord(json_text[error_pos])})")
        else:
            print("❌ JSON 패턴을 찾을 수 없습니다.")
            print("   응답에서 [ ] 패턴이 없습니다.")
            
    except Exception as e:
        print(f"❌ 테스트 실패: {e}")
        import traceback
        print(f"스택 트레이스:")
        print(traceback.format_exc())

async def main():
    print("=" * 60)
    print("🛠️  JSON 파싱 문제 직접 테스트")
    print("=" * 60)
    
    await test_claude_json_response()

if __name__ == "__main__":
    asyncio.run(main())