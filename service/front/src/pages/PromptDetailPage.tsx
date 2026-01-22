import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { promptTypeToCategory } from '../services/dummyData';
import { useCartStore } from '../store/cartStore';
import { usePurchaseStore } from '../store/purchaseStore';
import { creditApi, promptApi } from '../services/api';
import AnimatedContent from '../components/AnimatedContent';

// 프롬프트 상세 타입
interface PromptDetail {
  promptId: string;
  title: string;
  content: string;
  description: string;
  price: number;
  promptType: string;
  model: string;
  status: string;
  createUser: string;
  likeCount: number;
  commentCount: number;
  bookmarkCount: number;
  isPublic: boolean;
  created_at: string;
  updated_at: string;
  examples?: Array<{
    index: number;
    input: { content: string; input_type: string };
    output: string;
  }>;
  evaluationMetrics?: {
    consistency?: string;
    hallucination?: string;
    information_density?: string;
    model_variance?: string;
    relevance?: string;
    token_usage?: string;
    final_score?: string;
    feedback?: {
      final_score?: string;
      overall_feedback?: string;
      prompt_type?: string;
      individual_scores?: {
        consistency?: string;
        hallucination?: string;
        information_density?: string;
        model_variance?: string;
        relevance?: string;
        token_usage?: string;
      };
    };
  };
}

const PromptDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState<PromptDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [credit, setCredit] = useState<number>(0);
  const { addToCart, isInCart } = useCartStore();
  const { isPurchased, addPurchasedPrompt } = usePurchaseStore();

  const isAlreadyInCart = prompt ? isInCart(prompt.promptId) : false;
  const isAlreadyPurchased = prompt ? isPurchased(prompt.promptId) : false;

  const isLoggedIn = () => !!localStorage.getItem('accessToken');

  // 프롬프트 상세 정보 가져오기
  useEffect(() => {
    const fetchPromptDetail = async () => {
      if (!id) return;
      setIsLoading(true);
      setError(null);
      try {
        const response = await promptApi.getPromptDetail(id);
        if (response.data.success) {
          setPrompt(response.data.prompt);
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
  }, [id]);

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
    
    if (prompt && !isAlreadyInCart && !isAlreadyPurchased) {
      const category = promptTypeToCategory[prompt.promptType] || prompt.promptType;
      addToCart({
        id: prompt.promptId,
        title: prompt.title,
        price: prompt.price,
        category: category,
        sellerName: '판매자',
        sellerSub: prompt.createUser?.replace('USER#', '') || '',
        description: prompt.description,
        rating: 4.5
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

  const category = promptTypeToCategory[prompt.promptType] || prompt.promptType;

  // 성능 지표 파싱 (evaluationMetrics 중첩 구조 처리)
  const metrics = prompt.evaluationMetrics || {};
  const feedbackData = metrics.feedback || {};
  const individualScores = feedbackData.individual_scores || {};
  
  const performanceMetrics = {
    tokenUsage: parseFloat(individualScores.token_usage || metrics.token_usage || '0'),
    informationDensity: parseFloat(individualScores.information_density || metrics.information_density || '0'),
    responseConsistency: parseFloat(individualScores.consistency || metrics.consistency || '0'),
    modelPerformanceVariance: parseFloat(individualScores.model_variance || metrics.model_variance || '0'),
    hallucinationDetection: parseFloat(individualScores.hallucination || metrics.hallucination || '0'),
    relevance: parseFloat(individualScores.relevance || metrics.relevance || '0'),
    finalScore: parseFloat(feedbackData.final_score || metrics.final_score || '0'),
    feedback: feedbackData.overall_feedback || ''
  };

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
        <div className="bg-gradient-to-br from-blue-100 via-blue-50 to-white rounded-lg shadow-lg border border-blue-100 p-8">
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-4">
                <span className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                  {category}
                </span>
                {prompt.status === 'completed' && (
                  <>
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-green-600 font-medium">Verified</span>
                  </>
                )}
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-4">{prompt.title}</h1>
              <p className="text-gray-600 text-lg leading-relaxed mb-6">{prompt.description}</p>

              <div className="flex items-center space-x-6 text-sm text-gray-500">
                <div className="flex items-center space-x-1">
                  <span>❤️ {prompt.likeCount}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span>💬 {prompt.commentCount}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span>📌 {prompt.bookmarkCount}</span>
                </div>
              </div>
            </div>

            <div className="text-right ml-8">
              <div className="text-3xl font-bold text-gray-900 mb-4">{prompt.price}P</div>

              {isAlreadyPurchased ? (
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

        {/* 모델 정보 */}
        <AnimatedContent once distance={50} duration={0.6} delay={0.1}>
        <div className="bg-gradient-to-br from-blue-100 via-blue-50 to-white rounded-lg shadow-lg border border-blue-100 p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 pb-4 border-b border-gray-200">모델 정보</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg p-4 border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">추천 모델</h3>
              <p className="text-gray-600">{prompt.model || 'N/A'}</p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">상태</h3>
              <p className="text-gray-600">{prompt.status === 'completed' ? '검증 완료' : prompt.status === 'processing' ? '처리 중' : prompt.status}</p>
            </div>
          </div>
        </div>
        </AnimatedContent>

        {/* 성능 지표 */}
        {performanceMetrics.finalScore > 0 && (
        <AnimatedContent once distance={50} duration={0.6} delay={0.2}>
        <div className="bg-gradient-to-br from-blue-100 via-blue-50 to-white rounded-lg shadow-lg border border-blue-100 p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 pb-4 border-b border-gray-200">성능 지표</h2>
          
          {/* 최종 점수 강조 표시 */}
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg p-6 mb-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium opacity-90">AI 평가 최종 점수</h3>
                <p className="text-sm opacity-75 mt-1">6가지 지표를 종합한 점수입니다</p>
              </div>
              <div className="text-5xl font-bold">{performanceMetrics.finalScore.toFixed(1)}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg p-4 border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-700">토큰 효율성</h3>
                <span className="text-lg font-bold text-gray-900">{performanceMetrics.tokenUsage.toFixed(1)}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${Math.min(performanceMetrics.tokenUsage, 100)}%` }}></div>
              </div>
              <p className="text-xs text-gray-500 mt-2">토큰 사용 대비 정보량</p>
            </div>

            <div className="bg-white rounded-lg p-4 border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-700">정보 밀도</h3>
                <span className="text-lg font-bold text-gray-900">{performanceMetrics.informationDensity.toFixed(1)}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-600 h-2 rounded-full" style={{ width: `${Math.min(performanceMetrics.informationDensity, 100)}%` }}></div>
              </div>
              <p className="text-xs text-gray-500 mt-2">응답의 정보 밀집도</p>
            </div>

            <div className="bg-white rounded-lg p-4 border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-700">응답 일관성</h3>
                <span className="text-lg font-bold text-gray-900">{performanceMetrics.responseConsistency.toFixed(1)}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-purple-600 h-2 rounded-full" style={{ width: `${Math.min(performanceMetrics.responseConsistency, 100)}%` }}></div>
              </div>
              <p className="text-xs text-gray-500 mt-2">반복 실행 시 일관성</p>
            </div>

            <div className="bg-white rounded-lg p-4 border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-700">환각 탐지</h3>
                <span className="text-lg font-bold text-gray-900">{performanceMetrics.hallucinationDetection.toFixed(1)}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className={`h-2 rounded-full ${performanceMetrics.hallucinationDetection >= 70 ? 'bg-green-600' : performanceMetrics.hallucinationDetection >= 50 ? 'bg-yellow-500' : 'bg-red-600'}`} style={{ width: `${Math.min(performanceMetrics.hallucinationDetection, 100)}%` }}></div>
              </div>
              <p className="text-xs text-gray-500 mt-2">높을수록 환각 적음</p>
            </div>

            <div className="bg-white rounded-lg p-4 border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-700">관련성</h3>
                <span className="text-lg font-bold text-gray-900">{performanceMetrics.relevance.toFixed(1)}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-teal-600 h-2 rounded-full" style={{ width: `${Math.min(performanceMetrics.relevance, 100)}%` }}></div>
              </div>
              <p className="text-xs text-gray-500 mt-2">입력 대비 응답 관련성</p>
            </div>

            <div className="bg-white rounded-lg p-4 border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-700">모델 안정성</h3>
                <span className="text-lg font-bold text-gray-900">{performanceMetrics.modelPerformanceVariance.toFixed(1)}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-orange-500 h-2 rounded-full" style={{ width: `${Math.min(performanceMetrics.modelPerformanceVariance, 100)}%` }}></div>
              </div>
              <p className="text-xs text-gray-500 mt-2">다양한 모델에서의 성능</p>
            </div>
          </div>

          {/* AI 피드백 */}
          {performanceMetrics.feedback && (
            <div className="mt-6 bg-white rounded-lg p-6 border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <span className="mr-2">🤖</span> AI 평가 피드백
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
        <div className="bg-gradient-to-br from-blue-100 via-blue-50 to-white rounded-lg shadow-lg border border-blue-100 p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 pb-4 border-b border-gray-200">프롬프트 미리보기</h2>
          <div className="bg-white rounded-lg p-6 border border-gray-100">
            <pre className="text-gray-700 whitespace-pre-wrap font-mono text-sm">
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
        <div className="bg-gradient-to-br from-blue-100 via-blue-50 to-white rounded-lg shadow-lg border border-blue-100 p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 pb-4 border-b border-gray-200">예시 입력/출력</h2>
          <div className="space-y-8">
            {prompt.examples.map((example, index) => (
              <div key={index} className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-100">예시 {index + 1}</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">입력</h4>
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                      <pre className="text-gray-700 whitespace-pre-wrap text-sm">
                        {example.input?.content || '입력 없음'}
                      </pre>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">출력</h4>
                    <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                      <pre className="text-gray-700 whitespace-pre-wrap text-sm">
                        {example.output || '출력 없음'}
                      </pre>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        </AnimatedContent>
        )}
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
                    await creditApi.purchasePrompt({
                      sellerSub: prompt.createUser?.replace('USER#', '') || '',
                      promptPrice: prompt.price,
                      promptTitle: prompt.title,
                      promptId: prompt.promptId,
                    });
                    
                    addPurchasedPrompt({
                      id: prompt.promptId,
                      title: prompt.title,
                      price: prompt.price,
                      category: category,
                      sellerName: '판매자',
                      description: prompt.description,
                      rating: 4.5,
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
