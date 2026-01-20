"""
실제 Strands Framework 기반 Agent 파이프라인
"""

import logging
from typing import Dict, Any

from app.core.schemas import JobCreateRequest, EvaluationResult
from app.orchestrator.context import ExecutionContext
from app.agents.strands_supervisor_agent import StrandsSupervisorAgent

logger = logging.getLogger(__name__)

class AgentPipeline:
    """
    실제 Strands Framework 기반 Agent 파이프라인
    
    구조:
    - Strands Supervisor Agent: 실제 Strands 오케스트레이션
    - Strands Evaluation Agents: 6개 지표별 전문 AI Agent
    - Strands Parallel Workflow: 병렬 실행 워크플로우
    """
    
    def __init__(self, context: ExecutionContext):
        self.context = context
        self.strands_supervisor = StrandsSupervisorAgent(context)
        logger.info("🎯 Agent Pipeline initialized with Real Strands Framework")
    
    async def run(self, job_request: JobCreateRequest) -> EvaluationResult:
        """
        실제 Strands Framework 실행
        
        Flow:
        1. Strands Supervisor가 작업 계획 수립
        2. Strands Evaluation Agent들 생성
        3. Strands Parallel Workflow로 병렬 실행
        4. 결과 통합 및 피드백 생성
        """
        logger.info(f"🚀 Starting Real Strands Framework evaluation for: {job_request.prompt_type}")
        
        try:
            # 실제 Strands Supervisor Agent에게 전체 평가 작업 위임
            evaluation_result = await self.strands_supervisor.evaluate_prompt(job_request)
            
            logger.info("✅ Real Strands Framework evaluation completed successfully")
            return evaluation_result
            
        except Exception as e:
            logger.error(f"❌ Real Strands Framework evaluation failed: {str(e)}")
            raise
    
    def get_strands_info(self) -> Dict[str, Any]:
        """실제 Strands Framework 정보 반환"""
        return {
            "framework": "Real Strands Framework",
            "pattern": "AI Agent Orchestration",
            "supervisor": "Strands Supervisor Agent",
            "agents": [
                "Token Usage Strands Agent",
                "Information Density Strands Agent", 
                "Consistency Strands Agent",
                "Model Variance Strands Agent",
                "Relevance Strands Agent",
                "Hallucination Strands Agent"
            ],
            "workflow": "Strands Parallel Workflow",
            "architecture": "1 Supervisor + 6 Strands Agents",
            "description": "실제 Strands 라이브러리를 사용한 AI Agent 오케스트레이션",
            "agent_core_ready": True,
            "production_ready": True,
            "strands_library": "strands>=0.1.0"
        }