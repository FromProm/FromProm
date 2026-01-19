"""
Cohere Reranker - AWS Bedrock 기반
근거 재순위화를 위한 Reranker
"""

import logging
import asyncio
from typing import List, Dict, Any

logger = logging.getLogger(__name__)


class CohereReranker:
    """Cohere Rerank 모델을 사용한 근거 재순위화"""
    
    def __init__(self):
        self.model_id = "cohere.rerank-v3-5:0"
        self.region = "us-east-1"
    
    async def rerank_evidence_list(
        self,
        claim: str,
        evidence_list: List[Dict[str, Any]],
        top_k: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Claim과 근거 리스트를 받아 관련성 기준으로 재순위화
        
        Args:
            claim: 검증할 주장
            evidence_list: 근거 리스트
            top_k: 반환할 상위 근거 개수
            
        Returns:
            재순위화된 근거 리스트 (rerank_score 포함)
        """
        
        if not evidence_list:
            return []
        
        try:
            # AWS Bedrock Cohere Rerank 호출
            import boto3
            import json
            
            bedrock = boto3.client(
                service_name='bedrock-runtime',
                region_name=self.region
            )
            
            # 근거 텍스트 추출
            documents = []
            for evidence in evidence_list:
                doc_text = f"{evidence.get('title', '')}\n{evidence.get('content', '')}"
                documents.append(doc_text)
            
            # Cohere Rerank API 호출 (Bedrock 형식)
            request_body = {
                "query": claim,
                "documents": documents,
                "top_n": min(top_k, len(documents)),
                "api_version": "1"
            }
            
            response = bedrock.invoke_model(
                modelId=self.model_id,
                body=json.dumps(request_body)
            )
            
            response_body = json.loads(response['body'].read())
            results = response_body.get('results', [])
            
            # 재순위화된 결과 생성
            reranked_evidence = []
            for result in results:
                index = result['index']
                score = result['relevance_score']
                
                evidence = evidence_list[index].copy()
                evidence['rerank_score'] = score
                evidence['rerank_position'] = len(reranked_evidence) + 1
                evidence['original_position'] = index + 1
                
                reranked_evidence.append(evidence)
            
            logger.info(f"Cohere reranked {len(reranked_evidence)} evidence items")
            return reranked_evidence
            
        except Exception as e:
            logger.error(f"Cohere reranking failed: {str(e)}")
            
            # Fallback: 기존 relevance_score로 정렬
            logger.info("Falling back to relevance_score sorting")
            return await self._fallback_rerank(claim, evidence_list, top_k)
    
    async def _fallback_rerank(
        self,
        claim: str,
        evidence_list: List[Dict[str, Any]],
        top_k: int
    ) -> List[Dict[str, Any]]:
        """Fallback: 간단한 키워드 매칭 기반 재순위화"""
        
        await asyncio.sleep(0.01)  # 비동기 시뮬레이션
        
        # Claim에서 키워드 추출
        claim_lower = claim.lower()
        claim_words = set([w for w in claim_lower.split() if len(w) > 2])
        
        # 각 근거의 관련성 점수 계산
        scored_evidence = []
        for evidence in evidence_list:
            title = evidence.get('title', '').lower()
            content = evidence.get('content', '').lower()
            
            # 키워드 매칭 점수
            title_matches = sum(1 for word in claim_words if word in title)
            content_matches = sum(1 for word in claim_words if word in content)
            
            # 가중치: 제목 매칭이 더 중요
            match_score = (title_matches * 2 + content_matches) / (len(claim_words) + 1)
            
            # 기존 relevance_score와 결합
            original_score = evidence.get('relevance_score', 0.5)
            combined_score = (match_score * 0.6 + original_score * 0.4)
            
            evidence_copy = evidence.copy()
            evidence_copy['rerank_score'] = combined_score
            scored_evidence.append(evidence_copy)
        
        # 점수 기준 정렬
        scored_evidence.sort(key=lambda x: x['rerank_score'], reverse=True)
        
        # 상위 top_k개 선택
        reranked = scored_evidence[:top_k]
        
        # 위치 정보 추가
        for i, evidence in enumerate(reranked):
            evidence['rerank_position'] = i + 1
        
        logger.info(f"Fallback reranked {len(reranked)} evidence items")
        return reranked
