"""
Token Usage Agent - 토큰 사용량 계산 전문 AI
"""

import logging
from typing import Dict, Any

from app.core.schemas import TokenMetricScore
from app.orchestrator.context import ExecutionContext

logger = logging.getLogger(__name__)

class TokenUsageAgent:
    """
    토큰 사용량 계산 전문 AI Agent
    
    역할:
    - 프롬프트의 토큰 수 계산
    - 효율성 평가
    - 토큰 최적화 제안
    """
    
    def __init__(self, context: ExecutionContext):
        self.context = context
        self.agent_name = "TokenUsageAgent"
    
    async def calculate_metric(self, agent_input: Dict[str, Any]) -> TokenMetricScore:
        """토큰 사용량 지표 계산"""
        
        logger.info(f"🔢 {self.agent_name} starting token usage calculation...")
        
        try:
            prompt = agent_input["prompt"]
            execution_results = agent_input["execution_results"]
            
            # 기존 Tool 로직 재사용
            from app.agents.tools.tool_executor import ToolExecutor
            
            tool_executor = ToolExecutor(self.context)
            result = await tool_executor.execute_tool(
                "calculate_token_usage",
                {
                    "prompt": prompt,
                    "execution_results": execution_results
                }
            )
            
            if result.get("success"):
                score = result.get("score", 0.0)
                details = result.get("details", {})
                
                logger.info(f"✅ {self.agent_name} completed - Token Score: {score}")
                
                return TokenMetricScore(
                    score=score,
                    details={
                        **details,
                        "agent": self.agent_name,
                        "calculation_method": "tiktoken_based"
                    }
                )
            else:
                logger.error(f"❌ {self.agent_name} calculation failed: {result.get('error')}")
                return TokenMetricScore(
                    score=0.0,
                    details={
                        "agent": self.agent_name,
                        "error": result.get("error", "Unknown error")
                    }
                )
                
        except Exception as e:
            logger.error(f"❌ {self.agent_name} failed with exception: {str(e)}")
            return TokenMetricScore(
                score=0.0,
                details={
                    "agent": self.agent_name,
                    "error": str(e)
                }
            )