import logging
from typing import Dict, Any, Optional
from app.orchestrator.context import ExecutionContext
from app.core.schemas import MetricScore, EvaluationResult, PromptType
from app.core.config import settings

logger = logging.getLogger(__name__)

class AggregateStage:
    """평가 결과 집계 단계"""
    
    def __init__(self, context: ExecutionContext):
        self.context = context
    
    async def execute(
        self, 
        prompt_type: PromptType, 
        metric_scores: Dict[str, Optional[MetricScore]]
    ) -> EvaluationResult:
        """
        타입별 평가 지표를 집계하여 EvaluationResult 생성
        """
        logger.info(f"Aggregating metrics for {prompt_type}")
        
        try:
            # 각 지표별 점수 로깅
            for metric_name, score_obj in metric_scores.items():
                if score_obj is not None:
                    logger.info(f"{metric_name}: {score_obj.score:.3f}")
                else:
                    logger.warning(f"{metric_name}: No score available")
            
            # 가중치 적용하여 최종 점수 계산
            weights = settings.weights.get(prompt_type.value, {})
            weighted_scores = {}
            total_weight = 0
            weighted_sum = 0
            
            for metric_name, score_obj in metric_scores.items():
                if score_obj is not None and metric_name in weights:
                    weight = weights[metric_name]
                    weighted_score = score_obj.score * weight
                    weighted_scores[metric_name] = weighted_score
                    weighted_sum += weighted_score
                    total_weight += weight
                    logger.info(f"{metric_name}: {score_obj.score:.3f} * {weight} = {weighted_score:.3f}")
            
            # 최종 점수 계산
            final_score = weighted_sum / total_weight if total_weight > 0 else 0.0
            logger.info(f"Final score: {final_score:.3f} (total weight: {total_weight})")
            
            logger.info("Aggregation completed")
            
            # EvaluationResult 생성 (final_score 포함)
            return EvaluationResult(
                token_usage=metric_scores.get('token_usage'),
                information_density=metric_scores.get('information_density'),
                consistency=metric_scores.get('consistency'),
                model_variance=metric_scores.get('model_variance'),
                hallucination=metric_scores.get('hallucination'),
                relevance=metric_scores.get('relevance'),
                final_score=final_score,
                weighted_scores=weighted_scores
            )
            
        except Exception as e:
            logger.error(f"Aggregation failed: {str(e)}")
            # 실패시 기본 결과 반환
            return EvaluationResult(final_score=0.0, weighted_scores={})