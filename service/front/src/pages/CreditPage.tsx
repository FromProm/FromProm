import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { userApi } from '../services/api';
import AnimatedContent from '../components/AnimatedContent';
import SplitText from '../components/SplitText';

const CreditPage = () => {
  const [selectedAmount, setSelectedAmount] = useState(1000);
  const [customAmount, setCustomAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [currentCredits, setCurrentCredits] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // 사용자 크레딧 정보 가져오기
  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const response = await userApi.getMe();
        setCurrentCredits(response.data.credit || 0);
      } catch (error) {
        console.error('Failed to fetch user info:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchUserInfo();
  }, []);

  // 미리 정의된 충전 금액 옵션
  const creditPackages = [
    { credits: 500, price: 4.99, bonus: 0, popular: false },
    { credits: 1000, price: 9.99, bonus: 50, popular: true },
    { credits: 2500, price: 24.99, bonus: 200, popular: false },
    { credits: 5000, price: 49.99, bonus: 500, popular: false },
    { credits: 10000, price: 99.99, bonus: 1500, popular: false },
  ];

  const handlePurchase = async () => {
    setIsProcessing(true);
    
    try {
      const finalAmount = selectedAmount === 0 ? parseInt(customAmount) : selectedAmount;
      const bonus = creditPackages.find(pkg => pkg.credits === finalAmount)?.bonus || 0;
      const totalAmount = finalAmount + bonus;
      
      // 실제 API 호출
      await userApi.chargeCredit(totalAmount);
      
      // 성공 시 크레딧 업데이트
      setCurrentCredits(prev => prev + totalAmount);
      setShowSuccessModal(true);
    } catch (error: any) {
      alert(error.response?.data?.message || '크레딧 충전에 실패했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  const getPrice = (credits: number) => {
    const pkg = creditPackages.find(p => p.credits === credits);
    return pkg ? pkg.price : (credits * 0.01).toFixed(2);
  };

  const getBonus = (credits: number) => {
    const pkg = creditPackages.find(p => p.credits === credits);
    return pkg ? pkg.bonus : 0;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-gray-600">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">

      {/* 메인 콘텐츠 */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* 페이지 헤더 */}
          <div className="mb-8">
            <div>
              <SplitText
                text="크레딧 충전"
                className="text-3xl font-bold text-gray-900 mb-2"
                delay={50}
                duration={0.6}
                ease="power3.out"
                splitType="chars"
                from={{ opacity: 0, y: 30 }}
                to={{ opacity: 1, y: 0 }}
                threshold={0.1}
                rootMargin="-50px"
                textAlign="left"
                tag="h1"
              />
            </div>
            <div>
              <SplitText
                text="FromProm 크레딧을 충전하여 프롬프트를 구매하세요"
                className="text-gray-600"
                delay={30}
                duration={0.5}
                ease="power3.out"
                splitType="words"
                from={{ opacity: 0, y: 20 }}
                to={{ opacity: 1, y: 0 }}
                threshold={0.1}
                rootMargin="-50px"
                textAlign="left"
                tag="p"
              />
            </div>
          </div>

          {/* 현재 크레딧 표시 */}
          <AnimatedContent once distance={50} duration={0.6} delay={0}>
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 mb-8 text-white shadow-lg shadow-blue-500/20">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-medium mb-1">현재 보유 크레딧</h2>
                <p className="text-3xl font-bold">{currentCredits.toLocaleString()}P</p>
              </div>
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                <span className="text-2xl">💎</span>
              </div>
            </div>
          </div>
          </AnimatedContent>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* 충전 금액 선택 */}
            <div className="lg:col-span-2">
              <AnimatedContent once distance={50} duration={0.6} delay={0.1}>
              <div className="bg-gradient-to-br from-blue-100 via-blue-50 to-white border border-gray-200 rounded-lg p-8 shadow-lg shadow-blue-500/10">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">충전 금액 선택</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  {creditPackages.map((pkg) => (
                    <div
                      key={pkg.credits}
                      onClick={() => setSelectedAmount(pkg.credits)}
                      className={`relative border-2 rounded-lg p-4 cursor-pointer transition-all ${
                        selectedAmount === pkg.credits
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {pkg.popular && (
                        <div className="absolute -top-2 left-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xs font-bold px-2 py-1 rounded">
                          인기
                        </div>
                      )}
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="text-lg font-bold text-gray-900">{pkg.credits.toLocaleString()}P</div>
                          {pkg.bonus > 0 && (
                            <div className="text-sm text-green-600 font-medium">+{pkg.bonus}P 보너스</div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-blue-600">${pkg.price}</div>
                          {pkg.bonus > 0 && (
                            <div className="text-xs text-gray-500">총 {(pkg.credits + pkg.bonus).toLocaleString()}P</div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 사용자 정의 금액 */}
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">사용자 정의 금액</h3>
                  <div className="flex items-center space-x-4">
                    <input
                      type="radio"
                      id="custom"
                      name="amount"
                      checked={selectedAmount === 0}
                      onChange={() => setSelectedAmount(0)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="custom" className="flex-1">
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          min="100"
                          max="50000"
                          step="100"
                          value={customAmount}
                          onChange={(e) => {
                            setCustomAmount(e.target.value);
                            setSelectedAmount(0);
                          }}
                          placeholder="1000"
                          className="w-32 px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        />
                        <span className="text-gray-700">P</span>
                        <span className="text-gray-500">=</span>
                        <span className="text-blue-600 font-medium">
                          ${customAmount ? (parseInt(customAmount) * 0.01).toFixed(2) : '0.00'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">최소 100P, 최대 50,000P</p>
                    </label>
                  </div>
                </div>
              </div>
              </AnimatedContent>
            </div>

            {/* 결제 정보 */}
            <div className="lg:col-span-1">
              <AnimatedContent once distance={50} duration={0.6} delay={0.2}>
              <div className="bg-gradient-to-br from-blue-100 via-blue-50 to-white border border-gray-200 rounded-lg p-6 shadow-lg shadow-blue-500/10 sticky top-24">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">결제 정보</h3>
                
                {/* 주문 요약 */}
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between">
                    <span className="text-gray-600">크레딧</span>
                    <span className="font-medium">
                      {selectedAmount === 0 ? (customAmount || '0') : selectedAmount.toLocaleString()}P
                    </span>
                  </div>
                  {(selectedAmount > 0 && getBonus(selectedAmount) > 0) && (
                    <div className="flex justify-between text-green-600">
                      <span>보너스</span>
                      <span className="font-medium">+{getBonus(selectedAmount)}P</span>
                    </div>
                  )}
                  <div className="border-t border-gray-200 pt-3 flex justify-between text-lg font-bold">
                    <span>총 결제금액</span>
                    <span className="text-blue-600">
                      ${selectedAmount === 0 
                        ? (customAmount ? (parseInt(customAmount) * 0.01).toFixed(2) : '0.00')
                        : getPrice(selectedAmount)
                      }
                    </span>
                  </div>
                  <div className="text-sm text-gray-500">
                    받을 크레딧: {
                      selectedAmount === 0 
                        ? (customAmount || '0')
                        : (selectedAmount + getBonus(selectedAmount)).toLocaleString()
                    }P
                  </div>
                </div>

                {/* 결제 방법 */}
                <div className="mb-6">
                  <h4 className="font-medium text-gray-900 mb-3">결제 방법</h4>
                  <div className="space-y-2">
                    <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                      <input 
                        type="radio" 
                        name="payment" 
                        value="card" 
                        checked={paymentMethod === 'card'}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="mr-3" 
                      />
                      <div className="flex items-center">
                        <span className="text-sm font-medium">신용카드</span>
                        <div className="ml-2 flex space-x-1">
                          <div className="w-6 h-4 bg-blue-600 rounded text-white text-xs flex items-center justify-center">V</div>
                          <div className="w-6 h-4 bg-red-600 rounded text-white text-xs flex items-center justify-center">M</div>
                        </div>
                      </div>
                    </label>
                    <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                      <input 
                        type="radio" 
                        name="payment" 
                        value="paypal"
                        checked={paymentMethod === 'paypal'}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="mr-3" 
                      />
                      <span className="text-sm font-medium">PayPal</span>
                    </label>
                    <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                      <input 
                        type="radio" 
                        name="payment" 
                        value="bank"
                        checked={paymentMethod === 'bank'}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="mr-3" 
                      />
                      <span className="text-sm font-medium">계좌이체</span>
                    </label>
                  </div>
                </div>

                {/* 결제 버튼 */}
                <button
                  onClick={handlePurchase}
                  disabled={isProcessing || (selectedAmount === 0 && !customAmount) || (selectedAmount === 0 && parseInt(customAmount) < 100)}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-3 px-4 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? '처리 중...' : '크레딧 충전하기'}
                </button>

                <p className="text-xs text-gray-500 mt-3 text-center">
                  결제 완료 후 즉시 크레딧이 충전됩니다
                </p>
              </div>
              </AnimatedContent>
            </div>
          </div>

          {/* 크레딧 사용 안내 */}
          <AnimatedContent once distance={50} duration={0.6} delay={0.3}>
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-3">💡 크레딧 사용 안내</h3>
            <ul className="space-y-2 text-sm text-blue-800">
              <li>• 1P = $0.01 USD 환율로 충전됩니다</li>
              <li>• 충전된 크레딧은 프롬프트 구매에 사용할 수 있습니다</li>
              <li>• 보너스 크레딧은 일정 금액 이상 충전 시 제공됩니다</li>
              <li>• 크레딧은 환불되지 않으니 신중하게 충전해주세요</li>
              <li>• 미사용 크레딧은 계정에 영구 보관됩니다</li>
            </ul>
          </div>
          </AnimatedContent>
        </motion.div>
      </main>

      {/* 성공 모달 */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 text-center"
          >
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">충전 완료!</h3>
            <p className="text-gray-600 mb-6">
              크레딧이 성공적으로 충전되었습니다.<br />
              현재 보유 크레딧: <span className="font-bold text-blue-600">{currentCredits.toLocaleString()}P</span>
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowSuccessModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                닫기
              </button>
              <Link
                to="/marketplace"
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-center"
              >
                프롬프트 구매하기
              </Link>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default CreditPage;
