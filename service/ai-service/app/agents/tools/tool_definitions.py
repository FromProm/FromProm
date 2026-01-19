"""
AgentCore Tool 정의
기존 Stage 로직을 Tool로 래핑
"""

from typing import Dict, Any, List

# 지표 계산 Tools
METRIC_TOOLS = [
    {
        "toolSpec": {
            "name": "calculate_token_usage",
            "description": "프롬프트와 실행 결과를 기반으로 토큰 사용량을 계산합니다.",
            "inputSchema": {
                "json": {
                    "type": "object",
                    "properties": {
                        "prompt": {
                            "type": "string",
                            "description": "평가할 프롬프트 텍스트"
                        },
                        "execution_results": {
                            "type": "object",
                            "description": "모델 실행 결과 데이터"
                        }
                    },
                    "required": ["prompt", "execution_results"]
                }
            }
        }
    },
    {
        "toolSpec": {
            "name": "calculate_information_density",
            "description": "실행 결과의 정보 밀도를 n-gram 중복률 기반으로 계산합니다.",
            "inputSchema": {
                "json": {
                    "type": "object",
                    "properties": {
                        "execution_results": {
                            "type": "object",
                            "description": "모델 실행 결과 데이터"
                        }
                    },
                    "required": ["execution_results"]
                }
            }
        }
    },
    {
        "toolSpec": {
            "name": "calculate_consistency",
            "description": "임베딩 벡터를 기반으로 출력 일관성을 계산합니다.",
            "inputSchema": {
                "json": {
                    "type": "object",
                    "properties": {
                        "output_embeddings": {
                            "type": "array",
                            "description": "출력 임베딩 벡터 리스트"
                        }
                    },
                    "required": ["output_embeddings"]
                }
            }
        }
    },
    {
        "toolSpec": {
            "name": "calculate_model_variance",
            "description": "여러 모델 간의 출력 편차를 계산합니다.",
            "inputSchema": {
                "json": {
                    "type": "object",
                    "properties": {
                        "prompt": {
                            "type": "string",
                            "description": "평가할 프롬프트"
                        },
                        "example_inputs": {
                            "type": "array",
                            "description": "예시 입력 데이터"
                        },
                        "prompt_type": {
                            "type": "string",
                            "description": "프롬프트 타입"
                        },
                        "recommended_model": {
                            "type": "string",
                            "description": "추천 모델"
                        },
                        "execution_results": {
                            "type": "object",
                            "description": "기존 실행 결과 (재사용)"
                        }
                    },
                    "required": ["prompt", "example_inputs", "prompt_type", "recommended_model"]
                }
            }
        }
    },
    {
        "toolSpec": {
            "name": "calculate_relevance",
            "description": "프롬프트 조건 준수도와 관련성을 평가합니다.",
            "inputSchema": {
                "json": {
                    "type": "object",
                    "properties": {
                        "prompt": {
                            "type": "string",
                            "description": "평가할 프롬프트"
                        },
                        "example_inputs": {
                            "type": "array",
                            "description": "예시 입력 데이터"
                        },
                        "execution_results": {
                            "type": "object",
                            "description": "모델 실행 결과"
                        },
                        "prompt_type": {
                            "type": "string",
                            "description": "프롬프트 타입"
                        }
                    },
                    "required": ["prompt", "example_inputs", "execution_results", "prompt_type"]
                }
            }
        }
    },
    {
        "toolSpec": {
            "name": "detect_hallucination",
            "description": "MCP 기반 사실 검증을 통해 환각을 탐지합니다.",
            "inputSchema": {
                "json": {
                    "type": "object",
                    "properties": {
                        "example_inputs": {
                            "type": "array",
                            "description": "예시 입력 데이터"
                        },
                        "execution_results": {
                            "type": "object",
                            "description": "모델 실행 결과"
                        }
                    },
                    "required": ["example_inputs", "execution_results"]
                }
            }
        }
    }

]

# 임베딩 Tools
EMBEDDING_TOOLS = [
    {
        "toolSpec": {
            "name": "generate_text_embedding",
            "description": "텍스트를 Titan Text v2 모델로 임베딩합니다.",
            "inputSchema": {
                "json": {
                    "type": "object",
                    "properties": {
                        "text": {
                            "type": "string",
                            "description": "임베딩할 텍스트"
                        }
                    },
                    "required": ["text"]
                }
            }
        }
    },
    {
        "toolSpec": {
            "name": "generate_multilingual_embedding",
            "description": "텍스트를 Cohere Multilingual 모델로 임베딩합니다.",
            "inputSchema": {
                "json": {
                    "type": "object",
                    "properties": {
                        "text": {
                            "type": "string",
                            "description": "임베딩할 텍스트"
                        }
                    },
                    "required": ["text"]
                }
            }
        }
    },
    {
        "toolSpec": {
            "name": "generate_multimodal_embedding",
            "description": "콘텐츠를 Nova Multimodal 모델로 임베딩합니다.",
            "inputSchema": {
                "json": {
                    "type": "object",
                    "properties": {
                        "content": {
                            "type": "string",
                            "description": "임베딩할 콘텐츠"
                        }
                    },
                    "required": ["content"]
                }
            }
        }
    },
    {
        "toolSpec": {
            "name": "generate_cohere_v4_embedding",
            "description": "콘텐츠를 Cohere v4 모델로 임베딩합니다.",
            "inputSchema": {
                "json": {
                    "type": "object",
                    "properties": {
                        "content": {
                            "type": "string",
                            "description": "임베딩할 콘텐츠"
                        }
                    },
                    "required": ["content"]
                }
            }
        }
    },
    {
        "toolSpec": {
            "name": "generate_batch_text_embeddings",
            "description": "여러 텍스트를 배치로 Titan Text v2 모델로 임베딩합니다.",
            "inputSchema": {
                "json": {
                    "type": "object",
                    "properties": {
                        "texts": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "임베딩할 텍스트 리스트"
                        }
                    },
                    "required": ["texts"]
                }
            }
        }
    },
    {
        "toolSpec": {
            "name": "generate_batch_multilingual_embeddings",
            "description": "여러 텍스트를 배치로 Cohere Multilingual 모델로 임베딩합니다.",
            "inputSchema": {
                "json": {
                    "type": "object",
                    "properties": {
                        "texts": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "임베딩할 텍스트 리스트"
                        }
                    },
                    "required": ["texts"]
                }
            }
        }
    },
    {
        "toolSpec": {
            "name": "calculate_cosine_similarity",
            "description": "두 벡터 간의 코사인 유사도를 계산합니다.",
            "inputSchema": {
                "json": {
                    "type": "object",
                    "properties": {
                        "vector1": {
                            "type": "array",
                            "items": {"type": "number"},
                            "description": "첫 번째 벡터"
                        },
                        "vector2": {
                            "type": "array",
                            "items": {"type": "number"},
                            "description": "두 번째 벡터"
                        }
                    },
                    "required": ["vector1", "vector2"]
                }
            }
        }
    },
    {
        "toolSpec": {
            "name": "calculate_centroid",
            "description": "여러 벡터의 중심점(centroid)을 계산합니다.",
            "inputSchema": {
                "json": {
                    "type": "object",
                    "properties": {
                        "vectors": {
                            "type": "array",
                            "items": {
                                "type": "array",
                                "items": {"type": "number"}
                            },
                            "description": "벡터 리스트"
                        }
                    },
                    "required": ["vectors"]
                }
            }
        }
    }
]

# 집계 Tool
AGGREGATION_TOOLS = [
    {
        "toolSpec": {
            "name": "aggregate_metrics",
            "description": "모든 지표를 최종 점수로 집계합니다.",
            "inputSchema": {
                "json": {
                    "type": "object",
                    "properties": {
                        "prompt_type": {
                            "type": "string",
                            "description": "프롬프트 타입"
                        },
                        "metrics": {
                            "type": "object",
                            "description": "계산된 지표들"
                        }
                    },
                    "required": ["prompt_type", "metrics"]
                }
            }
        }
    }
]

# 전체 Tool 리스트
ALL_TOOLS = METRIC_TOOLS + EMBEDDING_TOOLS + AGGREGATION_TOOLS