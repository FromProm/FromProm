"""
Tool 실행기 - 기존 Stage 로직을 재사용하여 Tool 호출 처리
"""

import logging
import numpy as np
from typing import Dict, Any, List
from app.orchestrator.context import ExecutionContext
from app.orchestrator.stages.token_stage import TokenStage
from app.orchestrator.stages.density_stage import DensityStage
from app.orchestrator.stages.consistency_stage import ConsistencyStage
from app.orchestrator.stages.variance_stage import VarianceStage
from app.orchestrator.stages.relevance_stage import RelevanceStage
from app.orchestrator.stages.aggregate_stage import AggregateStage
from app.core.schemas import PromptType, ExampleInput

logger = logging.getLogger(__name__)

class ToolExecutor:
    """Tool 실행기 - 기존 Stage 로직 재사용"""
    
    def __init__(self, context: ExecutionContext):
        self.context = context
        
        # Stage 인스턴스 생성 (기존 로직 재사용)
        self.token_stage = TokenStage(context)
        self.density_stage = DensityStage(context)
        self.consistency_stage = ConsistencyStage(context)
        self.variance_stage = VarianceStage(context)
        self.relevance_stage = RelevanceStage(context)
        self.aggregate_stage = AggregateStage(context)
        
        # 임베딩 어댑터
        self.embedder = context.get_embedder()
    
    async def execute_tool(self, tool_name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """Tool 실행 - 이름에 따라 적절한 메서드 호출"""
        try:
            logger.info(f"Executing tool: {tool_name} with args: {list(arguments.keys())}")
            
            # 지표 계산 Tools
            if tool_name == "calculate_token_usage":
                result = await self._calculate_token_usage(arguments)
            elif tool_name == "calculate_information_density":
                result = await self._calculate_information_density(arguments)
            elif tool_name == "calculate_consistency":
                result = await self._calculate_consistency(arguments)
            elif tool_name == "calculate_model_variance":
                result = await self._calculate_model_variance(arguments)
            elif tool_name == "calculate_relevance":
                result = await self._calculate_relevance(arguments)
            elif tool_name == "detect_hallucination":
                result = await self._detect_hallucination(arguments)
            
            # 임베딩 Tools
            elif tool_name == "generate_text_embedding":
                result = await self._generate_text_embedding(arguments)
            elif tool_name == "generate_multilingual_embedding":
                result = await self._generate_multilingual_embedding(arguments)
            elif tool_name == "generate_multimodal_embedding":
                result = await self._generate_multimodal_embedding(arguments)
            elif tool_name == "generate_cohere_v4_embedding":
                result = await self._generate_cohere_v4_embedding(arguments)
            elif tool_name == "generate_batch_text_embeddings":
                result = await self._generate_batch_text_embeddings(arguments)
            elif tool_name == "generate_batch_multilingual_embeddings":
                result = await self._generate_batch_multilingual_embeddings(arguments)
            elif tool_name == "calculate_cosine_similarity":
                result = await self._calculate_cosine_similarity(arguments)
            elif tool_name == "calculate_centroid":
                result = await self._calculate_centroid(arguments)
            
            # 집계 Tool
            elif tool_name == "aggregate_metrics":
                result = await self._aggregate_metrics(arguments)
            
            else:
                raise ValueError(f"Unknown tool: {tool_name}")
            
            logger.info(f"Tool {tool_name} completed: success={result.get('success')}, score={result.get('score')}")
            return result
                
        except Exception as e:
            logger.error(f"Tool execution failed for {tool_name}: {str(e)}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            return {"error": str(e), "success": False}
    
    # === 지표 계산 Tool 구현 (기존 Stage 재사용) ===
    
    async def _calculate_token_usage(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """토큰 사용량 계산 - TokenStage 재사용"""
        prompt = args["prompt"]
        execution_results = args["execution_results"]
        
        result = await self.token_stage.execute(prompt, execution_results)
        return {
            "success": True,
            "metric_name": "token_usage",
            "score": result.score,
            "details": result.details
        }
    
    async def _calculate_information_density(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """정보 밀도 계산 - DensityStage 재사용"""
        execution_results = args["execution_results"]
        
        result = await self.density_stage.execute(execution_results)
        return {
            "success": True,
            "metric_name": "information_density",
            "score": result.score,
            "details": result.details
        }
    
    async def _calculate_consistency(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """일관성 계산 - ConsistencyStage 재사용"""
        output_embeddings = args["output_embeddings"]
        
        result = await self.consistency_stage.execute(output_embeddings)
        return {
            "success": True,
            "metric_name": "consistency",
            "score": result.score,
            "details": result.details
        }
    
    async def _calculate_model_variance(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """모델 편차 계산 - VarianceStage 재사용"""
        prompt = args["prompt"]
        example_inputs = [ExampleInput(**inp) for inp in args["example_inputs"]]
        prompt_type = PromptType(args["prompt_type"])
        recommended_model = args["recommended_model"]
        execution_results = args.get("execution_results")
        
        result = await self.variance_stage.execute(
            prompt, example_inputs, prompt_type, recommended_model, execution_results
        )
        return {
            "success": True,
            "metric_name": "model_variance",
            "score": result.score,
            "details": result.details
        }
    
    async def _calculate_relevance(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """관련성 계산 - RelevanceStage 재사용"""
        prompt = args["prompt"]
        example_inputs = [ExampleInput(**inp) for inp in args["example_inputs"]]
        execution_results = args["execution_results"]
        prompt_type = PromptType(args["prompt_type"])
        
        result = await self.relevance_stage.execute(
            prompt, example_inputs, execution_results, prompt_type
        )
        return {
            "success": True,
            "metric_name": "relevance",
            "score": result.score,
            "details": result.details
        }
    
    # === 임베딩 Tool 구현 ===
    
    async def _generate_text_embedding(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """텍스트 임베딩 생성 - Titan Text v2"""
        text = args["text"]
        
        embedding = await self.embedder.embed_text(text)
        return {
            "success": True,
            "embedding": embedding,
            "model": "titan_text_v2",
            "dimension": len(embedding) if embedding else 0
        }
    
    async def _generate_multilingual_embedding(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """다국어 임베딩 생성 - Cohere Multilingual"""
        text = args["text"]
        
        embedding = await self.embedder.embed_multilingual(text)
        return {
            "success": True,
            "embedding": embedding,
            "model": "cohere_multilingual_v3",
            "dimension": len(embedding) if embedding else 0
        }
    
    async def _generate_multimodal_embedding(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """멀티모달 임베딩 생성 - Nova Multimodal"""
        content = args["content"]
        
        embedding = await self.embedder.embed_multimodal(content)
        return {
            "success": True,
            "embedding": embedding,
            "model": "nova_multimodal",
            "dimension": len(embedding) if embedding else 0
        }
    
    async def _generate_cohere_v4_embedding(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """Cohere v4 임베딩 생성"""
        content = args["content"]
        
        embedding = await self.embedder.embed_cohere_v4(content)
        return {
            "success": True,
            "embedding": embedding,
            "model": "cohere_v4",
            "dimension": len(embedding) if embedding else 0
        }
    
    async def _generate_batch_text_embeddings(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """배치 텍스트 임베딩 생성 - Titan Text v2"""
        texts = args["texts"]
        
        embeddings = await self.embedder.embed_text_batch(texts)
        return {
            "success": True,
            "embeddings": embeddings,
            "model": "titan_text_v2",
            "count": len(embeddings) if embeddings else 0
        }
    
    async def _generate_batch_multilingual_embeddings(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """배치 다국어 임베딩 생성 - Cohere Multilingual"""
        texts = args["texts"]
        
        embeddings = await self.embedder.embed_multilingual_batch(texts)
        return {
            "success": True,
            "embeddings": embeddings,
            "model": "cohere_multilingual_v3",
            "count": len(embeddings) if embeddings else 0
        }
    
    async def _calculate_cosine_similarity(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """코사인 유사도 계산"""
        vector1 = np.array(args["vector1"])
        vector2 = np.array(args["vector2"])
        
        # 코사인 유사도 계산
        dot_product = np.dot(vector1, vector2)
        norm1 = np.linalg.norm(vector1)
        norm2 = np.linalg.norm(vector2)
        
        if norm1 == 0 or norm2 == 0:
            similarity = 0.0
        else:
            similarity = dot_product / (norm1 * norm2)
        
        return {
            "success": True,
            "similarity": float(similarity),
            "distance": float(1 - similarity)
        }
    
    async def _calculate_centroid(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """벡터들의 중심점 계산"""
        vectors = [np.array(vec) for vec in args["vectors"]]
        
        if not vectors:
            return {"success": False, "error": "No vectors provided"}
        
        # 중심점 계산
        centroid = np.mean(vectors, axis=0)
        
        return {
            "success": True,
            "centroid": centroid.tolist(),
            "dimension": len(centroid)
        }
    
    # === 집계 Tool 구현 ===
    
    async def _aggregate_metrics(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """지표 집계 - AggregateStage 재사용"""
        try:
            prompt_type = PromptType(args["prompt_type"])
            metrics = args["metrics"]
            
            result = await self.aggregate_stage.execute(prompt_type, metrics)
            
            # EvaluationResult 객체에서 속성 직접 접근
            return {
                "success": True,
                "final_score": getattr(result, 'final_score', 0.0),
                "weighted_scores": getattr(result, 'weighted_scores', {}),
                "execution_results": getattr(result, 'execution_results', None)
            }
        except Exception as e:
            logger.error(f"Aggregation failed: {str(e)}")
            return {
                "success": False,
                "error": f"Aggregation failed: {str(e)}",
                "final_score": 0.0,
                "weighted_scores": {}
            }
    
    async def _detect_hallucination(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """환각 탐지 - EnhancedJudgeStage 사용 (MCP + Cohere Rerank)"""
        from app.orchestrator.stages.enhanced_judge_stage import EnhancedJudgeStage
        
        example_inputs = [ExampleInput(**inp) for inp in args["example_inputs"]]
        execution_results = args["execution_results"]
        
        # EnhancedJudgeStage 인스턴스 생성 및 실행
        enhanced_judge = EnhancedJudgeStage(self.context)
        result = await enhanced_judge.execute(example_inputs, execution_results)
        
        return {
            "success": True,
            "metric_name": "hallucination",
            "score": result.score,
            "details": result.details
        }