"""
Tool Wrapper Agents - 기존 Tool을 Agent로 래핑
"""

import logging
from typing import Dict, Any

from app.agents.tools.tool_executor import ToolExecutor
from app.orchestrator.context import ExecutionContext

logger = logging.getLogger(__name__)


class BaseToolAgent:
    """기본 Tool Agent 클래스"""
    
    def __init__(self, tool_name: str, context: ExecutionContext):
        self.name = f"tool_agent_{tool_name}"
        self.tool_name = tool_name
        self.context = context
        self.tool_executor = ToolExecutor(context)
        logger.info(f"Tool Agent initialized: {self.name}")
    
    async def execute(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Tool 실행"""
        try:
            logger.info(f"Agent {self.tool_name} executing...")
            
            result = await self.tool_executor.execute_tool(self.tool_name, input_data)
            
            if result.get("success"):
                return {
                    "success": True,
                    "score": result.get("score", 0.0),
                    "details": result.get("details", {}),
                    "tool_name": self.tool_name
                }
            else:
                return {
                    "success": False,
                    "error": result.get("error", "Unknown error"),
                    "tool_name": self.tool_name
                }
                
        except Exception as e:
            logger.error(f"Agent {self.tool_name} failed: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "tool_name": self.tool_name
            }


class TokenUsageAgent(BaseToolAgent):
    """토큰 사용량 계산 Agent"""
    
    def __init__(self, context: ExecutionContext):
        super().__init__("calculate_token_usage", context)
    
    async def execute(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """토큰 사용량 계산"""
        logger.info("🔢 Token Usage Agent executing...")
        
        if "prompt" not in input_data or "execution_results" not in input_data:
            return {
                "success": False,
                "error": "Missing required fields: prompt, execution_results"
            }
        
        result = await super().execute({
            "prompt": input_data["prompt"],
            "execution_results": input_data["execution_results"]
        })
        
        logger.info(f"🔢 Token Usage Agent completed: {result.get('success')}")
        return result


class InformationDensityAgent(BaseToolAgent):
    """정보 밀도 계산 Agent"""
    
    def __init__(self, context: ExecutionContext):
        super().__init__("calculate_information_density", context)
    
    async def execute(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """정보 밀도 계산"""
        logger.info("📊 Information Density Agent executing...")
        
        if "execution_results" not in input_data:
            return {
                "success": False,
                "error": "Missing required field: execution_results"
            }
        
        result = await super().execute({
            "execution_results": input_data["execution_results"]
        })
        
        logger.info(f"📊 Information Density Agent completed: {result.get('success')}")
        return result


class ConsistencyAgent(BaseToolAgent):
    """일관성 계산 Agent"""
    
    def __init__(self, context: ExecutionContext):
        super().__init__("calculate_consistency", context)
    
    async def execute(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """일관성 계산"""
        logger.info("🎯 Consistency Agent executing...")
        
        embeddings = input_data.get("embeddings", {})
        # outputs 또는 output_embeddings 둘 다 지원
        output_embeddings = embeddings.get("outputs", embeddings.get("output_embeddings", []))
        
        if not output_embeddings:
            logger.warning("🎯 Consistency Agent: No output embeddings found")
            return {
                "success": False,
                "error": "Missing output_embeddings"
            }
        
        result = await super().execute({
            "output_embeddings": output_embeddings
        })
        
        logger.info(f"🎯 Consistency Agent completed: {result.get('success')}")
        return result


class ModelVarianceAgent(BaseToolAgent):
    """모델 편차 계산 Agent"""
    
    def __init__(self, context: ExecutionContext):
        super().__init__("calculate_model_variance", context)
    
    async def execute(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """모델 편차 계산"""
        logger.info("📈 Model Variance Agent executing...")
        
        required_fields = ["prompt", "example_inputs", "prompt_type", "execution_results"]
        for field in required_fields:
            if field not in input_data:
                return {
                    "success": False,
                    "error": f"Missing required field: {field}"
                }
        
        result = await super().execute({
            "prompt": input_data["prompt"],
            "example_inputs": input_data["example_inputs"],
            "prompt_type": input_data["prompt_type"],
            "recommended_model": input_data.get("recommended_model", ""),
            "execution_results": input_data["execution_results"]
        })
        
        logger.info(f"📈 Model Variance Agent completed: {result.get('success')}")
        return result


class RelevanceAgent(BaseToolAgent):
    """관련성 계산 Agent"""
    
    def __init__(self, context: ExecutionContext):
        super().__init__("calculate_relevance", context)
    
    async def execute(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """관련성 계산"""
        logger.info("🎪 Relevance Agent executing...")
        
        required_fields = ["prompt", "example_inputs", "execution_results", "prompt_type"]
        for field in required_fields:
            if field not in input_data:
                return {
                    "success": False,
                    "error": f"Missing required field: {field}"
                }
        
        result = await super().execute({
            "prompt": input_data["prompt"],
            "example_inputs": input_data["example_inputs"],
            "execution_results": input_data["execution_results"],
            "prompt_type": input_data["prompt_type"]
        })
        
        logger.info(f"🎪 Relevance Agent completed: {result.get('success')}")
        return result


class HallucinationAgent(BaseToolAgent):
    """환각 탐지 Agent"""
    
    def __init__(self, context: ExecutionContext):
        super().__init__("detect_hallucination", context)
    
    async def execute(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """환각 탐지 실행"""
        logger.info("🔍 Hallucination Agent executing...")
        
        required_fields = ["example_inputs", "execution_results"]
        for field in required_fields:
            if field not in input_data:
                return {
                    "success": False,
                    "error": f"Missing required field: {field}"
                }
        
        result = await super().execute({
            "example_inputs": input_data["example_inputs"],
            "execution_results": input_data["execution_results"]
        })
        
        logger.info(f"🔍 Hallucination Agent completed: {result.get('success')}")
        return result


# Agent 팩토리 함수들
def create_token_usage_agent(context: ExecutionContext) -> TokenUsageAgent:
    return TokenUsageAgent(context)

def create_information_density_agent(context: ExecutionContext) -> InformationDensityAgent:
    return InformationDensityAgent(context)

def create_consistency_agent(context: ExecutionContext) -> ConsistencyAgent:
    return ConsistencyAgent(context)

def create_model_variance_agent(context: ExecutionContext) -> ModelVarianceAgent:
    return ModelVarianceAgent(context)

def create_relevance_agent(context: ExecutionContext) -> RelevanceAgent:
    return RelevanceAgent(context)

def create_hallucination_agent(context: ExecutionContext) -> HallucinationAgent:
    return HallucinationAgent(context)


def create_all_agents(context: ExecutionContext) -> Dict[str, BaseToolAgent]:
    """모든 Agent 생성"""
    return {
        "token_usage": create_token_usage_agent(context),
        "information_density": create_information_density_agent(context),
        "consistency": create_consistency_agent(context),
        "model_variance": create_model_variance_agent(context),
        "relevance": create_relevance_agent(context),
        "hallucination": create_hallucination_agent(context)
    }