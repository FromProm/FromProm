import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { usePurchaseStore } from '../../store/purchaseStore';
import { promptApi, creditApi } from '../../services/api';
import { promptTypeToCategory } from '../../services/dummyData';
import AnimatedContent from '../../components/AnimatedContent';

const PurchasedPromptsPage = () => {
  const { getPurchasedPrompts, incrementDownloadCount, addPurchasedPrompt } = usePurchaseStore();
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [promptContents, setPromptContents] = useState<Record<string, string>>({});
  const [loadingContent, setLoadingContent] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(true);

  // 페이지 로드 시 API에서 구매 내역 동기화
  useEffect(() => {
    const syncPurchasedPrompts = async () => {
      setIsSyncing(true);
      try {
        const historyResponse = await creditApi.getPurchaseHistory();
        const purchases = historyResponse.data.purchases || [];
        
        for (const purchase of purchases) {
          if (purchase.promptId) {
            try {
              const detailResponse = await promptApi.getPromptDetail(purchase.promptId);
              if (detailResponse.data.success && detailResponse.data.prompt) {
                const prompt = detailResponse.data.prompt;
                const category = promptTypeToCategory[prompt.promptType] || prompt.promptType || prompt.category;
                
                // purchaseStore에 추가 (이미 있으면 무시됨)
                addPurchasedPrompt({
                  id: prompt.promptId,
                  title: prompt.title,
                  price: prompt.price,
                  category: category,
                  sellerName: prompt.nickname || '판매자',
                  description: prompt.description,
                  content: prompt.content,
                  rating: prompt.evaluationMetrics?.finalScore || 4.5,
                });
              }
            } catch (err) {
              console.error(`Failed to fetch prompt ${purchase.promptId}:`, err);
            }
          }
        }
      } catch (error) {
        console.error('Failed to sync purchased prompts:', error);
      } finally {
        setIsSyncing(false);
      }
    };

    syncPurchasedPrompts();
  }, [addPurchasedPrompt]);

  const purchasedPrompts = getPurchasedPrompts();

  const filteredPrompts = purchasedPrompts.filter(prompt => {
    const matchesCategory = selectedCategory === 'All' || prompt.category === selectedCategory;
    const matchesSearch = prompt.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         prompt.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const categories = ['All', ...Array.from(new Set(purchasedPrompts.map(p => p.category)))];

  // 프롬프트 내용 가져오기
  const fetchPromptContent = async (promptId: string) => {
    // 이미 캐시된 내용이 있으면 사용
    if (promptContents[promptId]) {
      return promptContents[promptId];
    }

    setLoadingContent(promptId);
    try {
      const response = await promptApi.getPromptDetail(promptId);
      if (response.data.success && response.data.prompt?.content) {
        const content = response.data.prompt.content;
        setPromptContents(prev => ({ ...prev, [promptId]: content }));
        return content;
      }
    } catch (error) {
      console.error('Failed to fetch prompt content:', error);
    } finally {
      setLoadingContent(null);
    }
    return null;
  };

  // 내용 보기 토글
  const handleToggleContent = async (promptId: string) => {
    if (selectedPrompt === promptId) {
      setSelectedPrompt(null);
    } else {
      await fetchPromptContent(promptId);
      setSelectedPrompt(promptId);
    }
  };

  // 프롬프트 내용 가져오기 (다운로드/복사용)
  const getPromptContent = (promptId: string, fallbackContent: string) => {
    return promptContents[promptId] || fallbackContent;
  };

  const handleDownload = async (promptId: string, fallbackContent: string, title: string) => {
    // 먼저 API에서 최신 내용 가져오기
    let content = promptContents[promptId];
    if (!content) {
      content = await fetchPromptContent(promptId) || fallbackContent;
    }

    // 다운로드 카운트 증가
    incrementDownloadCount(promptId);

    // 텍스트 파일로 다운로드
    const element = document.createElement('a');
    const file = new Blob([content], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `${title}(FromProm).txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleCopyToClipboard = async (promptId: string, fallbackContent: string) => {
    // 먼저 API에서 최신 내용 가져오기
    let content = promptContents[promptId];
    if (!content) {
      content = await fetchPromptContent(promptId) || fallbackContent;
    }

    try {
      await navigator.clipboard.writeText(content);
      alert('프롬프트가 클립보드에 복사되었습니다!');
    } catch (err) {
      console.error('클립보드 복사 실패:', err);
    }
  };

  if (isSyncing) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600">구매한 프롬프트를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (purchasedPrompts.length === 0) {
    return (
      <div className="min-h-screen bg-white">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-16">
            <div className="w-24 h-24 mx-auto mb-6 bg-gray-200 rounded-full flex items-center justify-center">
              <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">구매한 프롬프트가 없습니다</h2>
            <p className="text-gray-600 mb-8">마켓플레이스에서 프롬프트를 구매해보세요</p>
            <Link
              to="/marketplace"
              className="inline-flex items-center px-6 py-3 bg-blue-900 text-white font-medium rounded-lg hover:bg-blue-800 transition-colors"
            >
              마켓플레이스 둘러보기
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">구매한 프롬프트</h1>
          <p className="text-gray-600">{purchasedPrompts.length}개의 프롬프트를 구매했습니다</p>
        </div>

      {/* 검색 및 필터 */}
      <div className="mb-8 space-y-4">
        {/* 검색바 */}
        <div className="relative max-w-md">
          <input
            type="text"
            placeholder="프롬프트 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* 카테고리 필터 */}
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedCategory === category
                  ? 'bg-blue-900 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:border-blue-900 hover:text-blue-900'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* 프롬프트 목록 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPrompts.map((prompt, index) => (
          <AnimatedContent key={prompt.id} once distance={50} duration={0.6} delay={index * 0.1}>
          <div
            className="bg-gradient-to-br from-blue-100 via-blue-50 to-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-all duration-300"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                  {prompt.category}
                </span>
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-xs text-green-600 font-medium">구매완료</span>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-gray-900">{prompt.price}P</div>
              </div>
            </div>

            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {prompt.title}
            </h3>

            <p className="text-gray-600 text-sm mb-4 line-clamp-2">
              {prompt.description}
            </p>

            <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
              <span>by {prompt.sellerName}</span>
              <div className="flex items-center space-x-1">
                <span>⭐</span>
                <span>{prompt.rating}</span>
              </div>
            </div>

            {/* 구매 정보 */}
            <div className="border-t border-gray-200 pt-4 mb-4">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>구매일: {new Date(prompt.purchasedAt).toLocaleDateString()}</span>
                <span>다운로드: {prompt.downloadCount}회</span>
              </div>
            </div>

            {/* 액션 버튼 */}
            <div className="space-y-2">
              <button
                onClick={() => handleToggleContent(prompt.id)}
                disabled={loadingContent === prompt.id}
                className="w-full bg-blue-900 text-white font-medium py-2 rounded-lg hover:bg-blue-800 transition-colors text-sm disabled:opacity-50"
              >
                {loadingContent === prompt.id ? '로딩 중...' : selectedPrompt === prompt.id ? '내용 숨기기' : '내용 보기'}
              </button>

              <div className="flex space-x-2">
                <button
                  onClick={() => handleDownload(prompt.id, prompt.content, prompt.title)}
                  className="flex-1 border border-gray-300 text-gray-700 font-medium py-2 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                >
                  다운로드
                </button>
                <button
                  onClick={() => handleCopyToClipboard(prompt.id, prompt.content)}
                  className="flex-1 border border-gray-300 text-gray-700 font-medium py-2 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                >
                  복사
                </button>
              </div>
            </div>

            {/* 프롬프트 내용 */}
            {selectedPrompt === prompt.id && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200 animate-slide-down">
                <h4 className="font-medium text-gray-900 mb-2">프롬프트 내용:</h4>
                <div className="text-sm text-gray-700 whitespace-pre-wrap max-h-40 overflow-y-auto">
                  {promptContents[prompt.id] || prompt.content}
                </div>
              </div>
            )}
          </div>
          </AnimatedContent>
        ))}
      </div>

      {/* 결과 없음 */}
      {filteredPrompts.length === 0 && purchasedPrompts.length > 0 && (
        <div className="text-center py-12">
          <div className="text-gray-600 text-lg mb-2">검색 결과가 없습니다</div>
          <p className="text-gray-500 text-sm">다른 키워드나 카테고리를 시도해보세요</p>
        </div>
      )}
      </div>
    </div>
  );
};

export default PurchasedPromptsPage;
