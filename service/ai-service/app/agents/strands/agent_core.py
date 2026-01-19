"""
Strands Framework 기반 Agent Core
Tool Wrapper Agent 지원
"""

import logging
from typing import Dict, Any, List, Optional

from strands import Agent
from strands.agent import AgentResult

logger = logging.getLogger(__name__)
logger.info("Strands Framework loaded")

from app.agents.strands.tool_wrapper_agents import create_all_agents
from app.orchestrator.context import ExecutionContext


class StrandsAgentCore:
    """
    Strands Framework 기반 Agent Core
    Tool Wrapper Agent 통합
    """
    
    def __init__(self, region_name: str = "us-east-1"):
        self.region_name = region_name
        self.context = None
        self.agents = {}
        self._execution_context = None
        self._initialize()
    
    def _initialize(self):
        """Agent Core 초기화"""
        try:
            self._execution_context = ExecutionContext()
            self.agents = create_all_agents(self._execution_context)
            logger.info(f"Strands Agent Core initialized with {len(self.agents)} agents")
        except Exception as e:
            logger.error(f"Failed to initialize Strands Agent Core: {str(e)}")
            raise
    
    def get_agent(self, agent_name: str):
        """Agent 가져오기"""
        return self.agents.get(agent_name)
    
    def get_all_agents(self) -> Dict[str, Any]:
        """모든 Agent 가져오기"""
        return self.agents.copy()
    
    async def execute_agents_parallel(
        self, 
        agent_names: List[str], 
        input_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """선택된 Agent들을 병렬 실행"""
        import asyncio
        
        try:
            # 선택된 Agent들 가져오기
            selected_agents = []
            for agent_name in agent_names:
                agent = self.get_agent(agent_name)
                if agent:
                    selected_agents.append((agent_name, agent))
                else:
                    logger.warning(f"Agent not found: {agent_name}")
            
            logger.info(f"Executing {len(selected_agents)} agents in parallel...")
            
            # 병렬 실행
            tasks = []
            for agent_name, agent in selected_agents:
                task = agent.execute(input_data)
                tasks.append((agent_name, task))
            
            # 결과 수집
            agent_results = {}
            results = await asyncio.gather(*[t[1] for t in tasks], return_exceptions=True)
            
            for i, (agent_name, _) in enumerate(tasks):
                result = results[i]
                if isinstance(result, Exception):
                    logger.error(f"Agent {agent_name} failed: {str(result)}")
                    agent_results[agent_name] = {
                        "success": False,
                        "error": str(result)
                    }
                else:
                    agent_results[agent_name] = result
            
            return {
                "success": True,
                "results": agent_results,
                "agents_executed": len(selected_agents)
            }
            
        except Exception as e:
            logger.error(f"Parallel agent execution failed: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "results": {}
            }
    
    def is_available(self) -> bool:
        """사용 가능 여부"""
        return len(self.agents) > 0


def create_agent_core(region_name: str = "us-east-1") -> StrandsAgentCore:
    """Strands Agent Core 생성"""
    return StrandsAgentCore(region_name)


async def execute_strands_workflow(
    agent_names: List[str],
    input_data: Dict[str, Any],
    workflow_type: str = "parallel",
    region_name: str = "us-east-1"
) -> Dict[str, Any]:
    """Strands Workflow 실행"""
    try:
        agent_core = create_agent_core(region_name)
        
        if not agent_core.is_available():
            raise Exception("Strands Agent Core not available")
        
        return await agent_core.execute_agents_parallel(agent_names, input_data)
        
    except Exception as e:
        logger.error(f"Strands workflow execution failed: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "results": {}
        }