"""
Amazon Bedrock AgentCore 진입점
프롬프트 평가 에이전트
"""

import os
import sys
import json
import logging
import asyncio
from typing import Any
from pathlib import Path

# 로깅 설정 (CloudWatch용)
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)
logger.info("=== AgentCore Starting ===")

# Secrets Manager에서 credential 로드
def load_secrets_from_aws():
    """AWS Secrets Manager에서 민감한 정보 로드"""
    try:
        import boto3
        
        secret_name = "ai-service/credentials"
        region_name = "us-east-1"
        
        logger.info(f"Loading secrets from AWS Secrets Manager: {secret_name}")
        
        client = boto3.client('secretsmanager', region_name=region_name)
        response = client.get_secret_value(SecretId=secret_name)
        
        secrets = json.loads(response['SecretString'])
        logger.info(f"Successfully loaded {len(secrets)} secrets from Secrets Manager")
        
        return secrets
    except Exception as e:
        logger.warning(f"Failed to load from Secrets Manager: {str(e)}")
        logger.info("Falling back to environment variables")
        return {}

# Secrets Manager에서 로드 (프로덕션)
secrets = load_secrets_from_aws()

# .env 파일 로드 (로컬 개발용 fallback)
from dotenv import load_dotenv
load_dotenv()
logger.info("Environment file loaded as fallback")

# 환경변수 설정 (Secrets Manager 우선, .env fallback)
os.environ.setdefault("AWS_REGION", "us-east-1")
os.environ.setdefault("AWS_ACCESS_KEY_ID", secrets.get("AWS_ACCESS_KEY_ID", os.getenv("AWS_ACCESS_KEY_ID", "")))
os.environ.setdefault("AWS_SECRET_ACCESS_KEY", secrets.get("AWS_SECRET_ACCESS_KEY", os.getenv("AWS_SECRET_ACCESS_KEY", "")))
os.environ.setdefault("BRAVE_API_KEY", secrets.get("BRAVE_API_KEY", os.getenv("BRAVE_API_KEY", "")))
os.environ.setdefault("TAVILY_API_KEY", secrets.get("TAVILY_API_KEY", os.getenv("TAVILY_API_KEY", "")))
os.environ.setdefault("GOOGLE_SEARCH_API_KEY", secrets.get("GOOGLE_SEARCH_API_KEY", os.getenv("GOOGLE_SEARCH_API_KEY", "")))
os.environ.setdefault("GOOGLE_SEARCH_ENGINE_ID", secrets.get("GOOGLE_SEARCH_ENGINE_ID", os.getenv("GOOGLE_SEARCH_ENGINE_ID", "")))
os.environ.setdefault("MOCK_MODE", "false")
os.environ.setdefault("USE_AGENT_PIPELINE", "true")
os.environ.setdefault("CACHE_ENABLED", "true")
os.environ.setdefault("ALPHA", "0.2")
logger.info("Environment variables configured from Secrets Manager")

from bedrock_agentcore import BedrockAgentCoreApp
from opentelemetry import trace

logger.info("Importing application modules...")
from app.core.schemas import (
    JobCreateRequest, PromptType, ExampleInput, RecommendedModel
)
from app.orchestrator.context import ExecutionContext
from app.agents.agent_pipeline import AgentPipeline

logger.info("All modules imported successfully")

# AgentCore 앱 생성
app = BedrockAgentCoreApp()
logger.info("BedrockAgentCoreApp initialized")

# OpenTelemetry tracer 초기화
tracer = trace.get_tracer(__name__)
logger.info("OpenTelemetry tracer initialized")

# 전역 컨텍스트 (초기화 지연)
_context: ExecutionContext = None
_pipeline: AgentPipeline = None


async def get_context() -> ExecutionContext:
    """ExecutionContext 싱글톤"""
    global _context
    if _context is None:
        _context = ExecutionContext()
        await _context.initialize()
    return _context


async def get_pipeline() -> AgentPipeline:
    """AgentPipeline 싱글톤"""
    global _pipeline
    if _pipeline is None:
        context = await get_context()
        _pipeline = AgentPipeline(context)
    return _pipeline


@app.entrypoint
async def handle_request(request: dict) -> dict:
    """
    AgentCore 진입점
    
    백엔드(DynamoDB) 형식 요청:
    {
        "PK": "PROMPT#...",
        "prompt_content": "프롬프트 내용",
        "prompt_type": "type_a",
        "examples": [{"index": 0, "input": {"content": "...", "input_type": "text"}}],
        "model": "모델ID",
        ...
    }
    
    또는 단순 형식:
    {
        "action": "evaluate" | "get_models" | "get_metrics",
        "prompt": "...",
        ...
    }
    """
    with tracer.start_as_current_span('handle_request'):
        logger.info(f"Received request with keys: {list(request.keys())}")
        
        # 백엔드 DynamoDB 형식인지 확인
        if "PK" in request or "prompt_content" in request:
            return await evaluate_from_dynamodb_format(request)
        
        # 단순 형식
        action = request.get("action", "evaluate")
        
        if action == "evaluate":
            return await evaluate_prompt(request)
        elif action == "get_models":
            return get_supported_models()
        elif action == "get_metrics":
            return get_evaluation_metrics()
        else:
            return {"error": f"Unknown action: {action}"}


async def evaluate_prompt(request: dict) -> dict:
    """프롬프트 품질 평가 실행 (단순 형식)"""
    try:
        prompt = request.get("prompt")
        prompt_type = request.get("prompt_type")
        example_inputs = request.get("example_inputs", [])
        recommended_model = request.get("recommended_model")
        repeat_count = request.get("repeat_count", 5)
        
        if not prompt or not prompt_type:
            return {"success": False, "error": "prompt and prompt_type are required"}
        
        logger.info(f"Starting prompt evaluation: {prompt_type}")
        
        # PromptType 변환
        prompt_type_enum = PromptType(prompt_type)
        
        # ExampleInput 리스트 생성
        examples = [ExampleInput(**inp) for inp in example_inputs]
        
        # RecommendedModel 변환
        model = None
        if recommended_model:
            model = RecommendedModel(recommended_model)
        
        # JobCreateRequest 생성
        job_request = JobCreateRequest(
            prompt=prompt,
            prompt_type=prompt_type_enum,
            example_inputs=examples,
            recommended_model=model,
            repeat_count=repeat_count
        )
        
        # 파이프라인 실행
        pipeline = await get_pipeline()
        result = await pipeline.run(job_request)
        
        return build_result_dict(result)
        
    except Exception as e:
        logger.error(f"Evaluation failed: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }


async def evaluate_from_dynamodb_format(request: dict) -> dict:
    """백엔드 DynamoDB 형식으로 프롬프트 평가 후 DynamoDB + S3에 저장"""
    from datetime import datetime
    from decimal import Decimal
    import boto3
    import json
    import base64
    
    def convert_floats_to_strings(obj):
        """재귀적으로 모든 float를 문자열로 변환"""
        if isinstance(obj, float):
            return str(round(obj, 2))
        elif isinstance(obj, dict):
            return {k: convert_floats_to_strings(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [convert_floats_to_strings(item) for item in obj]
        else:
            return obj
    
    # AWS 클라이언트 초기화 (DynamoDB만 서울 리전)
    dynamodb = boto3.resource('dynamodb', region_name='ap-northeast-2')
    s3_client = boto3.client('s3', region_name=os.environ.get('AWS_REGION', 'us-east-1'))
    table = dynamodb.Table(os.environ.get('TABLE_NAME', 'FromProm_Table'))
    s3_bucket = os.environ.get('S3_BUCKET', 'fromprom-s3')
    
    try:
        # DynamoDB 형식에서 필드 추출
        prompt = request.get("prompt_content")
        prompt_type = request.get("prompt_type")
        examples_raw = request.get("examples", [])
        recommended_model = request.get("model", "")
        prompt_id = request.get("PK", "").replace("PROMPT#", "")
        price = request.get("price", 0)
        created_at = request.get("created_at", "")
        
        if not prompt or not prompt_type:
            error_msg = "prompt_content and prompt_type are required"
            logger.error(error_msg)
            # DynamoDB 업데이트
            table.update_item(
                Key={'PK': request.get('PK'), 'SK': request.get('SK', 'METADATA')},
                UpdateExpression='SET #status = :status, updated_at = :updated_at',
                ExpressionAttributeNames={'#status': 'status'},
                ExpressionAttributeValues={
                    ':status': 'failed',
                    ':updated_at': datetime.utcnow().isoformat() + "Z"
                }
            )
            return request
        
        logger.info(f"Starting evaluation for prompt: {prompt_id}, type: {prompt_type}")
        
        # PromptType 변환
        prompt_type_enum = PromptType(prompt_type)
        
        # examples 형식 변환: DynamoDB → ExampleInput
        example_inputs = []
        for ex in examples_raw:
            inp = ex.get("input", {})
            example_inputs.append(ExampleInput(
                content=inp.get("content", ""),
                input_type=inp.get("input_type", "text")
            ))
        
        # RecommendedModel 변환
        model = None
        if recommended_model:
            try:
                model = RecommendedModel(recommended_model)
            except ValueError:
                logger.warning(f"Unknown model: {recommended_model}, using default")
        
        # JobCreateRequest 생성
        job_request = JobCreateRequest(
            prompt=prompt,
            prompt_type=prompt_type_enum,
            example_inputs=example_inputs,
            recommended_model=model,
            repeat_count=5,
            PK=request.get("PK")  # 이메일 발송용 PK 전달
        )
        
        # 파이프라인 실행
        pipeline = await get_pipeline()
        result = await pipeline.run(job_request)
        
        # 평가 결과 구성 (소수점 2자리 반올림)
        evaluation_metrics = {
            "token_usage": str(round(result.token_usage.score, 2)) if result.token_usage else "",
            "information_density": str(round(result.information_density.score, 2)) if result.information_density else "",
            "consistency": str(round(result.consistency.score, 2)) if result.consistency else "",
            "model_variance": str(round(result.model_variance.score, 2)) if result.model_variance else "",
            "hallucination": str(round(result.hallucination.score, 2)) if result.hallucination else "",
            "relevance": str(round(result.relevance.score, 2)) if result.relevance else "",
            "final_score": str(round(result.final_score, 2)) if result.final_score else "",
            "feedback": result.feedback if result.feedback else ""
        }
        
        # S3 저장용 데이터 준비
        s3_examples = []
        updated_examples = []
        
        if result.execution_results and "executions" in result.execution_results:
            executions = result.execution_results["executions"]
            
            for i, ex in enumerate(examples_raw):
                example_copy = ex.copy()
                s3_example = {
                    "index": i,
                    "input": ex.get("input", {})
                }
                
                # 해당 인덱스의 출력 찾기
                for exec_data in executions:
                    if exec_data.get("input_index") == i:
                        outputs = exec_data.get("outputs", [])
                        if outputs:
                            output_data = outputs[0]
                            
                            # 이미지 타입인 경우
                            if prompt_type == "type_b_image":
                                # 이미지 데이터를 S3에 저장
                                image_key = f"prompts/{prompt_id}/images/output_{i}.png"
                                
                                # output_data가 base64 인코딩된 이미지라고 가정
                                if isinstance(output_data, str):
                                    # base64 디코딩
                                    try:
                                        image_bytes = base64.b64decode(output_data)
                                        s3_client.put_object(
                                            Bucket=s3_bucket,
                                            Key=image_key,
                                            Body=image_bytes,
                                            ContentType='image/png'
                                        )
                                        
                                        example_copy["output"] = None
                                        example_copy["output_s3_url"] = f"images/output_{i}.png"
                                        s3_example["output"] = None
                                        s3_example["output_s3_url"] = f"images/output_{i}.png"
                                        
                                        logger.info(f"Saved image to S3: {image_key}")
                                    except Exception as img_error:
                                        logger.error(f"Failed to save image to S3: {str(img_error)}")
                                        example_copy["output"] = ""
                                        example_copy["output_s3_url"] = None
                                        s3_example["output"] = None
                                        s3_example["output_s3_url"] = None
                            else:
                                # 텍스트 타입인 경우
                                output_text = output_data if isinstance(output_data, str) else str(output_data)
                                example_copy["output"] = output_text
                                s3_example["output"] = output_text
                                s3_example["output_s3_url"] = None
                        break
                
                updated_examples.append(example_copy)
                s3_examples.append(s3_example)
        else:
            # 실행 결과가 없는 경우
            for i, ex in enumerate(examples_raw):
                example_copy = ex.copy()
                example_copy["output"] = ""
                updated_examples.append(example_copy)
                
                s3_examples.append({
                    "index": i,
                    "input": ex.get("input", {}),
                    "output": None if prompt_type == "type_b_image" else "",
                    "output_s3_url": None
                })
        
        # S3에 examples.json 저장
        s3_data = {
            "prompt_id": prompt_id,
            "prompt_type": prompt_type,
            "examples": s3_examples,
            "created_at": datetime.utcnow().isoformat() + "Z"
        }
        
        s3_key = f"prompts/{prompt_id}/examples.json"
        s3_client.put_object(
            Bucket=s3_bucket,
            Key=s3_key,
            Body=json.dumps(s3_data, ensure_ascii=False, indent=2),
            ContentType='application/json'
        )
        logger.info(f"Saved examples to S3: {s3_key}")
        
        # examples_s3_url 설정
        if prompt_type == "type_b_image":
            examples_s3_url = f"s3://{s3_bucket}/prompts/{prompt_id}/images/"
        else:
            examples_s3_url = f"s3://{s3_bucket}/prompts/{prompt_id}/examples.json"
        
        # DynamoDB 저장 전 모든 float를 문자열로 변환
        updated_examples_safe = convert_floats_to_strings(updated_examples)
        evaluation_metrics_safe = convert_floats_to_strings(evaluation_metrics)
        
        # DynamoDB 업데이트
        now = datetime.utcnow().isoformat() + "Z"
        table.update_item(
            Key={'PK': request.get('PK'), 'SK': request.get('SK', 'METADATA')},
            UpdateExpression='SET #status = :status, evaluation_metrics = :metrics, examples = :examples, examples_s3_url = :s3_url, price = :price, created_at = :created_at, updated_at = :updated_at',
            ExpressionAttributeNames={'#status': 'status'},
            ExpressionAttributeValues={
                ':status': 'completed',
                ':metrics': evaluation_metrics_safe,
                ':examples': updated_examples_safe,
                ':s3_url': examples_s3_url,
                ':price': price,
                ':created_at': created_at,
                ':updated_at': now
            }
        )
        
        logger.info(f"Evaluation completed and saved to DynamoDB + S3 for prompt: {prompt_id}, score: {result.final_score}")
        
        # 업데이트된 데이터 반환
        request["status"] = "completed"
        request["evaluation_metrics"] = evaluation_metrics
        request["examples"] = updated_examples_safe
        request["examples_s3_url"] = examples_s3_url
        request["price"] = price
        request["created_at"] = created_at
        request["updated_at"] = now
        
        return request
        
    except Exception as e:
        logger.error(f"Evaluation failed: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        
        # 에러 시 DynamoDB 업데이트
        try:
            table.update_item(
                Key={'PK': request.get('PK'), 'SK': request.get('SK', 'METADATA')},
                UpdateExpression='SET #status = :status, updated_at = :updated_at',
                ExpressionAttributeNames={'#status': 'status'},
                ExpressionAttributeValues={
                    ':status': 'failed',
                    ':updated_at': datetime.utcnow().isoformat() + "Z"
                }
            )
        except Exception as db_error:
            logger.error(f"Failed to update DynamoDB: {str(db_error)}")
        
        request["status"] = "failed"
        request["updated_at"] = datetime.utcnow().isoformat() + "Z"
        return request


def build_result_dict(result) -> dict:
    """평가 결과를 dict로 변환"""
    result_dict = {
        "success": True,
        "final_score": result.final_score,
        "weighted_scores": result.weighted_scores,
        "feedback": result.feedback,
        "metrics": {}
    }
    
    if result.token_usage:
        result_dict["metrics"]["token_usage"] = {
            "score": result.token_usage.score,
            "details": result.token_usage.details
        }
    if result.information_density:
        result_dict["metrics"]["information_density"] = {
            "score": result.information_density.score,
            "details": result.information_density.details
        }
    if result.consistency:
        result_dict["metrics"]["consistency"] = {
            "score": result.consistency.score,
            "details": result.consistency.details
        }
    if result.model_variance:
        result_dict["metrics"]["model_variance"] = {
            "score": result.model_variance.score,
            "details": result.model_variance.details
        }
    if result.relevance:
        result_dict["metrics"]["relevance"] = {
            "score": result.relevance.score,
            "details": result.relevance.details
        }
    if result.hallucination:
        result_dict["metrics"]["hallucination"] = {
            "score": result.hallucination.score,
            "details": result.hallucination.details
        }
    
    return result_dict


def get_supported_models() -> dict:
    """지원되는 모델 목록 반환"""
    return {
        "success": True,
        "text_models": [
            {"id": "openai.gpt-oss-120b-1:0", "name": "GPT OSS 120B"},
            {"id": "openai.gpt-oss-20b-1:0", "name": "GPT OSS 20B"},
            {"id": "anthropic.claude-3-5-sonnet-20240620-v1:0", "name": "Claude 3.5 Sonnet"},
            {"id": "anthropic.claude-3-haiku-20240307-v1:0", "name": "Claude 3 Haiku"},
            {"id": "google.gemma-3-27b-it-v1:0", "name": "Gemma 3 27B"},
            {"id": "google.gemma-3-12b-it-v1:0", "name": "Gemma 3 12B"},
            {"id": "google.gemma-3-4b-it-v1:0", "name": "Gemma 3 4B"},
        ],
        "image_models": [
            {"id": "amazon.titan-image-generator-v2:0", "name": "Titan Image V2"},
            {"id": "amazon.nova-canvas-v1:0", "name": "Nova Canvas"},
        ],
        "prompt_types": [
            {"id": "type_a", "name": "Information (정답/사실/근거 요구)"},
            {"id": "type_b_text", "name": "Creative 글"},
            {"id": "type_b_image", "name": "Creative 이미지"},
        ]
    }


def get_evaluation_metrics() -> dict:
    """평가 지표 설명 반환"""
    return {
        "success": True,
        "metrics": {
            "token_usage": {
                "name": "토큰 사용량",
                "description": "프롬프트의 토큰 효율성 측정"
            },
            "information_density": {
                "name": "정보 밀도",
                "description": "토큰 대비 유용한 정보량 측정"
            },
            "consistency": {
                "name": "일관성",
                "description": "동일 입력에 대한 출력 일관성 측정"
            },
            "model_variance": {
                "name": "모델 편차",
                "description": "다른 모델 간 출력 차이 측정"
            },
            "relevance": {
                "name": "관련성",
                "description": "프롬프트와 출력의 관련성 측정"
            },
            "hallucination": {
                "name": "환각 탐지",
                "description": "사실과 다른 정보 생성 여부 탐지"
            }
        }
    }


# AgentCore Runtime에서 실행
if __name__ == "__main__":
    app.run()
