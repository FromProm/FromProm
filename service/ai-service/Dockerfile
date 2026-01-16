# Bedrock AgentCore Dockerfile
FROM public.ecr.aws/docker/library/python:3.11-slim

WORKDIR /app

# 시스템 의존성 설치
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# 애플리케이션 코드 복사
COPY . .

# Python 의존성 설치 (poetry 대신 pip 직접 사용)
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir \
    bedrock-agentcore>=1.2.0 \
    strands-agents>=0.1.0 \
    pydantic>=2.5.0 \
    pydantic-settings>=2.1.0 \
    boto3>=1.34.0 \
    tiktoken>=0.5.0 \
    numpy>=1.24.0 \
    scikit-learn>=1.3.0 \
    aiosqlite>=0.19.0 \
    httpx>=0.25.0 \
    aiohttp>=3.8.0 \
    python-dotenv>=1.0.0 \
    requests>=2.31.0 \
    anthropic>=0.40.0 \
    langchain \
    langchain-aws \
    langchain-community \
    faiss-cpu \
    cohere \
    tavily-python \
    duckduckgo-search

# AgentCore 진입점
CMD ["python", "agent.py"]
