import logging
import asyncio
import numpy as np
from typing import Dict, Any, Optional, List
from app.orchestrator.context import ExecutionContext
from app.core.schemas import MetricScore, ExampleInput, PromptType

logger = logging.getLogger(__name__)

class VarianceStage:
    """모델별 성능 편차 계산 단계 - Run Stage에서 사전 계산된 결과 사용"""
    
    def __init__(self, context: ExecutionContext):
        self.context = context
        # 비교할 모델들 정의 (각 계열의 확실한 Bedrock 지원 모델)
        self.comparison_models = {
            PromptType.TYPE_A: [
                "anthropic.claude-3-5-sonnet-20240620-v1:0",  # Claude 3.5 Sonnet
                "anthropic.claude-3-sonnet-20240229-v1:0",    # Claude 3 Sonnet
                "anthropic.claude-3-haiku-20240307-v1:0"      # Claude 3 Haiku
            ],
            PromptType.TYPE_B_TEXT: [
                "anthropic.claude-3-5-sonnet-20240620-v1:0",  # Claude 3.5 Sonnet
                "anthropic.claude-3-sonnet-20240229-v1:0",    # Claude 3 Sonnet
                "anthropic.claude-3-haiku-20240307-v1:0"      # Claude 3 Haiku
            ],
            PromptType.TYPE_B_IMAGE: [
                "amazon.nova-canvas-v1:0",                    # Nova Canvas
                "amazon.titan-image-generator-v1",            # Titan Image Generator v1
                "amazon.titan-image-generator-v2:0"           # Titan Image Generator v2
            ]
        }
    
    async def execute(
        self, 
        prompt: str, 
        example_inputs: List[ExampleInput], 
        prompt_type: PromptType,
        recommended_model: Optional[str] = None,
        existing_outputs: Optional[Dict[str, Any]] = None
    ) -> MetricScore:
        """
        모델별 성능 편차 계산 (Run Stage에서 이미 실행된 결과 사용)
        - Run Stage에서 받은 variance_outputs 사용
        - LLM 호출 없이 임베딩 + 계산만 수행
        """
        logger.info(f"Calculating model variance score for {prompt_type} (using pre-computed outputs)")
        
        try:
            models = self.comparison_models.get(prompt_type, [])
            if len(models) < 2:
                logger.warning(f"Not enough models for {prompt_type} comparison")
                return MetricScore(score=50.0, details={'error': 'insufficient_models'})
            
            embedder = self.context.get_embedder()
            
            # existing_outputs에서 variance_outputs 추출
            if not existing_outputs or 'variance_outputs' not in existing_outputs:
                logger.warning("No variance outputs found from Run Stage")
                return MetricScore(score=50.0, details={'error': 'no_variance_outputs'})
            
            variance_outputs = existing_outputs['variance_outputs']
            details = {'per_input_scores': [], 'models_used': models, 'used_precomputed': True}
            
            # 결과를 입력별로 처리
            input_results = []
            for i, example_input in enumerate(example_inputs):
                logger.info(f"Processing results for input {i+1}/{len(example_inputs)}")
                
                # 모델별 출력 수집 (이미 Run Stage에서 실행됨)
                model_outputs = {}
                for model in models:
                    if model in variance_outputs and i < len(variance_outputs[model]):
                        model_outputs[model] = variance_outputs[model][i]
                    else:
                        logger.warning(f"Missing output for {model}, input {i+1}")
                        model_outputs[model] = ""
                
                # 임베딩 생성 (병렬)
                embedding_tasks = []
                valid_models = []
                for model, output in model_outputs.items():
                    if output.strip():
                        embedding_tasks.append(self._embed_single_output(embedder, output, prompt_type))
                        valid_models.append(model)
                
                embeddings = {}
                if embedding_tasks:
                    embedding_results = await asyncio.gather(*embedding_tasks, return_exceptions=True)
                    for model, result in zip(valid_models, embedding_results):
                        if isinstance(result, Exception):
                            logger.error(f"Failed to embed output from {model}: {str(result)}")
                            embeddings[model] = None
                        else:
                            embeddings[model] = result
                
                # 유효한 임베딩만 필터링
                valid_embeddings = {k: v for k, v in embeddings.items() if v is not None}
                
                if len(valid_embeddings) < 2:
                    logger.warning(f"Not enough valid embeddings for input {i}")
                    input_results.append({
                        'input_index': i,
                        'score': 0.0,
                        'reason': 'insufficient_valid_outputs',
                        'valid_models': list(valid_embeddings.keys()),
                        'model_outputs': {k: v[:100] + "..." if len(v) > 100 else v for k, v in model_outputs.items()}
                    })
                    continue
                
                # 임베딩 간 유사도 계산
                similarities = []
                embedding_list = list(valid_embeddings.values())
                model_names = list(valid_embeddings.keys())
                
                for i_emb in range(len(embedding_list)):
                    for j_emb in range(i_emb + 1, len(embedding_list)):
                        similarity = self._cosine_similarity(embedding_list[i_emb], embedding_list[j_emb])
                        similarities.append(similarity)
                
                if similarities:
                    avg_similarity = sum(similarities) / len(similarities)
                    # 유사도를 편차 점수로 변환 (높은 유사도 = 낮은 편차 = 높은 점수)
                    variance_score = avg_similarity * 100
                else:
                    variance_score = 0.0
                
                input_results.append({
                    'input_index': i,
                    'score': variance_score,
                    'similarity_scores': similarities,
                    'average_similarity': avg_similarity if similarities else 0.0,
                    'valid_models': model_names,
                    'model_outputs': {k: v[:100] + "..." if len(v) > 100 else v for k, v in model_outputs.items()}
                })
            
            # 전체 평균 점수 계산
            valid_scores = [result['score'] for result in input_results if result['score'] > 0]
            if valid_scores:
                final_score = sum(valid_scores) / len(valid_scores)
            else:
                final_score = 0.0
            
            details['per_input_scores'] = input_results
            
            logger.info(f"Model variance score: {final_score:.3f}")
            return MetricScore(score=final_score, details=details)
            
        except Exception as e:
            logger.error(f"Variance calculation failed: {str(e)}")
            return MetricScore(score=0.0, details={'error': str(e)})
    
    async def _embed_single_output(self, embedder, output: str, prompt_type: PromptType):
        """단일 출력에 대한 임베딩 생성"""
        try:
            if prompt_type == PromptType.TYPE_B_IMAGE:
                # 이미지 타입의 경우 텍스트 임베딩 사용
                return await embedder.embed_text(output)  # 단일 문자열 전달
            else:
                # 텍스트 타입
                return await embedder.embed_text(output)  # 단일 문자열 전달
        except Exception as e:
            logger.error(f"Embedding failed for output: {str(e)}")
            raise e
    
    def _cosine_similarity(self, vec1, vec2):
        """코사인 유사도 계산"""
        try:
            # 벡터가 리스트의 리스트 형태인 경우 첫 번째 요소 사용
            if isinstance(vec1, list) and len(vec1) > 0 and isinstance(vec1[0], list):
                vec1 = vec1[0]
            if isinstance(vec2, list) and len(vec2) > 0 and isinstance(vec2[0], list):
                vec2 = vec2[0]
            
            vec1 = np.array(vec1)
            vec2 = np.array(vec2)
            
            dot_product = np.dot(vec1, vec2)
            norm1 = np.linalg.norm(vec1)
            norm2 = np.linalg.norm(vec2)
            
            if norm1 == 0 or norm2 == 0:
                return 0.0
            
            return dot_product / (norm1 * norm2)
        except Exception as e:
            logger.error(f"Cosine similarity calculation failed: {str(e)}")
            return 0.0
    
    def _fill_prompt(self, prompt: str, input_content: str) -> str:
        """프롬프트의 {{변수명}} 플레이스홀더를 실제 입력으로 치환"""
        import json
        import re
        
        result = prompt
        has_placeholder = bool(re.search(r'\{\{.*?\}\}', prompt))
        
        # 1. input_content가 JSON인 경우 파싱해서 각 키별로 치환
        try:
            data = json.loads(input_content)
            if isinstance(data, dict):
                for key, value in data.items():
                    # {{key}} 형태를 value로 치환
                    result = result.replace(f"{{{{{key}}}}}", str(value))
        except (json.JSONDecodeError, TypeError):
            pass
        
        # 2. 기본 플레이스홀더 치환 (JSON이 아닌 경우)
        result = result.replace("{{}}", input_content).replace("{{input}}", input_content)
        
        # 3. 플레이스홀더가 없었으면 맨 뒤에 입력 추가
        if not has_placeholder:
            result = f"{result}\n\n{input_content}"
        
        return result