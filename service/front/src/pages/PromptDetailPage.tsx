import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useCartStore } from '../store/cartStore';
import { usePurchaseStore } from '../store/purchaseStore';
import { useAuthStore } from '../store/authStore';
import { creditApi, promptApi, interactionApi } from '../services/api';
import { promptTypeToCategory } from '../services/dummyData';
import AnimatedContent from '../components/AnimatedContent';
import { Comment } from '../types';

// 프롬프트 상세 타입 (새로운 API 응답 구조)
interface PromptDetail {
  promptId: string;
  title: string;
  content: string;
  description: string;
  category: string;
  model: string;
  nickname: string;
  userId: string;
  status: string;
  price: number;
  createdAt: string;
  updatedAt: string;
  examplesS3Url?: string;
  // DynamoDB 통계
  likeCount: number;
  bookmarkCount: number;
  commentCount: number;
  isLiked?: boolean;
  isBookmarked?: boolean;
  // 평가 지표
  evaluationMetrics?: {
    finalScore: number;
    relevance: number;
    consistency: number;
    hallucination: number;
    informationDensity: number;
    modelVariance: number;
    tokenUsage: number;
    promptType?: string;
    overallFeedback?: string;
  };
  // 예시 (DynamoDB에서 가져온 형식)
  examples?: Array<{
    index?: number;
    input?: { content?: string; inputType?: string };
    output?: string;
  }>;
}

const PromptDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState<PromptDetail | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [credit, setCredit] = useState<number>(0);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const { addToCart, isInCart } = useCartStore();
  const { isPurchased, addPurchasedPrompt } = usePurchaseStore();
  const { userInfo, fetchUserInfo } = useAuthStore();

  const isAlreadyInCart = prompt ? isInCart(prompt.promptId) : false;
  const isAlreadyPurchased = prompt ? isPurchased(prompt.promptId) : false;
  
  // 내가 등록한 프롬프트인지 확인 (userId가 USER#uuid 형식일 수 있음)
  const isMyPrompt = (() => {
    if (!prompt || !userInfo?.sub) return false;
    const promptUserId = prompt.userId?.startsWith('USER#') 
      ? prompt.userId.substring(5) 
      : prompt.userId;
    return promptUserId === userInfo.sub;
  })();

  const isLoggedIn = () => !!localStorage.getItem('accessToken');

  // 사용자 정보 가져오기
  useEffect(() => {
    if (isLoggedIn()) {
      fetchUserInfo();
    }
  }, [fetchUserInfo]);

  // 프롬프트 상세 정보 가져오기
  useEffect(() => {
    const fetchPromptDetail = async () => {
      if (!id) return;
      setIsLoading(true);
      setError(null);
      try {
        const userId = userInfo?.sub;
        const response = await promptApi.getPromptDetailWithComments(id, userId);
        if (response.data.success) {
          setPrompt(response.data.prompt);
          setComments(response.data.comments || []);
        } else {
          setError('프롬프트를 찾을 수 없습니다.');
        }
      } catch (err) {
        console.error('Failed to fetch prompt detail:', err);
        setError('프롬프트를 불러오는데 실패했습니다.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchPromptDetail();
  }, [id, userInfo?.sub]);

  useEffect(() => {
    if (isLoggedIn()) {
      creditApi.getBalance()
        .then((response) => {
          setCredit(response.data.balance || 0);
        })
        .catch((error) => {
          console.error('Failed to fetch credit balance:', error);
        });
    }
  }, []);

  const handleAddToCart = () => {
    if (!isLoggedIn()) {
      alert('로그인이 필요한 서비스입니다.');
      navigate('/auth/login');
      return;
    }
    
    if (prompt && !isAlreadyInCart && !isAlreadyPurchased && !isMyPrompt) {
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

  const handlePurchase = () => {
    if (!isLoggedIn()) {
      alert('로그인이 필요한 서비스입니다.');
      navigate('/auth/login');
      return;
    }
    
    navigate(`/purchase/${prompt?.promptId}`);
  };

  // 좋아요 토글
  const handleLikeToggle = async () => {
    if (!isLoggedIn() || !prompt) {
      alert('로그인이 필요한 서비스입니다.');
      navigate('/auth/login');
      return;
    }

    try {
      const currentLikeCount = Number(prompt.likeCount) || 0;
      if (prompt.isLiked) {
        await interactionApi.deleteLike(prompt.promptId);
        setPrompt({ ...prompt, isLiked: false, likeCount: Math.max(0, currentLikeCount - 1) });
      } else {
        await interactionApi.addLike(prompt.promptId);
        setPrompt({ ...prompt, isLiked: true, likeCount: currentLikeCount + 1 });
      }
    } catch (error) {
      console.error('Failed to toggle like:', error);
    }
  };

  // 북마크 토글
  const handleBookmarkToggle = async () => {
    if (!isLoggedIn() || !prompt) {
      alert('로그인이 필요한 서비스입니다.');
      navigate('/auth/login');
      return;
    }

    try {
      const currentBookmarkCount = Number(prompt.bookmarkCount) || 0;
      if (prompt.isBookmarked) {
        await interactionApi.deleteBookmark(prompt.promptId);
        setPrompt({ ...prompt, isBookmarked: false, bookmarkCount: Math.max(0, currentBookmarkCount - 1) });
      } else {
        await interactionApi.addBookmark(prompt.promptId);
        setPrompt({ ...prompt, isBookmarked: true, bookmarkCount: currentBookmarkCount + 1 });
      }
    } catch (error) {
      console.error('Failed to toggle bookmark:', error);
    }
  };

  // 댓글 작성
  const handleSubmitComment = async () => {
    if (!isLoggedIn()) {
      alert('로그인이 필요한 서비스입니다.');
      navigate('/auth/login');
      return;
    }

    if (!newComment.trim() || !prompt) return;

    setIsSubmittingComment(true);
    const commentContent = newComment.trim();
    
    try {
      await interactionApi.addComment(prompt.promptId, commentContent);
      
      // 낙관적 업데이트: 즉시 UI에 반영
      const optimisticComment: Comment = {
        commentId: `COMMENT#${new Date().toISOString()}#temp`,
        content: commentContent,
        userId: userInfo?.sub || '',
        nickname: userInfo?.nickname || '나',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      setComments(prev => [optimisticComment, ...prev]);
      setPrompt(prev => prev ? { 
        ...prev, 
        commentCount: (prev.commentCount || 0) + 1 
      } : null);
      setNewComment('');
      
      // 백그라운드에서 실제 데이터로 동기화 (약간의 딜레이 후)
      setTimeout(async () => {
        try {
          const response = await promptApi.getPromptComments(prompt.promptId);
          if (response.data.success) {
            setComments(response.data.comments || []);
          }
        } catch (e) {
          console.error('Failed to refresh comments:', e);
        }
      }, 500);
      
    } catch (error) {
      console.error('Failed to submit comment:', error);
      alert('댓글 작성에 실패했습니다.');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-500 mt-4">프롬프트를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error || !prompt) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">{error || '프롬프트를 찾을 수 없습니다'}</h1>
          <Link to="/marketplace" className="text-blue-600 hover:text-blue-500">
            마켓플레이스로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  const category = prompt.category;

  // 성능 지표 (새로운 구조)
  const metrics = prompt.evaluationMetrics;
  const performanceMetrics = metrics ? {
    tokenUsage: metrics.tokenUsage || 0,
    informationDensity: metrics.informationDensity || 0,
    responseConsistency: metrics.consistency || 0,
    modelPerformanceVariance: metrics.modelVariance || 0,
    hallucinationDetection: metrics.hallucination || 0,
    relevance: metrics.relevance || 0,
    finalScore: metrics.finalScore || 0,
    feedback: metrics.overallFeedback || ''
  } : null;

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="space-y-8"
      >
        {/* 뒤로가기 링크 */}
        <div className="mb-6">
          <Link
            to="/marketplace"
            className="inline-flex items-center text-gray-700 hover:text-blue-900 font-medium text-sm transition-colors border border-gray-300 rounded-lg px-4 py-2 hover:border-blue-900 hover:bg-blue-50"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            마켓플레이스로 돌아가기
          </Link>
        </div>
        {/* 프롬프트 기본 정보 */}
        <AnimatedContent once distance={50} duration={0.6} delay={0}>
        <div className="bg-gradient-to-br from-blue-100 via-blue-50 to-white rounded-lg shadow-lg border border-blue-100 p-4 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-6 gap-4">
            <div className="flex-1">
              <div className="flex items-center flex-wrap gap-2 sm:space-x-3 mb-4">
                <span className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                  {promptTypeToCategory[category] || category}
                </span>
                {(Number(prompt.likeCount) || 0) >= 50 && (
                  <span className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-2 py-1 rounded-full text-xs font-bold">
                    🔥 HOT
                  </span>
                )}
                {prompt.status === 'completed' && (
                  <>
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-green-600 font-medium">Verified</span>
                  </>
                )}
              </div>
              <h1 className="text-xl sm:text-3xl font-extrabold text-gray-900 mb-4">{prompt.title || '제목 없음'}</h1>
              <p className="text-gray-600 text-sm sm:text-lg leading-relaxed mb-6">{prompt.description || '설명 없음'}</p>

              <div className="flex items-center flex-wrap gap-2 text-sm text-gray-500">
                <button 
                  onClick={handleLikeToggle}
                  className="flex items-center space-x-1 hover:text-red-500 transition-colors"
                >
                  <span>{prompt.isLiked ? '❤️' : '🤍'}</span>
                  <span>{Number(prompt.likeCount) || 0}</span>
                </button>
                <button 
                  onClick={handleBookmarkToggle}
                  className="flex items-center space-x-1 hover:text-red-500 transition-colors"
                >
                  <span>{prompt.isBookmarked ? '📌' : '📍'}</span>
                  <span>{Number(prompt.bookmarkCount) || 0}</span>
                </button>
                <div className="flex items-center space-x-1">
                  <span>💬</span>
                  <span>{Number(prompt.commentCount) || 0}</span>
                </div>
                <span className="text-xs">by {prompt.nickname || '익명'}</span>
              </div>

              {/* 모델 정보 */}
              <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">추천 모델:</span>
                  <span className="text-sm font-medium text-gray-700 bg-gray-100 px-2 py-1 rounded">{prompt.model || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">상태:</span>
                  <span className={`text-sm font-medium px-2 py-1 rounded ${prompt.status === 'ACTIVE' ? 'text-green-700 bg-green-100' : 'text-gray-700 bg-gray-100'}`}>
                    {prompt.status === 'ACTIVE' ? '검증 완료' : prompt.status === 'processing' ? '처리 중' : prompt.status}
                  </span>
                </div>
              </div>
            </div>

            <div className="text-left sm:text-right sm:ml-8">
              <div className="text-xl sm:text-3xl font-bold text-gray-900 mb-4">{prompt.price}P</div>

              {isMyPrompt ? (
                <div className="space-y-2">
                  <div className="bg-blue-100 text-blue-800 px-4 py-2 rounded-lg text-sm font-medium">
                    ✏️ 내가 등록한 프롬프트입니다
                  </div>
                  <Link
                    to="/dashboard/selling"
                    className="block bg-blue-900 text-white font-semibold px-8 py-3 rounded-lg hover:bg-blue-800 transition-colors text-center"
                  >
                    판매 관리
                  </Link>
                </div>
              ) : isAlreadyPurchased ? (
                <div className="space-y-2">
                  <div className="bg-green-100 text-green-800 px-4 py-2 rounded-lg text-sm font-medium">
                    ✓ 구매 완료
                  </div>
                  <Link
                    to="/dashboard/purchased"
                    className="block bg-blue-900 text-white font-semibold px-8 py-3 rounded-lg hover:bg-blue-800 transition-colors text-center"
                  >
                    내 프롬프트 보기
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex space-x-2">
                    <button
                      onClick={handleAddToCart}
                      disabled={isAlreadyInCart}
                      className={`flex-1 font-semibold px-3 py-3 rounded-lg transition-colors text-sm whitespace-nowrap ${isAlreadyInCart
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'border-2 border-blue-900 text-blue-900 hover:bg-blue-50'
                        }`}
                    >
                      {isAlreadyInCart ? '장바구니에 있음' : '장바구니에 추가'}
                    </button>
                    <button
                      onClick={handlePurchase}
                      className="flex-1 bg-blue-900 text-white font-semibold px-3 py-3 rounded-lg hover:bg-blue-800 transition-colors text-center text-sm whitespace-nowrap"
                    >
                      구매
                    </button>
                  </div>
                  {isAlreadyInCart && (
                    <Link
                      to="/cart"
                      className="block text-center text-blue-900 text-sm hover:underline"
                    >
                      장바구니 보기
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        </AnimatedContent>

        {/* 성능 지표 */}
        {performanceMetrics && performanceMetrics.finalScore > 0 && (
        <AnimatedContent once distance={50} duration={0.6} delay={0.2}>
        <div className="bg-gradient-to-br from-blue-100 via-blue-50 to-white rounded-lg shadow-lg border border-blue-100 p-4 sm:p-8">
          <h2 className="text-lg sm:text-2xl font-bold text-gray-900 mb-6 pb-4 border-b border-gray-200">성능 지표</h2>
          
          {/* 최종 점수 + 토큰 사용량 */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6" style={{ height: 'auto', minHeight: '116px' }}>
            {/* 토큰 사용량 - 카운터 스타일 */}
            <div className="bg-gradient-to-br from-lime-50 to-emerald-50 rounded-lg px-6 py-4 border border-lime-200 flex flex-col items-center justify-center sm:min-w-[180px]">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-gray-900">{Math.round(performanceMetrics.tokenUsage).toLocaleString()}</span>
                <span className="text-sm text-gray-500">tokens</span>
              </div>
              <h3 className="text-sm font-medium text-gray-600 mt-1">토큰 사용량</h3>
            </div>

            {/* 최종 점수 */}
            <div className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg px-6 py-4 text-white flex flex-col sm:flex-row items-center justify-between gap-2">
              <div className="text-center sm:text-left">
                <h3 className="text-lg font-medium opacity-90">AI 평가 최종 점수</h3>
                <p className="text-sm opacity-75 mt-1">
                  {prompt.category === 'type_a' ? '5가지' : prompt.category === 'type_b_text' ? '3가지' : '3가지'} 지표를 종합한 점수입니다
                </p>
              </div>
              <div className="text-5xl font-bold">{performanceMetrics.finalScore.toFixed(1)}</div>
            </div>
          </div>

          {/* 점수 지표들 - 타입별로 다르게 표시 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* 출력 대비 정보 밀도 - type_a, type_b_text만 */}
            {(prompt.category === 'type_a' || prompt.category === 'type_b_text') && (
            <div className="bg-white rounded-lg p-4 border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[17px] font-semibold text-gray-700">출력 대비 정보 밀도</h3>
                <div>
                  <span className="text-lg font-bold text-gray-900">{performanceMetrics.informationDensity.toFixed(1)}</span>
                  <span className="text-sm text-gray-400">/100</span>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-600 h-2 rounded-full" style={{ width: `${Math.min(performanceMetrics.informationDensity, 100)}%` }}></div>
              </div>
              <p className="text-xs text-gray-500 mt-2">응답의 정보 밀집도</p>
            </div>
            )}

            {/* 응답의 일관성 - type_a, type_b_image만 */}
            {(prompt.category === 'type_a' || prompt.category === 'type_b_image') && (
            <div className="bg-white rounded-lg p-4 border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[17px] font-semibold text-gray-700">응답의 일관성</h3>
                <div>
                  <span className="text-lg font-bold text-gray-900">{performanceMetrics.responseConsistency.toFixed(1)}</span>
                  <span className="text-sm text-gray-400">/100</span>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-purple-600 h-2 rounded-full" style={{ width: `${Math.min(performanceMetrics.responseConsistency, 100)}%` }}></div>
              </div>
              <p className="text-xs text-gray-500 mt-2">반복 실행 시 일관성</p>
            </div>
            )}

            {/* 버전별 편차 - 모든 타입 */}
            <div className="bg-white rounded-lg p-4 border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[17px] font-semibold text-gray-700">버전별 편차</h3>
                <div>
                  <span className="text-lg font-bold text-gray-900">{performanceMetrics.modelPerformanceVariance.toFixed(1)}</span>
                  <span className="text-sm text-gray-400">/100</span>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-orange-500 h-2 rounded-full" style={{ width: `${Math.min(performanceMetrics.modelPerformanceVariance, 100)}%` }}></div>
              </div>
              <p className="text-xs text-gray-500 mt-2">다양한 모델에서의 성능</p>
            </div>

            {/* 환각 탐지 - type_a만 */}
            {prompt.category === 'type_a' && (
            <div className="bg-white rounded-lg p-4 border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[17px] font-semibold text-gray-700">환각 탐지</h3>
                <div>
                  <span className="text-lg font-bold text-gray-900">{performanceMetrics.hallucinationDetection.toFixed(1)}</span>
                  <span className="text-sm text-gray-400">/100</span>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className={`h-2 rounded-full ${performanceMetrics.hallucinationDetection >= 70 ? 'bg-green-600' : performanceMetrics.hallucinationDetection >= 50 ? 'bg-yellow-500' : 'bg-red-600'}`} style={{ width: `${Math.min(performanceMetrics.hallucinationDetection, 100)}%` }}></div>
              </div>
              <p className="text-xs text-gray-500 mt-2">높을수록 환각 적음</p>
            </div>
            )}

            {/* 적합도 - 모든 타입 */}
            <div className="bg-white rounded-lg p-4 border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[17px] font-semibold text-gray-700">적합도</h3>
                <div>
                  <span className="text-lg font-bold text-gray-900">{performanceMetrics.relevance.toFixed(1)}</span>
                  <span className="text-sm text-gray-400">/100</span>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-teal-600 h-2 rounded-full" style={{ width: `${Math.min(performanceMetrics.relevance, 100)}%` }}></div>
              </div>
              <p className="text-xs text-gray-500 mt-2">입력 대비 응답 관련성</p>
            </div>
          </div>

          {/* AI 피드백 - 프롬프트 등록자에게만 표시 */}
          {performanceMetrics.feedback && isMyPrompt && (
            <div className="mt-6 bg-white rounded-lg p-6 border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <span className="mr-2">🤖</span> AI 평가 피드백
                <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">등록자 전용</span>
              </h3>
              <div className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                {performanceMetrics.feedback}
              </div>
            </div>
          )}
        </div>
        </AnimatedContent>
        )}

        {/* 프롬프트 미리보기 */}
        <AnimatedContent once distance={50} duration={0.6} delay={0.3}>
        <div className="bg-gradient-to-br from-blue-100 via-blue-50 to-white rounded-lg shadow-lg border border-blue-100 p-4 sm:p-8">
          <h2 className="text-lg sm:text-2xl font-bold text-gray-900 mb-6 pb-4 border-b border-gray-200">프롬프트 미리보기</h2>
          <div className="bg-white rounded-lg p-4 sm:p-6 border border-gray-100">
            <pre className="text-gray-700 whitespace-pre-wrap font-mono text-xs sm:text-sm">
              {prompt.content ? prompt.content.substring(0, 200) + '...' : '프롬프트 내용이 없습니다.'}
            </pre>
          </div>
          <p className="text-sm text-gray-500 mt-4">
            💡 전체 프롬프트는 구매 후 확인할 수 있습니다.
          </p>
        </div>
        </AnimatedContent>

        {/* 예시 입력/출력 */}
        {prompt.examples && prompt.examples.length > 0 && (
        <AnimatedContent once distance={50} duration={0.6} delay={0.4}>
        <div className="bg-gradient-to-br from-blue-100 via-blue-50 to-white rounded-lg shadow-lg border border-blue-100 p-4 sm:p-8">
          <h2 className="text-lg sm:text-2xl font-bold text-gray-900 mb-6 pb-4 border-b border-gray-200">예시 입력/출력</h2>
          <div className="space-y-6 sm:space-y-8">
            {prompt.examples.map((example, index) => {
              // input.content에서 변수 값 추출
              const inputContent = example.input?.content;
              let inputVariables: Record<string, string> = {};
              if (inputContent) {
                try {
                  inputVariables = JSON.parse(inputContent);
                } catch {
                  // JSON 파싱 실패
                }
              }

              // 이미지 타입인지 확인
              const isImageType = prompt.category === 'type_b_image';
              
              // S3 이미지 URL 생성 (output이 null이거나 없을 때 S3 URL에서 가져옴)
              const getImageUrl = () => {
                // output이 이미 URL인 경우 그대로 사용
                if (example.output?.startsWith('http') || example.output?.startsWith('/')) {
                  return example.output;
                }
                // S3 URL에서 이미지 URL 생성
                if (prompt.promptId) {
                  return `https://fromprom-s3.s3.ap-northeast-2.amazonaws.com/prompts/${prompt.promptId}/images/output_${index}.png`;
                }
                return null;
              };
              
              const imageUrl = isImageType ? getImageUrl() : null;

              return (
              <div key={index} className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
                <h3 className="text-sm sm:text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-100">예시 {index + 1}</h3>
                <div className="flex flex-col sm:flex-row gap-4 items-start">
                  <div className="w-full sm:w-1/2 flex flex-col">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">입력 변수</h4>
                    <div className="bg-blue-50 rounded-lg p-3 sm:p-4 border border-blue-100">
                      {Object.keys(inputVariables).length > 0 ? (
                        <div className="space-y-2">
                          {Object.entries(inputVariables).map(([key, value]) => (
                            <div key={key} className="flex items-center gap-2">
                              <span className="text-gray-500 text-sm">{key}:</span>
                              <span className="font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded text-sm">
                                {value}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">입력 변수 없음</span>
                      )}
                    </div>
                  </div>
                  <div className="w-full sm:w-1/2 flex flex-col">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">출력</h4>
                    <div className="bg-green-50 rounded-lg p-3 sm:p-4 border border-green-100">
                      {isImageType && imageUrl ? (
                        <img 
                          src={imageUrl} 
                          alt={`예시 출력 ${index + 1}`}
                          className="max-w-[450px] h-auto rounded-lg"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            target.parentElement!.innerHTML = '<span class="text-gray-500 text-sm">이미지를 불러올 수 없습니다.</span>';
                          }}
                        />
                      ) : (
                        <pre className="text-gray-700 whitespace-pre-wrap text-xs sm:text-sm break-words">
                          {example.output || '출력 없음'}
                        </pre>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        </div>
        </AnimatedContent>
        )}

        {/* 댓글 섹션 */}
        <AnimatedContent once distance={50} duration={0.6} delay={0.5}>
        <div className="bg-gradient-to-br from-blue-100 via-blue-50 to-white rounded-lg shadow-lg border border-blue-100 p-4 sm:p-8">
          <h2 className="text-lg sm:text-2xl font-bold text-gray-900 mb-6 pb-4 border-b border-gray-200">
            댓글 ({comments.length})
          </h2>
          
          {/* 댓글 작성 */}
          {isLoggedIn() && (
            <div className="mb-6">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="댓글을 작성해주세요..."
                className="w-full p-4 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows={3}
              />
              <div className="flex justify-end mt-2">
                <button
                  onClick={handleSubmitComment}
                  disabled={isSubmittingComment || !newComment.trim()}
                  className="px-4 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSubmittingComment ? '작성 중...' : '댓글 작성'}
                </button>
              </div>
            </div>
          )}

          {/* 댓글 목록 */}
          <div className="space-y-4">
            {comments.length === 0 ? (
              <p className="text-gray-500 text-center py-8">아직 댓글이 없습니다. 첫 댓글을 작성해보세요!</p>
            ) : (
              comments.map((comment) => (
                <div key={comment.commentId} className="bg-white rounded-lg p-4 border border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900">{comment.nickname || '익명'}</span>
                    <span className="text-xs text-gray-500">
                      {new Date(comment.createdAt).toLocaleDateString('ko-KR')}
                    </span>
                  </div>
                  <p className="text-gray-700">{comment.content}</p>
                </div>
              ))
            )}
          </div>
        </div>
        </AnimatedContent>
      </motion.div>

      {/* 결제 모달 */}
      {showPaymentModal && prompt && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">결제하기</h3>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* 상품 정보 */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h4 className="font-semibold text-gray-900 mb-2">{prompt.title}</h4>
              <p className="text-sm text-gray-600 mb-3">{prompt.description}</p>
              <div className="flex justify-between items-center">
                <span className="text-xl font-bold text-gray-900">{prompt.price}P</span>
              </div>
            </div>

            {/* 결제 버튼 */}
            <div className="flex space-x-3">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={async () => {
                  if (!prompt) return;
                  
                  if (credit < prompt.price) {
                    alert('크레딧이 부족합니다. 충전 후 다시 시도해주세요.');
                    setShowPaymentModal(false);
                    navigate('/credit');
                    return;
                  }
                  
                  setIsPurchasing(true);
                  try {
                    // 판매자 ID 추출 및 유효성 검사
                    const sellerSub = (prompt.userId || '').replace('USER#', '');
                    if (!sellerSub || sellerSub.trim() === '') {
                      alert('판매자 정보를 확인할 수 없습니다. 잠시 후 다시 시도해주세요.');
                      setIsPurchasing(false);
                      return;
                    }
                    
                    await creditApi.purchasePrompt({
                      sellerSub: sellerSub,
                      promptPrice: prompt.price,
                      promptTitle: prompt.title,
                      promptId: prompt.promptId,
                    });
                    
                    addPurchasedPrompt({
                      id: prompt.promptId,
                      title: prompt.title,
                      price: prompt.price,
                      category: category,
                      sellerName: prompt.nickname || '판매자',
                      description: prompt.description,
                      rating: prompt.evaluationMetrics?.finalScore || 4.5,
                      content: prompt.content
                    });
                    
                    setShowPaymentModal(false);
                    alert('결제가 완료되었습니다! 프롬프트를 확인해보세요.');
                    navigate('/dashboard/purchased');
                  } catch (error: any) {
                    const message = error.response?.data?.message || '결제 처리 중 오류가 발생했습니다.';
                    alert(message);
                  } finally {
                    setIsPurchasing(false);
                  }
                }}
                disabled={isPurchasing}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPurchasing ? '처리 중...' : `${prompt.price}P 결제하기`}
              </button>
            </div>
          </motion.div>
        </div>
      )}
      </div>
    </div>
  );
};

export default PromptDetailPage;
