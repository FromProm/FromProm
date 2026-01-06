import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { usePurchaseStore } from '../../store/purchaseStore';
import { useCartStore } from '../../store/cartStore';
import { userApi } from '../../services/api';

const DashboardPage = () => {
  const [nickname, setNickname] = useState<string>('');
  const { getPurchasedPrompts } = usePurchaseStore();
  const { getItemCount } = useCartStore();

  // 사용자 정보 가져오기
  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const response = await userApi.getMe();
        setNickname(response.data.nickname || '사용자');
      } catch (error) {
        console.error('Failed to fetch user info:', error);
        setNickname('사용자');
      }
    };
    fetchUserInfo();
  }, []);
  
  const purchasedPrompts = getPurchasedPrompts();
  const cartItemCount = getItemCount();
  
  // 통계 데이터
  const stats = {
    totalPurchased: purchasedPrompts.length,
    totalSpent: purchasedPrompts.reduce((sum, prompt) => sum + prompt.price, 0),
    cartItems: cartItemCount,
    favoriteCategory: purchasedPrompts.length > 0 
      ? purchasedPrompts.reduce((acc, prompt) => {
          acc[prompt.category] = (acc[prompt.category] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      : {}
  };
  
  const mostUsedCategory = Object.keys(stats.favoriteCategory).length > 0
    ? Object.entries(stats.favoriteCategory).sort(([,a], [,b]) => b - a)[0][0]
    : '없음';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-blue-50 to-white">
      {/* 배경 그라데이션 효과 */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-900/5 via-transparent to-blue-900/5 pointer-events-none"></div>
      
      <div className="relative w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">대시보드</h1>
          <p className="text-gray-600">안녕하세요, {nickname}님! 프롬프트 활동을 한눈에 확인해보세요.</p>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* 구매한 프롬프트 수 */}
          <div className="bg-white rounded-lg shadow-lg border border-blue-100 p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-blue-900/10 to-transparent rounded-full -translate-y-10 translate-x-10"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600">구매한 프롬프트</h3>
                <div className="p-2 bg-blue-100 rounded-lg">
                  <svg className="w-5 h-5 text-blue-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900">{stats.totalPurchased}</div>
              <p className="text-xs text-gray-500 mt-1">개의 프롬프트</p>
            </div>
          </div>

          {/* 총 지출 금액 */}
          <div className="bg-white rounded-lg shadow-lg border border-blue-100 p-6 relative overflow-hidden">
            <div className="absolute bottom-0 left-0 w-16 h-16 bg-gradient-to-tr from-blue-900/8 to-transparent rounded-full translate-y-8 -translate-x-8"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600">총 지출</h3>
                <div className="p-2 bg-green-100 rounded-lg">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900">{stats.totalSpent}P</div>
              <p className="text-xs text-gray-500 mt-1">포인트 사용</p>
            </div>
          </div>

          {/* 장바구니 아이템 */}
          <div className="bg-white rounded-lg shadow-lg border border-blue-100 p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-18 h-18 bg-gradient-to-br from-blue-900/6 to-transparent rounded-full -translate-y-9 -translate-x-9"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600">장바구니</h3>
                <div className="p-2 bg-purple-100 rounded-lg">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-1.5 6M7 13l-1.5-6m0 0h15.5M17 21a2 2 0 100-4 2 2 0 000 4zM9 21a2 2 0 100-4 2 2 0 000 4z" />
                  </svg>
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900">{stats.cartItems}</div>
              <p className="text-xs text-gray-500 mt-1">개의 아이템</p>
            </div>
          </div>

          {/* 선호 카테고리 */}
          <div className="bg-white rounded-lg shadow-lg border border-blue-100 p-6 relative overflow-hidden">
            <div className="absolute bottom-0 right-0 w-22 h-22 bg-gradient-to-tl from-blue-900/7 to-transparent rounded-full translate-y-11 translate-x-11"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600">선호 카테고리</h3>
                <div className="p-2 bg-orange-100 rounded-lg">
                  <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </div>
              </div>
              <div className="text-lg font-bold text-gray-900 truncate">{mostUsedCategory}</div>
              <p className="text-xs text-gray-500 mt-1">가장 많이 구매</p>
            </div>
          </div>
        </div>

        {/* 빠른 액션 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* 최근 구매한 프롬프트 */}
          <div className="bg-white rounded-lg shadow-lg border border-blue-100 p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-blue-900/8 to-transparent rounded-full -translate-y-16 translate-x-16"></div>
            <div className="relative">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">최근 구매한 프롬프트</h3>
              {purchasedPrompts.length > 0 ? (
                <div className="space-y-3">
                  {purchasedPrompts.slice(0, 3).map((prompt) => (
                    <div key={prompt.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 text-sm truncate">{prompt.title}</h4>
                        <p className="text-xs text-gray-500">{prompt.category}</p>
                      </div>
                      <div className="text-sm font-medium text-blue-900">{prompt.price}P</div>
                    </div>
                  ))}
                  <Link
                    to="/dashboard/purchased"
                    className="block text-center text-blue-900 text-sm font-medium hover:underline mt-4"
                  >
                    모든 구매 내역 보기 →
                  </Link>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <p className="text-gray-500 text-sm mb-4">아직 구매한 프롬프트가 없습니다</p>
                  <Link
                    to="/marketplace"
                    className="inline-flex items-center px-4 py-2 bg-blue-900 text-white text-sm font-medium rounded-lg hover:bg-blue-800 transition-colors"
                  >
                    프롬프트 둘러보기
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* 빠른 액션 메뉴 */}
          <div className="bg-white rounded-lg shadow-lg border border-blue-100 p-6 relative overflow-hidden">
            <div className="absolute bottom-0 left-0 w-28 h-28 bg-gradient-to-tr from-blue-900/6 to-transparent rounded-full translate-y-14 -translate-x-14"></div>
            <div className="relative">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">빠른 액션</h3>
              <div className="grid grid-cols-2 gap-4">
                <Link
                  to="/marketplace"
                  className="flex flex-col items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors group"
                >
                  <div className="w-12 h-12 bg-blue-900 rounded-lg flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-gray-900">프롬프트 찾기</span>
                </Link>

                <Link
                  to="/cart"
                  className="flex flex-col items-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors group"
                >
                  <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-1.5 6M7 13l-1.5-6m0 0h15.5M17 21a2 2 0 100-4 2 2 0 000 4zM9 21a2 2 0 100-4 2 2 0 000 4z" />
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-gray-900">장바구니</span>
                </Link>

                <Link
                  to="/credit"
                  className="flex flex-col items-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors group"
                >
                  <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-gray-900">크레딧 충전</span>
                </Link>

                <Link
                  to="/prompt/create"
                  className="flex flex-col items-center p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors group"
                >
                  <div className="w-12 h-12 bg-orange-600 rounded-lg flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-gray-900">프롬프트 등록</span>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* 추가 메뉴 */}
        <div className="bg-white rounded-lg shadow-lg border border-blue-100 p-6 relative overflow-hidden">
          <div className="absolute top-0 left-1/2 w-40 h-40 bg-gradient-to-b from-blue-900/5 to-transparent rounded-full -translate-y-20 -translate-x-1/2"></div>
          <div className="relative">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">더 많은 기능</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Link
                to="/dashboard/purchased"
                className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors group"
              >
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-4 group-hover:bg-blue-200 transition-colors">
                  <svg className="w-5 h-5 text-blue-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">구매한 프롬프트</h4>
                  <p className="text-sm text-gray-500">내가 구매한 모든 프롬프트 관리</p>
                </div>
              </Link>

              <Link
                to="/dashboard/selling"
                className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors group"
              >
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-4 group-hover:bg-green-200 transition-colors">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">판매 중인 프롬프트</h4>
                  <p className="text-sm text-gray-500">내가 등록한 프롬프트 관리</p>
                </div>
              </Link>

              <Link
                to="/dashboard/analytics"
                className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors group"
              >
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-4 group-hover:bg-purple-200 transition-colors">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">분석 및 통계</h4>
                  <p className="text-sm text-gray-500">상세한 사용 통계 및 분석</p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;