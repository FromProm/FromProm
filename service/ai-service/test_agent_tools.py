#!/usr/bin/env python3
"""
Agent Tools 테스트 스크립트
기존 Stage 로직이 Tool로 잘 래핑되었는지 확인
"""

import asyncio
import sys
import os

# 프로젝트 루트를 Python 경로에 추가
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.orchestrator.context import ExecutionContext
from app.agents.tools.tool_executor import ToolExecutor
from app.agents.tools.tool_definitions import ALL_TOOLS
from app.core.schemas import ExampleInput, PromptType

async def test_tool_definitions():
    """Tool 정의 확인"""
    print("=== Tool Definitions Test ===")
    print(f"Total tools defined: {len(ALL_TOOLS)}")
    
    for tool in ALL_TOOLS:
        tool_spec = tool["toolSpec"]
        print(f"- {tool_spec['name']}: {tool_spec['description']}")
    
    print()

async def test_embedding_tools():
    """임베딩 Tool 테스트"""
    print("=== Embedding Tools Test ===")
    
    context = ExecutionContext()
    await context.initialize()
    
    try:
        executor = ToolExecutor(context)
        
        # 텍스트 임베딩 테스트
        print("Testing text embedding...")
        result = await executor.execute_tool(
            "generate_text_embedding",
            {"text": "Hello, this is a test text."}
        )
        print(f"Text embedding result: {result.get('success')}, dimension: {result.get('dimension')}")
        
        # 배치 텍스트 임베딩 테스트
        print("Testing batch text embeddings...")
        result = await executor.execute_tool(
            "generate_batch_text_embeddings",
            {"texts": ["First text", "Second text", "Third text"]}
        )
        print(f"Batch embedding result: {result.get('success')}, count: {result.get('count')}")
        
        # 코사인 유사도 테스트
        print("Testing cosine similarity...")
        result = await executor.execute_tool(
            "calculate_cosine_similarity",
            {
                "vector1": [1.0, 0.0, 0.0],
                "vector2": [0.0, 1.0, 0.0]
            }
        )
        print(f"Cosine similarity result: {result.get('success')}, similarity: {result.get('similarity')}")
        
        # 중심점 계산 테스트
        print("Testing centroid calculation...")
        result = await executor.execute_tool(
            "calculate_centroid",
            {
                "vectors": [
                    [1.0, 2.0, 3.0],
                    [4.0, 5.0, 6.0],
                    [7.0, 8.0, 9.0]
                ]
            }
        )
        print(f"Centroid result: {result.get('success')}, centroid: {result.get('centroid')}")
        
    except Exception as e:
        print(f"Embedding tools test failed: {str(e)}")
    
    finally:
        await context.cleanup()
    
    print()

async def test_metric_tools():
    """지표 계산 Tool 테스트 (Mock 데이터 사용)"""
    print("=== Metric Tools Test ===")
    
    context = ExecutionContext()
    await context.initialize()
    
    try:
        executor = ToolExecutor(context)
        
        # Mock 실행 결과 데이터
        mock_execution_results = {
            "executions": [
                {
                    "input_index": 0,
                    "outputs": ["Output 1", "Output 2", "Output 3"]
                }
            ]
        }
        
        # 토큰 사용량 계산 테스트
        print("Testing token usage calculation...")
        result = await executor.execute_tool(
            "calculate_token_usage",
            {
                "prompt": "Test prompt",
                "execution_results": mock_execution_results
            }
        )
        print(f"Token usage result: {result.get('success')}, metric: {result.get('metric_name')}")
        
        # 정보 밀도 계산 테스트
        print("Testing information density calculation...")
        result = await executor.execute_tool(
            "calculate_information_density",
            {
                "execution_results": mock_execution_results
            }
        )
        print(f"Information density result: {result.get('success')}, metric: {result.get('metric_name')}")
        
        # 집계 테스트
        print("Testing metrics aggregation...")
        mock_metrics = {
            "token_usage": {"score": 85.0, "details": {}},
            "information_density": {"score": 75.0, "details": {}}
        }
        result = await executor.execute_tool(
            "aggregate_metrics",
            {
                "prompt_type": "TYPE_A",
                "metrics": mock_metrics
            }
        )
        print(f"Aggregation result: {result.get('success')}, final_score: {result.get('final_score')}")
        
        print("\n참고: 환각 탐지는 MCP 기반으로 별도 처리됩니다 (Tool이 아님)")
        
    except Exception as e:
        print(f"Metric tools test failed: {str(e)}")
    
    finally:
        await context.cleanup()
    
    print()

async def main():
    """메인 테스트 함수"""
    print("Agent Tools Test Suite")
    print("=" * 50)
    
    await test_tool_definitions()
    await test_embedding_tools()
    await test_metric_tools()
    
    print("All tests completed!")

if __name__ == "__main__":
    asyncio.run(main())