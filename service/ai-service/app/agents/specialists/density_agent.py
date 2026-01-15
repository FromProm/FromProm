"""
Information Density Agent - 정보 밀도 계산 전문 AI
"""

import logging
from typing import Dict, Any

from app.core.schemas import MetricScore
from app.orchestrator.context import ExecutionContext

logger = logging.getLogger(__name__)

class InformationDensityAgent:
    """
    정보 밀도 계산 전문 AI Agent
    
    역할:
    - 텍스트의 정보 밀도 분석
    - Unigram/Bigram 기반 계산
    - 정보량 최적화 제안
    """
    
    def __init__(self, context: ExecutionContext):
        self.context = context
        self.agent_name = "InformationDensityAgent"
    
    async def calculate_metric(self, agent_input: Dict[str, Any]) -> MetricScore:
        """정보 밀도 지표 계산"""
        
        logger.info(f"📊 {self.agent_name} starting information density calculation...")
        
        try:
            execution_results = agent_input["execution_results"]
            
            # 기존 Tool 로직 재사용
            from app.agents.tools.tool_executor import ToolExecutor
            
            tool_executor = ToolExecutor(self.context)
            result = await tool_executor.execute_tool(
                "calculate_information_density",
                {
                    "execution_results": execution_results
                }
            )
            
            if result.get("success"):
                score = result.get("score", 0.0)
                details = result.get("details", {})
                
                logger.info(f"✅ {self.agent_name} completed - Density Score: {score}")
                
                return MetricScore(
                    score=score,
                    details={
                        **details,
                        "agent": self.agent_name,
                        "calculation_method": "unigram_bigram_entropy"
                    }
                )
            else:
                logger.error(f"❌ {self.agent_name} calculation failed: {result.get('error')}")
                return MetricScore(
                    score=0.0,
                    details={
                        "agent": self.agent_name,
                        "error": result.get("error", "Unknown error")
                    }
                )
                
        except Exception as e:
            logger.error(f"❌ {self.agent_name} failed with exception: {str(e)}")
            return MetricScore(
                score=0.0,
                details={
                    "agent": self.agent_name,
                    "error": str(e)
                }
            )