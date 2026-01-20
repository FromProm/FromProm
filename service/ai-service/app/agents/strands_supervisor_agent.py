"""
Strands Framework 기반 Supervisor Agent
"""

import asyncio
import logging
from typing import Dict, Any, List, Optional

from app.core.schemas import JobCreateRequest, EvaluationResult, PromptType, MetricScore, TokenMetricScore
from app.orchestrator.context import ExecutionContext
from app.agents.strands.agent_core import create_agent_core

logger = logging.getLogger(__name__)

class StrandsSupervisorAgent:
    """
    Strands Framework 기반 Supervisor Agent
    """
    
    def __init__(self, context: ExecutionContext):
        self.context = context
        self.strands_core = None
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
        logger.info(f"🎯 Strands Supervisor starting evaluation for: {job_request.prompt_type}")
        
        try:
            if not self.strands_core or not self.strands_core.is_available():
                raise Exception("Strands Agent Core not available")
            
            # 1. 기본 데이터 준비
            logger.info("📋 Step 1: Preparing execution data...")
            execution_data = await self._prepare_execution_data(job_request)
            
            # 2. Agent 선택
            logger.info("🤖 Step 2: Selecting agents...")
            agent_types = self._select_agents(job_request.prompt_type)
            
            # 3. Workflow 실행
            logger.info("⚡ Step 3: Executing workflow...")
            workflow_results = await self._execute_workflow(
                agent_types, job_request, execution_data
            )
            
            # 4. 결과 통합
            logger.info("📊 Step 4: Integrating results...")
            final_score, weighted_scores, metrics = await self._integrate_results(
                workflow_results, job_request.prompt_type
            )
            
            # 5. 피드백 생성
            logger.info("💬 Step 5: Generating feedback...")
            feedback = await self._generate_feedback(job_request, metrics, final_score)
            
            evaluation_result = EvaluationResult(
                final_score=final_score,
                weighted_scores=weighted_scores,
                execution_results=execution_data["execution_results"],
                feedback=feedback,
                **metrics
            )
            
            logger.info(f"✅ Strands Supervisor completed - Final Score: {final_score}")
            return evaluation_result
            
        except Exception as e:
            logger.error(f"❌ Strands Supervisor failed: {str(e)}")
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
        execution_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Workflow 실행"""
        
        try:
            workflow_input = {
                "prompt": job_request.prompt,
                "prompt_type": job_request.prompt_type.value,
                "example_inputs": [inp.dict() for inp in job_request.example_inputs],
                "execution_results": execution_data["execution_results"],
                "embeddings": execution_data.get("embeddings", {}),
                "recommended_model": job_request.recommended_model.value if job_request.recommended_model else ""
            }
            
            logger.info(f"   Executing {len(agent_types)} agents in parallel...")
            workflow_results = await self.strands_core.execute_agents_parallel(
                agent_types, 
                workflow_input
            )
            
            if workflow_results.get("success"):
                logger.info("   ✅ Workflow completed successfully")
                return workflow_results["results"]
            else:
                logger.error(f"   ❌ Workflow failed: {workflow_results.get('error')}")
                return {}
                
        except Exception as e:
            logger.error(f"Workflow execution failed: {str(e)}")
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