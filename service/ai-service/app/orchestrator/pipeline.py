import asyncio
import logging
from typing import Dict, Any, List
from datetime import datetime

from opentelemetry import trace

from app.core.schemas import JobCreateRequest, EvaluationResult, MetricScore, PromptType
from app.orchestrator.context import ExecutionContext
from app.orchestrator.stages.run_stage import RunStage
from app.orchestrator.stages.token_stage import TokenStage
from app.orchestrator.stages.density_stage import DensityStage
from app.orchestrator.stages.embed_stage import EmbedStage
from app.orchestrator.stages.consistency_stage import ConsistencyStage
from app.orchestrator.stages.relevance_stage import RelevanceStage
from app.orchestrator.stages.variance_stage import VarianceStage
from app.orchestrator.stages.judge_stage import JudgeStage
from app.orchestrator.stages.aggregate_stage import AggregateStage
from app.orchestrator.stages.feedback_stage import FeedbackStage
from app.core.config import settings

logger = logging.getLogger(__name__)

class Orchestrator:
    """전체 파이프라인 오케스트레이터 - 유일한 진실의 소스"""
    
    def __init__(self, context: ExecutionContext):
        self.context = context
        self.tracer = trace.get_tracer(__name__)
        self.stages = {
            'run': RunStage(context),
            'token': TokenStage(context),
            'density': DensityStage(context),
            'embed': EmbedStage(context),
            'consistency': ConsistencyStage(context),
            'relevance': RelevanceStage(context),
            'variance': VarianceStage(context),
            'judge': JudgeStage(context),
            'aggregate': AggregateStage(context),
            'feedback': FeedbackStage(context)
        }
    
    async def run(self, job_request: JobCreateRequest) -> EvaluationResult:
        """전체 파이프라인 실행 (병렬 처리)"""
        logger.info("=" * 80)
        logger.info("🚀 [PIPELINE] 평가 파이프라인 시작")
        logger.info(f"📝 프롬프트 타입: {job_request.prompt_type}")
        logger.info(f"📊 예제 개수: {len(job_request.example_inputs)}")
        logger.info(f"🔁 반복 횟수: {job_request.repeat_count}")
        logger.info("=" * 80)
        
        try:
            # [1단계] 프롬프트 실행 - 출력 생성 + Variance 모델 실행 (선행 필수)
            logger.info("🔹 [STAGE 1/6] RunStage 시작...")
            with self.tracer.start_as_current_span('RunStage'):
                execution_results = await self.stages['run'].execute(
                    job_request.prompt,
                    job_request.example_inputs,
                    job_request.recommended_model,
                    job_request.repeat_count,
                    job_request.prompt_type
                )
            logger.info(f"✅ [STAGE 1/6] RunStage 완료 - {len(execution_results.get('executions', []))}개 실행")
            
            # 실행 결과 보존 (S3 저장용)
            self._last_execution_results = execution_results
            
            # [2단계] 임베딩 + 독립 지표들 병렬 실행
            # 임베딩은 일관성 계산에 필요하므로 함께 실행
            logger.info("🔹 [STAGE 2/6] 병렬 지표 계산 시작...")
            logger.info(f"   병렬 실행 대상: TokenStage, DensityStage, EmbedStage, RelevanceStage, JudgeStage, VarianceStage")
            parallel_tasks = []
            task_names = []
            
            # 토큰 계산 (항상)
            parallel_tasks.append(
                self._execute_with_xray('TokenStage', self.stages['token'].execute, job_request.prompt, execution_results)
            )
            task_names.append('token')
            
            # 정보 밀도 (TYPE_A, TYPE_B_TEXT)
            if job_request.prompt_type in [PromptType.TYPE_A, PromptType.TYPE_B_TEXT]:
                parallel_tasks.append(
                    self._execute_with_xray('DensityStage', self.stages['density'].execute, execution_results)
                )
                task_names.append('density')
            
            # 임베딩 생성 (일관성 계산용)
            parallel_tasks.append(
                self._execute_with_xray('EmbedStage', self.stages['embed'].execute, execution_results, job_request.example_inputs, job_request.prompt_type)
            )
            task_names.append('embed')
            
            # 정확도 계산 (모든 타입)
            parallel_tasks.append(
                self._execute_with_xray('RelevanceStage', self.stages['relevance'].execute, job_request.prompt, job_request.example_inputs, execution_results, job_request.prompt_type)
            )
            task_names.append('relevance')
            
            # 환각 탐지 (TYPE_A만)
            if job_request.prompt_type == PromptType.TYPE_A:
                parallel_tasks.append(
                    self._execute_with_xray('JudgeStage', self.stages['judge'].execute, job_request.example_inputs, execution_results)
                )
                task_names.append('judge')
            
            # 모델별 편차 (모든 타입) - 기존 출력 재사용
            parallel_tasks.append(
                self._execute_with_xray('VarianceStage', self.stages['variance'].execute, job_request.prompt, job_request.example_inputs, job_request.prompt_type, job_request.recommended_model, execution_results)
            )
            task_names.append('variance')
            
            # 병렬 실행
            logger.info(f"   실행 중: {', '.join(task_names)}")
            parallel_results = await asyncio.gather(*parallel_tasks, return_exceptions=True)
            
            # 결과 매핑
            results_map = {}
            for name, result in zip(task_names, parallel_results):
                if isinstance(result, Exception):
                    logger.error(f"   ❌ {name} 실패: {str(result)}")
                    results_map[name] = None
                else:
                    score_str = f"점수: {result.score:.2f}" if hasattr(result, 'score') else "완료"
                    logger.info(f"   ✅ {name} {score_str}")
                    results_map[name] = result
            
            logger.info("✅ [STAGE 2/6] 병렬 지표 계산 완료")
            
            # 결과 추출
            token_score = results_map.get('token')
            density_score = results_map.get('density')
            embeddings = results_map.get('embed')
            relevance_score = results_map.get('relevance')
            hallucination_score = results_map.get('judge')
            variance_score = results_map.get('variance')
            
            # [3단계] 일관성 계산 (임베딩 완료 후)
            consistency_score = None
            if job_request.prompt_type in [PromptType.TYPE_A, PromptType.TYPE_B_IMAGE]:
                logger.info("🔹 [STAGE 3/6] ConsistencyStage 시작...")
                if embeddings and 'outputs' in embeddings:
                    with self.tracer.start_as_current_span('ConsistencyStage'):
                        consistency_score = await self.stages['consistency'].execute(
                            embeddings['outputs']
                        )
                    logger.info(f"✅ [STAGE 3/6] ConsistencyStage 완료 - 점수: {consistency_score.score:.2f}")
                else:
                    logger.warning("⚠️ [STAGE 3/6] ConsistencyStage 스킵 - 임베딩 데이터 없음")
            
            # [4단계] 최종 점수 집계
            logger.info("🔹 [STAGE 4/6] AggregateStage 시작...")
            with self.tracer.start_as_current_span('AggregateStage'):
                final_result = await self.stages['aggregate'].execute(
                    job_request.prompt_type,
                    {
                        'token_usage': token_score,
                        'information_density': density_score,
                        'consistency': consistency_score,
                        'relevance': relevance_score,
                        'hallucination': hallucination_score,
                        'model_variance': variance_score
                    }
                )
            logger.info(f"✅ [STAGE 4/6] AggregateStage 완료 - 최종 점수: {final_result.final_score:.2f}")
            
            # 실제 AI 출력 결과 포함
            final_result.execution_results = execution_results
            
            # [5단계] 프롬프트 개선 피드백 생성
            logger.info("🔹 [STAGE 5/6] FeedbackStage 시작...")
            try:
                evaluation_data = {
                    'token_usage': {'score': token_score.score if token_score else 0} if token_score else None,
                    'information_density': {'score': density_score.score if density_score else 0} if density_score else None,
                    'consistency': {'score': consistency_score.score if consistency_score else 0} if consistency_score else None,
                    'relevance': {'score': relevance_score.score if relevance_score else 0} if relevance_score else None,
                    'hallucination': {'score': hallucination_score.score if hallucination_score else 0} if hallucination_score else None,
                    'model_variance': {'score': variance_score.score if variance_score else 0} if variance_score else None,
                    'execution_results': execution_results
                }
                
                with self.tracer.start_as_current_span('FeedbackStage'):
                    feedback = await self.stages['feedback'].execute(
                        evaluation_data,
                        prompt=job_request.prompt,
                        prompt_type=job_request.prompt_type,
                        example_inputs=job_request.example_inputs
                    )
                final_result.feedback = feedback
                logger.info("✅ [STAGE 5/6] FeedbackStage 완료")
            except Exception as e:
                logger.warning(f"⚠️ [STAGE 5/6] FeedbackStage 실패: {str(e)}")
                final_result.feedback = {'error': str(e)}
            
            logger.info("=" * 80)
            logger.info(f"🎉 [PIPELINE] 평가 완료 - 최종 점수: {final_result.final_score:.2f}")
            logger.info("=" * 80)
            return final_result
            
        except Exception as e:
            logger.error(f"Pipeline execution failed: {str(e)}")
            raise
    
    async def _execute_with_xray(self, segment_name: str, func, *args):
        """OpenTelemetry span으로 감싸서 실행"""
        with self.tracer.start_as_current_span(segment_name):
            return await func(*args)