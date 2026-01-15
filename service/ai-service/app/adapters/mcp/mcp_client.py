"""
MCP (Model Context Protocol) 클라이언트
다양한 MCP 서버들과 통신하여 근거 수집
"""

import asyncio
import logging
import re
from typing import List, Dict, Any, Optional
from enum import Enum

logger = logging.getLogger(__name__)

class MCPServerType(str, Enum):
    """지원하는 MCP 서버 타입들"""
    BRAVE_SEARCH = "brave_search"
    TAVILY_SEARCH = "tavily_search"
    WIKIPEDIA = "wikipedia"
    ACADEMIC_SEARCH = "academic_search"
    GOOGLE_SEARCH = "google_search"

class MCPClient:
    """MCP 서버들과 통신하는 클라이언트"""
    
    def __init__(self):
        self.server_configs = {
            MCPServerType.BRAVE_SEARCH: {
                'endpoint': 'brave-search-mcp',
                'tools': ['web_search']
            },
            MCPServerType.TAVILY_SEARCH: {
                'endpoint': 'tavily-mcp',
                'tools': ['search']
            },
            MCPServerType.WIKIPEDIA: {
                'endpoint': 'wikipedia-mcp',
                'tools': ['search_wikipedia']
            },
            MCPServerType.ACADEMIC_SEARCH: {
                'endpoint': 'academic-mcp',
                'tools': ['search_papers']
            },
            MCPServerType.GOOGLE_SEARCH: {
                'endpoint': 'google-search-mcp',
                'tools': ['web_search']
            }
        }
    
    def _preprocess_query_for_wikipedia(self, query: str) -> str:
        """
        Wikipedia 검색을 위한 쿼리 전처리
        긴 문장에서 핵심 키워드를 추출
        """
        # 연도 패턴 제거 (1950년대:, 1956년: 등)
        query = re.sub(r'^\d{4}년대?:\s*', '', query)
        
        # 인명 추출 (한글 이름, 영문 이름)
        names = re.findall(r'[A-Z][a-z]+\s+[A-Z][a-z]+|[가-힣]{2,4}(?:\s+[가-힣]{2,4})?', query)
        if names:
            # 첫 번째 인명 사용
            return names[0]
        
        # 고유명사/전문용어 추출 (대문자로 시작하거나 특정 패턴)
        # 다트머스 컨퍼런스, 전문가 시스템, 딥러닝 등
        terms = re.findall(r'[가-힣A-Z][가-힣a-z\s]{2,15}(?:시스템|컨퍼런스|기술|접근법|학습)', query)
        if terms:
            return terms[0].strip()
        
        # 핵심 명사구 추출 (조사 제거)
        # "인공지능이라는", "기계학습 기술의" -> "인공지능", "기계학습"
        nouns = re.findall(r'([가-힣]{2,10})(?:이라는|이|가|을|를|의|에서|으로|라는)', query)
        if nouns:
            return nouns[0]
        
        # 영문 전문용어 추출
        english_terms = re.findall(r'[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*', query)
        if english_terms:
            return english_terms[0]
        
        # 기본: 첫 20자 + 핵심 단어만
        words = query.split()
        if len(words) > 3:
            # 조사 제거하고 명사만
            keywords = [w for w in words[:5] if len(w) > 1 and not w.endswith(('은', '는', '이', '가', '을', '를', '의', '에', '로'))]
            return ' '.join(keywords[:3])
        
        return query[:30]
    
    def _preprocess_query_for_academic(self, query: str) -> str:
        """
        학술 검색을 위한 쿼리 전처리
        영문 키워드 추출 및 번역
        """
        # 연도 패턴 제거
        query = re.sub(r'^\d{4}년대?:\s*', '', query)
        
        # 한글 전문용어 -> 영문 매핑
        term_mapping = {
            '인공지능': 'artificial intelligence',
            '기계학습': 'machine learning',
            '딥러닝': 'deep learning',
            '신경망': 'neural network',
            '자연어 처리': 'natural language processing',
            '컴퓨터 비전': 'computer vision',
            '전문가 시스템': 'expert system',
            '기호주의': 'symbolic AI',
            '빅데이터': 'big data'
        }
        
        # 매핑된 용어 찾기
        for ko, en in term_mapping.items():
            if ko in query:
                return en
        
        # 영문이 이미 있으면 그대로 사용
        english_terms = re.findall(r'[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*', query)
        if english_terms:
            return ' '.join(english_terms[:3])
        
        # 기본: 핵심 명사만
        nouns = re.findall(r'([가-힣]{2,10})(?:이라는|이|가|을|를|의|에서|으로)', query)
        return nouns[0] if nouns else query[:30]
    
    async def search_evidence(
        self, 
        server_type: MCPServerType, 
        query: str, 
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        지정된 MCP 서버에서 근거 검색
        
        Args:
            server_type: 사용할 MCP 서버 타입
            query: 검색 쿼리
            limit: 반환할 결과 수
            
        Returns:
            검색된 근거 리스트
        """
        try:
            # 서버 타입별 쿼리 전처리
            processed_query = query
            if server_type == MCPServerType.WIKIPEDIA:
                processed_query = self._preprocess_query_for_wikipedia(query)
                logger.info(f"Wikipedia query preprocessed: '{query[:50]}...' -> '{processed_query}'")
            elif server_type == MCPServerType.ACADEMIC_SEARCH:
                processed_query = self._preprocess_query_for_academic(query)
                logger.info(f"Academic query preprocessed: '{query[:50]}...' -> '{processed_query}'")
            
            logger.info(f"Searching evidence using {server_type.value} for: {processed_query[:50]}...")
            
            # 서버 타입별 검색 실행
            if server_type == MCPServerType.BRAVE_SEARCH:
                return await self._search_brave(processed_query, limit)
            elif server_type == MCPServerType.TAVILY_SEARCH:
                return await self._search_tavily(processed_query, limit)
            elif server_type == MCPServerType.WIKIPEDIA:
                return await self._search_wikipedia(processed_query, limit)
            elif server_type == MCPServerType.ACADEMIC_SEARCH:
                return await self._search_academic(processed_query, limit)
            elif server_type == MCPServerType.GOOGLE_SEARCH:
                return await self._search_google(processed_query, limit)
            else:
                logger.error(f"Unsupported MCP server type: {server_type}")
                return []
                
        except Exception as e:
            logger.error(f"MCP search failed for {server_type}: {str(e)}")
            return []
    
    async def _search_brave(self, query: str, limit: int) -> List[Dict[str, Any]]:
        """Brave Search MCP 서버 호출 - 실제 구현"""
        import aiohttp
        import os
        
        api_key = os.getenv("BRAVE_API_KEY")
        if not api_key:
            logger.error("BRAVE_API_KEY not found - cannot perform search")
            raise ValueError("BRAVE_API_KEY environment variable is required")
        
        url = "https://api.search.brave.com/res/v1/web/search"
        headers = {
            "Accept": "application/json",
            "X-Subscription-Token": api_key
        }
        params = {
            "q": query,
            "count": min(limit, 20),
            "search_lang": "ko",
            "country": "KR"
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.get(url, headers=headers, params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    results = []
                    
                    for item in data.get("web", {}).get("results", [])[:limit]:
                        results.append({
                            'title': item.get('title', ''),
                            'content': item.get('description', ''),
                            'url': item.get('url', ''),
                            'source': 'brave_search',
                            'relevance_score': 0.9,
                            'published_date': item.get('age', ''),
                            'domain': item.get('profile', {}).get('name', '')
                        })
                    
                    logger.info(f"Brave Search returned {len(results)} results")
                    return results
                else:
                    error_msg = f"Brave Search API error: {response.status}"
                    logger.error(error_msg)
                    raise RuntimeError(error_msg)
    
    async def _search_tavily(self, query: str, limit: int) -> List[Dict[str, Any]]:
        """Tavily Search MCP 서버 호출 - 실제 구현"""
        import aiohttp
        import os
        
        api_key = os.getenv("TAVILY_API_KEY")
        if not api_key:
            logger.error("TAVILY_API_KEY not found - cannot perform search")
            raise ValueError("TAVILY_API_KEY environment variable is required")
        
        url = "https://api.tavily.com/search"
        headers = {"Content-Type": "application/json"}
        payload = {
            "api_key": api_key,
            "query": query,
            "search_depth": "basic",
            "include_answer": False,
            "include_images": False,
            "include_raw_content": False,
            "max_results": min(limit, 10)
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post(url, headers=headers, json=payload) as response:
                if response.status == 200:
                    data = await response.json()
                    results = []
                    
                    for item in data.get("results", [])[:limit]:
                        results.append({
                            'title': item.get('title', ''),
                            'content': item.get('content', ''),
                            'url': item.get('url', ''),
                            'source': 'tavily_search',
                            'relevance_score': item.get('score', 0.5),
                            'confidence': 0.9,
                            'category': 'general'
                        })
                    
                    logger.info(f"Tavily Search returned {len(results)} results")
                    return results
                else:
                    error_msg = f"Tavily Search API error: {response.status}"
                    logger.error(error_msg)
                    raise RuntimeError(error_msg)
    
    async def _search_wikipedia(self, query: str, limit: int) -> List[Dict[str, Any]]:
        """Wikipedia MCP 서버 호출 - 실제 구현"""
        import aiohttp
        import urllib.parse
        
        # 한국어 위키피디아 우선 검색
        encoded_query = urllib.parse.quote(query)
        
        # Wikipedia API는 User-Agent 필수
        headers = {
            "User-Agent": "FromPromAI/1.0 (https://fromprom.ai; contact@fromprom.ai)"
        }
        
        async with aiohttp.ClientSession(headers=headers) as session:
            # 먼저 요약 API 시도
            summary_url = f"https://ko.wikipedia.org/api/rest_v1/page/summary/{encoded_query}"
            
            try:
                async with session.get(summary_url) as response:
                    if response.status == 200:
                        data = await response.json()
                        return [{
                            'title': data.get('title', ''),
                            'content': data.get('extract', ''),
                            'url': data.get('content_urls', {}).get('desktop', {}).get('page', ''),
                            'source': 'wikipedia',
                            'relevance_score': 0.95,
                            'language': 'ko',
                            'page_id': str(data.get('pageid', ''))
                        }]
            except:
                pass
            
            # 검색 API로 대체
            search_url = "https://ko.wikipedia.org/w/api.php"
            params = {
                "action": "query",
                "format": "json",
                "list": "search",
                "srsearch": query,
                "srlimit": min(limit, 5),
                "srprop": "snippet|titlesnippet"
            }
            
            async with session.get(search_url, params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    results = []
                    
                    for item in data.get("query", {}).get("search", []):
                        title = item.get('title', '')
                        results.append({
                            'title': f'Wikipedia: {title}',
                            'content': item.get('snippet', '').replace('<span class="searchmatch">', '').replace('</span>', ''),
                            'url': f"https://ko.wikipedia.org/wiki/{urllib.parse.quote(title)}",
                            'source': 'wikipedia',
                            'relevance_score': 0.9,
                            'language': 'ko',
                            'page_id': str(item.get('pageid', ''))
                        })
                    
                    logger.info(f"Wikipedia returned {len(results)} results")
                    return results
                else:
                    error_msg = f"Wikipedia API error: {response.status}"
                    logger.error(error_msg)
                    raise RuntimeError(error_msg)
    
    async def _search_academic(self, query: str, limit: int) -> List[Dict[str, Any]]:
        """Academic Paper MCP 서버 호출 - arXiv API 사용"""
        import aiohttp
        import xml.etree.ElementTree as ET
        import urllib.parse
        
        # arXiv API (무료, Rate Limit 관대: 초당 1회)
        encoded_query = urllib.parse.quote(query)
        url = f"http://export.arxiv.org/api/query?search_query=all:{encoded_query}&start=0&max_results={min(limit, 10)}"
        
        async with aiohttp.ClientSession() as session:
            async with session.get(url) as response:
                if response.status == 200:
                    xml_data = await response.text()
                    
                    # XML 파싱
                    root = ET.fromstring(xml_data)
                    ns = {'atom': 'http://www.w3.org/2005/Atom'}
                    
                    results = []
                    for entry in root.findall('atom:entry', ns):
                        title = entry.find('atom:title', ns)
                        summary = entry.find('atom:summary', ns)
                        link = entry.find('atom:id', ns)
                        published = entry.find('atom:published', ns)
                        
                        authors = []
                        for author in entry.findall('atom:author', ns):
                            name = author.find('atom:name', ns)
                            if name is not None:
                                authors.append(name.text)
                        
                        results.append({
                            'title': title.text.strip() if title is not None else '',
                            'content': summary.text.strip() if summary is not None else '',
                            'url': link.text if link is not None else '',
                            'source': 'arxiv',
                            'relevance_score': 0.88,
                            'authors': ', '.join(authors),
                            'publication_date': published.text[:10] if published is not None else '',
                            'journal': 'arXiv',
                            'citations': 0
                        })
                    
                    logger.info(f"arXiv returned {len(results)} results")
                    return results
                else:
                    error_msg = f"arXiv API error: {response.status}"
                    logger.error(error_msg)
                    raise RuntimeError(error_msg)
    
    async def _search_google(self, query: str, limit: int) -> List[Dict[str, Any]]:
        """Google Custom Search API 호출 - 실제 구현"""
        import aiohttp
        import os
        
        api_key = os.getenv("GOOGLE_SEARCH_API_KEY")
        search_engine_id = os.getenv("GOOGLE_SEARCH_ENGINE_ID")
        
        if not api_key or not search_engine_id:
            logger.error("GOOGLE_SEARCH_API_KEY or GOOGLE_SEARCH_ENGINE_ID not found - cannot perform search")
            raise ValueError("GOOGLE_SEARCH_API_KEY and GOOGLE_SEARCH_ENGINE_ID environment variables are required")
        
        # Google Custom Search API
        url = "https://www.googleapis.com/customsearch/v1"
        params = {
            "key": api_key,
            "cx": search_engine_id,
            "q": query,
            "num": min(limit, 10),
            "lr": "lang_ko",  # 한국어 우선
            "safe": "medium"
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.get(url, params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    results = []
                    
                    for item in data.get("items", [])[:limit]:
                        results.append({
                            'title': item.get('title', ''),
                            'content': item.get('snippet', ''),
                            'url': item.get('link', ''),
                            'source': 'google_search',
                            'relevance_score': 0.9,
                            'display_link': item.get('displayLink', ''),
                            'formatted_url': item.get('formattedUrl', ''),
                            'cache_id': item.get('cacheId', '')
                        })
                    
                    logger.info(f"Google Search returned {len(results)} results")
                    return results
                else:
                    error_msg = f"Google Search API error: {response.status}"
                    logger.error(error_msg)
                    raise RuntimeError(error_msg)
    
