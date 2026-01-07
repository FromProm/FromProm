import asyncio
import logging
from typing import List, Dict, Any
from app.orchestrator.context import ExecutionContext
from app.core.schemas import ExampleInput
from app.core.config import settings

logger = logging.getLogger(__name__)

class RunStage:
    """프롬프트 실행 단계 - Runner 호출"""
    
    def __init__(self, context: ExecutionContext):
        self.context = context
    
    async def execute(
        self, 
        prompt: str, 
        example_inputs: List[ExampleInput], 
        recommended_model: str = None,
        repeat_count: int = 5
    ) -> Dict[str, Any]:
        """
        예시 입력들에 대해 프롬프트를 병렬 실행하고 결과 수집
        
        Returns:
            {
                'executions': [
                    {
                        'input_index': 0,
                        'input_content': '...',
                        'outputs': ['output1', 'output2', ...],
                        'model': 'model_name',
                        'token_usage': {...}
                    },
                    ...
                ]
            }
        """
        logger.info(f"Executing prompt with {len(example_inputs)} inputs, {repeat_count} repeats each (parallel)")
        
        runner = self.context.get_runner()
        
        # 모델 선택
        model = recommended_model or self._get_default_model(example_inputs)
        
        # 모든 실행 태스크 생성 (입력별 × 반복별)
        all_tasks = []
        task_info = []  # 태스크 정보 저장
        
        for i, example_input in enumerate(example_inputs):
            # 프롬프트에 입력 삽입
            filled_prompt = self._fill_prompt(prompt, example_input.content)
            
            # 각 입력에 대해 repeat_count만큼 태스크 생성
            for repeat in range(repeat_count):
                task = runner.invoke(
                    model=model,
                    prompt=filled_prompt,
                    input_type=example_input.input_type
                )
                all_tasks.append(task)
                task_info.append({
                    'input_index': i,
                    'repeat_index': repeat,
                    'input_content': example_input.content
                })
        
        logger.info(f"Running {len(all_tasks)} LLM calls in parallel")
        
        # 모든 태스크 병렬 실행
        results = await asyncio.gather(*all_tasks, return_exceptions=True)
        
        # 결과를 입력별로 그룹화
        executions = []
        for i in range(len(example_inputs)):
            outputs = []
            total_token_usage = {'input_tokens': 0, 'output_tokens': 0, 'total_tokens': 0}
            
            # 해당 입력의 결과들 수집
            for j, (result, info) in enumerate(zip(results, task_info)):
                if info['input_index'] == i:
                    if isinstance(result, Exception):
                        logger.error(f"Failed execution for input {i+1}, repeat {info['repeat_index']+1}: {str(result)}")
                        outputs.append("")  # 실패시 빈 출력
                    else:
                        outputs.append(result['output'])
                        
                        # 토큰 사용량 누적
                        if 'token_usage' in result:
                            for key in total_token_usage:
                                total_token_usage[key] += result['token_usage'].get(key, 0)
            
            executions.append({
                'input_index': i,
                'input_content': example_inputs[i].content,
                'input_type': example_inputs[i].input_type,
                'outputs': outputs,
                'model': model,
                'token_usage': total_token_usage
            })
        
        logger.info(f"Parallel execution completed: {len(executions)} inputs processed")
        return {'executions': executions}
    
    def _get_default_model(self, example_inputs: List[ExampleInput]) -> str:
        """입력 타입에 따른 기본 모델 선택"""
        has_image = any(inp.input_type == "image" for inp in example_inputs)
        
        if has_image:
            return settings.default_models["type_b_image"]
        else:
            return settings.default_models["type_a"]
    
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