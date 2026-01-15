"""
향상된 환각 탐지 단계
Claude 기반 Claim 분석 + MCP 선택 + Cohere Rerank + 판단 LLM
"""

import logging
import asyncio
from typing import Dict, Any, List, Optional, Tuple
from enum import Enum

from app.orchestrator.context import ExecutionContext
from app.core.schemas import MetricScore, ExampleInput

logger = logging.getLogger(__name__)

class ClaimDomain(str, Enum):
    """Claim 분야 분류"""
    CURRENT_EVENTS = "current_events"      # 시사/최신 사건
    HISTORY_PEOPLE = "history_people"      # 역사/인물/정의  
    SCIENCE_RESEARCH = "science_research"  # 과학/연구/수식
    ACADEMIC_PAPER = "academic_paper"      # 학술 논문
    GENERAL_SEARCH = "general_search"      # 일반 검색

class MCPSource(str, Enum):
    """MCP 소스 타입"""
    BRAVE_SEARCH = "brave_search"
    TAVILY_SEARCH = "tavily_search"
    WIKIPEDIA = "wikipedia"
    ACADEMIC_SEARCH = "academic_search"
    GOOGLE_SEARCH = "google_search"
    # 실제 MCP 클라이언트에서 지원하는 타입들만 사용

class EnhancedJudgeStage:
    """향상된 환각 탐지 단계"""
    
    def __init__(self, context: ExecutionContext):
        self.context = context
        
        # MCP 매핑 - Google Search와 Tavily Search를 주로 사용
        self.domain_to_mcp = {
            ClaimDomain.CURRENT_EVENTS: [MCPSource.GOOGLE_SEARCH, MCPSource.TAVILY_SEARCH],
            ClaimDomain.HISTORY_PEOPLE: [MCPSource.GOOGLE_SEARCH, MCPSource.WIKIPEDIA],
            ClaimDomain.SCIENCE_RESEARCH: [MCPSource.GOOGLE_SEARCH, MCPSource.ACADEMIC_SEARCH],
            ClaimDomain.ACADEMIC_PAPER: [MCPSource.GOOGLE_SEARCH, MCPSource.ACADEMIC_SEARCH],
            ClaimDomain.GENERAL_SEARCH: [MCPSource.GOOGLE_SEARCH, MCPSource.TAVILY_SEARCH]
        }
    
    async def execute(
        self, 
        example_inputs: List[ExampleInput], 
        execution_results: Dict[str, Any]
    ) -> MetricScore:
        """
        향상된 환각 탐지 실행
        1. Claude로 Claim 추출 및 분야 분류
        2. MCP 선택 및 근거 수집
        3. Cohere Rerank
        4. Lost in Middle 방지 재배치
        5. 판단 LLM으로 점수 계산
        """
        logger.info("Starting enhanced hallucination detection")
        
        try:
            judge = self.context.get_judge()
            executions = execution_results['executions']
            
            # [1단계] Claude로 Claim 추출 및 분야 분류
            logger.info("Step 1: Extracting and classifying claims...")
            classified_claims = await self._extract_and_classify_claims(judge, executions)
            
            logger.info(f"Extracted {len(classified_claims)} classified claims")
            for i, claim in enumerate(classified_claims):
                logger.info(f"  Claim {i+1}: [{claim.get('domain')}] {claim.get('claim', '')[:100]}...")
            
            if not classified_claims:
                logger.warning("No verifiable claims found - returning perfect score")
                return MetricScore(
                    score=100.0,
                    details={
                        'note': 'No verifiable claims found', 
                        'claims_processed': 0,
                        'reason': 'no_claims_extracted'
                    }
                )
            
            # [2단계] MCP 기반 근거 수집
            logger.info("Step 2: Collecting evidence using MCP...")
            evidence_results = await self._collect_evidence_parallel(classified_claims)
            
            # [3단계] Cohere Rerank
            logger.info("Step 3: Reranking evidence with Cohere...")
            reranked_results = await self._rerank_evidence_parallel(evidence_results)
            
            # [4단계] Lost in Middle 방지 재배치
            logger.info("Step 4: Rearranging evidence to prevent lost in middle...")
            rearranged_results = self._rearrange_evidence(reranked_results)
            
            # [5단계] 판단 LLM으로 점수 계산
            logger.info("Step 5: Scoring claims with judgment LLM...")
            claim_scores = await self._score_claims_parallel(judge, rearranged_results)
            
            # 최종 점수 계산
            final_score = self._calculate_final_score(claim_scores)
            
            details = {
                'claims_processed': len(classified_claims),
                'claim_scores': claim_scores,
                'average_score': final_score,
                'methodology': 'Enhanced MCP-based fact verification with Cohere reranking'
            }
            
            logger.info(f"Enhanced hallucination detection completed: {final_score:.3f}")
            return MetricScore(score=final_score, details=details)
            
        except Exception as e:
            logger.error(f"Enhanced hallucination detection failed: {str(e)}")
            return MetricScore(score=0.0, details={'error': str(e)})
    
    async def _extract_and_classify_claims(
        self, 
        judge, 
        executions: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Claude로 Claim 추출, 키워드 추출 및 분야 분류"""
        
        all_outputs = []
        for exec_data in executions:
            outputs = exec_data.get('outputs', [])
            all_outputs.extend([output for output in outputs if output.strip()])
        
        logger.info(f"Analyzing {len(all_outputs)} non-empty outputs for claims")
        
        if not all_outputs:
            logger.warning("No valid outputs to analyze")
            return []
        
        # 출력 내용 샘플 로깅
        for i, output in enumerate(all_outputs[:3]):  # 처음 3개만
            logger.info(f"Sample output {i+1}: {output[:200]}...")
        
        # Claude에게 Claim 추출, 키워드 추출 및 분류 요청
        prompt = f"""다음 텍스트들에서 사실 검증이 가능한 구체적인 주장(claim)들을 추출하고, 각 주장의 핵심 키워드와 분야를 분류해주세요.

텍스트들:
""" + "\n".join([f"{i+1}. {output}" for i, output in enumerate(all_outputs)]) + """

분류 기준:
- current_events: 시사, 최신 사건, 뉴스
- history_people: 역사적 사실, 인물 정보, 정의
- science_research: 과학적 사실, 연구 결과, 수식
- academic_paper: 학술 논문, 연구 논문
- general_search: 일반적인 사실, 상식, 기타

키워드 추출 규칙:
- 각 주장에서 검증에 필요한 핵심 키워드 2-4개 추출
- 인명, 고유명사, 전문용어, 핵심 개념 위주
- 예: "1950년대: 알란 튜링이 인공지능 개념을 제안" → ["알란 튜링", "인공지능", "1950년대"]

각 주장을 다음 JSON 형식으로만 출력해주세요. 다른 설명이나 텍스트는 포함하지 마세요:

[
  {
    "claim": "구체적인 주장 내용",
    "keywords": ["키워드1", "키워드2", "키워드3"],
    "domain": "분야_코드",
    "confidence": 0.9
  }
]

중요: 
- JSON 배열만 출력하세요
- 추가 설명이나 코멘트는 절대 포함하지 마세요
- 유효한 JSON 형식을 엄격히 준수하세요
- keywords는 반드시 배열 형태로 제공하세요

검증 불가능한 주관적 의견이나 창작 내용은 제외하고, 객관적으로 참/거짓을 판단할 수 있는 주장만 포함해주세요."""

        try:
            logger.info("Sending claim extraction request to Claude...")
            result = await judge.analyze_text(prompt)
            logger.info(f"Claude response length: {len(result)} characters")
            logger.info(f"Claude response preview: {result[:500]}...")
            
            # JSON 파싱 시도
            import json
            import re
            
            # JSON 부분만 추출 (더 정확한 방법)
            json_match = re.search(r'\[.*?\]', result, re.DOTALL)
            if json_match:
                json_text = json_match.group().strip()
                logger.info(f"Extracted JSON: {json_text[:300]}...")
                
                # JSON 유효성 검사 및 정리
                try:
                    claims_data = json.loads(json_text)
                except json.JSONDecodeError as e:
                    logger.warning(f"First JSON parse failed: {e}")
                    # 더 엄격한 JSON 추출 시도
                    lines = result.split('\n')
                    json_lines = []
                    in_json = False
                    bracket_count = 0
                    
                    for line in lines:
                        line = line.strip()
                        if line.startswith('['):
                            in_json = True
                            bracket_count = line.count('[') - line.count(']')
                            json_lines.append(line)
                        elif in_json:
                            bracket_count += line.count('[') - line.count(']')
                            json_lines.append(line)
                            if bracket_count <= 0:
                                break
                    
                    if json_lines:
                        json_text = '\n'.join(json_lines)
                        logger.info(f"Cleaned JSON: {json_text[:300]}...")
                        claims_data = json.loads(json_text)
                    else:
                        raise e
                logger.info(f"Parsed {len(claims_data)} claims from JSON")
                
                # 유효한 도메인만 필터링
                valid_domains = [domain.value for domain in ClaimDomain]
                filtered_claims = []
                
                for claim_data in claims_data:
                    claim_text = claim_data.get('claim', '')
                    keywords = claim_data.get('keywords', [])
                    domain = claim_data.get('domain', '')
                    
                    if (domain in valid_domains and 
                        claim_text and 
                        len(claim_text) > 10 and
                        isinstance(keywords, list)):
                        
                        # 키워드가 없으면 자동 추출 (fallback)
                        if not keywords:
                            logger.warning(f"No keywords provided for claim, using fallback extraction")
                            keywords = self._extract_keywords_fallback(claim_text)
                        
                        claim_data['keywords'] = keywords
                        filtered_claims.append(claim_data)
                        logger.info(f"Valid claim: [{domain}] {claim_text[:100]}... | Keywords: {keywords}")
                    else:
                        logger.warning(f"Invalid claim filtered out: [{domain}] {claim_text[:50]}... | Keywords: {keywords}")
                
                logger.info(f"Final filtered claims: {len(filtered_claims)}")
                return filtered_claims
            else:
                logger.error("No JSON array found in Claude response")
                logger.error(f"Full response: {result}")
            
        except json.JSONDecodeError as e:
            logger.error(f"JSON parsing failed: {str(e)}")
            if 'json_text' in locals():
                logger.error(f"Problematic JSON (first 500 chars): {json_text[:500]}")
                logger.error(f"Problematic JSON (last 500 chars): {json_text[-500:]}")
            else:
                logger.error("No JSON text extracted from response")
                logger.error(f"Full Claude response: {result[:1000]}")
        except Exception as e:
            logger.error(f"Claim extraction failed: {str(e)}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
        
        return []
    
    def _extract_keywords_fallback(self, claim_text: str) -> List[str]:
        """키워드 추출 실패 시 fallback 로직"""
        import re
        
        # 인명 추출 (한글 이름, 영문 이름)
        names = re.findall(r'[A-Z][a-z]+\s+[A-Z][a-z]+|[가-힣]{2,4}', claim_text)
        
        # 숫자/연도 추출
        years = re.findall(r'\d{4}년대?|\d{4}년', claim_text)
        
        # 핵심 명사 추출 (조사 제거)
        nouns = re.findall(r'([가-힣]{2,10})(?:이라는|이|가|을|를|의|에서|으로)', claim_text)
        
        # 영문 전문용어
        english_terms = re.findall(r'[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*', claim_text)
        
        # 조합
        keywords = []
        keywords.extend(names[:2])
        keywords.extend(years[:1])
        keywords.extend(nouns[:2])
        keywords.extend(english_terms[:1])
        
        # 중복 제거 및 최대 4개
        unique_keywords = []
        for kw in keywords:
            if kw not in unique_keywords and len(kw) > 1:
                unique_keywords.append(kw)
        
        return unique_keywords[:4] if unique_keywords else [claim_text[:30]]
    
    async def _collect_evidence_parallel(
        self, 
        classified_claims: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """MCP를 사용하여 병렬로 근거 수집"""
        
        tasks = []
        for claim_data in classified_claims:
            task = self._collect_evidence_for_claim(claim_data)
            tasks.append(task)
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        evidence_results = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                logger.error(f"Evidence collection failed for claim {i}: {str(result)}")
                # 실패한 경우 빈 근거로 처리
                evidence_results.append({
                    **classified_claims[i],
                    'evidence': [],
                    'mcp_used': 'failed'
                })
            else:
                evidence_results.append(result)
        
        return evidence_results
    
    async def _collect_evidence_for_claim(self, claim_data: Dict[str, Any]) -> Dict[str, Any]:
        """단일 Claim에 대한 근거 수집 - 각 키워드당 5개씩 수집"""
        
        domain = ClaimDomain(claim_data['domain'])
        claim_text = claim_data['claim']
        keywords = claim_data.get('keywords', [])
        
        # 도메인에 따른 MCP 선택
        available_mcps = self.domain_to_mcp.get(domain, [MCPSource.GOOGLE_SEARCH, MCPSource.BRAVE_SEARCH])
        
        try:
            all_evidence = []
            mcp_used = []
            
            # 각 키워드에 대해 근거 수집
            for keyword in keywords:
                logger.info(f"Collecting evidence for keyword: '{keyword}'")
                
                # 각 MCP 소스에서 키워드로 검색 (키워드당 5개)
                for mcp_source in available_mcps[:2]:  # 최대 2개 소스 사용
                    try:
                        evidence = await self._call_mcp_for_evidence(mcp_source, keyword, limit=5)
                        
                        # 키워드 정보 추가
                        for ev in evidence:
                            ev['search_keyword'] = keyword
                        
                        all_evidence.extend(evidence)
                        
                        if mcp_source.value not in mcp_used:
                            mcp_used.append(mcp_source.value)
                        
                        logger.info(f"  - {mcp_source.value}: {len(evidence)} items for '{keyword}'")
                    except Exception as e:
                        logger.warning(f"  - {mcp_source.value} failed for '{keyword}': {str(e)}")
            
            logger.info(f"Total collected: {len(all_evidence)} evidence items from {len(keywords)} keywords")
            
            return {
                **claim_data,
                'evidence': all_evidence,
                'mcp_used': mcp_used,
                'keywords_searched': keywords
            }
            
        except Exception as e:
            logger.error(f"Evidence collection failed: {str(e)}")
            return {
                **claim_data,
                'evidence': [],
                'mcp_used': 'failed'
            }
    
    async def _call_mcp_for_evidence(
        self, 
        mcp_source: MCPSource, 
        claim_text: str, 
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """MCP 호출하여 근거 수집 - 실제 구현"""
        
        try:
            # MCP 클라이언트 import
            from app.adapters.mcp.mcp_client import MCPClient, MCPServerType
            
            # MCP 소스를 서버 타입으로 변환
            source_mapping = {
                MCPSource.BRAVE_SEARCH: MCPServerType.BRAVE_SEARCH,
                MCPSource.TAVILY_SEARCH: MCPServerType.TAVILY_SEARCH,
                MCPSource.WIKIPEDIA: MCPServerType.WIKIPEDIA,
                MCPSource.ACADEMIC_SEARCH: MCPServerType.ACADEMIC_SEARCH,
                MCPSource.GOOGLE_SEARCH: MCPServerType.GOOGLE_SEARCH
            }
            
            server_type = source_mapping.get(mcp_source)
            if not server_type:
                logger.error(f"Unsupported MCP source: {mcp_source}")
                return []
            
            # 실제 MCP 클라이언트로 검색
            mcp_client = MCPClient()
            evidence = await mcp_client.search_evidence(server_type, claim_text, limit)
            
            logger.info(f"MCP {mcp_source.value} returned {len(evidence)} evidence items")
            return evidence
            
        except Exception as e:
            logger.error(f"MCP call failed for {mcp_source}: {str(e)}")
            return []
    
    async def _rerank_evidence_parallel(
        self, 
        evidence_results: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Cohere Reranker로 병렬 재순위화"""
        
        tasks = []
        for evidence_data in evidence_results:
            if evidence_data['evidence']:
                task = self._rerank_single_evidence(evidence_data)
                tasks.append(task)
            else:
                # 근거가 없으면 그대로 반환
                tasks.append(asyncio.create_task(self._return_as_is(evidence_data)))
        
        return await asyncio.gather(*tasks, return_exceptions=True)
    
    async def _rerank_single_evidence(self, evidence_data: Dict[str, Any]) -> Dict[str, Any]:
        """단일 Claim의 근거를 Cohere로 재순위화"""
        
        claim_text = evidence_data['claim']
        evidence_list = evidence_data['evidence']
        
        logger.info(f"Reranking {len(evidence_list)} evidence items for claim: {claim_text[:50]}...")
        
        try:
            # 실제 AWS Bedrock Cohere Rerank 호출
            from app.adapters.reranker.cohere_reranker import CohereReranker
            
            reranker = CohereReranker()
            reranked_evidence = await reranker.rerank_evidence_list(
                claim=claim_text,
                evidence_list=evidence_list,
                top_k=min(15, len(evidence_list))  # 최대 15개까지 유지
            )
            
            logger.info(f"Cohere rerank completed: {len(reranked_evidence)} items retained")
            
            return {
                **evidence_data,
                'evidence': reranked_evidence,
                'reranked': True,
                'rerank_method': 'cohere_bedrock',
                'original_count': len(evidence_list),
                'reranked_count': len(reranked_evidence)
            }
            
        except Exception as e:
            logger.error(f"Cohere reranking failed: {str(e)}, using fallback")
            
            # 실패 시 기본 정렬로 폴백
            await asyncio.sleep(0.05)
            
            # Fallback: relevance_score 기준으로 정렬
            reranked_evidence = sorted(
                evidence_list, 
                key=lambda x: x.get('relevance_score', 0), 
                reverse=True
            )[:15]  # 최대 15개
            
            # Rerank 점수 추가
            for i, evidence in enumerate(reranked_evidence):
                evidence['rerank_score'] = 1.0 - (i * 0.05)
                evidence['rerank_position'] = i + 1
            
            return {
                **evidence_data,
                'evidence': reranked_evidence,
                'reranked': True,
                'rerank_method': 'fallback_relevance',
                'rerank_error': str(e),
                'original_count': len(evidence_list),
                'reranked_count': len(reranked_evidence)
            }
    
    async def _return_as_is(self, evidence_data: Dict[str, Any]) -> Dict[str, Any]:
        """근거가 없는 경우 그대로 반환"""
        return {**evidence_data, 'reranked': False}
    
    def _rearrange_evidence(
        self, 
        reranked_results: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Lost in Middle 방지를 위한 근거 재배치"""
        
        rearranged_results = []
        
        for evidence_data in reranked_results:
            if isinstance(evidence_data, Exception):
                logger.error(f"Reranking failed: {str(evidence_data)}")
                continue
                
            evidence_list = evidence_data.get('evidence', [])
            
            if len(evidence_list) <= 3:
                # 3개 이하면 그대로 사용
                rearranged_evidence = evidence_list
            else:
                # Lost in Middle 방지 재배치
                # 가장 중요한 것들을 처음과 끝에 배치
                rearranged_evidence = self._apply_lost_in_middle_prevention(evidence_list)
            
            rearranged_results.append({
                **evidence_data,
                'evidence': rearranged_evidence,
                'rearranged': True
            })
        
        return rearranged_results
    
    def _apply_lost_in_middle_prevention(self, evidence_list: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Lost in Middle 방지 알고리즘 적용"""
        
        if len(evidence_list) <= 3:
            return evidence_list
        
        # 점수 기준으로 정렬 (이미 rerank됨)
        sorted_evidence = sorted(
            evidence_list, 
            key=lambda x: x.get('rerank_score', x.get('relevance_score', 0)), 
            reverse=True
        )
        
        # 재배치: [1위, 2위, 3위, 7위, 8위, 9위, 10위, 6위, 5위, 4위]
        rearranged = []
        
        # 처음 3개 (1위, 2위, 3위) - 높은 점수들을 앞에
        for i in range(min(3, len(sorted_evidence))):
            rearranged.append(sorted_evidence[i])
        
        # 중간 낮은 점수들 (7위부터 끝까지) - 가장 낮은 점수들을 중간에
        if len(sorted_evidence) > 6:
            for i in range(6, len(sorted_evidence)):
                rearranged.append(sorted_evidence[i])
        
        # 마지막에 6위, 5위, 4위 순서로 (역순) - 중간 점수들을 끝에
        if len(sorted_evidence) > 3:
            for i in range(min(6, len(sorted_evidence)) - 1, 2, -1):
                if i < len(sorted_evidence):
                    rearranged.append(sorted_evidence[i])
        
        return rearranged
    
    async def _score_claims_parallel(
        self, 
        judge, 
        rearranged_results: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """판단 LLM으로 병렬 점수 계산"""
        
        tasks = []
        for evidence_data in rearranged_results:
            task = self._score_single_claim(judge, evidence_data)
            tasks.append(task)
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        scored_results = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                logger.error(f"Claim scoring failed for claim {i}: {str(result)}")
                scored_results.append({
                    **rearranged_results[i],
                    'score': 50.0,  # 중간 점수
                    'scoring_error': str(result)
                })
            else:
                scored_results.append(result)
        
        return scored_results
    
    async def _score_single_claim(
        self, 
        judge, 
        evidence_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """단일 Claim에 대한 점수 계산 - 재정렬된 근거 기반"""
        
        claim_text = evidence_data['claim']
        evidence_list = evidence_data.get('evidence', [])
        keywords = evidence_data.get('keywords', [])
        
        if not evidence_list:
            # 근거가 없으면 낮은 점수 (검증 불가)
            return {
                **evidence_data,
                'score': 30.0,
                'reasoning': 'No evidence available for verification - likely hallucination'
            }
        
        # 근거들을 텍스트로 구성 (rerank_score 순서대로 이미 정렬됨)
        evidence_text = "\n\n".join([
            f"근거 {i+1} (관련도: {evidence.get('rerank_score', 0):.2f}):\n"
            f"제목: {evidence.get('title', '')}\n"
            f"내용: {evidence.get('content', '')}\n"
            f"출처: {evidence.get('url', '')}"
            for i, evidence in enumerate(evidence_list[:10])  # 상위 10개만 사용
        ])
        
        # 판단 LLM에게 점수 요청
        scoring_prompt = f"""다음 주장(claim)에 대해 제공된 근거들을 바탕으로 사실 여부를 판단하고 0-100점으로 점수를 매겨주세요.

주장: {claim_text}

검색 키워드: {', '.join(keywords)}

근거들 (관련도 순으로 정렬됨):
{evidence_text}

평가 기준:
- 100점: 근거들이 주장을 명확하고 구체적으로 뒷받침함 (사실 확인됨)
- 80-99점: 근거들이 주장을 강하게 뒷받침하지만 일부 세부사항 불일치
- 60-79점: 근거들이 주장을 부분적으로 뒷받침함
- 40-59점: 근거들이 주장과 관련은 있으나 직접적 뒷받침 부족
- 20-39점: 근거들이 주장과 상충하거나 반박함 (환각 가능성 높음)
- 0-19점: 근거들이 주장을 명확히 반박함 (환각 확실)

중요:
- 근거의 관련도 점수를 고려하세요
- 여러 독립적인 출처가 같은 내용을 뒷받침하면 신뢰도가 높습니다
- 근거가 주장의 핵심 내용을 직접 언급하는지 확인하세요

다음 형식으로 답변해주세요:
점수: [0-100 숫자]
근거: [점수를 매긴 이유를 2-3문장으로 설명]"""

        try:
            result = await judge.analyze_text(scoring_prompt)
            
            # 점수 추출
            import re
            score_match = re.search(r'점수:\s*(\d+)', result)
            reasoning_match = re.search(r'근거:\s*(.+)', result, re.DOTALL)
            
            if score_match:
                score = float(score_match.group(1))
                reasoning = reasoning_match.group(1).strip() if reasoning_match else "No reasoning provided"
                
                # 근거 개수에 따른 신뢰도 조정
                if len(evidence_list) < 3:
                    score = score * 0.9  # 근거가 적으면 10% 감점
                    reasoning += f" (근거 부족으로 10% 감점: {len(evidence_list)}개)"
            else:
                score = 50.0
                reasoning = "Failed to parse score from LLM response"
            
            logger.info(f"Claim scored: {score:.1f} - {claim_text[:50]}...")
            
            return {
                **evidence_data,
                'score': max(0.0, min(100.0, score)),
                'reasoning': reasoning,
                'llm_response': result[:500],
                'evidence_count': len(evidence_list)
            }
            
        except Exception as e:
            logger.error(f"Claim scoring failed: {str(e)}")
            return {
                **evidence_data,
                'score': 50.0,
                'reasoning': f'Scoring failed: {str(e)}',
                'evidence_count': len(evidence_list)
            }
    
    def _calculate_final_score(self, claim_scores: List[Dict[str, Any]]) -> float:
        """최종 점수 계산"""
        
        if not claim_scores:
            return 100.0  # 검증할 주장이 없으면 환각 없음 (100점 = 좋음)
        
        # 각 주장의 점수 평균
        scores = [result.get('score', 50.0) for result in claim_scores]
        
        # 검증 점수 평균 = 사실 확인 점수
        # 100점 = 환각 없음 (좋음), 0점 = 환각 많음 (나쁨)
        average_verification_score = sum(scores) / len(scores)
        
        return max(0.0, min(100.0, average_verification_score))