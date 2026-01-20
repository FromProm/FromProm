import logging
import numpy as np
from typing import Dict, Any, List
from app.orchestrator.context import ExecutionContext
from app.core.schemas import MetricScore
from app.core.config import settings

logger = logging.getLogger(__name__)

class ConsistencyStage:
    """일관성 계산 단계 - Centroid 방식"""
    
    def __init__(self, context: ExecutionContext):
        self.context = context
    
    async def execute(self, output_embeddings: List[Dict[str, Any]]) -> MetricScore:
        """
        출력 일관성 점수 계산
        - Centroid 기반 거리 계산
        - 앙상블 평균 (Titan + Cohere)
        """
        logger.info("Calculating consistency score using centroid method")
        
        try:
            all_consistency_scores = []
            details = {'per_input_scores': [], 'ensemble_details': []}
            
            for output_group in output_embeddings:
                input_index = output_group['input_index']
                embeddings = output_group['embeddings']
                
                # 유효한 임베딩만 필터링 (빈 출력 제외)
                valid_embeddings = []
                for emb in embeddings:
                    # 이미지 타입이면 nova_embedding, 텍스트 타입이면 titan_embedding 확인
                    if 'nova_embedding' in emb and emb['nova_embedding'] is not None:
                        valid_embeddings.append(emb)
                    elif 'titan_embedding' in emb and emb['titan_embedding'] is not None:
                        valid_embeddings.append(emb)
                
                if len(valid_embeddings) < 2:
                    # 2개 미만이면 일관성 계산 불가
                    logger.warning(f"Input {input_index}: Not enough valid outputs for consistency ({len(valid_embeddings)})")
                    all_consistency_scores.append(0.0)
                    details['per_input_scores'].append({
                        'input_index': input_index,
                        'score': 0.0,
                        'valid_outputs': len(valid_embeddings),
                        'reason': 'insufficient_outputs'
                    })
                    continue
                elif len(valid_embeddings) == 2:
                    # 2개면 단순 유사도 계산
                    logger.info(f"Input {input_index}: Using pairwise similarity for 2 outputs")
                    similarity_score = self._calculate_pairwise_similarity(valid_embeddings)
                    all_consistency_scores.append(similarity_score)
                    details['per_input_scores'].append({
                        'input_index': input_index,
                        'score': similarity_score,
                        'valid_outputs': len(valid_embeddings),
                        'method': 'pairwise_similarity'
                    })
                    continue
                
                # Nova/Titan과 Cohere 각각 계산
                # 첫 번째 모델 (Nova 또는 Titan)
                first_embeddings = []
                for emb in valid_embeddings:
                    if 'nova_embedding' in emb and emb['nova_embedding'] is not None:
                        first_embeddings.append(emb['nova_embedding'])
                    elif 'titan_embedding' in emb and emb['titan_embedding'] is not None:
                        first_embeddings.append(emb['titan_embedding'])
                
                # Cohere 임베딩 필터링 (None 제외)
                cohere_embeddings = [emb['cohere_embedding'] for emb in valid_embeddings 
                                     if emb.get('cohere_embedding') is not None]
                
                # 첫 번째 모델 점수 계산
                first_score = 0.0
                if len(first_embeddings) >= 2:
                    first_score = self._calculate_centroid_consistency(first_embeddings)
                
                # Cohere 점수 계산
                cohere_score = 0.0
                if len(cohere_embeddings) >= 2:
                    cohere_score = self._calculate_centroid_consistency(cohere_embeddings)
                
                # 앙상블 평균 (유효한 점수만)
                valid_scores = [s for s in [first_score, cohere_score] if s > 0]
                ensemble_score = sum(valid_scores) / len(valid_scores) if valid_scores else 0.0
                all_consistency_scores.append(ensemble_score)
                
                details['per_input_scores'].append({
                    'input_index': input_index,
                    'score': ensemble_score,
                    'first_model_score': first_score,  # Nova 또는 Titan
                    'cohere_score': cohere_score,
                    'valid_outputs': len(valid_embeddings)
                })
            
            # 전체 평균 (100점 만점)
            final_score = sum(all_consistency_scores) / len(all_consistency_scores) if all_consistency_scores else 0
            
            details['final_score'] = final_score
            details['alpha'] = settings.alpha
            details['note'] = 'Consistency score out of 100, negative scores clipped to 0. Using Nova Multimodal for images, Titan Text for text.'
            
            logger.info(f"Consistency score: {final_score:.3f}")
            return MetricScore(score=final_score, details=details)
            
        except Exception as e:
            logger.error(f"Consistency calculation failed: {str(e)}")
            return MetricScore(score=0.0, details={'error': str(e)})
    
    def _calculate_centroid_consistency(self, embeddings: List[List[float]]) -> float:
        """단일 모델의 centroid 기반 일관성 계산"""
        embeddings = np.array(embeddings)  # (N, D)
        
        # 1. 중심 벡터 계산
        centroid = np.mean(embeddings, axis=0)
        
        # 2. 정규화
        centroid_norm = centroid / np.linalg.norm(centroid)
        emb_norm = embeddings / np.linalg.norm(embeddings, axis=1, keepdims=True)
        
        # 3. 중심으로부터의 cosine distance 계산
        distances = 1 - np.dot(emb_norm, centroid_norm)
        
        # 4. 평균 거리와 최대 거리
        mean_d = np.mean(distances)
        max_d = np.max(distances)
        
        # 5. 일관성 점수 (alpha로 최대 거리 패널티) - 음수 방지 및 100점 만점 변환
        consistency = 1 - (mean_d + settings.alpha * max_d)
        
        # 0-1 범위로 클리핑 후 100점 만점으로 변환
        consistency_score = max(0.0, min(1.0, consistency)) * 100
        
        return consistency_score
    
    def _calculate_pairwise_similarity(self, valid_embeddings: List[Dict[str, Any]]) -> float:
        """2개 출력의 쌍별 유사도 계산"""
        if len(valid_embeddings) != 2:
            return 0.0
        
        emb1 = valid_embeddings[0]
        emb2 = valid_embeddings[1]
        
        # 첫 번째 모델 임베딩 비교
        first_sim = 0.0
        if ((emb1.get('nova_embedding') and emb2.get('nova_embedding')) or 
            (emb1.get('titan_embedding') and emb2.get('titan_embedding'))):
            
            vec1 = emb1.get('nova_embedding') or emb1.get('titan_embedding')
            vec2 = emb2.get('nova_embedding') or emb2.get('titan_embedding')
            
            if vec1 and vec2:
                first_sim = self._cosine_similarity(vec1, vec2)
        
        # Cohere 임베딩 비교
        cohere_sim = 0.0
        if emb1.get('cohere_embedding') and emb2.get('cohere_embedding'):
            cohere_sim = self._cosine_similarity(
                emb1['cohere_embedding'], 
                emb2['cohere_embedding']
            )
        
        # 앙상블 평균
        valid_sims = [s for s in [first_sim, cohere_sim] if s > 0]
        avg_similarity = sum(valid_sims) / len(valid_sims) if valid_sims else 0.0
        
        # 유사도를 일관성 점수로 변환 (100점 만점)
        return avg_similarity * 100
    
    def _cosine_similarity(self, vec1: List[float], vec2: List[float]) -> float:
        """코사인 유사도 계산"""
        try:
            vec1 = np.array(vec1)
            vec2 = np.array(vec2)
            
            # 정규화
            vec1_norm = vec1 / np.linalg.norm(vec1)
            vec2_norm = vec2 / np.linalg.norm(vec2)
            
            # 코사인 유사도
            similarity = np.dot(vec1_norm, vec2_norm)
            
            return max(0.0, min(1.0, similarity))
            
        except Exception as e:
            logger.error(f"Cosine similarity calculation failed: {str(e)}")
            return 0.0