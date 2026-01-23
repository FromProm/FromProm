import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';

const Header = () => {
  const [showMenu, setShowMenu] = useState(false);
  const { getItemCount } = useCartStore();
  const { isAuthenticated, userInfo, fetchUserInfo, logout, checkAuth } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const cartItemCount = getItemCount();

  // 로그인 상태 확인 및 사용자 정보 가져오기
  useEffect(() => {
    checkAuth();
    const token = localStorage.getItem('accessToken');
    if (token) {
      fetchUserInfo();
    }
  }, [checkAuth, fetchUserInfo]);

  // 메뉴 바깥 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showMenu && !target.closest('.menu-container')) {
        setShowMenu(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showMenu]);

  const handleLogout = () => {
    logout();
    setShowMenu(false);
    
    // 현재 페이지가 마켓플레이스면 마켓플레이스에 머무르고, 아니면 랜딩페이지로
    if (location.pathname === '/marketplace' || location.pathname.startsWith('/prompt/')) {
      navigate('/marketplace');
    } else {
      navigate('/');
    }
  };

  return (
    <header className="bg-gradient-to-br from-blue-100 via-blue-50 to-white border-b border-blue-200 shadow-sm">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* 로고 */}
          <Link to="/" className="flex items-center space-x-3">
            <div className="w-13 h-14 rounded-md overflow-hidden flex items-center justify-center">
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
              <div className="w-10 h-10 bg-blue-600 rounded-md flex items-center justify-center" style={{display: 'none'}}>
                <span className="text-white font-bold text-base">F</span>
              </div>
            </div>
            <span className="text-xl font-semibold text-gray-900 tracking-tight">FromProm</span>
          </Link>

          {/* 사용자 메뉴 */}
          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <>
                {userInfo?.nickname && (
                  <span className="text-sm text-gray-700">
                    환영합니다. {userInfo.nickname}님!
                  </span>
                )}
                <div className="relative menu-container">
                {/* 메뉴 아이콘 (햄버거) */}
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-2 text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                {showMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-50">
                    <Link
                      to="/marketplace"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      마켓플레이스
                    </Link>
                    <Link
                      to="/cart"
                      className="flex items-center justify-between px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <span>장바구니</span>
                      {cartItemCount > 0 && (
                        <span className="bg-blue-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                          {cartItemCount}
                        </span>
                      )}
                    </Link>
                    <Link
                      to="/credit"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      크레딧 충전
                    </Link>
                    <Link
                      to="/prompt/create"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      프롬프트 등록
                    </Link>
                    <div className="border-t border-gray-100 my-1"></div>
                    <Link
                      to="/dashboard"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      내 프로필
                    </Link>
                    <Link
                      to="/dashboard/purchased"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      구매한 프롬프트
                    </Link>
                    <Link
                      to="/dashboard/selling"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      판매 중인 프롬프트
                    </Link>
                    <Link
                      to="/dashboard/analytics"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      판매 분석
                    </Link>
                    <Link
                      to="/dashboard/settings"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      개인정보 설정
                    </Link>
                    <div className="border-t border-gray-100 my-1"></div>
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                    >
                      로그아웃
                    </button>
                  </div>
                )}
              </div>
              </>
            ) : (
              <div className="flex items-center space-x-4">
                <Link
                  to="/marketplace"
                  className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
                >
                  Marketplace
                </Link>
                <Link
                  to="/auth/login"
                  className="bg-blue-600 text-white font-medium px-4 py-2 rounded-md text-sm hover:bg-blue-700 transition-colors"
                >
                  Sign in
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;