"""
Grounding Cache - DynamoDB 기반 Claim 검증 결과 캐시

설계 원칙:
- 기존 FromProm_Table 사용 (Single Table Design)
- PK: GROUNDING_CACHE#{claim_hash}
- TTL 지원 (기본 7일)
- Fail-open (캐시 실패해도 서비스 진행)
"""

import os
import time
import hashlib
import json
import logging
import re
from typing import Optional, Dict, Any
from dataclasses import dataclass
from datetime import datetime

import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger(__name__)

# 환경 변수
AWS_REGION_SQS_DDB = os.getenv("AWS_REGION_SQS_DDB", "ap-northeast-2")
TABLE_NAME = os.getenv("DDB_TABLE_NAME", "FromProm_Table")

# 캐시 설정
CACHE_VERSION = "v1"  # 캐시 스키마 버전 (로직 변경 시 버전 업)
DEFAULT_TTL_SECONDS = 7 * 24 * 60 * 60  # 7일


@dataclass
class GroundingCacheEntry:
    """캐시 엔트리 데이터 클래스"""
    claim: str
    claim_normalized: str
    is_verified: bool
    evidence: str
    mcp_sources: list
    confidence: float
    cache_version: str
    created_at: str
    ttl: int  # Unix timestamp


class GroundingCache:
    """
    DynamoDB 기반 Grounding Cache

    사용법:
        cache = GroundingCache()

        # 캐시 조회
        cached = await cache.get(claim)
        if cached:
            return cached['is_verified'], cached['evidence']

        # 새로 검증 후 캐시 저장
        is_verified, evidence = await verify_with_mcp(claim)
        await cache.set(claim, is_verified, evidence, sources)
    """

    def __init__(self, ttl_seconds: int = DEFAULT_TTL_SECONDS):
        self.ttl_seconds = ttl_seconds
        self.table_name = TABLE_NAME

        # DynamoDB 클라이언트 초기화
        # AgentCore 환경에서는 IAM 역할 사용, 로컬에서는 환경 변수 사용
        try:
            aws_access_key = os.getenv("AWS_ACCESS_KEY_ID")
            aws_secret_key = os.getenv("AWS_SECRET_ACCESS_KEY")

            if aws_access_key and aws_secret_key:
                # 로컬 환경: 환경 변수 사용
                self.ddb = boto3.client(
                    "dynamodb",
                    region_name=AWS_REGION_SQS_DDB,
                    aws_access_key_id=aws_access_key,
                    aws_secret_access_key=aws_secret_key
                )
                logger.info(f"GroundingCache: Using explicit credentials")
            else:
                # AgentCore/Lambda 환경: IAM 역할 사용
                self.ddb = boto3.client(
                    "dynamodb",
                    region_name=AWS_REGION_SQS_DDB
                )
                logger.info(f"GroundingCache: Using IAM role credentials")

            self._enabled = True
            logger.info(f"GroundingCache initialized (Table: {self.table_name}, Region: {AWS_REGION_SQS_DDB}, TTL: {ttl_seconds}s)")

            # 연결 테스트 (선택적)
            try:
                self.ddb.describe_table(TableName=self.table_name)
                logger.info(f"GroundingCache: DynamoDB connection verified")
            except Exception as conn_err:
                logger.warning(f"GroundingCache: DynamoDB connection test failed: {conn_err}")
                # 연결 실패해도 캐시는 시도 (실제 요청 시 에러 처리)

        except Exception as e:
            logger.error(f"GroundingCache initialization failed, running without cache: {e}")
            import traceback
            logger.error(f"GroundingCache traceback: {traceback.format_exc()}")
            self._enabled = False

    def _normalize_claim(self, claim: str) -> str:
        """
        Claim 정규화 (캐시 키 생성용)

        - 소문자 변환
        - 앞뒤 공백 제거
        - 연속 공백 단일 공백으로
        - 문장 부호 제거 (마침표, 쉼표 등)
        """
        normalized = claim.lower().strip()
        normalized = re.sub(r'\s+', ' ', normalized)  # 연속 공백 -> 단일 공백
        normalized = re.sub(r'[.,!?;:"\']', '', normalized)  # 문장 부호 제거
        return normalized

    def _generate_cache_key(self, claim: str) -> str:
        """
        캐시 키 생성

        PK 형식: GROUNDING_CACHE#{hash}
        """
        normalized = self._normalize_claim(claim)
        claim_hash = hashlib.sha256(normalized.encode('utf-8')).hexdigest()[:16]
        return f"GROUNDING_CACHE#{claim_hash}"

    async def get(self, claim: str) -> Optional[Dict[str, Any]]:
        """
        캐시에서 claim 검증 결과 조회

        Returns:
            캐시된 결과 dict 또는 None (캐시 미스)
        """
        if not self._enabled:
            return None

        try:
            pk = self._generate_cache_key(claim)

            response = self.ddb.get_item(
                TableName=self.table_name,
                Key={
                    "PK": {"S": pk},
                    "SK": {"S": "RESULT"}
                },
                ConsistentRead=False  # 캐시는 eventual consistency로 충분
            )

            item = response.get("Item")
            if not item:
                logger.debug(f"[GroundingCache] MISS - {claim[:30]}...")
                return None

            # TTL 확인 (DynamoDB TTL은 지연 삭제되므로 직접 확인)
            ttl = int(item.get("ttl", {}).get("N", 0))
            if ttl > 0 and ttl < int(time.time()):
                logger.debug(f"[GroundingCache] EXPIRED - {claim[:30]}...")
                return None

            # 버전 확인 (버전 다르면 캐시 무시)
            cached_version = item.get("cache_version", {}).get("S", "")
            if cached_version != CACHE_VERSION:
                logger.debug(f"[GroundingCache] VERSION_MISMATCH - {claim[:30]}... (cached: {cached_version}, current: {CACHE_VERSION})")
                return None

            # 결과 파싱
            result = {
                "claim": item.get("claim", {}).get("S", ""),
                "claim_normalized": item.get("claim_normalized", {}).get("S", ""),
                "is_verified": item.get("is_verified", {}).get("BOOL", False),
                "evidence": item.get("evidence", {}).get("S", ""),
                "mcp_sources": json.loads(item.get("mcp_sources", {}).get("S", "[]")),
                "confidence": float(item.get("confidence", {}).get("N", "0")),
                "cache_version": cached_version,
                "created_at": item.get("created_at", {}).get("S", ""),
                "cache_hit": True
            }

            logger.info(f"[GroundingCache] HIT - {claim[:30]}... (verified: {result['is_verified']})")
            return result

        except ClientError as e:
            logger.warning(f"[GroundingCache] DynamoDB get error (proceeding without cache): {e}")
            return None
        except Exception as e:
            logger.warning(f"[GroundingCache] Unexpected error (proceeding without cache): {e}")
            return None

    async def set(
        self,
        claim: str,
        is_verified: bool,
        evidence: str,
        mcp_sources: list = None,
        confidence: float = 1.0
    ) -> bool:
        """
        캐시에 claim 검증 결과 저장

        Args:
            claim: 원본 claim
            is_verified: 검증 결과
            evidence: 검증 근거
            mcp_sources: MCP 검색 결과 소스들
            confidence: 신뢰도 (0-1)

        Returns:
            저장 성공 여부
        """
        if not self._enabled:
            return False

        try:
            pk = self._generate_cache_key(claim)
            now = datetime.utcnow().isoformat() + "Z"
            ttl_timestamp = int(time.time()) + self.ttl_seconds

            item = {
                "PK": {"S": pk},
                "SK": {"S": "RESULT"},
                "claim": {"S": claim},
                "claim_normalized": {"S": self._normalize_claim(claim)},
                "is_verified": {"BOOL": is_verified},
                "evidence": {"S": evidence or ""},
                "mcp_sources": {"S": json.dumps(mcp_sources or [], ensure_ascii=False)},
                "confidence": {"N": str(confidence)},
                "cache_version": {"S": CACHE_VERSION},
                "created_at": {"S": now},
                "ttl": {"N": str(ttl_timestamp)},
                "type": {"S": "GROUNDING_CACHE"}  # GSI용 타입 구분
            }

            logger.info(f"[GroundingCache] Attempting to save: PK={pk}, Table={self.table_name}")

            self.ddb.put_item(
                TableName=self.table_name,
                Item=item
            )

            logger.info(f"[GroundingCache] SET SUCCESS - {claim[:30]}... (verified: {is_verified}, TTL: {self.ttl_seconds}s)")
            return True

        except ClientError as e:
            error_code = e.response.get('Error', {}).get('Code', 'Unknown')
            error_msg = e.response.get('Error', {}).get('Message', str(e))
            logger.error(f"[GroundingCache] DynamoDB put error [{error_code}]: {error_msg}")
            return False
        except Exception as e:
            import traceback
            logger.error(f"[GroundingCache] Unexpected error during set: {e}")
            logger.error(f"[GroundingCache] Traceback: {traceback.format_exc()}")
            return False

    async def delete(self, claim: str) -> bool:
        """캐시에서 특정 claim 삭제"""
        if not self._enabled:
            return False

        try:
            pk = self._generate_cache_key(claim)

            self.ddb.delete_item(
                TableName=self.table_name,
                Key={
                    "PK": {"S": pk},
                    "SK": {"S": "RESULT"}
                }
            )

            logger.info(f"[GroundingCache] DELETE - {claim[:30]}...")
            return True

        except Exception as e:
            logger.warning(f"[GroundingCache] Delete error: {e}")
            return False

    def get_stats(self) -> Dict[str, Any]:
        """캐시 통계 (간단 버전)"""
        return {
            "enabled": self._enabled,
            "table_name": self.table_name,
            "ttl_seconds": self.ttl_seconds,
            "cache_version": CACHE_VERSION
        }


# 싱글톤 인스턴스
_grounding_cache_instance: Optional[GroundingCache] = None


def get_grounding_cache() -> GroundingCache:
    """싱글톤 캐시 인스턴스 반환"""
    global _grounding_cache_instance
    if _grounding_cache_instance is None:
        _grounding_cache_instance = GroundingCache()
    return _grounding_cache_instance
