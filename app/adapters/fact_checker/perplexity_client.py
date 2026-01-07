import asyncio
import logging
import httpx
from typing import Dict, Any, Optional, List
from app.core.config import settings

logger = logging.getLogger(__name__)

class PerplexityClient:
    """Perplexity API 클라이언트 (다중 키 지원)"""
    
    def __init__(self):
        self.api_keys = settings.perplexity_api_keys
        self.model = settings.perplexity_model
        self.base_url = "https://api.perplexity.ai"
        self.current_key_index = 0
        
        if not self.api_keys:
            logger.warning("No Perplexity API keys found in settings")
        else:
            logger.info(f"Initialized with {len(self.api_keys)} Perplexity API keys")
    
    def _get_current_key(self) -> str:
        """현재 사용할 API 키 반환"""
        if not self.api_keys:
            return ""
        return self.api_keys[self.current_key_index]
    
    def _rotate_key(self):
        """다음 API 키로 전환"""
        if len(self.api_keys) > 1:
            self.current_key_index = (self.current_key_index + 1) % len(self.api_keys)
            logger.info(f"Rotated to API key {self.current_key_index + 1}/{len(self.api_keys)}")
    
    def _get_headers(self) -> Dict[str, str]:
        """현재 키로 헤더 생성"""
        return {
            "Authorization": f"Bearer {self._get_current_key()}",
            "Content-Type": "application/json"
        }
    
    async def verify_claim(self, claim: str) -> float:
        """
        단일 claim을 검증하고 0-100 점수 반환 (다중 키 지원)
        
        Args:
            claim: 검증할 주장/사실
            
        Returns:
            float: 0-100 점수 (100이 완전히 검증됨)
        """
        max_retries = 2
        base_delay = 2.0
        
        # 모든 키를 시도
        for key_attempt in range(len(self.api_keys) if self.api_keys else 1):
            for retry_attempt in range(max_retries):
                try:
                    # Perplexity에 팩트체킹 요청
                    prompt = self._create_fact_check_prompt(claim)
                    response = await self._call_api(prompt)
                    
                    # 응답에서 점수 추출
                    score = self._parse_verification_score(response, claim)
                    
                    logger.debug(f"Claim verification: '{claim[:50]}...' -> {score:.1f} (key {self.current_key_index + 1})")
                    return score
                    
                except Exception as e:
                    error_msg = str(e)
                    
                    # Rate limit 에러인 경우
                    if "429" in error_msg or "rate limit" in error_msg.lower():
                        if retry_attempt < max_retries - 1:
                            delay = base_delay * (2 ** retry_attempt)
                            logger.warning(f"Rate limit hit for claim '{claim[:30]}...', retrying in {delay}s (key {self.current_key_index + 1}, attempt {retry_attempt + 1}/{max_retries})")
                            await asyncio.sleep(delay)
                            continue
                        else:
                            # 재시도 횟수 초과, 다른 키로 전환
                            if key_attempt < len(self.api_keys) - 1:
                                logger.warning(f"Key {self.current_key_index + 1} exhausted, switching to next key")
                                self._rotate_key()
                                break
                    
                    logger.error(f"Perplexity verification failed for claim '{claim[:50]}...': {error_msg}")
                    if key_attempt == len(self.api_keys) - 1:  # 마지막 키인 경우
                        return 0.0
                    break
        
        logger.error(f"All API keys exhausted for claim '{claim[:50]}...'")
        return 0.0
    
    async def verify_claims_batch(self, claims: list[str]) -> list[float]:
        """
        여러 claim을 배치로 검증 (Rate limit 고려)
        
        Args:
            claims: 검증할 주장들의 리스트
            
        Returns:
            list[float]: 각 claim의 점수 리스트
        """
        logger.info(f"Batch verifying {len(claims)} claims with Perplexity")
        
        # Rate limit을 고려한 배치 처리
        batch_size = 1  # 완전 순차 처리
        delay_between_batches = 1.5  # 각 요청 간 지연
        
        all_scores = []
        
        for i in range(0, len(claims), batch_size):
            batch_claims = claims[i:i + batch_size]
            logger.debug(f"Processing batch {i//batch_size + 1}/{(len(claims) + batch_size - 1)//batch_size}")
            
            # 순차 처리
            batch_scores = []
            for j, claim in enumerate(batch_claims):
                try:
                    score = await self.verify_claim(claim)
                    batch_scores.append(score)
                except Exception as e:
                    logger.error(f"Claim {i+j+1} verification failed: {str(e)}")
                    batch_scores.append(0.0)
            
            all_scores.extend(batch_scores)
            
            # 다음 배치 전 지연 (마지막 배치가 아닌 경우)
            if i + batch_size < len(claims):
                await asyncio.sleep(delay_between_batches)
        
        return all_scores
    
    def _create_fact_check_prompt(self, claim: str) -> str:
        """팩트체킹용 프롬프트 생성"""
        return f"""Please fact-check the following claim and provide a verification score from 0 to 100:

Claim: "{claim}"

Instructions:
1. Search for reliable sources to verify this claim
2. Consider the accuracy, recency, and credibility of information
3. Provide a score where:
   - 0-20: Completely false or no evidence found
   - 21-40: Mostly false with some misleading elements
   - 41-60: Mixed or partially accurate
   - 61-80: Mostly accurate with minor issues
   - 81-100: Completely accurate and well-supported

Please respond with:
1. Your verification score (0-100)
2. Brief explanation of your reasoning
3. Key sources or evidence found

Format your response as:
SCORE: [number]
REASONING: [explanation]
SOURCES: [sources found]"""
    
    async def _call_api(self, prompt: str) -> Dict[str, Any]:
        """Perplexity API 호출 (현재 키 사용)"""
        payload = {
            "model": self.model,
            "messages": [
                {
                    "role": "system",
                    "content": "You are a fact-checking expert. Provide accurate verification scores based on reliable sources."
                },
                {
                    "role": "user", 
                    "content": prompt
                }
            ],
            "max_tokens": 1000,
            "temperature": 0.1,
            "top_p": 0.9,
            "return_citations": True,
            "search_domain_filter": ["perplexity.ai"],
            "return_images": False,
            "return_related_questions": False
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{self.base_url}/chat/completions",
                headers=self._get_headers(),
                json=payload
            )
            
            if response.status_code != 200:
                raise Exception(f"Perplexity API error: {response.status_code} - {response.text}")
            
            return response.json()
    
    def _parse_verification_score(self, response: Dict[str, Any], claim: str) -> float:
        """API 응답에서 검증 점수 추출"""
        try:
            # 응답에서 텍스트 추출
            content = response.get("choices", [{}])[0].get("message", {}).get("content", "")
            
            if not content:
                logger.warning(f"Empty response from Perplexity for claim: {claim[:50]}...")
                return 0.0
            
            # SCORE: 패턴으로 점수 추출
            import re
            score_match = re.search(r'SCORE:\s*(\d+(?:\.\d+)?)', content, re.IGNORECASE)
            
            if score_match:
                score = float(score_match.group(1))
                # 0-100 범위로 제한
                return max(0.0, min(100.0, score))
            
            # SCORE 패턴이 없으면 다른 패턴 시도
            number_matches = re.findall(r'\b(\d+(?:\.\d+)?)\b', content)
            if number_matches:
                # 첫 번째 숫자를 점수로 사용 (보통 0-100 범위)
                potential_score = float(number_matches[0])
                if 0 <= potential_score <= 100:
                    return potential_score
            
            # 키워드 기반 점수 추정
            content_lower = content.lower()
            if any(word in content_lower for word in ['false', 'incorrect', 'wrong', 'inaccurate']):
                return 20.0
            elif any(word in content_lower for word in ['partially', 'mixed', 'some truth']):
                return 50.0
            elif any(word in content_lower for word in ['accurate', 'correct', 'true', 'verified']):
                return 80.0
            
            # 기본값
            logger.warning(f"Could not parse score from Perplexity response for claim: {claim[:50]}...")
            return 50.0
            
        except Exception as e:
            logger.error(f"Error parsing Perplexity response: {str(e)}")
            return 0.0
    
    async def health_check(self) -> bool:
        """Perplexity API 연결 상태 확인"""
        try:
            test_claim = "The sky is blue."
            score = await self.verify_claim(test_claim)
            return score > 0
        except Exception as e:
            logger.error(f"Perplexity health check failed: {str(e)}")
            return False