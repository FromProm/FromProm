import logging
import asyncio
import re
from typing import Dict, Any, List, Optional
from app.orchestrator.context import ExecutionContext
from app.core.schemas import MetricScore, ExampleInput, ClaimType, Verdict
from app.adapters.fact_checker import PerplexityClient
from app.cache.sqlite_cache import SQLiteCache

logger = logging.getLogger(__name__)

class JudgeStage:
    """환각 탐지 단계 - Perplexity 기반 사실 검증 (SQLite 캐싱)"""
    
    def __init__(self, context: ExecutionContext):
        self.context = context
        self.perplexity_client = PerplexityClient()
        self.cache = SQLiteCache("fact_check_cache.db")
    
    async def execute(
        self, 
        example_inputs: List[ExampleInput], 
        execution_results: Dict[str, Any]
    ) -> MetricScore:
        """
        환각 탐지 점수 계산 (Perplexity 기반 병렬 처리)
        1. 모든 출력에서 FACT_VERIFIABLE 문장 병렬 추출
        2. claim 통합 + 중복 제거
        3. Perplexity로 병렬 검증
        4. 점수 계산 (100점 만점)
        """
        logger.info("Running hallucination detection with Perplexity fact verification")
        
        try:
            judge = self.context.get_judge()
            executions = execution_results['executions']
            
            # [1단계] 모든 출력에서 claim 병렬 추출
            claim_extraction_tasks = []
            output_info = []  # 출력 정보 저장
            
            for exec_data in executions:
                input_index = exec_data['input_index']
                outputs = exec_data['outputs']
                
                for output_idx, output in enumerate(outputs):
                    if output.strip():
                        task = self._extract_claims_from_output(judge, output)
                        claim_extraction_tasks.append(task)
                        output_info.append({
                            'input_index': input_index,
                            'output_index': output_idx,
                            'output': output
                        })
            
            logger.info(f"Extracting claims from {len(claim_extraction_tasks)} outputs in parallel")
            
            # 병렬 claim 추출
            extraction_results = await asyncio.gather(*claim_extraction_tasks, return_exceptions=True)
            
            # [2단계] claim 통합 및 중복 제거
            all_claims = []
            claim_sources = {}  # claim -> 출처 정보
            
            for i, result in enumerate(extraction_results):
                if isinstance(result, Exception):
                    logger.error(f"Claim extraction failed for output {i}: {str(result)}")
                    continue
                
                if result and 'claims' in result:
                    for claim in result['claims']:
                        claim_text = claim.get('claim', '').strip()
                        if claim_text and len(claim_text) > 10:  # 최소 길이 필터
                            all_claims.append(claim_text)
                            if claim_text not in claim_sources:
                                claim_sources[claim_text] = []
                            claim_sources[claim_text].append(output_info[i])
                elif isinstance(result, list):
                    # 직접 claim 리스트가 반환된 경우
                    for claim_text in result:
                        if claim_text and len(claim_text) > 10:
                            all_claims.append(claim_text)
                            if claim_text not in claim_sources:
                                claim_sources[claim_text] = []
                            claim_sources[claim_text].append(output_info[i])
            
            # 중복 제거
            unique_claims = list(set(all_claims))
            logger.info(f"Found {len(unique_claims)} unique claims from {len(all_claims)} total claims")
            
            if not unique_claims:
                logger.warning("No verifiable claims found in outputs")
                return MetricScore(
                    score=100.0,  # claim이 없으면 환각도 없음
                    details={
                        'total_claims': 0,
                        'unique_claims': 0,
                        'verified_claims': [],
                        'average_score': 100.0,
                        'note': 'No verifiable claims found'
                    }
                )
            
            # [3단계] SQLite 캐시 확인 및 새 claim 필터링
            new_claims = []
            cached_scores = {}
            
            for claim in unique_claims:
                cached_result = await self.cache.get_fact_check(claim)
                if cached_result:
                    cached_scores[claim] = cached_result['score']
                    logger.debug(f"Using cached score for claim: {claim[:50]}...")
                else:
                    new_claims.append(claim)
            
            logger.info(f"Cache hits: {len(cached_scores)}, New claims to verify: {len(new_claims)}")
            
            # [4단계] Perplexity로 새 claim들 병렬 검증
            new_scores = {}
            if new_claims:
                logger.info(f"Batch verifying {len(new_claims)} claims with Perplexity")
                
                try:
                    scores = await self.perplexity_client.verify_claims_batch(new_claims)
                    
                    for claim, score in zip(new_claims, scores):
                        new_scores[claim] = score
                        # SQLite 캐시에 저장 (7일 TTL)
                        await self.cache.set_fact_check(claim, {'score': score}, ttl=7*24*3600)
                        
                except Exception as e:
                    logger.error(f"Perplexity batch verification failed: {str(e)}")
                    # 실패 시 기본 점수 할당
                    for claim in new_claims:
                        new_scores[claim] = 50.0  # 중간 점수
            
            # [5단계] 모든 점수 통합
            all_scores = {**cached_scores, **new_scores}
            
            # [6단계] 최종 점수 계산
            if all_scores:
                # 개별 claim 점수들의 평균 (0-100 범위)
                individual_scores = list(all_scores.values())
                average_score = sum(individual_scores) / len(individual_scores)
                
                # 환각 탐지 관점에서 점수 해석
                # 높은 점수 = 사실 확인됨 = 환각 적음
                # 낮은 점수 = 사실 확인 안됨 = 환각 많음
                final_score = 100.0 - average_score  # 역전시켜서 환각 점수로 변환
                
                logger.info(f"Parallel hallucination detection completed: {final_score:.3f} "
                          f"(unique claims: {len(unique_claims)}, average verification: {average_score:.1f})")
            else:
                final_score = 100.0  # 검증할 claim이 없으면 환각 없음
                average_score = 100.0
            
            # 상세 정보 구성
            verified_claims = [
                {
                    'claim': claim,
                    'score': score
                }
                for claim, score in all_scores.items()
            ]
            
            details = {
                'total_claims': len(all_claims),
                'unique_claims': len(unique_claims),
                'verified_claims': verified_claims,
                'score': final_score,
                'average_verification_score': average_score,
                'cache_hits': len(cached_scores),
                'new_verifications': len(new_scores),
                'note': 'Perplexity-based fact verification (parallel processing)'
            }
            
            return MetricScore(score=final_score, details=details)
            
        except Exception as e:
            logger.error(f"Hallucination detection failed: {str(e)}")
            return MetricScore(score=0.0, details={'error': str(e)})
    
    async def _extract_claims_from_output(self, judge, output: str) -> List[str]:
        """출력에서 검증 가능한 claim들을 추출"""
        try:
            # LLM에게 검증 가능한 사실 주장 추출 요청
            prompt = f"""다음 텍스트에서 외부 자료로 검증 가능한 구체적인 사실 주장들을 추출해주세요.

텍스트:
{output}

추출 기준:
- 날짜, 숫자, 인물명, 회사명 등 구체적 정보가 포함된 문장
- 외부 검색으로 참/거짓을 확인할 수 있는 객관적 사실
- 주관적 의견이나 일반적 설명은 제외

각 사실 주장을 한 줄씩 출력해주세요. 없으면 NONE을 출력하세요."""
            
            result = await judge.analyze_text(prompt)
            
            if result.strip().upper() == "NONE":
                return []
            
            # 결과를 줄별로 분리하여 반환
            claims = []
            for line in result.split('\n'):
                line = line.strip()
                if line and line.upper() != "NONE" and len(line) > 10:
                    claims.append(line)
            
            return claims
            
        except Exception as e:
            logger.error(f"Failed to extract claims from output: {str(e)}")
            return []