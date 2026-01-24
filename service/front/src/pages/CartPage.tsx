import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCartStore } from '../store/cartStore';
import { usePurchaseStore } from '../store/purchaseStore';
import { creditApi } from '../services/api';
import Header from '../components/Header';
import AnimatedContent from '../components/AnimatedContent';
import SplitText from '../components/SplitText';

const CartPage = () => {
  const navigate = useNavigate();
  const { items, addToCart, removeFromCart, clearCart, getTotalPrice } = useCartStore();
  const { addPurchasedPrompt } = usePurchaseStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [credit, setCredit] = useState<number>(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDevMode] = useState(() => import.meta.env.DEV);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      creditApi.getBalance()
        .then((response) => {
          setCredit(response.data.balance || 0);
        })
        .catch((error) => {
          console.error('Failed to fetch credit balance:', error);
        });
    }
  }, []);

  // 초기 로드 시 모든 아이템 선택
  useEffect(() => {
    setSelectedIds(new Set(items.map(item => item.id)));
  }, [items.length]);

  // 선택된 아이템들
  const selectedItems = items.filter(item => selectedIds.has(item.id));
  const selectedTotalPrice = selectedItems.reduce((sum, item) => sum + item.price, 0);

  // 개별 선택 토글
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // 전체 선택/해제
  const toggleSelectAll = () => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map(item => item.id)));
    }
  };

  // 더미 데이터 장바구니에 추가 (개발 모드 전용)
  const addDummyToCart = async () => {
    if (!isDevMode) return;
    try {
      const { dummyPrompts } = await import('../services/dummyPrompts.local');
      dummyPrompts.forEach((prompt: any) => {
        addToCart({
          id: prompt.promptId,
          title: prompt.title,
          price: prompt.price,
          category: prompt.category,
          sellerName: prompt.nickname,
          sellerSub: prompt.userId,
          description: prompt.description,
          rating: prompt.evaluationMetrics?.finalScore || 4.5,
        });
      });
    } catch (e) {
      console.error('Failed to load dummy data:', e);
    }
  };

  const handlePurchase = async () => {
    if (selectedItems.length === 0) {
      alert('구매할 프롬프트를 선택해주세요.');
      return;
    }

    const token = localStorage.getItem('accessToken');
    if (!token) {
      alert('로그인이 필요한 서비스입니다.');
      navigate('/auth/login');
      return;
    }

    if (credit < selectedTotalPrice) {
      alert('크레딧이 부족합니다. 충전 후 다시 시도해주세요.');
      navigate('/credit');
      return;
    }

    setIsProcessing(true);
    
    try {
      // 선택된 아이템만 구매 API 호출
      await creditApi.purchaseCart(selectedItems.map(item => ({
        id: item.id,
        title: item.title,
        price: item.price,
        category: item.category,
        sellerName: item.sellerName,
        description: item.description,
        rating: item.rating,
        sellerSub: item.sellerSub,
      })));
      
      // 구매한 프롬프트 저장
      selectedItems.forEach(item => {
        addPurchasedPrompt({
          ...item,
          content: `이것은 "${item.title}" 프롬프트의 실제 내용입니다. 구매해주셔서 감사합니다!`
        });
        removeFromCart(item.id);
      });
      
      alert('구매가 완료되었습니다!');
      navigate('/dashboard/purchased');
    } catch (error: any) {
      const message = error.response?.data?.message || '구매 처리 중 오류가 발생했습니다.';
      alert(message);
    } finally {
      setIsProcessing(false);
    }
  };

  // 선택된 아이템만 삭제
  const removeSelected = () => {
    selectedItems.forEach(item => removeFromCart(item.id));
    setSelectedIds(new Set());
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-16">
            <div className="w-24 h-24 mx-auto mb-6 bg-gray-200 rounded-full flex items-center justify-center">
              <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-1.5 6M7 13l-1.5-6m0 0h15.5M17 21a2 2 0 100-4 2 2 0 000 4zM9 21a2 2 0 100-4 2 2 0 000 4z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">장바구니가 비어있습니다</h2>
            <p className="text-gray-600 mb-8">마켓플레이스에서 원하는 프롬프트를 찾아보세요</p>
            <div className="flex flex-col items-center gap-4">
              <Link
                to="/marketplace"
                className="inline-flex items-center px-6 py-3 bg-blue-900 text-white font-medium rounded-lg hover:bg-blue-800 transition-colors"
              >
                마켓플레이스 둘러보기
              </Link>
              {isDevMode && (
                <button
                  onClick={addDummyToCart}
                  className="inline-flex items-center px-6 py-3 bg-orange-500 text-white font-medium rounded-lg hover:bg-orange-600 transition-colors"
                >
                  🧪 테스트용 더미 데이터 추가
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div>
            <SplitText
              text="장바구니"
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
              text={`${items.length}개의 프롬프트가 담겨있습니다`}
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

        {/* 전체 선택 / 선택 삭제 바 */}
        <div className="flex items-center justify-between mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={selectedIds.size === items.length && items.length > 0}
              onChange={toggleSelectAll}
              className="w-5 h-5 text-blue-900 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="ml-3 text-sm font-medium text-gray-700">
              전체 선택 ({selectedIds.size}/{items.length})
            </span>
          </label>
          <button
            onClick={removeSelected}
            disabled={selectedIds.size === 0}
            className="text-sm text-red-600 hover:text-red-800 disabled:text-gray-400 disabled:cursor-not-allowed"
          >
            선택 삭제
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 장바구니 아이템 목록 */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item, index) => (
              <AnimatedContent key={item.id} once distance={50} duration={0.6} delay={index * 0.1}>
              <div 
                className={`bg-gradient-to-br from-blue-100 via-blue-50 to-white rounded-lg border p-6 shadow-sm transition-all ${
                  selectedIds.has(item.id) ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'
                }`}
              >
                <div className="flex items-start">
                  {/* 체크박스 */}
                  <div className="flex items-center mr-4 pt-1">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(item.id)}
                      onChange={() => toggleSelect(item.id)}
                      className="w-5 h-5 text-blue-900 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                    />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                        {item.category}
                      </span>
                      <div className="flex items-center space-x-1 text-xs text-gray-500">
                        <span>⭐</span>
                        <span>{item.rating}</span>
                      </div>
                    </div>
                    
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {item.title}
                    </h3>
                    
                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                      {item.description}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">by {item.sellerName}</span>
                      <div className="text-lg font-bold text-gray-900">{item.price}P</div>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="ml-4 p-2 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
              </AnimatedContent>
            ))}
          </div>

          {/* 주문 요약 */}
          <div className="lg:col-span-1">
            <div className="sticky top-8">
            <AnimatedContent once distance={50} duration={0.6} delay={0.2}>
            <div className="bg-gradient-to-br from-blue-100 via-blue-50 to-white rounded-lg border border-gray-200 p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">주문 요약</h3>
              
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">선택한 상품</span>
                  <span className="text-gray-900">{selectedItems.length}개</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">전체 상품</span>
                  <span className="text-gray-500">{items.length}개</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">선택 금액</span>
                  <span className="text-gray-900">{selectedTotalPrice}P</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">보유 크레딧</span>
                  <span className={`font-medium ${credit >= selectedTotalPrice ? 'text-green-600' : 'text-red-600'}`}>
                    {credit}P
                  </span>
                </div>
                <div className="border-t border-gray-200 pt-3">
                  <div className="flex justify-between font-semibold">
                    <span className="text-gray-900">결제 금액</span>
                    <span className="text-blue-900 text-lg">{selectedTotalPrice}P</span>
                  </div>
                </div>
              </div>

              <button
                onClick={handlePurchase}
                disabled={isProcessing || selectedItems.length === 0}
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
                ) : selectedItems.length === 0 ? (
                  '프롬프트를 선택해주세요'
                ) : (
                  `선택한 ${selectedItems.length}개 구매하기`
                )}
              </button>

              <button
                onClick={clearCart}
                className="w-full mt-3 border border-gray-300 text-gray-700 font-medium py-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                장바구니 비우기
              </button>

              <div className="mt-6 text-center">
                <Link
                  to="/marketplace"
                  className="text-blue-900 text-sm font-medium hover:underline"
                >
                  계속 쇼핑하기
                </Link>
              </div>
            </div>
            </AnimatedContent>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartPage;
