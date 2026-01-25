import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { categories, promptTypeToCategory } from '../services/dummyData';
import { promptApi, interactionApi } from '../services/api';
import { useCartStore } from '../store/cartStore';
import { usePurchaseStore } from '../store/purchaseStore';
import { useAuthStore } from '../store/authStore';
import SplitText from '../components/SplitText';
import AnimatedContent from '../components/AnimatedContent';

// 프롬프트 타입 정의 (새로운 API 응답 구조)
interface PromptItem {
  promptId: string;
  title: string;
  description: string;
  content: string;
  category: string;
  model: string;
  nickname: string;
  userId: string;
  status: string;
  price: number;
  createdAt: string;
  updatedAt: string;
  // DynamoDB 통계
  likeCount: number;
  bookmarkCount: number;
  commentCount: number;
  isLiked?: boolean;
  isBookmarked?: boolean;
  // 검색 점수
  score?: number;
  // 평가 지표
  evaluationMetrics?: {
    finalScore: number;
    relevance: number;
    consistency: number;
    hallucination: number;
    informationDensity: number;
    modelVariance: number;
    tokenUsage: number;
  };
}

const MarketplacePage = () => {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [prompts, setPrompts] = useState<PromptItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { addToCart, removeFromCart, isInCart } = useCartStore();
  const { isPurchased } = usePurchaseStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const isLoggedIn = () => !!localStorage.getItem('accessToken');

  // 모델명 정제 함수 (AWS Bedrock 모델 ID -> 사용자 친화적 이름)
  const formatModelName = (model: string): string => {
    if (!model) return 'AI Model';
    
    const modelMap: Record<string, string> = {
      // Claude 모델
      'anthropic.claude-3-haiku-20240307-v1:0': 'claude 3 haiku',
      'anthropic.claude-3-5-sonnet-20240620-v1:0': 'claude 3.5 sonnet v1',
      'anthropic.claude-sonnet-4-5-20250514-v1:0': 'claude sonnet 4.5',
      // Nova / Titan 이미지 모델
      'amazon.nova-canvas-v1:0': 'Nova Canvas 1.0',
      'amazon.titan-image-generator-v2:0': 'Titan Image Generator G1 v2',
      // GPT 모델
      'gpt-oss-120b': 'gpt-oss-120b',
      'gpt-oss-20b': 'gpt-oss-20b',
      // Gemma 모델
      'gemma-3-27b-instruct': 'Gemma 3 27B Instruct',
      'gemma-3-12b-it': 'Gemma 3 12B IT',
      'gemma-3-4b-instruct': 'Gemma 3 4B Instruct',
    };
    
    return modelMap[model] || model;
  };

  // 프롬프트 목록 가져오기
  useEffect(() => {
    const fetchPrompts = async () => {
      setIsLoading(true);
      try {
        // 로그인한 경우 userId 전달하여 좋아요/북마크 여부 확인
        const userId = user?.id;
        const response = await promptApi.getAllPrompts(50, userId);
        if (response.data.success) {
          setPrompts(response.data.prompts || []);
        }
      } catch (error) {
        console.error('Failed to fetch prompts:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPrompts();
  }, [user]);

  const handleAddToCart = (prompt: PromptItem, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!isLoggedIn()) {
      alert('로그인이 필요한 서비스입니다.');
      navigate('/auth/login', { state: { from: location.pathname } });
      return;
    }
    
    if (isInCart(prompt.promptId)) {
      removeFromCart(prompt.promptId);
    } else if (!isPurchased(prompt.promptId)) {
      addToCart({
        id: prompt.promptId,
        title: prompt.title,
        price: prompt.price,
        category: prompt.category,
        sellerName: prompt.nickname || '판매자',
        sellerSub: prompt.userId || '',
        description: prompt.description,
        rating: prompt.evaluationMetrics?.finalScore || 4.5
      });
    }
  };

  const handlePurchase = (promptId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!isLoggedIn()) {
      alert('로그인이 필요한 서비스입니다.');
      navigate('/auth/login', { state: { from: location.pathname } });
      return;
    }
    
    navigate(`/purchase/${promptId}`);
  };

  // 좋아요 토글
  const handleLikeToggle = async (prompt: PromptItem, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!isLoggedIn()) {
      alert('로그인이 필요한 서비스입니다.');
      navigate('/auth/login', { state: { from: location.pathname } });
      return;
    }

    try {
      const currentLikeCount = Number(prompt.likeCount) || 0;
      if (prompt.isLiked) {
        await interactionApi.deleteLike(prompt.promptId);
        setPrompts(prev => prev.map(p => 
          p.promptId === prompt.promptId 
            ? { ...p, isLiked: false, likeCount: Math.max(0, currentLikeCount - 1) }
            : p
        ));
      } else {
        await interactionApi.addLike(prompt.promptId);
        setPrompts(prev => prev.map(p => 
          p.promptId === prompt.promptId 
            ? { ...p, isLiked: true, likeCount: currentLikeCount + 1 }
            : p
        ));
      }
    } catch (error) {
      console.error('Failed to toggle like:', error);
    }
  };

  // 북마크 토글
  const handleBookmarkToggle = async (prompt: PromptItem, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!isLoggedIn()) {
      alert('로그인이 필요한 서비스입니다.');
      navigate('/auth/login', { state: { from: location.pathname } });
      return;
    }

    try {
      const currentBookmarkCount = Number(prompt.bookmarkCount) || 0;
      if (prompt.isBookmarked) {
        await interactionApi.deleteBookmark(prompt.promptId);
        setPrompts(prev => prev.map(p => 
          p.promptId === prompt.promptId 
            ? { ...p, isBookmarked: false, bookmarkCount: Math.max(0, currentBookmarkCount - 1) }
            : p
        ));
      } else {
        await interactionApi.addBookmark(prompt.promptId);
        setPrompts(prev => prev.map(p => 
          p.promptId === prompt.promptId 
            ? { ...p, isBookmarked: true, bookmarkCount: currentBookmarkCount + 1 }
            : p
        ));
      }
    } catch (error) {
      console.error('Failed to toggle bookmark:', error);
    }
  };

  // 카테고리 필터링 (promptType을 한글 카테고리로 변환하여 비교)
  const filteredPrompts = prompts.filter(prompt => {
    // prompt.category가 promptType(type_a 등)일 수 있으므로 한글로 변환
    const promptCategory = promptTypeToCategory[prompt.category] || prompt.category;
    const matchesCategory = selectedCategory === 'All' || promptCategory === selectedCategory;
    const title = prompt.title || '';
    const description = prompt.description || '';
    const matchesSearch = title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-white">
      {/* 메인 콘텐츠 */}
      <main className="w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* 페이지 헤더 */}
        <div className="mb-8 text-center flex flex-col items-center">
          <SplitText
            text="프롬프트 마켓플레이스"
            className="text-3xl font-bold text-gray-900 mb-2"
            delay={50}
            duration={0.6}
            ease="power3.out"
            splitType="chars"
            from={{ opacity: 0, y: 30 }}
            to={{ opacity: 1, y: 0 }}
            threshold={0.1}
            rootMargin="-50px"
            textAlign="center"
            tag="h1"
          />
          <SplitText
            text="검증된 고품질 AI 프롬프트를 찾아보세요"
            className="text-gray-600"
            delay={30}
            duration={0.5}
            ease="power3.out"
            splitType="words"
            from={{ opacity: 0, y: 20 }}
            to={{ opacity: 1, y: 0 }}
            threshold={0.1}
            rootMargin="-50px"
            textAlign="center"
            tag="p"
          />
        </div>

        {/* 검색 및 필터 */}
        <div className="mb-8 space-y-4 flex flex-col items-center">
          {/* 검색바 */}
          <div className="relative w-full max-w-md">
            <input
              type="text"
              placeholder="프롬프트 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors shadow-lg shadow-blue-500/20"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* 카테고리 필터 */}
          <div className="flex flex-wrap justify-center gap-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selectedCategory === category
                  ? 'bg-blue-900 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:border-blue-900 hover:text-blue-900'
                  }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* 로딩 상태 */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 mx-auto border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-500 mt-4">프롬프트를 불러오는 중...</p>
          </div>
        ) : (
          <>
            {/* 프롬프트 그리드 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPrompts.map((prompt, index) => {
                return (
                  <AnimatedContent
                    key={prompt.promptId}
                    distance={50}
                    direction="vertical"
                    reverse={false}
                    duration={0.6}
                    ease="power3.out"
                    initialOpacity={0}
                    animateOpacity
                    threshold={0.1}
                    delay={index * 0.1}
                  >
                    <div
                      className="bg-gradient-to-br from-blue-100 via-blue-50 to-white border border-blue-200 rounded-lg p-6 shadow-lg shadow-blue-500/10 hover:shadow-xl hover:shadow-blue-500/20 hover:border-blue-300 transition-all cursor-pointer group h-[320px] flex flex-col"
                      onClick={() => navigate(`/prompt/${prompt.promptId}`)}
                    >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-blue-700 bg-blue-100 px-2 py-1 rounded">
                          {promptTypeToCategory[prompt.category] || prompt.category}
                        </span>
                        {prompt.status === 'ACTIVE' && (
                          <>
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span className="text-xs text-green-600 font-medium">Verified</span>
                          </>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-gray-900">{prompt.price}P</div>
                      </div>
                    </div>

                    <h3 className="text-gray-900 text-lg font-semibold mb-2 group-hover:text-blue-900 transition-colors line-clamp-1">
                      {prompt.title || '제목 없음'}
                    </h3>

                    <p className="text-gray-600 text-sm mb-4 line-clamp-2 flex-grow">
                      {prompt.description || '설명 없음'}
                    </p>

                    <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                      <span className="bg-gray-100 px-2 py-1 rounded text-xs font-medium">{formatModelName(prompt.model)}</span>
                      <span className="text-xs text-gray-500">by {prompt.nickname || '익명'}</span>
                    </div>

                    {/* 통계 정보 */}
                    <div className="flex items-center justify-between text-xs text-gray-500 border-t border-blue-200 pt-4">
                      <div className="flex items-center space-x-4">
                        <button 
                          onClick={(e) => handleLikeToggle(prompt, e)}
                          className="flex items-center space-x-1 hover:scale-110 transition-transform"
                        >
                          <span>{prompt.isLiked ? '❤️' : '🤍'}</span>
                          <span>{prompt.likeCount || 0}</span>
                        </button>
                        <button 
                          onClick={(e) => handleBookmarkToggle(prompt, e)}
                          className="flex items-center space-x-1 hover:scale-110 transition-transform"
                        >
                          <span>{prompt.isBookmarked ? '📌' : '📍'}</span>
                          <span>{prompt.bookmarkCount || 0}</span>
                        </button>
                        <span className="flex items-center space-x-1">
                          <span>💬</span>
                          <span>{prompt.commentCount || 0}</span>
                        </span>
                      </div>
                      {prompt.evaluationMetrics?.finalScore && prompt.evaluationMetrics.finalScore >= 8 && (
                        <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-2 py-1 rounded text-xs font-medium">
                          HOT
                        </div>
                      )}
                    </div>

                    {/* 액션 버튼 */}
                    <div className="mt-4 flex space-x-2">
                      {isPurchased(prompt.promptId) ? (
                        <div className="flex-1 bg-green-100 text-green-800 px-3 py-2 rounded text-xs font-medium text-center">
                          ✓ 구매 완료
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={(e) => handleAddToCart(prompt, e)}
                            className={`flex-1 px-3 py-2 rounded text-xs font-medium transition-colors ${isInCart(prompt.promptId)
                              ? 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                              : 'border border-blue-900 text-blue-900 hover:bg-blue-50'
                              }`}
                          >
                            {isInCart(prompt.promptId) ? '장바구니에서 제거' : '장바구니'}
                          </button>
                          <button
                            onClick={(e) => handlePurchase(prompt.promptId, e)}
                            className="flex-1 bg-blue-900 text-white px-3 py-2 rounded text-xs font-medium hover:bg-blue-800 transition-colors text-center"
                          >
                            구매
                          </button>
                        </>
                      )}
                    </div>
                    </div>
                  </AnimatedContent>
                );
              })}
            </div>

            {/* 결과 없음 */}
            {filteredPrompts.length === 0 && (
              <div className="text-center py-12">
                <div className="text-gray-600 text-lg mb-2">검색 결과가 없습니다</div>
                <p className="text-gray-500 text-sm">다른 키워드나 카테고리를 시도해보세요</p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default MarketplacePage;
