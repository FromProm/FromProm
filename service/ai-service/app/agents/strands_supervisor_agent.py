"""
Strands Framework 기반 Supervisor Agent
"""

import asyncio
import logging
import time
import uuid
from typing import Dict, Any, List, Optional

from app.core.schemas import JobCreateRequest, EvaluationResult, PromptType, MetricScore, TokenMetricScore
from app.orchestrator.context import ExecutionContext
from app.agents.strands.agent_core import create_agent_core
from app.core.logging import format_duration
from app.adapters.user.user_repository import UserRepository
from app.adapters.notification.ses_notifier import SESNotifier

logger = logging.getLogger(__name__)

class StrandsSupervisorAgent:
    """
    Strands Framework 기반 Supervisor Agent
    """

    def __init__(self, context: ExecutionContext):
        self.context = context
        self.strands_core = None
        self.user_repo = UserRepository()  # User Repository 추가
        self.ses_notifier = SESNotifier()  # SES Notifier 추가
        self._initialize()
    
    def _initialize(self):
        """초기화"""
        try:
            self.strands_core = create_agent_core()
            logger.info("🎯 Strands Supervisor initialized")
        except Exception as e:
            logger.error(f"Failed to initialize Strands: {str(e)}")
            raise
    
    async def evaluate_prompt(self, job_request: JobCreateRequest) -> EvaluationResult:
        """
        Strands 기반 프롬프트 평가
        """
        # 실행 ID 생성 (각 실행을 구분하기 위함)
        execution_id = str(uuid.uuid4())[:8]
        
        supervisor_start = time.time()
        logger.info(f"[{execution_id}] 🎯 Strands Supervisor starting evaluation for: {job_request.prompt_type}")

        try:
            if not self.strands_core or not self.strands_core.is_available():
                raise Exception("Strands Agent Core not available")

            # 1. 기본 데이터 준비
            step1_start = time.time()
            logger.info(f"[{execution_id}] 📋 Step 1: Preparing execution data...")
            execution_data = await self._prepare_execution_data(job_request)
            step1_duration = time.time() - step1_start
            logger.info(f"[{execution_id}] 📋 Step 1 Complete (AI 모델 실행 및 임베딩 생성) - {format_duration(step1_duration)}")

            # 2. Agent 선택
            step2_start = time.time()
            logger.info(f"[{execution_id}] 🤖 Step 2: Selecting agents...")
            agent_types = self._select_agents(job_request.prompt_type)
            step2_duration = time.time() - step2_start
            logger.info(f"[{execution_id}] 🤖 Step 2 Complete (프롬프트 타입별 평가 지표 선택) - {format_duration(step2_duration)}")

            # 3. Workflow 실행
            step3_start = time.time()
            logger.info(f"[{execution_id}] ⚡ Step 3: Dispatching workers (sending requests to metric calculators)...")
            workflow_results = await self._execute_workflow(
                agent_types, job_request, execution_data, execution_id
            )
            step3_duration = time.time() - step3_start
            logger.info(f"[{execution_id}] ⚡ Step 3 Complete (6개 지표 병렬 계산 완료) - {format_duration(step3_duration)}")

            # 4. 결과 통합
            step4_start = time.time()
            logger.info(f"[{execution_id}] 📊 Step 4: Integrating results...")
            final_score, weighted_scores, metrics = await self._integrate_results(
                workflow_results, job_request.prompt_type
            )
            step4_duration = time.time() - step4_start
            logger.info(f"[{execution_id}] 📊 Step 4 Complete (가중치 적용 및 최종 점수 계산) - {format_duration(step4_duration)}")

            # 5. 피드백 생성
            step5_start = time.time()
            logger.info(f"[{execution_id}] 💬 Step 5: Generating feedback...")
            feedback = await self._generate_feedback(job_request, metrics, final_score)
            step5_duration = time.time() - step5_start
            logger.info(f"[{execution_id}] 💬 Step 5 Complete (AI 피드백 및 개선 제안 생성) - {format_duration(step5_duration)}")

            evaluation_result = EvaluationResult(
                final_score=final_score,
                weighted_scores=weighted_scores,
                execution_results=execution_data["execution_results"],
                feedback=feedback,
                **metrics
            )

            total_duration = time.time() - supervisor_start
            logger.info(f"[{execution_id}] ✅ Supervisor completed - Final Score: {final_score} - Total: {format_duration(total_duration)}")

            # ✨ 이메일 발송 (PK가 있는 경우)
            if job_request.PK:
                await self._send_completion_email(
                    job_request=job_request,
                    final_score=final_score,
                    execution_id=execution_id
                )

            return evaluation_result

        except Exception as e:
            logger.error(f"[{execution_id}] ❌ Strands Supervisor failed: {str(e)}")
            raise
    
    def _select_agents(self, prompt_type: PromptType) -> List[str]:
        """프롬프트 타입에 따른 Agent 선택"""
        selected = ["token_usage", "model_variance", "relevance"]
        
        if prompt_type == PromptType.TYPE_A:
            selected.extend(["information_density", "consistency", "hallucination"])
        elif prompt_type == PromptType.TYPE_B_TEXT:
            selected.append("information_density")
        elif prompt_type == PromptType.TYPE_B_IMAGE:
            selected.append("consistency")
        
        return selected
    
    async def _execute_workflow(
        self,
        agent_types: List[str],
        job_request: JobCreateRequest,
        execution_data: Dict[str, Any],
        execution_id: str
    ) -> Dict[str, Any]:
        """Workflow 실행 및 각 Worker 타이밍 로깅"""

        try:
            workflow_input = {
                "prompt": job_request.prompt,
                "prompt_type": job_request.prompt_type.value,
                "example_inputs": [inp.dict() for inp in job_request.example_inputs],
                "execution_results": execution_data["execution_results"],
                "embeddings": execution_data.get("embeddings", {}),
                "recommended_model": job_request.recommended_model.value if job_request.recommended_model else None
            }

            logger.info(f"[{execution_id}]    Executing {len(agent_types)} workers in parallel...")

            # 각 워커별 개별 타이밍 측정
            worker_timings = {}

            # 메트릭 번호 매핑 (순서대로 1-6)
            metric_numbers = {
                "token_usage": 1,
                "information_density": 2,
                "consistency": 3,
                "model_variance": 4,
                "hallucination": 5,
                "relevance": 6
            }

            # 메트릭 한국어 이름
            metric_names_kr = {
                "token_usage": "토큰 사용량",
                "information_density": "정보 밀도",
                "consistency": "일관성",
                "model_variance": "모델 분산도",
                "hallucination": "환각 탐지",
                "relevance": "관련성"
            }

            async def execute_single_agent(agent_type: str) -> tuple[str, Any]:
                """단일 에이전트 실행 및 타이밍 로깅"""
                metric_num = metric_numbers.get(agent_type, 0)
                metric_name_kr = metric_names_kr.get(agent_type, agent_type)
                worker_start = time.time()
                logger.info(f"[{execution_id}]    🚀 Step 3-{metric_num}: [{agent_type}] ({metric_name_kr}) started")

                try:
                    result = await self.strands_core.execute_single_agent(agent_type, workflow_input)
                    worker_duration = time.time() - worker_start
                    worker_timings[agent_type] = worker_duration

                    score = result.get("score", 0.0) if result and result.get("success") else 0.0
                    logger.info(f"[{execution_id}]    ✅ Step 3-{metric_num} Complete: [{agent_type}] ({metric_name_kr}) - Score: {score:.2f} - {format_duration(worker_duration)}")

                    return agent_type, result
                except Exception as e:
                    worker_duration = time.time() - worker_start
                    logger.error(f"[{execution_id}]    ❌ Step 3-{metric_num} Failed: [{agent_type}] ({metric_name_kr}) - {format_duration(worker_duration)} - Error: {str(e)}")
                    return agent_type, None

            # 모든 워커를 병렬로 실행
            results = await asyncio.gather(*[execute_single_agent(agent_type) for agent_type in agent_types])

            # 결과를 딕셔너리로 변환
            workflow_results = {agent_type: result for agent_type, result in results}

            # 전체 워커 통계
            total_workers = len(agent_types)
            successful_workers = sum(1 for r in workflow_results.values() if r and r.get("success"))
            avg_duration = sum(worker_timings.values()) / len(worker_timings) if worker_timings else 0

            logger.info(f"[{execution_id}]    📊 Workers Summary: {successful_workers}/{total_workers} succeeded - Avg: {format_duration(avg_duration)}")

            return workflow_results

        except Exception as e:
            logger.error(f"[{execution_id}] Workflow execution failed: {str(e)}")
            return {}
    
    async def _integrate_results(
        self,
        workflow_results: Dict[str, Any],
        prompt_type: PromptType
    ) -> tuple[float, Dict[str, float], Dict[str, Any]]:
        """결과 통합"""
        
        metrics = {}
        
        for agent_type, result in workflow_results.items():
            if result and result.get("success"):
                score = result.get("score", 0.0)
                details = result.get("details", {})
                
                if agent_type == "token_usage":
                    metrics[agent_type] = TokenMetricScore(score=score, details=details)
                else:
                    metrics[agent_type] = MetricScore(score=score, details=details)
            else:
                metrics[agent_type] = None
        
        from app.agents.tools.tool_executor import ToolExecutor
        
        tool_executor = ToolExecutor(self.context)
        final_result = await tool_executor.execute_tool(
            "aggregate_metrics",
            {
                "prompt_type": prompt_type.value,
                "metrics": metrics
            }
        )
        
        final_score = final_result.get("final_score", 0.0) if final_result.get("success") else 0.0
        weighted_scores = final_result.get("weighted_scores", {}) if final_result.get("success") else {}
        
        return final_score, weighted_scores, metrics
    
    async def _generate_feedback(
        self,
        job_request: JobCreateRequest,
        metrics: Dict[str, Any],
        final_score: float
    ) -> Dict[str, Any]:
        """피드백 생성"""
        
        try:
            judge = self.context.get_judge()
            
            scores_summary = {}
            for metric_name, metric_result in metrics.items():
                if metric_result is not None:
                    scores_summary[metric_name] = metric_result.score
                else:
                    scores_summary[metric_name] = "계산되지 않음"
            
            feedback_prompt = f"""다음 프롬프트에 대한 성능 평가 결과를 바탕으로 종합적인 피드백을 생성해주세요.

프롬프트: {job_request.prompt}
프롬프트 타입: {job_request.prompt_type.value}
최종 점수: {final_score}/100

개별 지표 점수:
{chr(10).join([f"- {name}: {score}" for name, score in scores_summary.items()])}

다음 형식으로 피드백을 작성해주세요:
1. 전반적 평가
2. 강점
3. 약점
4. 구체적 개선 제안 (3가지)

한국어로 작성해주세요."""

            feedback_text = await judge.analyze_text(feedback_prompt)
            
            return {
                "overall_feedback": feedback_text,
                "final_score": final_score,
                "individual_scores": scores_summary,
                "prompt_type": job_request.prompt_type.value
            }
            
        except Exception as e:
            logger.error(f"Feedback generation failed: {str(e)}")
            return {
                "overall_feedback": "피드백 생성 중 오류가 발생했습니다.",
                "final_score": final_score,
                "error": str(e)
            }
    
    async def _prepare_execution_data(self, job_request: JobCreateRequest) -> Dict[str, Any]:
        """기본 실행 데이터 준비"""
        from app.orchestrator.stages.run_stage import RunStage
        from app.orchestrator.stages.embed_stage import EmbedStage
        
        run_stage = RunStage(self.context)
        execution_results = await run_stage.execute(
            job_request.prompt,
            job_request.example_inputs,
            job_request.recommended_model,
            job_request.repeat_count,
            job_request.prompt_type
        )
        
        embed_stage = EmbedStage(self.context)
        embeddings = await embed_stage.execute(
            execution_results,
            job_request.example_inputs,
            job_request.prompt_type
        )
        
        return {
            "execution_results": execution_results,
            "embeddings": embeddings
        }

    async def _send_completion_email(
        self,
        job_request: JobCreateRequest,
        final_score: float,
        execution_id: str
    ):
        """평가 완료 이메일 발송"""
        try:
            # create_user에서 USER# prefix 제거하여 user_id 추출
            create_user = job_request.create_user
            if not create_user or not create_user.startswith("USER#"):
                logger.warning(f"[{execution_id}] ⚠️ Invalid create_user format: {create_user}")
                return

            user_id = create_user.replace("USER#", "")
            logger.info(f"[{execution_id}] 📧 Preparing to send completion email for user_id: {user_id}")

            # 1. User ID로 이메일 조회
            user_email = await self.user_repo.get_user_email(user_id)

            if not user_email:
                logger.warning(f"[{execution_id}] ⚠️ User email not found for user_id: {user_id}")
                return

            logger.info(f"[{execution_id}] 📧 Sending completion email to {user_email}")

            # 2. prompt_id 추출 (PROMPT#xxx에서 xxx만)
            prompt_id = None
            if job_request.PK and job_request.PK.startswith("PROMPT#"):
                prompt_id = job_request.PK.replace("PROMPT#", "")

            # 3. 이메일 발송
            result = await self.ses_notifier.send_evaluation_complete_email(
                recipient_email=user_email,
                final_score=final_score,
                prompt_type=job_request.prompt_type.value,
                prompt_title=job_request.title,
                prompt_id=prompt_id
            )

            if result.get("success"):
                logger.info(f"[{execution_id}] ✅ Email sent successfully - MessageId: {result.get('message_id')}")
            else:
                logger.warning(f"[{execution_id}] ⚠️ Email send failed: {result.get('error')}")

        except Exception as e:
            # 이메일 발송 실패해도 평가 결과는 반환 (non-critical)
            logger.error(f"[{execution_id}] Email notification failed (non-critical): {str(e)}")