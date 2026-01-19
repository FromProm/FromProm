"""
Hallucination Agent - MCP 기반 환각 탐지 전문 AI
Google Search + Brave Search를 사용한 팩트체크
"""

import logging
import asyncio
from typing import Dict, Any, List

from app.core.schemas import MetricScore, ExampleInput
from app.adapters.mcp.mcp_client import MCPClient, MCPServerType

logger = logging.getLogger(__name__)


class HallucinationAgent:
    """
    MCP 기반 환각 탐지 전문 AI Agent
    
    역할:
    - AI 출력에서 사실적 주장(claims) 추출
    - Google Search + Brave Search로 팩트체크
    - 환각 점수 계산
    """
    
    def __init__(self):
        self.agent_name = "HallucinationAgent"
        self.mcp_client = MCPClient()
    
    async def analyze_hallucination(
        self,
        judge,
        example_inputs: List[ExampleInput],
        execution_results: Dict[str, Any]
    ) -> MetricScore:
        """MCP 기반 환각 탐지 분석"""
        
        logger.info(f"🔍 {self.agent_name} starting MCP-based hallucination detection...")
        
        try:
            executions = execution_results.get("executions", [])
            
            if not executions:
                logger.warning(f"⚠️ {self.agent_name}: No executions to analyze")
                return MetricScore(
                    score=100.0,
                    details={
                        "agent": self.agent_name,
                        "message": "No executions to analyze",
                        "method": "mcp_factcheck"
                    }
                )
            
            total_claims = 0
            verified_claims = 0
            hallucination_details = []
            
            for exec_data in executions:
                outputs = exec_data.get("outputs", [])
                input_index = exec_data.get("input_index", 0)
                
                # 입력 컨텍스트 가져오기
                input_context = ""
                if input_index < len(example_inputs):
                    input_context = example_inputs[input_index].content
                
                for output in outputs:
                    if not output or not isinstance(output, str):
                        continue
                    
                    # 1. Judge로 주장 추출
                    claims = await self._extract_claims(judge, output, input_context)
                    
                    if not claims:
                        continue
                    
                    # 2. MCP로 각 주장 팩트체크
                    for claim in claims:
                        total_claims += 1
                        
                        is_verified, evidence = await self._verify_claim_with_mcp(claim)
                        
                        if is_verified:
                            verified_claims += 1
                        else:
                            hallucination_details.append({
                                "claim": claim,
                                "verified": False,
                                "evidence": evidence
                            })
            
            # 점수 계산 (환각이 없을수록 높은 점수)
            if total_claims > 0:
                score = (verified_claims / total_claims) * 100
            else:
                score = 100.0
            
            logger.info(f"✅ {self.agent_name} completed - Score: {score:.2f}, Claims: {total_claims}, Verified: {verified_claims}")
            
            return MetricScore(
                score=score,
                details={
                    "agent": self.agent_name,
                    "method": "mcp_factcheck",
                    "sources": ["google_search", "brave_search"],
                    "total_claims": total_claims,
                    "verified_claims": verified_claims,
                    "hallucination_count": len(hallucination_details),
                    "hallucinations": hallucination_details[:5]
                }
            )
            
        except Exception as e:
            logger.error(f"❌ {self.agent_name} failed: {str(e)}")
            return MetricScore(
                score=0.0,
                details={
                    "agent": self.agent_name,
                    "error": str(e)
                }
            )
    
    async def _extract_claims(
        self,
        judge,
        output: str,
        input_context: str
    ) -> List[str]:
        """Judge를 사용해 팩트체크 가능한 주장 추출"""
        
        try:
            extraction_prompt = f"""다음 AI 출력에서 팩트체크가 필요한 사실적 주장들만 추출해주세요.

입력 컨텍스트: {input_context}

AI 출력:
{output[:2000]}

규칙:
- 검증 가능한 사실적 주장만 추출 (숫자, 날짜, 이름, 사건 등)
- 의견, 추측, 일반적인 설명은 제외
- 각 주장은 한 문장으로 간결하게

JSON 배열로 응답:
["주장1", "주장2", "주장3"]

주장이 없으면 빈 배열 [] 반환"""

            response = await judge.analyze_text(extraction_prompt)
            
            # JSON 파싱
            import json
            import re
            
            json_match = re.search(r'\[[\s\S]*?\]', response)
            if json_match:
                try:
                    claims = json.loads(json_match.group())
                    if isinstance(claims, list):
                        return [c for c in claims if isinstance(c, str) and len(c) > 10][:5]
                except json.JSONDecodeError:
                    pass
            
            return []
            
        except Exception as e:
            logger.error(f"Claim extraction failed: {str(e)}")
            return []
    
    async def _verify_claim_with_mcp(self, claim: str) -> tuple[bool, str]:
        """MCP (Google + Brave)로 주장 검증"""
        
        try:
            # Google Search와 Brave Search 병렬 실행
            google_task = self.mcp_client.search_evidence(
                MCPServerType.GOOGLE_SEARCH, claim, limit=3
            )
            brave_task = self.mcp_client.search_evidence(
                MCPServerType.BRAVE_SEARCH, claim, limit=3
            )
            
            google_results, brave_results = await asyncio.gather(
                google_task, brave_task, return_exceptions=True
            )
            
            # 결과 합치기
            all_results = []
            if not isinstance(google_results, Exception):
                all_results.extend(google_results)
            if not isinstance(brave_results, Exception):
                all_results.extend(brave_results)
            
            if not all_results:
                return False, "검색 결과 없음"
            
            # 검증 로직: 검색 결과에서 주장과 관련된 내용 확인
            supporting_evidence = []
            contradicting_evidence = []
            
            for result in all_results:
                content = result.get('content', '').lower()
                title = result.get('title', '').lower()
                claim_lower = claim.lower()
                
                # 간단한 키워드 매칭으로 관련성 확인
                claim_keywords = [w for w in claim_lower.split() if len(w) > 2]
                matches = sum(1 for kw in claim_keywords if kw in content or kw in title)
                
                if matches >= len(claim_keywords) * 0.3:  # 30% 이상 키워드 매칭
                    supporting_evidence.append({
                        'title': result.get('title', ''),
                        'url': result.get('url', ''),
                        'source': result.get('source', '')
                    })
            
            # 지지 근거가 있으면 검증됨
            if supporting_evidence:
                evidence_summary = f"지지 근거 {len(supporting_evidence)}개 발견: {supporting_evidence[0].get('title', '')}"
                return True, evidence_summary
            else:
                return False, "관련 근거를 찾지 못함"
            
        except Exception as e:
            logger.error(f"MCP verification failed: {str(e)}")
            return False, f"검증 실패: {str(e)}"
