import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { creditApi, promptApi } from '../../services/api';
import { promptTypeToCategory } from '../../services/dummyData';
import AnimatedContent from '../../components/AnimatedContent';

// 프롬프트 타입 정의
interface PurchasedPrompt {
  promptId: string;
  title: string;
  description: string;
  price: number;
  category: string;
  nickname: string;
  model: string;
  content: string;
  purchasedAt: string;
}

// 카드 색상 설정 함수 (마켓페이지와 동일)
const getCardColors = (category: string) => {
  const type = promptTypeToCategory[category] || category;
  
  if (type === '사실/정보/근거 요구' || type === '사실 근거 기반' || category === 'type_a') {
    return {
      gradient: 'from-rose-50 via-rose-25 to-white',
      border: 'border-rose-100',
      hoverBorder: 'hover:border-rose-500',
      shadow: 'shadow-rose-500/5 hover:shadow-rose-500/30',
      tag: 'text-gray-700 bg-white border border-rose-400',
      borderBottom: 'border-rose-100',
      tagLabel: '사실/정보/근거 요구',
    };
  } else if (type === '글 창작 및 생성' || category === 'type_b_text') {
    return {
      gradient: 'from-emerald-50 via-emerald-25 to-white',
      border: 'border-emerald-100',
      hoverBorder: 'hover:border-emerald-500',
      shadow: 'shadow-emerald-500/5 hover:shadow-emerald-500/30',
      tag: 'text-gray-700 bg-white border border-emerald-400',
      borderBottom: 'border-emerald-100',
      tagLabel: '글 창작 및 생성',
    };
  } else if (type === '이미지 창작 및 생성' || category === 'type_b_image') {
    return {
      gradient: 'from-blue-50 via-blue-25 to-white',
      border: 'border-blue-100',
      hoverBorder: 'hover:border-blue-500',
      shadow: 'shadow-blue-500/5 hover:shadow-blue-500/30',
      tag: 'text-gray-700 bg-white border border-blue-400',
      borderBottom: 'border-blue-100',
      tagLabel: '이미지 창작 및 생성',
    };
  } else {
    return {
      gradient: 'from-gray-50 via-gray-25 to-white',
      border: 'border-gray-100',
      hoverBorder: 'hover:border-gray-500',
      shadow: 'shadow-gray-500/5 hover:shadow-gray-500/30',
      tag: 'text-gray-700 bg-white border border-gray-400',
      borderBottom: 'border-gray-100',
      tagLabel: category || '기타',
    };
  }
};

const PurchasedPromptsPage = () => {
  const [purchasedPrompts, setPurchasedPrompts] = useState<PurchasedPrompt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // API에서 구매한 프롬프트 목록 가져오기
  useEffect(() => {
    const fetchPurchasedPrompts = async () => {
      setIsLoading(true);
      try {
        // 구매 내역 가져오기
        const historyResponse = await creditApi.getPurchaseHistory();
        const purchases = historyResponse.data.purchases || [];
        
        // 각 구매 내역에서 프롬프트 상세 정보 가져오기
        const promptDetails: PurchasedPrompt[] = [];
        for (const purchase of purchases) {
          if (purchase.promptId) {
            try {
              const detailResponse = await promptApi.getPromptDetail(purchase.promptId);
              if (detailResponse.data.success && detailResponse.data.prompt) {
                const prompt = detailResponse.data.prompt;
                promptDetails.push({
                  promptId: prompt.promptId,
                  title: prompt.title,
                  description: prompt.description,
                  price: prompt.price,
                  category: prompt.promptType || prompt.category,
                  nickname: prompt.nickname || '익명',
                  model: prompt.model,
                  content: prompt.content,
                  purchasedAt: purchase.created_at || purchase.purchasedAt,
                });
              }
            } catch (err) {
              console.error(`Failed to fetch prompt ${purchase.promptId}:`, err);
            }
          }
        }
        
        setPurchasedPrompts(promptDetails);
      } catch (error) {
        console.error('Failed to fetch purchased prompts:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPurchasedPrompts();
  }, []);

  const filteredPrompts = purchasedPrompts.filter(prompt => {
    const type = promptTypeToCategory[prompt.category] || prompt.category;
    const matchesCategory = selectedCategory === 'All' || 
      prompt.category === selectedCategory ||
      type === selectedCategory;
    const matchesSearch = prompt.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         prompt.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // 카테고리 목록
  const categoryList = ['All', '사실/정보/근거 요구', '글 창작 및 생성', '이미지 창작 및 생성'];

  const handleDownload = (content: string, title: string) => {
    const element = document.createElement('a');
    const file = new Blob([content], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `${title}(FromProm).txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleCopyToClipboard = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      alert('프롬프트가 클립보드에 복사되었습니다!');
    } catch (err) {
      console.error('클립보드 복사 실패:', err);
    }
  };

  if (isLoading) {
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

          <div className="flex flex-wrap gap-2">
            {categoryList.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedCategory === category
                    ? 'bg-blue-900 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:border-blue-900 hover:text-blue-900'
                }`}
              >
                {category === 'All' ? '전체' : category}
              </button>
            ))}
          </div>
        </div>

        {/* 프롬프트 목록 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPrompts.map((prompt, index) => {
            const colors = getCardColors(prompt.category);
            return (
              <AnimatedContent key={prompt.promptId} once distance={50} duration={0.6} delay={index * 0.1}>
                <div className={`bg-gradient-to-br ${colors.gradient} border-2 ${colors.border} ${colors.hoverBorder} rounded-xl p-5 shadow-lg ${colors.shadow} transition-all duration-300`}>
                  {/* 상단: 카테고리 + 가격 */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <span className={`text-xs ${colors.tag} px-2 py-1 rounded-full font-medium`}>
                        {colors.tagLabel}
                      </span>
                      <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                        구매완료
                      </span>
                    </div>
                    <div className="text-xl font-bold text-gray-900">{prompt.price}P</div>
                  </div>

                  {/* 제목 */}
                  <h3 className="text-gray-900 text-lg font-bold mb-2 line-clamp-1">
                    {prompt.title}
                  </h3>
                  
                  {/* 설명 */}
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {prompt.description}
                  </p>

                  {/* 모델 + 작성자 */}
                  <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
                    <span className="bg-gray-50 border border-gray-200 px-2 py-0.5 rounded text-xs font-medium text-gray-700 truncate max-w-[120px]">
                      {prompt.model}
                    </span>
                    <span className="text-xs">by {prompt.nickname}</span>
                  </div>

                  {/* 구매 정보 */}
                  <div className={`border-t ${colors.borderBottom} pt-3 mb-4`}>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>구매일: {new Date(prompt.purchasedAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* 액션 버튼 */}
                  <div className="space-y-2">
                    <button
                      onClick={() => setSelectedPrompt(selectedPrompt === prompt.promptId ? null : prompt.promptId)}
                      className="w-full bg-blue-900 text-white font-medium py-2 rounded-lg hover:bg-blue-800 transition-colors text-sm"
                    >
                      {selectedPrompt === prompt.promptId ? '내용 숨기기' : '내용 보기'}
                    </button>
                    
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleDownload(prompt.content, prompt.title)}
                        className="flex-1 border border-gray-300 text-gray-700 font-medium py-2 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                      >
                        다운로드
                      </button>
                      <button
                        onClick={() => handleCopyToClipboard(prompt.content)}
                        className="flex-1 border border-gray-300 text-gray-700 font-medium py-2 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                      >
                        복사
                      </button>
                    </div>
                  </div>

                  {/* 프롬프트 내용 */}
                  {selectedPrompt === prompt.promptId && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200 animate-slide-down">
                      <h4 className="font-medium text-gray-900 mb-2">프롬프트 내용:</h4>
                      <div className="text-sm text-gray-700 whitespace-pre-wrap max-h-40 overflow-y-auto">
                        {prompt.content}
                      </div>
                    </div>
                  )}
                </div>
              </AnimatedContent>
            );
          })}
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
