import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { categories, promptTypeToCategory } from '../services/dummyData';
import { promptApi, interactionApi } from '../services/api';
import { useCartStore } from '../store/cartStore';
import { usePurchaseStore } from '../store/purchaseStore';
import { useAuthStore } from '../store/authStore';
import SplitText from '../components/SplitText';
import AnimatedContent from '../components/AnimatedContent';
import TiltCard from '../components/TiltCard';

// 페이지 크기
const PAGE_SIZE = 20;

// 프롬프트 타입 정의
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
  likeCount: number;
  bookmarkCount: number;
  commentCount: number;
  isLiked?: boolean;
  isBookmarked?: boolean;
  score?: number;
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

// 내 프롬프트인지 확인하는 함수
const isMyPrompt = (promptUserId: string | undefined, userSub: string | undefined): boolean => {
  if (!promptUserId || !userSub) return false;
  const cleanPromptUserId = promptUserId.replace(/^USER#/, '');
  return cleanPromptUserId === userSub;
};

// 모델명 정제 함수
const formatModelName = (model: string): string => {
  if (!model) return 'AI Model';
  
  const modelMap: Record<string, string> = {
    'anthropic.claude-3-haiku-20240307-v1:0': 'claude 3 haiku',
    'anthropic.claude-3-5-sonnet-20240620-v1:0': 'claude 3.5 sonnet v1',
    'anthropic.claude-sonnet-4-5-20250514-v1:0': 'claude sonnet 4.5',
    'amazon.nova-canvas-v1:0': 'Nova Canvas 1.0',
    'amazon.titan-image-generator-v2:0': 'Titan Image Generator G1 v2',
    'gpt-oss-120b': 'gpt-oss-120b',
    'gpt-oss-20b': 'gpt-oss-20b',
    'gemma-3-27b-instruct': 'Gemma 3 27B Instruct',
    'gemma-3-12b-it': 'Gemma 3 12B IT',
    'gemma-3-4b-instruct': 'Gemma 3 4B Instruct',
  };
  
  return modelMap[model] || model;
};

// 카드 색상 설정 함수
const getCardColors = (category: string, finalScore?: number) => {
  // 90점 이상이면 황금색 카드
  if (finalScore && finalScore >= 90) {
    return {
      gradient: 'from-amber-100 via-yellow-50 to-amber-50',
      border: 'border-amber-300',
      hoverBorder: 'hover:border-amber-500',
      shadow: 'shadow-amber-500/20 hover:shadow-amber-500/40',
      tag: 'text-amber-800 bg-amber-100 border border-amber-400',
      borderBottom: 'border-amber-200',
      barGradient: 'from-amber-300 to-amber-500',
      dotColor: 'bg-amber-500',
      isGold: true,
    };
  }

  const type = promptTypeToCategory[category] || category;
  if (type === '사실 근거 기반' || category === 'type_a') {
    return {
      gradient: 'from-rose-50 via-rose-25 to-white',
      border: 'border-rose-100',
      hoverBorder: 'hover:border-rose-500',
      shadow: 'shadow-rose-500/5 hover:shadow-rose-500/30',
      tag: 'text-gray-700 bg-white border border-rose-400',
      borderBottom: 'border-rose-100',
      barGradient: 'from-rose-200 to-rose-500',
      dotColor: 'bg-rose-500',
      isGold: false,
    };
  } else if (type === '글 창작 및 생성' || category === 'type_b_text') {
    return {
      gradient: 'from-emerald-50 via-emerald-25 to-white',
      border: 'border-emerald-100',
      hoverBorder: 'hover:border-emerald-500',
      shadow: 'shadow-emerald-500/5 hover:shadow-emerald-500/30',
      tag: 'text-gray-700 bg-white border border-emerald-400',
      borderBottom: 'border-emerald-100',
      barGradient: 'from-emerald-200 to-emerald-500',
      dotColor: 'bg-emerald-500',
      isGold: false,
    };
  } else {
    return {
      gradient: 'from-blue-50 via-blue-25 to-white',
      border: 'border-blue-100',
      hoverBorder: 'hover:border-blue-500',
      shadow: 'shadow-blue-500/5 hover:shadow-blue-500/30',
      tag: 'text-gray-700 bg-white border border-blue-400',
      borderBottom: 'border-blue-100',
      barGradient: 'from-blue-200 to-blue-500',
      dotColor: 'bg-blue-500',
      isGold: false,
    };
  }
};

const MarketplacePage = () => {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showScrollTop, setShowScrollTop] = useState(false);
  const { addToCart, removeFromCart, isInCart } = useCartStore();
  const { isPurchased } = usePurchaseStore();
  const { user, userInfo } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const isLoggedIn = () => !!localStorage.getItem('accessToken');

  // 스크롤 위치 감지
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // React Query - 무한 스크롤 쿼리
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
  } = useInfiniteQuery({
    queryKey: ['prompts', user?.id],
    queryFn: async ({ pageParam }) => {
      const response = await promptApi.getAllPrompts(PAGE_SIZE, user?.id, pageParam);
      return response.data;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.hasNext ? lastPage.nextCursor : undefined,
    staleTime: 1000 * 60 * 2, // 2분
  });

  // 모든 페이지의 프롬프트를 하나의 배열로 합침
  const allPrompts: PromptItem[] = data?.pages.flatMap(page => page.prompts || []) || [];

  // 좋아요 mutation (낙관적 업데이트)
  const likeMutation = useMutation({
    mutationFn: async ({ promptId, isLiked }: { promptId: string; isLiked: boolean }) => {
      if (isLiked) {
        await interactionApi.deleteLike(promptId);
      } else {
        await interactionApi.addLike(promptId);
      }
      return { promptId, isLiked };
    },
    onMutate: async ({ promptId, isLiked }) => {
      // 진행 중인 쿼리 취소
      await queryClient.cancelQueries({ queryKey: ['prompts'] });
      
      // 이전 데이터 스냅샷
      const previousData = queryClient.getQueryData(['prompts', user?.id]);
      
      // 낙관적 업데이트
      queryClient.setQueryData(['prompts', user?.id], (old: typeof data) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map(page => ({
            ...page,
            prompts: page.prompts?.map((p: PromptItem) =>
              p.promptId === promptId
                ? {
                    ...p,
                    isLiked: !isLiked,
                    likeCount: isLiked ? Math.max(0, (p.likeCount || 0) - 1) : (p.likeCount || 0) + 1
                  }
                : p
            )
          }))
        };
      });
      
      return { previousData };
    },
    onError: (_err, _variables, context) => {
      // 에러 시 롤백
      if (context?.previousData) {
        queryClient.setQueryData(['prompts', user?.id], context.previousData);
      }
    },
  });

  // 북마크 mutation (낙관적 업데이트)
  const bookmarkMutation = useMutation({
    mutationFn: async ({ promptId, isBookmarked }: { promptId: string; isBookmarked: boolean }) => {
      if (isBookmarked) {
        await interactionApi.deleteBookmark(promptId);
      } else {
        await interactionApi.addBookmark(promptId);
      }
      return { promptId, isBookmarked };
    },
    onMutate: async ({ promptId, isBookmarked }) => {
      await queryClient.cancelQueries({ queryKey: ['prompts'] });
      const previousData = queryClient.getQueryData(['prompts', user?.id]);
      
      queryClient.setQueryData(['prompts', user?.id], (old: typeof data) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map(page => ({
            ...page,
            prompts: page.prompts?.map((p: PromptItem) =>
              p.promptId === promptId
                ? {
                    ...p,
                    isBookmarked: !isBookmarked,
                    bookmarkCount: isBookmarked ? Math.max(0, (p.bookmarkCount || 0) - 1) : (p.bookmarkCount || 0) + 1
                  }
                : p
            )
          }))
        };
      });
      
      return { previousData };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['prompts', user?.id], context.previousData);
      }
    },
  });

  // 무한 스크롤 - IntersectionObserver
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

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

  const handleLikeToggle = (prompt: PromptItem, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!isLoggedIn()) {
      alert('로그인이 필요한 서비스입니다.');
      navigate('/auth/login', { state: { from: location.pathname } });
      return;
    }

    likeMutation.mutate({ promptId: prompt.promptId, isLiked: !!prompt.isLiked });
  };

  const handleBookmarkToggle = (prompt: PromptItem, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!isLoggedIn()) {
      alert('로그인이 필요한 서비스입니다.');
      navigate('/auth/login', { state: { from: location.pathname } });
      return;
    }

    bookmarkMutation.mutate({ promptId: prompt.promptId, isBookmarked: !!prompt.isBookmarked });
  };

  // 카테고리 및 검색 필터링
  const filteredPrompts = allPrompts.filter(prompt => {
    const promptCategory = promptTypeToCategory[prompt.category] || prompt.category;
    const matchesCategory = selectedCategory === 'All' || promptCategory === selectedCategory;
    const title = prompt.title || '';
    const description = prompt.description || '';
    const matchesSearch = title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // 90점 이상 프롬프트를 상단에 배치
  const sortedPrompts = [...filteredPrompts].sort((a, b) => {
    const aScore = a.evaluationMetrics?.finalScore || 0;
    const bScore = b.evaluationMetrics?.finalScore || 0;
    const aIsGold = aScore >= 90;
    const bIsGold = bScore >= 90;
    
    // 둘 다 골드이거나 둘 다 골드가 아니면 점수 순으로
    if (aIsGold === bIsGold) {
      return bScore - aScore;
    }
    // 골드가 먼저
    return aIsGold ? -1 : 1;
  });

  // TOP 3 프롬프트 ID 추출 (90점 이상 중 상위 3개)
  const top3PromptIds = sortedPrompts
    .filter(p => (p.evaluationMetrics?.finalScore || 0) >= 90)
    .slice(0, 3)
    .map(p => p.promptId);

  return (
    <div className="min-h-screen bg-white">
      <main className="w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* 페이지 헤더 */}
        <div className="mb-6 sm:mb-8 text-center flex flex-col items-center">
          <SplitText
            text="프롬프트 마켓플레이스"
            className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2"
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
            className="text-gray-600 text-sm sm:text-base"
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
        <div className="mb-6 sm:mb-8 space-y-3 sm:space-y-4 flex flex-col items-center">
          <div className="relative w-full max-w-md">
            <input
              type="text"
              placeholder="프롬프트 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-lg px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base text-gray-900 placeholder-gray-500 focus:outline-none focus:border-blue-900 focus:ring-1 focus:ring-blue-900 transition-colors shadow-lg shadow-blue-500/20"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* 모바일: 2x2 배치 / 데스크탑: 한줄 */}
          <div className="flex flex-col sm:flex-row sm:flex-wrap justify-center gap-1.5 sm:gap-2">
            {/* 모바일에서 2x2 배치 */}
            <div className="grid grid-cols-2 gap-1.5 sm:hidden">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    selectedCategory === category
                      ? 'bg-blue-900 text-white'
                      : 'bg-white text-gray-700 border border-gray-300'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
            {/* 데스크탑에서는 한 줄로 */}
            <div className="hidden sm:flex sm:flex-wrap justify-center gap-2">
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
        </div>

        {/* 로딩 상태 */}
        {isLoading ? (
          <div className="text-center py-8 sm:py-12">
            <div className="w-10 h-10 sm:w-12 sm:h-12 mx-auto border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-500 mt-3 sm:mt-4 text-sm sm:text-base">프롬프트를 불러오는 중...</p>
          </div>
        ) : isError ? (
          <div className="text-center py-8 sm:py-12">
            <p className="text-red-500">프롬프트를 불러오는데 실패했습니다.</p>
          </div>
        ) : (
          <>
            {/* 프롬프트 그리드 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {sortedPrompts.map((prompt, index) => {
                const colors = getCardColors(prompt.category, prompt.evaluationMetrics?.finalScore);
                const isTop3 = top3PromptIds.includes(prompt.promptId);
                const top3Rank = isTop3 ? top3PromptIds.indexOf(prompt.promptId) + 1 : 0;
                
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
                    <TiltCard
                      className={`relative bg-gradient-to-br ${colors.gradient} border-2 ${colors.border} ${colors.hoverBorder} rounded-xl p-4 sm:p-5 shadow-lg ${colors.shadow} cursor-pointer group flex flex-col transition-colors duration-300 ${colors.isGold ? 'ring-2 ring-amber-400/50' : ''}`}
                      onClick={() => navigate(`/prompt/${prompt.promptId}`)}
                      rotateAmplitude={8}
                      scaleOnHover={1.03}
                    >
                      {/* TOP 3 뱃지 */}
                      {isTop3 && (
                        <div className="absolute -top-2 -right-2 bg-gradient-to-r from-amber-400 to-yellow-500 text-white px-2 py-1 rounded-full text-xs font-bold shadow-lg flex items-center gap-1">
                          🏆 TOP {top3Rank}
                        </div>
                      )}
                      {/* 골드 뱃지 (TOP 3가 아닌 90점 이상) */}
                      {colors.isGold && !isTop3 && (
                        <div className="absolute -top-2 -right-2 bg-gradient-to-r from-amber-400 to-yellow-500 text-white px-2 py-1 rounded-full text-xs font-bold shadow-lg">
                          ⭐ PREMIUM
                        </div>
                      )}
                      {/* 상단: 카테고리 + 가격 */}
                      <div className="flex items-center justify-between mb-2 sm:mb-3">
                        <div className="flex items-center space-x-1.5 sm:space-x-2">
                          <span className={`text-xs ${colors.tag} px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full font-medium`}>
                            {promptTypeToCategory[prompt.category] || prompt.category}
                          </span>
                          {prompt.status === 'ACTIVE' && (
                            <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                              <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                              <span className="hidden sm:inline">Verified</span>
                            </span>
                          )}
                        </div>
                        <div className="text-lg sm:text-xl font-bold text-gray-900">{prompt.price}P</div>
                      </div>

                      {/* 제목 */}
                      <h3 className="text-gray-900 text-base sm:text-lg font-bold mb-1.5 sm:mb-2 group-hover:text-blue-900 transition-colors line-clamp-1">
                        {prompt.title || '제목 없음'}
                      </h3>

                      {/* 설명 */}
                      <p className="text-gray-600 text-xs sm:text-sm mb-3 sm:mb-4 line-clamp-2">
                        {prompt.description || '설명 없음'}
                      </p>

                      {/* 성능 점수 섹션 */}
                      {prompt.evaluationMetrics?.finalScore && (
                        <div className="bg-white/60 rounded-lg p-3 sm:p-4 mb-3 sm:mb-4">
                          <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                            <span className="text-xs sm:text-sm font-medium text-gray-700">AI 성능 점수</span>
                            <span className="text-xl sm:text-2xl font-black text-gray-800">
                              {Math.round(prompt.evaluationMetrics.finalScore)}
                              <span className="text-xs sm:text-sm font-normal text-gray-400">/100</span>
                            </span>
                          </div>
                          <div className="relative w-full h-2.5 sm:h-3 bg-gray-100 rounded-full">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 bg-gradient-to-r ${colors.barGradient}`}
                              style={{ width: `${prompt.evaluationMetrics.finalScore}%` }}
                            />
                            <div 
                              className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 sm:w-4 sm:h-4 ${colors.dotColor} rounded-full`}
                              style={{ 
                                left: `calc(${prompt.evaluationMetrics.finalScore}% - 6px)`,
                                boxShadow: `0 0 8px 3px rgba(255, 255, 255, 0.9), 0 0 12px 5px rgba(255, 255, 255, 0.5)`
                              }}
                            />
                          </div>
                        </div>
                      )}

                      {/* 모델 + 작성자 */}
                      <div className="flex items-center justify-between text-xs sm:text-sm text-gray-500 mb-2 sm:mb-3">
                        <span className="bg-gray-50 border border-gray-200 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded text-xs font-medium text-gray-700 truncate max-w-[120px] sm:max-w-none">
                          {formatModelName(prompt.model)}
                        </span>
                        <span className="text-xs truncate ml-2">by {prompt.nickname || '익명'}</span>
                      </div>

                      {/* 통계 정보 */}
                      <div className={`flex items-center justify-between text-xs text-gray-500 border-t ${colors.borderBottom} pt-2 sm:pt-3`}>
                        <div className="flex items-center space-x-3 sm:space-x-4">
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
                        {(prompt.likeCount || 0) >= 3 && (
                          <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-xs font-bold">
                            🔥 HOT
                          </div>
                        )}
                      </div>

                      {/* 액션 버튼 */}
                      <div className="mt-4 flex space-x-2">
                        {isMyPrompt(prompt.userId, userInfo?.sub) ? (
                          <div className="flex-1 bg-blue-50 text-blue-700 px-3 py-2 rounded text-xs font-medium text-center">
                            📝 내가 등록한 프롬프트
                          </div>
                        ) : isPurchased(prompt.promptId) ? (
                          <div className="flex-1 bg-green-100 text-green-800 px-3 py-2 rounded text-xs font-medium text-center">
                            ✓ 구매 완료
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={(e) => handleAddToCart(prompt, e)}
                              className={`flex-1 px-3 py-2 rounded text-xs font-medium transition-colors ${
                                isInCart(prompt.promptId)
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
                    </TiltCard>
                  </AnimatedContent>
                );
              })}
            </div>

            {/* 무한 스크롤 트리거 */}
            {sortedPrompts.length > 0 && (
              <div ref={loadMoreRef} className="flex justify-center items-center py-8">
                {isFetchingNextPage && (
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-gray-500 mt-2 text-sm">더 불러오는 중...</p>
                  </div>
                )}
                {!hasNextPage && !isFetchingNextPage && allPrompts.length > PAGE_SIZE && (
                  <p className="text-gray-400 text-sm">모든 프롬프트를 불러왔습니다</p>
                )}
              </div>
            )}

            {/* 결과 없음 */}
            {sortedPrompts.length === 0 && (
              <div className="text-center py-8 sm:py-12">
                <div className="text-gray-600 text-base sm:text-lg mb-2">검색 결과가 없습니다</div>
                <p className="text-gray-500 text-xs sm:text-sm">다른 키워드나 카테고리를 시도해보세요</p>
              </div>
            )}
          </>
        )}
      </main>

      {/* 스크롤 탑 버튼 */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 w-14 h-14 bg-blue-900 hover:bg-blue-800 text-white rounded-full shadow-lg hover:shadow-xl hover:scale-110 hover:-translate-y-1 transition-all duration-300 flex items-center justify-center z-50"
          aria-label="맨 위로 이동"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
          </svg>
        </button>
      )}
    </div>
  );
};

export default MarketplacePage;
