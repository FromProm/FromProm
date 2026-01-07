import json
import sqlite3
import logging
import hashlib
from typing import Any, Optional
from datetime import datetime, timedelta
from pathlib import Path
from app.core.config import settings

logger = logging.getLogger(__name__)

class SQLiteCache:
    """SQLite 기반 영속 캐시 (환각탐지용)"""
    
    def __init__(self, db_path: str = "cache.db"):
        self.db_path = Path(db_path)
        self.ttl = settings.cache_ttl
        self._init_db()
    
    def _init_db(self):
        """데이터베이스 초기화"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.execute("""
                    CREATE TABLE IF NOT EXISTS fact_check_cache (
                        claim_hash TEXT PRIMARY KEY,
                        claim_text TEXT NOT NULL,
                        result TEXT NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        expires_at TIMESTAMP NOT NULL
                    )
                """)
                
                # 인덱스 생성
                conn.execute("""
                    CREATE INDEX IF NOT EXISTS idx_expires_at 
                    ON fact_check_cache(expires_at)
                """)
                
                conn.commit()
                logger.info(f"SQLite cache initialized: {self.db_path}")
                
        except Exception as e:
            logger.error(f"Failed to initialize SQLite cache: {str(e)}")
            raise
    
    def _hash_claim(self, claim: str) -> str:
        """Claim 해시 생성"""
        return hashlib.sha256(claim.encode('utf-8')).hexdigest()
    
    async def get_fact_check(self, claim: str) -> Optional[dict]:
        """Fact check 결과 조회"""
        try:
            claim_hash = self._hash_claim(claim)
            
            with sqlite3.connect(self.db_path) as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.execute("""
                    SELECT result, expires_at 
                    FROM fact_check_cache 
                    WHERE claim_hash = ? AND expires_at > datetime('now')
                """, (claim_hash,))
                
                row = cursor.fetchone()
                if row:
                    logger.debug(f"Cache hit for claim: {claim[:50]}...")
                    return json.loads(row['result'])
                
                return None
                
        except Exception as e:
            logger.error(f"Failed to get fact check from cache: {str(e)}")
            return None
    
    async def set_fact_check(self, claim: str, result: dict, ttl: Optional[int] = None) -> bool:
        """Fact check 결과 저장"""
        try:
            claim_hash = self._hash_claim(claim)
            expires_at = datetime.utcnow() + timedelta(seconds=ttl or self.ttl)
            
            with sqlite3.connect(self.db_path) as conn:
                conn.execute("""
                    INSERT OR REPLACE INTO fact_check_cache 
                    (claim_hash, claim_text, result, expires_at)
                    VALUES (?, ?, ?, ?)
                """, (
                    claim_hash,
                    claim,
                    json.dumps(result),
                    expires_at.isoformat()
                ))
                
                conn.commit()
                logger.debug(f"Cached fact check for claim: {claim[:50]}...")
                return True
                
        except Exception as e:
            logger.error(f"Failed to set fact check cache: {str(e)}")
            return False
    
    async def cleanup_expired(self) -> int:
        """만료된 캐시 정리"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.execute("""
                    DELETE FROM fact_check_cache 
                    WHERE expires_at <= datetime('now')
                """)
                
                deleted_count = cursor.rowcount
                conn.commit()
                
                if deleted_count > 0:
                    logger.info(f"Cleaned up {deleted_count} expired cache entries")
                
                return deleted_count
                
        except Exception as e:
            logger.error(f"Failed to cleanup expired cache: {str(e)}")
            return 0
    
    async def get_stats(self) -> dict:
        """캐시 통계"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.execute("""
                    SELECT 
                        COUNT(*) as total_entries,
                        COUNT(CASE WHEN expires_at > datetime('now') THEN 1 END) as active_entries,
                        COUNT(CASE WHEN expires_at <= datetime('now') THEN 1 END) as expired_entries
                    FROM fact_check_cache
                """)
                
                row = cursor.fetchone()
                return {
                    'total_entries': row[0],
                    'active_entries': row[1], 
                    'expired_entries': row[2],
                    'db_path': str(self.db_path),
                    'ttl_seconds': self.ttl
                }
                
        except Exception as e:
            logger.error(f"Failed to get cache stats: {str(e)}")
            return {}
    
    async def clear_all(self) -> bool:
        """전체 캐시 삭제"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.execute("DELETE FROM fact_check_cache")
                conn.commit()
                logger.info("All cache entries cleared")
                return True
                
        except Exception as e:
            logger.error(f"Failed to clear cache: {str(e)}")
            return False