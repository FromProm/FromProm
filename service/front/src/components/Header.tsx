import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCartStore } from '../store/cartStore';
import { userApi } from '../services/api';

const Header = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showMyPageMenu, setShowMyPageMenu] = useState(false);
  const { getItemCount } = useCartStore();
  const navigate = useNavigate();
  const cartItemCount = getItemCount();

  // 로그인 상태 확인
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    setIsAuthenticated(!!token);
  }, []);

  const handleLogout = async () => {
    try {
      await userApi.logout();
    } catch (error) {
      console.error('Logout API error:', error);
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('idToken');
      setIsAuthenticated(false);
      navigate('/');
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* 로고 */}
          <Link to="/marketplace" className="flex items-center space-x-3">
            <div className="w-13 h-14 rounded-md overflow-hidden flex items-center justify-center">
              {/* 이미지가 있으면 이미지를 사용하고, 없으면 기본 아이콘 사용 */}
              <img 
                src="/logo.png" 
                alt="FromProm Logo" 
                className="w-full h-full object-cover"
                onError={(e) => {
                  // 이미지 로드 실패 시 기본 아이콘으로 대체
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.nextElementSibling.style.display = 'flex';
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
              <div className="flex items-center space-x-4">
                {/* 장바구니 아이콘 - 로그인 시에만 표시 */}
                <Link
                  to="/cart"
                  className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-1.5 6M7 13l-1.5-6m0 0h15.5M17 21a2 2 0 100-4 2 2 0 000 4zM9 21a2 2 0 100-4 2 2 0 000 4z" />
                  </svg>
                  {cartItemCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                      {cartItemCount}
                    </span>
                  )}
                </Link>

                {/* 크레딧 충전 */}
                <Link
                  to="/credit"
                  className="text-gray-600 hover:text-gray-900 transition-colors text-sm font-medium"
                >
                  크레딧 충전
                </Link>

                {/* 내 페이지 드롭다운 */}
                <div className="relative">
                  <button
                    onClick={() => setShowMyPageMenu(!showMyPageMenu)}
                    onBlur={() => setTimeout(() => setShowMyPageMenu(false), 150)}
                    className="text-gray-600 hover:text-gray-900 transition-colors text-sm font-medium flex items-center"
                  >
                    내 페이지
                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {showMyPageMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-50">
                      <Link
                        to="/dashboard"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        대시보드
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
                    </div>
                  )}
                </div>

                {/* 프롬프트 등록 */}
                <Link
                  to="/prompt/create"
                  className="bg-blue-600 text-white font-medium px-4 py-2 rounded-md text-sm hover:bg-blue-700 transition-colors"
                >
                  프롬프트 등록
                </Link>

                {/* 로그아웃 */}
                <button
                  onClick={handleLogout}
                  className="text-gray-600 hover:text-gray-900 font-medium text-sm transition-colors"
                >
                  로그아웃
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link
                  to="/auth/login"
                  className="bg-blue-600 text-white font-medium px-4 py-2 rounded-md text-sm hover:bg-blue-700 transition-colors"
                >
                  로그인
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