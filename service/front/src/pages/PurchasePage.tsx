import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { dummyPrompts } from '../services/dummyData';
import { usePurchaseStore } from '../store/purchaseStore';
import { userApi } from '../services/api';

const PurchasePage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addPurchasedPrompt, isPurchased } = usePurchaseStore();
  const [prompt, setPrompt] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [purchaseComplete, setPurchaseComplete] = useState(false);
  const [credit, setCredit] = useState<number>(0);

  useEffect(() => {
    if (id) {
      const foundPrompt = dummyPrompts.find(p => p.id === id);
      setPrompt(foundPrompt);

      // 이미 구매한 프롬프트인지 확인
      if (foundPrompt && isPurchased(id)) {
        setPurchaseComplete(true);
      }
    }

    // 크레딧 정보 가져오기
    userApi.getMe()
      .then((response) => {
        setCredit(response.data.credit || 0);
      })
      .catch((error) => {
        console.error('Failed to fetch user info:', error);
      });
  }, [id, isPurchased]);

  const handlePurchase = async () => {
    if (!prompt) return;

    if (credit < prompt.price) {
      alert('크레딧이 부족합니다. 충전 후 다시 시도해주세요.');
      navigate('/credit');
      return;
    }

    setIsProcessing(true);

    try {
      // 크레딧 사용 API 호출
      await userApi.useCredit({
        amount: prompt.price,
        description: `프롬프트 구매: ${prompt.title}`
      });

      // 구매한 프롬프트로 추가
      addPurchasedPrompt({
        ...prompt,
        content: `이것은 "${prompt.title}" 프롬프트의 실제 내용입니다. 구매해주셔서 감사합니다!\n\n실제 프롬프트 내용이 여기에 표시됩니다.`
      });

      setPurchaseComplete(true);
    } catch (error: any) {
      const message = error.response?.data || '구매 처리 중 오류가 발생했습니다.';
      alert(message);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!prompt) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-100 via-blue-50 to-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">프롬프트를 찾을 수 없습니다</h2>
          <Link
            to="/marketplace"
            className="text-blue-900 font-medium hover:underline"
          >
            마켓플레이스로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  if (purchaseComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-100 via-blue-50 to-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg border border-gray-200 p-8 text-center shadow-sm"
          >
            <div className="w-16 h-16 mx-auto mb-6 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-4">구매가 완료되었습니다!</h2>
            <p className="text-gray-600 mb-8">"{prompt.title}" 프롬프트를 성공적으로 구매했습니다.</p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/dashboard/purchased"
                className="inline-flex items-center px-6 py-3 bg-blue-900 text-white font-medium rounded-lg hover:bg-blue-800 transition-colors"
              >
                구매한 프롬프트 보기
              </Link>
              <Link
                to="/marketplace"
                className="inline-flex items-center px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                계속 쇼핑하기
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-blue-50 to-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Link
            to={`/prompt/${prompt.id}`}
            className="inline-flex items-center text-blue-900 font-medium hover:underline mb-4"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            프롬프트 상세로 돌아가기
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">구매하기</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 프롬프트 정보 */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                    {prompt.category}
                  </span>
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-xs text-green-600 font-medium">Verified</span>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-gray-900">{prompt.price}P</div>
                </div>
              </div>

              <h2 className="text-2xl font-bold text-gray-900 mb-4">{prompt.title}</h2>

              <p className="text-gray-600 mb-6">{prompt.description}</p>

              <div className="flex items-center justify-between text-sm text-gray-500 mb-6">
                <span>by {prompt.sellerName}</span>
                <div className="flex items-center space-x-1">
                  <span>⭐</span>
                  <span>{prompt.rating}</span>
                  <span>({prompt.reviewCount} reviews)</span>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">구매 후 제공되는 내용</h3>
                <ul className="space-y-2 text-gray-600">
                  <li className="flex items-center">
                    <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    완전한 프롬프트 텍스트
                  </li>
                  <li className="flex items-center">
                    <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    사용 가이드 및 팁
                  </li>
                  <li className="flex items-center">
                    <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    무제한 다운로드
                  </li>
                  <li className="flex items-center">
                    <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    평생 액세스
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* 결제 정보 */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm sticky top-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">결제 정보</h3>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">프롬프트 가격</span>
                  <span className="text-gray-900">{prompt.price}P</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">수수료</span>
                  <span className="text-gray-900">0P</span>
                </div>
                <div className="border-t border-gray-200 pt-3">
                  <div className="flex justify-between font-semibold">
                    <span className="text-gray-900">총 결제 금액</span>
                    <span className="text-blue-900 text-lg">{prompt.price}P</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">보유 크레딧</span>
                  <span className={`font-medium ${credit >= (prompt?.price || 0) ? 'text-green-600' : 'text-red-600'}`}>
                    {credit}P
                  </span>
                </div>
                <button
                  onClick={handlePurchase}
                  disabled={isProcessing}
                  className="w-full bg-blue-900 text-white font-medium py-3 rounded-lg hover:bg-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isProcessing ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      구매 처리 중...
                    </>
                  ) : (
                    '구매하기'
                  )}
                </button>
              </div>

              <div className="mt-4 text-center">
                <p className="text-xs text-gray-500">
                  구매 시 <Link to="#" className="text-blue-900 hover:underline">이용약관</Link> 및{' '}
                  <Link to="#" className="text-blue-900 hover:underline">개인정보처리방침</Link>에 동의하게 됩니다.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PurchasePage;