import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { userApi } from '../../services/api';
import LightRays from '../../components/LightRays';
import SplitText from '../../components/SplitText';
import AnimatedContent from '../../components/AnimatedContent';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  
  // 이전 페이지 경로 (state에서 가져오거나 기본값은 마켓플레이스)
  const from = (location.state as { from?: string })?.from || '/marketplace';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await userApi.login({ email, password });
      const { accessToken, refreshToken, idToken } = response.data;
      
      // 토큰 저장
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('idToken', idToken);
      
      // 이전 페이지로 이동 (로그인/회원가입 페이지는 제외)
      const redirectTo = from.startsWith('/auth') ? '/marketplace' : from;
      navigate(redirectTo);
    } catch (error: any) {
      const message = error.response?.data || '로그인에 실패했습니다.';
      alert(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-black overflow-hidden">
      {/* 배경 그라데이션 */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900/80 via-gray-900 to-black" />
      </div>

      {/* LightRays 효과 */}
      <div className="absolute inset-0 z-[1]" style={{ width: '100%', height: '100%' }}>
        <LightRays
          raysOrigin="top-center"
          raysColor="#ffffff"
          raysSpeed={1}
          lightSpread={1}
          rayLength={3}
          followMouse={false}
          fadeDistance={3}
          saturation={1}
          mouseInfluence={0.1}
          noiseAmount={0.1}
          distortion={0.05}
        />
      </div>

      <div className="relative z-10 flex flex-col justify-center py-12 sm:px-6 lg:px-8 min-h-screen">
        {/* 상단 로고와 제목 */}
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="flex items-center justify-center mb-8">
            <Link to="/" className="flex items-center space-x-2 mr-4">
              <div className="w-10 h-10 rounded-md overflow-hidden flex items-center justify-center shadow-lg">
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
                <div className="w-10 h-10 bg-white rounded-md flex items-center justify-center shadow-lg" style={{ display: 'none' }}>
                  <span className="text-black font-bold text-base">P</span>
                </div>
              </div>
              <h2 className="text-2xl font-bold text-white">
                FromProm
              </h2>
            </Link>

          </div>
          <div className="flex justify-center items-center space-x-3 mb-3">
            <SplitText
              text="로그인"
              className="text-3xl font-bold text-white"
              delay={50}
              duration={0.6}
              ease="power3.out"
              splitType="chars"
              from={{ opacity: 0, y: 30 }}
              to={{ opacity: 1, y: 0 }}
              threshold={0.1}
              rootMargin="-50px"
              textAlign="center"
              tag="h1"
            />
          </div>

          <div className="text-center">
            <SplitText
              text="FromProm에 오신 것을 환영합니다"
              className="text-gray-300"
              delay={30}
              duration={0.5}
              ease="power3.out"
              splitType="words"
              from={{ opacity: 0, y: 20 }}
              to={{ opacity: 1, y: 0 }}
              threshold={0.1}
              rootMargin="-50px"
              textAlign="center"
              tag="p"
            />
          </div>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <AnimatedContent
            distance={100}
            direction="vertical"
            reverse={false}
            duration={0.8}
            ease="power3.out"
            initialOpacity={0}
            animateOpacity
            scale={0.95}
            threshold={0.1}
            delay={0.2}
          >
            <div className="bg-gray-900/40 backdrop-blur-sm border border-gray-700/50 py-8 px-4 shadow-2xl sm:rounded-xl sm:px-10">
              <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300">
                  이메일
                </label>
                <div className="mt-1">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="your@email.com"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-300">
                  비밀번호
                </label>
                <div className="mt-1">
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-300">
                    로그인 상태 유지
                  </label>
                </div>

                <div className="text-sm">
                  <a href="#" className="font-medium text-gray-400 hover:text-gray-200">
                    비밀번호를 잊으셨나요?
                  </a>
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {isLoading ? '로그인 중...' : '로그인'}
                </button>
              </div>
            </form>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-600" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-gray-900/40 text-gray-400">또는</span>
                </div>
              </div>

              <div className="mt-6 text-center">
                <span className="text-sm text-gray-400">
                  계정이 없으신가요?{' '}
                  <Link to="/auth/register" className="font-medium text-blue-400 hover:text-blue-300">
                    회원가입
                  </Link>
                </span>
              </div>
            </div>
          </div>
          </AnimatedContent>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;