import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCartStore } from '../store/cartStore';
import { usePurchaseStore } from '../store/purchaseStore';
import { creditApi } from '../services/api';
import { promptTypeToCategory } from '../services/dummyData';
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
  const addDummyToCart = () => {
    if (!isDevMode) return;
    const dummyPrompts = [
      { promptId: 'dummy-001', title: '마케팅 카피라이팅 마스터', description: '제품/서비스의 특징을 입력하면 매력적인 마케팅 문구를 생성해주는 프롬프트입니다.', category: '글 창작 및 생성', nickname: '마케팅마스터', userId: 'dummy-user-001', price: 500, finalScore: 8.5 },
      { promptId: 'dummy-002', title: '코드 리뷰 어시스턴트', description: '코드를 입력하면 버그, 성능 개선점, 베스트 프랙티스를 분석해주는 프롬프트입니다.', category: '사실/정보/근거 요구', nickname: '코드마스터', userId: 'dummy-user-002', price: 800, finalScore: 9.2 },
      { promptId: 'dummy-003', title: '판타지 일러스트 생성기', description: '판타지 세계관의 캐릭터, 배경, 아이템 이미지를 생성하는 프롬프트입니다.', category: '이미지 창작 및 생성', nickname: '아트디렉터', userId: 'dummy-user-003', price: 1200, finalScore: 9.0 },
      { promptId: 'dummy-004', title: '비즈니스 이메일 작성기', description: '상황과 목적을 입력하면 전문적인 비즈니스 이메일을 작성해주는 프롬프트입니다.', category: '글 창작 및 생성', nickname: '비즈니스프로', userId: 'dummy-user-004', price: 300, finalScore: 8.0 },
      { promptId: 'dummy-005', title: '데이터 분석 리포트 생성기', description: '데이터를 입력하면 인사이트와 시각화 제안을 포함한 분석 리포트를 생성합니다.', category: '사실/정보/근거 요구', nickname: '데이터사이언티스트', userId: 'dummy-user-005', price: 1000, finalScore: 8.8 },
    ];
    dummyPrompts.forEach((prompt) => {
      addToCart({
        id: prompt.promptId,
        title: prompt.title,
        price: prompt.price,
        category: prompt.category,
        sellerName: prompt.nickname,
        sellerSub: prompt.userId,
        description: prompt.description,
        rating: prompt.finalScore,
      });
    });
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
      // 더미 데이터와 실제 데이터 분리
      const dummyItems = selectedItems.filter(item => item.id.startsWith('dummy-'));
      const realItems = selectedItems.filter(item => !item.id.startsWith('dummy-'));
      
      // 실제 데이터만 API 호출
      if (realItems.length > 0) {
        await creditApi.purchaseCart(realItems.map(item => ({
          id: item.id,
          title: item.title,
          price: item.price,
          category: item.category,
          sellerName: item.sellerName,
          description: item.description,
          rating: item.rating,
          sellerSub: item.sellerSub,
        })));
      }
      
      // 구매한 프롬프트 저장 (더미 + 실제 모두)
      selectedItems.forEach(item => {
        addPurchasedPrompt({
          ...item,
          content: `이것은 "${item.title}" 프롬프트의 실제 내용입니다. 구매해주셔서 감사합니다!`
        });
        removeFromCart(item.id);
      });
      
      // 더미 데이터만 구매한 경우 안내 메시지
      if (dummyItems.length > 0 && realItems.length === 0) {
        alert('테스트 구매가 완료되었습니다! (더미 데이터는 실제 결제되지 않습니다)');
      } else {
        alert('구매가 완료되었습니다!');
      }
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
        <div className="w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="text-center py-10 sm:py-16">
            <div className="w-16 h-16 sm:w-24 sm:h-24 mx-auto mb-4 sm:mb-6 bg-gray-200 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 sm:w-12 sm:h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-1.5 6M7 13l-1.5-6m0 0h15.5M17 21a2 2 0 100-4 2 2 0 000 4zM9 21a2 2 0 100-4 2 2 0 000 4z" />
              </svg>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">장바구니가 비어있습니다</h2>
            <p className="text-gray-600 mb-6 sm:mb-8 text-sm sm:text-base">마켓플레이스에서 원하는 프롬프트를 찾아보세요</p>
            <div className="flex flex-col items-center gap-3 sm:gap-4">
              <Link
                to="/marketplace"
                className="inline-flex items-center px-5 sm:px-6 py-2.5 sm:py-3 bg-blue-900 text-white font-medium rounded-lg hover:bg-blue-800 transition-colors text-sm sm:text-base"
              >
                마켓플레이스 둘러보기
              </Link>
              {isDevMode && (
                <button
                  onClick={addDummyToCart}
                  className="inline-flex items-center px-5 sm:px-6 py-2.5 sm:py-3 bg-orange-500 text-white font-medium rounded-lg hover:bg-orange-600 transition-colors text-sm sm:text-base"
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
      <div className="w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <div>
            <SplitText
              text="장바구니"
              className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2"
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
              className="text-gray-600 text-sm sm:text-base"
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
        <div className="flex items-center justify-between mb-3 sm:mb-4 p-3 sm:p-4 bg-gray-50 rounded-lg border border-gray-200">
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={selectedIds.size === items.length && items.length > 0}
              onChange={toggleSelectAll}
              className="w-4 h-4 sm:w-5 sm:h-5 text-blue-900 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="ml-2 sm:ml-3 text-xs sm:text-sm font-medium text-gray-700">
              전체 선택 ({selectedIds.size}/{items.length})
            </span>
          </label>
          <button
            onClick={removeSelected}
            disabled={selectedIds.size === 0}
            className="text-xs sm:text-sm text-red-600 hover:text-red-800 disabled:text-gray-400 disabled:cursor-not-allowed"
          >
            선택 삭제
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8">
          {/* 장바구니 아이템 목록 */}
          <div className="lg:col-span-2 space-y-3 sm:space-y-4">
            {items.map((item, index) => (
              <AnimatedContent key={item.id} once distance={50} duration={0.6} delay={index * 0.1}>
              <div 
                className={`bg-gradient-to-br from-blue-100 via-blue-50 to-white rounded-lg border p-4 sm:p-6 shadow-sm transition-all ${
                  selectedIds.has(item.id) ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'
                }`}
              >
                <div className="flex items-start">
                  {/* 체크박스 */}
                  <div className="flex items-center mr-3 sm:mr-4 pt-1">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(item.id)}
                      onChange={() => toggleSelect(item.id)}
                      className="w-4 h-4 sm:w-5 sm:h-5 text-blue-900 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                    />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center flex-wrap gap-1.5 sm:gap-2 mb-2">
                      <span className="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 sm:py-1 rounded">
                        {promptTypeToCategory[item.category] || item.category}
                      </span>
                      <div className="flex items-center space-x-1 text-xs text-gray-500">
                        <span>⭐</span>
                        <span>{item.rating}</span>
                      </div>
                    </div>
                    
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1.5 sm:mb-2 truncate">
                      {item.title}
                    </h3>
                    
                    <p className="text-gray-600 text-xs sm:text-sm mb-2 sm:mb-3 line-clamp-2">
                      {item.description}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-xs sm:text-sm text-gray-500 truncate">by {item.sellerName}</span>
                      <div className="text-base sm:text-lg font-bold text-gray-900 ml-2">{item.price}P</div>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="ml-2 sm:ml-4 p-1.5 sm:p-2 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                  >
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            <div className="bg-gradient-to-br from-blue-100 via-blue-50 to-white rounded-lg border border-gray-200 p-4 sm:p-6 shadow-sm">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">주문 요약</h3>
              
              <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-6">
                <div className="flex justify-between text-xs sm:text-sm">
                  <span className="text-gray-600">선택한 상품</span>
                  <span className="text-gray-900">{selectedItems.length}개</span>
                </div>
                <div className="flex justify-between text-xs sm:text-sm">
                  <span className="text-gray-600">전체 상품</span>
                  <span className="text-gray-500">{items.length}개</span>
                </div>
                <div className="flex justify-between text-xs sm:text-sm">
                  <span className="text-gray-600">선택 금액</span>
                  <span className="text-gray-900">{selectedTotalPrice}P</span>
                </div>
                <div className="flex justify-between text-xs sm:text-sm">
                  <span className="text-gray-600">보유 크레딧</span>
                  <span className={`font-medium ${credit >= selectedTotalPrice ? 'text-green-600' : 'text-red-600'}`}>
                    {credit}P
                  </span>
                </div>
                <div className="border-t border-gray-200 pt-2 sm:pt-3">
                  <div className="flex justify-between font-semibold">
                    <span className="text-gray-900 text-sm sm:text-base">결제 금액</span>
                    <span className="text-blue-900 text-base sm:text-lg">{selectedTotalPrice}P</span>
                  </div>
                </div>
              </div>

              <button
                onClick={handlePurchase}
                disabled={isProcessing || selectedItems.length === 0}
                className="w-full bg-blue-900 text-white font-medium py-2.5 sm:py-3 rounded-lg hover:bg-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-sm sm:text-base"
              >
                {isProcessing ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 sm:mr-3 h-4 w-4 sm:h-5 sm:w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
                className="w-full mt-2 sm:mt-3 border border-gray-300 text-gray-700 font-medium py-2.5 sm:py-3 rounded-lg hover:bg-gray-50 transition-colors text-sm sm:text-base"
              >
                장바구니 비우기
              </button>

              <div className="mt-4 sm:mt-6 text-center">
                <Link
                  to="/marketplace"
                  className="text-blue-900 text-xs sm:text-sm font-medium hover:underline"
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
