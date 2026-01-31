import { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useCartStore } from '../store/cartStore';

const Header = () => {
  const { isAuthenticated, userInfo, fetchUserInfo, logout, checkAuth } = useAuthStore();
  const { getItemCount } = useCartStore();
  const navigate = useNavigate();
  const location = useLocation();
  const cartItemCount = getItemCount();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // 현재 페이지 확인 함수
  const isCurrentPage = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard' || location.pathname.startsWith('/dashboard');
    }
    return location.pathname === path;
  };

  // 메뉴 스타일 (현재 페이지면 파란색)
  const getMenuStyle = (path: string) => {
    return isCurrentPage(path)
      ? 'text-blue-600 font-bold'
      : 'text-gray-600 hover:text-gray-900 font-medium';
  };

  // 로그인 상태 확인 및 사용자 정보 가져오기
  useEffect(() => {
    checkAuth();
    const token = localStorage.getItem('accessToken');
    if (token) {
      fetchUserInfo();
    }
  }, [checkAuth, fetchUserInfo]);

  // 페이지 이동 시 모바일 메뉴 닫기
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    setIsMobileMenuOpen(false);
    
    // 현재 페이지가 마켓플레이스면 마켓플레이스에 머무르고, 아니면 랜딩페이지로
    if (location.pathname === '/marketplace' || location.pathname.startsWith('/prompt/')) {
      navigate('/marketplace');
    } else {
      navigate('/');
    }
  };

  return (
    <header className="bg-gradient-to-br from-indigo-200 via-indigo-100 to-indigo-50 border-b border-indigo-300 shadow-[0_8px_24px_rgba(0,0,0,0.15)]">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14">
          {/* 로고 */}
          <Link to="/" className="flex items-center space-x-3">
            <div className="w-10 h-9 rounded-md overflow-hidden flex items-center justify-center">
              {/* 이미지가 있으면 이미지를 사용하고, 없으면 기본 아이콘 사용 */}
              <img 
                src="/logo.png" 
                alt="FromProm Logo" 
                className="w-full h-full object-cover"
                onError={(e) => {
                  // 이미지 로드 실패 시 기본 아이콘으로 대체
                  e.currentTarget.style.display = 'none';
                  const sibling = e.currentTarget.nextElementSibling as HTMLElement;
                  if (sibling) sibling.style.display = 'flex';
                }}
              />
              <div className="w-10 h-9 bg-blue-600 rounded-md flex items-center justify-center" style={{display: 'none'}}>
                <span className="text-white font-bold text-base">F</span>
              </div>
            </div>
            <span className="text-xl font-semibold text-gray-900 tracking-tight">FromProm</span>
          </Link>

          {/* 데스크탑 메뉴 */}
          <div className="hidden md:flex items-center justify-between flex-1 ml-8">
            {isAuthenticated ? (
              <>
                {/* 왼쪽 메뉴들 - 가이드 > 마켓 > 장바구니 > 마이페이지 순서 */}
                <div className="flex items-center space-x-6">
                  <Link
                    to="/docs"
                    className={`${getMenuStyle('/docs')} transition-colors`}
                  >
                    사용 가이드
                  </Link>
                  <Link
                    to="/marketplace"
                    className={`${getMenuStyle('/marketplace')} transition-colors`}
                  >
                    마켓
                  </Link>
                  <Link
                    to="/cart"
                    className={`relative ${getMenuStyle('/cart')} transition-colors`}
                  >
                    장바구니
                    {cartItemCount > 0 && (
                      <span className="absolute -top-2 -right-3 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                        {cartItemCount > 9 ? '9+' : cartItemCount}
                      </span>
                    )}
                  </Link>
                  <Link
                    to="/dashboard"
                    className={`${getMenuStyle('/dashboard')} transition-colors`}
                  >
                    마이페이지
                  </Link>
                </div>
                
                {/* 오른쪽: 프롬프트 등록 + 환영 메시지 + 로그아웃 */}
                <div className="flex items-center space-x-4">
                  <Link
                    to="/prompt/create"
                    className={`px-3 py-1.5 rounded-md transition-all ${
                      isCurrentPage('/prompt/create')
                        ? 'bg-blue-900 text-white font-bold'
                        : 'bg-blue-200 text-blue-900 font-medium hover:bg-blue-900 hover:text-white animate-bounce-subtle'
                    }`}
                  >
                    ✏️ 프롬프트 등록
                  </Link>
                  {userInfo?.nickname && (
                    <span className="text-sm text-gray-700">
                      환영합니다. {userInfo.nickname}님
                    </span>
                  )}
                  <button
                    onClick={handleLogout}
                    className="text-red-600 hover:text-red-700 font-medium transition-colors"
                  >
                    로그아웃
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-end flex-1 space-x-6">
                <Link
                  to="/docs"
                  className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
                >
                  가이드
                </Link>
                <Link
                  to="/auth/login"
                  state={{ from: location.pathname }}
                  className="bg-blue-900 text-white font-medium px-4 py-2 rounded-md text-sm hover:bg-blue-800 transition-colors"
                >
                  로그인
                </Link>
              </div>
            )}
          </div>

          {/* 모바일 햄버거 메뉴 버튼 */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isMobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* 모바일 메뉴 드롭다운 */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-indigo-200">
            {isAuthenticated ? (
              <div className="space-y-3">
                {userInfo?.nickname && (
                  <div className="px-2 py-2 text-sm text-gray-700 bg-indigo-50 rounded-lg">
                    환영합니다. {userInfo.nickname}님!
                  </div>
                )}
                <Link
                  to="/docs"
                  className={`block px-2 py-2 ${isCurrentPage('/docs') ? 'text-blue-600 bg-blue-50 font-bold' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 font-medium'} rounded-lg transition-colors`}
                >
                  사용 가이드
                </Link>
                <Link
                  to="/marketplace"
                  className={`block px-2 py-2 ${isCurrentPage('/marketplace') ? 'text-blue-600 bg-blue-50 font-bold' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 font-medium'} rounded-lg transition-colors`}
                >
                  마켓
                </Link>
                <Link
                  to="/prompt/create"
                  className={`block px-2 py-2 text-center rounded-lg transition-all ${
                    isCurrentPage('/prompt/create')
                      ? 'bg-blue-900 text-white font-bold'
                      : 'bg-blue-200 text-blue-900 font-medium animate-bounce-subtle'
                  }`}
                >
                  ✏️ 프롬프트 등록
                </Link>
                <Link
                  to="/cart"
                  className={`flex items-center justify-between px-2 py-2 ${isCurrentPage('/cart') ? 'text-blue-600 bg-blue-50 font-bold' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 font-medium'} rounded-lg transition-colors`}
                >
                  <span>장바구니</span>
                  {cartItemCount > 0 && (
                    <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                      {cartItemCount > 9 ? '9+' : cartItemCount}
                    </span>
                  )}
                </Link>
                <Link
                  to="/dashboard"
                  className={`block px-2 py-2 ${isCurrentPage('/dashboard') ? 'text-blue-600 bg-blue-50 font-bold' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 font-medium'} rounded-lg transition-colors`}
                >
                  마이페이지
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-2 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg font-medium transition-colors"
                >
                  로그아웃
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <Link
                  to="/marketplace"
                  className="block px-2 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg font-medium transition-colors"
                >
                  마켓플레이스
                </Link>
                <Link
                  to="/docs"
                  className="block px-2 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg font-medium transition-colors"
                >
                  가이드
                </Link>
                <Link
                  to="/auth/login"
                  state={{ from: location.pathname }}
                  className="block px-2 py-2 bg-blue-600 text-white text-center font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  로그인
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;