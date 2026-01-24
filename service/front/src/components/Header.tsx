import { useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useCartStore } from '../store/cartStore';

const Header = () => {
  const { isAuthenticated, userInfo, fetchUserInfo, logout, checkAuth } = useAuthStore();
  const { getItemCount } = useCartStore();
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

  const handleLogout = () => {
    logout();
    
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
                <Link
                  to="/dashboard"
                  className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
                >
                  프로필
                </Link>
                <Link
                  to="/cart"
                  className="relative text-gray-600 hover:text-gray-900 font-medium transition-colors"
                >
                  장바구니
                  {cartItemCount > 0 && (
                    <span className="absolute -top-2 -right-3 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                      {cartItemCount > 9 ? '9+' : cartItemCount}
                    </span>
                  )}
                </Link>
                <Link
                  to="/prompt/create"
                  className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
                >
                  프롬프트 등록
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-red-600 hover:text-red-700 font-medium transition-colors"
                >
                  로그아웃
                </button>
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
                  state={{ from: location.pathname }}
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