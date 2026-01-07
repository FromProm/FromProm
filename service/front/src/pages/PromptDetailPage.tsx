import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { dummyPrompts } from '../services/dummyData';
import { useCartStore } from '../store/cartStore';
import { usePurchaseStore } from '../store/purchaseStore';
import { useAuthStore } from '../store/authStore';

const PromptDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const prompt = dummyPrompts.find(p => p.id === id);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const { addToCart, isInCart } = useCartStore();
  const { isPurchased } = usePurchaseStore();
  const { isAuthenticated } = useAuthStore();

  const isAlreadyInCart = prompt ? isInCart(prompt.id) : false;
  const isAlreadyPurchased = prompt ? isPurchased(prompt.id) : false;

  const isLoggedIn = () => !!localStorage.getItem('accessToken');

  const handleAddToCart = () => {
    if (!isLoggedIn()) {
      alert('로그인이 필요한 서비스입니다.');
      navigate('/auth/login');
      return;
    }
    
    if (prompt && !isAlreadyInCart && !isAlreadyPurchased) {
      addToCart({
        id: prompt.id,
        title: prompt.title,
        price: prompt.price,
        category: prompt.category,
        sellerName: prompt.sellerName,
        description: prompt.description,
        rating: prompt.rating
      });
    }
  };

  const handlePurchase = () => {
    if (!isLoggedIn()) {
      alert('로그인이 필요한 서비스입니다.');
      navigate('/auth/login');
      return;
    }
    
    navigate(`/purchase/${prompt?.id}`);
  };

  if (!prompt) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">프롬프트를 찾을 수 없습니다</h1>
          <Link to="/marketplace" className="text-blue-600 hover:text-blue-500">
            마켓플레이스로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  // 더미 예시 데이터
  const examples = [
    {
      input: "다음 코드를 리뷰해주세요:\n\nfunction calculateTotal(items) {\n  let total = 0;\n  for(let i = 0; i < items.length; i++) {\n    total += items[i].price;\n  }\n  return total;\n}",
      output: "코드 리뷰 결과:\n\n✅ 장점:\n- 기본적인 로직이 명확함\n- 변수명이 직관적\n\n⚠️ 개선사항:\n1. const 사용 권장 (let 대신)\n2. for...of 루프 또는 reduce() 메서드 활용\n3. 입력 검증 추가 필요\n4. JSDoc 주석 추가 권장\n\n개선된 코드:\n```javascript\n/**\n * 아이템 배열의 총 가격을 계산합니다\n * @param {Array} items - 가격 정보가 있는 아이템 배열\n * @returns {number} 총 가격\n */\nfunction calculateTotal(items) {\n  if (!Array.isArray(items)) return 0;\n  return items.reduce((total, item) => total + (item?.price || 0), 0);\n}\n```"
    },
    {
      input: "React 컴포넌트에서 useState 훅 사용법을 알려주세요.",
      output: "React useState 훅 사용법:\n\n```javascript\nimport React, { useState } from 'react';\n\nfunction Counter() {\n  // [상태값, 상태변경함수] = useState(초기값)\n  const [count, setCount] = useState(0);\n\n  return (\n    <div>\n      <p>현재 카운트: {count}</p>\n      <button onClick={() => setCount(count + 1)}>\n        증가\n      </button>\n      <button onClick={() => setCount(count - 1)}>\n        감소\n      </button>\n    </div>\n  );\n}\n```\n\n주요 포인트:\n- 함수형 컴포넌트에서만 사용 가능\n- 상태가 변경되면 컴포넌트 리렌더링\n- 이전 상태 기반 업데이트 시 함수형 업데이트 사용 권장"
    },
    {
      input: "API 호출 에러 처리 방법을 검토해주세요.",
      output: "API 에러 처리 모범 사례:\n\n```javascript\nasync function fetchUserData(userId) {\n  try {\n    const response = await fetch(`/api/users/${userId}`);\n    \n    if (!response.ok) {\n      throw new Error(`HTTP ${response.status}: ${response.statusText}`);\n    }\n    \n    const userData = await response.json();\n    return { success: true, data: userData };\n    \n  } catch (error) {\n    console.error('사용자 데이터 조회 실패:', error);\n    \n    // 네트워크 에러 vs HTTP 에러 구분\n    if (error instanceof TypeError) {\n      return { success: false, error: '네트워크 연결을 확인해주세요' };\n    }\n    \n    return { success: false, error: error.message };\n  }\n}\n```\n\n권장사항:\n- 명확한 에러 메시지 제공\n- 에러 타입별 적절한 처리\n- 사용자 친화적 에러 메시지\n- 로깅을 통한 디버깅 지원"
    }
  ];

  // 성능 지표 더미 데이터
  const performanceMetrics = {
    tokenUsage: 85,
    informationDensity: 92,
    responseConsistency: 88,
    modelPerformanceVariance: 76,
    hallucinationDetection: 94,
    relevance: 90
  };

  return (
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
            className="inline-flex items-center text-gray-600 hover:text-blue-900 font-medium text-sm transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            마켓플레이스로 돌아가기
          </Link>
        </div>
        {/* 프롬프트 기본 정보 */}
        <div className="bg-white rounded-lg shadow-lg border border-blue-100 p-8">
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-4">
                <span className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                  {prompt.category}
                </span>
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-green-600 font-medium">Verified</span>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-4">{prompt.title}</h1>
              <p className="text-gray-600 text-lg leading-relaxed mb-6">{prompt.description}</p>

              <div className="flex items-center space-x-6 text-sm text-gray-500">
                <span>by <span className="font-medium text-gray-700">{prompt.sellerName}</span></span>
                <div className="flex items-center space-x-1">
                  <span>⭐</span>
                  <span className="font-medium">{prompt.rating}</span>
                  <span>({prompt.reviewCount} reviews)</span>
                </div>
                <span>{prompt.salesCount} sales</span>
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

        {/* 모델 정보 */}
        <div className="bg-white rounded-lg shadow-lg border border-blue-100 p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">모델 정보</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">추천 모델</h3>
              <p className="text-gray-600">{prompt.llmModel || 'GPT-4'}</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">모델 버전</h3>
              <p className="text-gray-600">{prompt.llmVersion || 'gpt-4-turbo-preview'}</p>
            </div>
          </div>
        </div>

        {/* 성능 지표 */}
        <div className="bg-white rounded-lg shadow-lg border border-blue-100 p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">성능 지표</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-700">토큰 사용량</h3>
                <span className="text-lg font-bold text-gray-900">{performanceMetrics.tokenUsage}/100</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ width: `${performanceMetrics.tokenUsage}%` }}
                ></div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-700">출력대비 정보밀도</h3>
                <span className="text-lg font-bold text-gray-900">{performanceMetrics.informationDensity}/100</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full"
                  style={{ width: `${performanceMetrics.informationDensity}%` }}
                ></div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-700">응답의 일관성</h3>
                <span className="text-lg font-bold text-gray-900">{performanceMetrics.responseConsistency}/100</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-purple-600 h-2 rounded-full"
                  style={{ width: `${performanceMetrics.responseConsistency}%` }}
                ></div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-700">모델별 성능편차</h3>
                <span className="text-lg font-bold text-gray-900">{performanceMetrics.modelPerformanceVariance}/100</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-orange-600 h-2 rounded-full"
                  style={{ width: `${performanceMetrics.modelPerformanceVariance}%` }}
                ></div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-700">환각 탐지</h3>
                <span className="text-lg font-bold text-gray-900">{performanceMetrics.hallucinationDetection}/100</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-red-600 h-2 rounded-full"
                  style={{ width: `${performanceMetrics.hallucinationDetection}%` }}
                ></div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-700">관련성</h3>
                <span className="text-lg font-bold text-gray-900">{performanceMetrics.relevance}/100</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-teal-600 h-2 rounded-full"
                  style={{ width: `${performanceMetrics.relevance}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* 프롬프트 미리보기 */}
        <div className="bg-white rounded-lg shadow-lg border border-blue-100 p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">프롬프트 미리보기</h2>
          <div className="bg-gray-50 rounded-lg p-6">
            <pre className="text-gray-700 whitespace-pre-wrap font-mono text-sm">
              {prompt.preview}
            </pre>
          </div>
          <p className="text-sm text-gray-500 mt-4">
            💡 전체 프롬프트는 구매 후 확인할 수 있습니다.
          </p>
        </div>

        {/* 예시 입력/출력 */}
        <div className="bg-white rounded-lg shadow-lg border border-blue-100 p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">예시 입력/출력</h2>
          <div className="space-y-8">
            {examples.map((example, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">예시 {index + 1}</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">입력</h4>
                    <div className="bg-blue-50 rounded-lg p-4">
                      <pre className="text-gray-700 whitespace-pre-wrap text-sm">
                        {example.input}
                      </pre>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">출력</h4>
                    <div className="bg-green-50 rounded-lg p-4">
                      <pre className="text-gray-700 whitespace-pre-wrap text-sm">
                        {example.output}
                      </pre>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 태그 */}
        <div className="bg-white rounded-lg shadow-lg border border-blue-100 p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">태그</h2>
          <div className="flex flex-wrap gap-2">
            {prompt.tags.map((tag, index) => (
              <span
                key={index}
                className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm"
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>
      </motion.div>

      {/* 결제 모달 */}
      {showPaymentModal && (
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
                <span className="text-sm text-gray-500">판매자: {prompt.sellerName}</span>
                <span className="text-xl font-bold text-gray-900">{prompt.price}P</span>
              </div>
            </div>

            {/* 결제 방법 */}
            <div className="mb-6">
              <h4 className="font-medium text-gray-900 mb-3">결제 방법</h4>
              <div className="space-y-2">
                <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input type="radio" name="payment" value="card" defaultChecked className="mr-3" />
                  <div className="flex items-center">
                    <span className="text-sm font-medium">신용카드</span>
                    <div className="ml-2 flex space-x-1">
                      <div className="w-6 h-4 bg-blue-600 rounded text-white text-xs flex items-center justify-center">V</div>
                      <div className="w-6 h-4 bg-red-600 rounded text-white text-xs flex items-center justify-center">M</div>
                    </div>
                  </div>
                </label>
                <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input type="radio" name="payment" value="paypal" className="mr-3" />
                  <span className="text-sm font-medium">PayPal</span>
                </label>
                <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input type="radio" name="payment" value="crypto" className="mr-3" />
                  <span className="text-sm font-medium">암호화폐</span>
                </label>
              </div>
            </div>

            {/* 약관 동의 */}
            <div className="mb-6">
              <label className="flex items-start">
                <input type="checkbox" className="mt-1 mr-3" required />
                <span className="text-sm text-gray-600">
                  <span className="font-medium">구매 약관</span> 및 <span className="font-medium">환불 정책</span>에 동의합니다.
                  구매 후 즉시 프롬프트에 접근할 수 있으며, 디지털 상품 특성상 환불이 제한됩니다.
                </span>
              </label>
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
                onClick={() => {
                  // 실제 결제 처리 로직
                  alert('결제가 완료되었습니다! 프롬프트를 확인해보세요.');
                  setShowPaymentModal(false);
                }}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-colors font-semibold"
              >
                {prompt.price}P 결제하기
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default PromptDetailPage;