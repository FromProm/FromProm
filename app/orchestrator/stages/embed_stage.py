import logging
import asyncio
from typing import Dict, Any, List
from app.orchestrator.context import ExecutionContext
from app.core.schemas import ExampleInput, PromptType

logger = logging.getLogger(__name__)

class EmbedStage:
    """임베딩 생성 단계"""
    
    def __init__(self, context: ExecutionContext):
        self.context = context
    
    async def execute(
        self, 
        execution_results: Dict[str, Any], 
        example_inputs: List[ExampleInput],
        prompt_type: PromptType
    ) -> Dict[str, Any]:
        """
        임베딩 생성
        - 입력과 출력을 각각 임베딩
        - 텍스트/이미지 타입에 따라 적절한 모델 선택
        """
        logger.info("Generating embeddings for inputs and outputs")
        
        try:
            embedder = self.context.get_embedder()
            executions = execution_results['executions']
            
            # 입력 임베딩 생성
            input_embeddings = await self._embed_inputs(embedder, example_inputs)
            
            # 출력 임베딩 생성
            output_embeddings = await self._embed_outputs(embedder, executions, prompt_type)
            
            return {
                'inputs': input_embeddings,
                'outputs': output_embeddings
            }
            
        except Exception as e:
            logger.error(f"Embedding generation failed: {str(e)}")
            raise
    
    async def _embed_inputs(self, embedder, example_inputs: List[ExampleInput]) -> List[Dict[str, Any]]:
        """입력 임베딩 생성 - 병렬 처리"""
        logger.info(f"Embedding {len(example_inputs)} inputs in parallel")
        
        # 모든 입력을 병렬로 처리
        embedding_tasks = []
        for i, example_input in enumerate(example_inputs):
            task = self._embed_single_input(embedder, i, example_input)
            embedding_tasks.append(task)
        
        # 병렬 실행
        input_embeddings = await asyncio.gather(*embedding_tasks, return_exceptions=True)
        
        # 예외 처리
        valid_embeddings = []
        for i, result in enumerate(input_embeddings):
            if isinstance(result, Exception):
                logger.error(f"Input {i+1} embedding failed: {str(result)}")
                # 실패시 기본값
                valid_embeddings.append({
                    'index': i,
                    'content': example_inputs[i].content,
                    'type': example_inputs[i].input_type,
                    'titan_embedding': None,
                    'cohere_embedding': None
                })
            else:
                valid_embeddings.append(result)
        
        return valid_embeddings

    async def _embed_single_input(self, embedder, index: int, example_input: ExampleInput) -> Dict[str, Any]:
        """단일 입력 임베딩 - Cohere와 Nova/Titan 병렬 처리"""
        logger.info(f"Embedding input {index+1}")
        
        if example_input.input_type == "image":
            # 이미지: Nova + Cohere 병렬 처리
            nova_task = embedder.embed_multimodal(example_input.content)
            cohere_task = embedder.embed_cohere_v4(example_input.content)
            
            nova_emb, cohere_emb = await asyncio.gather(nova_task, cohere_task, return_exceptions=True)
            
            return {
                'index': index,
                'content': example_input.content,
                'type': example_input.input_type,
                'nova_embedding': nova_emb if not isinstance(nova_emb, Exception) else None,
                'cohere_embedding': cohere_emb if not isinstance(cohere_emb, Exception) else None
            }
        else:
            # 텍스트: Titan + Cohere 병렬 처리
            titan_task = embedder.embed_text(example_input.content)
            cohere_task = embedder.embed_multilingual(example_input.content)
            
            titan_emb, cohere_emb = await asyncio.gather(titan_task, cohere_task, return_exceptions=True)
            
            return {
                'index': index,
                'content': example_input.content,
                'type': example_input.input_type,
                'titan_embedding': titan_emb if not isinstance(titan_emb, Exception) else None,
                'cohere_embedding': cohere_emb if not isinstance(cohere_emb, Exception) else None
            }
    
    async def _embed_outputs(self, embedder, executions: List[Dict], prompt_type: PromptType) -> List[Dict[str, Any]]:
        """출력 임베딩 생성 - 병렬 처리"""
        logger.info(f"Embedding outputs for {len(executions)} inputs in parallel")
        
        # 모든 입력의 출력들을 병렬로 처리
        embedding_tasks = []
        for exec_data in executions:
            task = self._embed_single_execution_outputs(embedder, exec_data)
            embedding_tasks.append(task)
        
        # 병렬 실행
        output_embeddings = await asyncio.gather(*embedding_tasks, return_exceptions=True)
        
        # 예외 처리
        valid_embeddings = []
        for i, result in enumerate(output_embeddings):
            if isinstance(result, Exception):
                logger.error(f"Output embedding failed for input {i+1}: {str(result)}")
                # 실패시 기본값
                valid_embeddings.append({
                    'input_index': executions[i]['input_index'],
                    'embeddings': []
                })
            else:
                valid_embeddings.append(result)
        
        return valid_embeddings

    async def _embed_single_execution_outputs(self, embedder, exec_data: Dict) -> Dict[str, Any]:
        """단일 입력의 모든 출력 임베딩 - 병렬 처리"""
        input_index = exec_data['input_index']
        outputs = exec_data['outputs']
        
        logger.info(f"Embedding {len(outputs)} outputs for input {input_index+1} in parallel")
        
        # 모든 출력을 병렬로 처리
        output_tasks = []
        for output_idx, output in enumerate(outputs):
            task = self._embed_single_output(embedder, output_idx, output)
            output_tasks.append(task)
        
        # 병렬 실행
        exec_embeddings = await asyncio.gather(*output_tasks, return_exceptions=True)
        
        # 예외 처리
        valid_exec_embeddings = []
        for output_idx, result in enumerate(exec_embeddings):
            if isinstance(result, Exception):
                logger.error(f"Output {output_idx+1} embedding failed: {str(result)}")
                # 실패시 기본값
                valid_exec_embeddings.append({
                    'output_index': output_idx,
                    'content': outputs[output_idx],
                    'titan_embedding': None,
                    'cohere_embedding': None
                })
            else:
                valid_exec_embeddings.append(result)
        
        return {
            'input_index': input_index,
            'embeddings': valid_exec_embeddings
        }

    async def _embed_single_output(self, embedder, output_idx: int, output: str) -> Dict[str, Any]:
        """단일 출력 임베딩 - Titan과 Cohere 병렬 처리"""
        if not output.strip():
            # 빈 출력은 제로 벡터로 처리
            return {
                'output_index': output_idx,
                'content': output,
                'titan_embedding': None,
                'cohere_embedding': None
            }
        
        # Titan + Cohere 병렬 처리
        titan_task = embedder.embed_text(output)
        cohere_task = embedder.embed_multilingual(output)
        
        titan_emb, cohere_emb = await asyncio.gather(titan_task, cohere_task, return_exceptions=True)
        
        return {
            'output_index': output_idx,
            'content': output,
            'titan_embedding': titan_emb if not isinstance(titan_emb, Exception) else None,
            'cohere_embedding': cohere_emb if not isinstance(cohere_emb, Exception) else None
        }