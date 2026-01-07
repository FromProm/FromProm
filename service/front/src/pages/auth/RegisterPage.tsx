import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { userApi } from '../../services/api';
import LightRays from '../../components/LightRays';
import SplitText from '../../components/SplitText';
import AnimatedContent from '../../components/AnimatedContent';

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    nickname: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [isSignUpComplete, setIsSignUpComplete] = useState(false);
  const navigate = useNavigate();

  // 1단계: 회원가입 요청 (이메일 인증 코드 발송)
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      alert('비밀번호가 일치하지 않습니다.');
      return;
    }

    setIsLoading(true);
    
    try {
      await userApi.signUp({
        email: formData.email,
        password: formData.password,
        nickname: formData.nickname,
      });
      setIsSignUpComplete(true);
      setIsEmailSent(true);
      alert('회원가입이 완료되었습니다. 이메일로 전송된 인증 코드를 입력해주세요.');
    } catch (error: any) {
      const message = error.response?.data || '회원가입에 실패했습니다.';
      alert(message);
    } finally {
      setIsLoading(false);
    }
  };

  // 2단계: 이메일 인증 코드 확인
  const handleVerifyCode = async () => {
    if (!verificationCode) {
      alert('인증 코드를 입력해주세요.');
      return;
    }

    setIsLoading(true);
    try {
      await userApi.confirm({
        email: formData.email,
        code: verificationCode,
      });
      setIsEmailVerified(true);
      alert('이메일 인증이 완료되었습니다! 로그인 페이지로 이동합니다.');
      navigate('/auth/login');
    } catch (error: any) {
      const message = error.response?.data || '인증에 실패했습니다.';
      alert(message);
    } finally {
      setIsLoading(false);
    }
  };

  // 인증 코드 재전송
  const handleResendCode = async () => {
    try {
      await userApi.resendCode(formData.email);
      alert('인증 코드가 재전송되었습니다.');
    } catch (error: any) {
      const message = error.response?.data || '코드 재전송에 실패했습니다.';
      alert(message);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
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
                <div className="w-10 h-10 bg-white rounded-md flex items-center justify-center shadow-lg" style={{display: 'none'}}>
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
              text="회원가입"
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
              text="FromProm과 함께 시작하세요"
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
              {/* 회원가입 완료 후 인증 코드 입력 화면 */}
              {isSignUpComplete ? (
              <div className="space-y-6">
                <div className="text-center">
                  <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-white">이메일 인증</h3>
                  <p className="mt-2 text-sm text-gray-400">
                    {formData.email}로 전송된 인증 코드를 입력해주세요.
                  </p>
                </div>

                <div>
                  <label htmlFor="verificationCode" className="block text-sm font-medium text-gray-300">
                    인증 코드
                  </label>
                  <input
                    id="verificationCode"
                    type="text"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    className="mt-1 w-full px-3 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-center text-lg tracking-widest"
                    placeholder="000000"
                    maxLength={6}
                  />
                </div>

                <button
                  type="button"
                  onClick={handleVerifyCode}
                  disabled={isLoading}
                  className="w-full py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {isLoading ? '확인 중...' : '인증 확인'}
                </button>

                <button
                  type="button"
                  onClick={handleResendCode}
                  className="w-full py-2 text-sm text-gray-400 hover:text-white transition-colors"
                >
                  인증 코드 재전송
                </button>
              </div>
            ) : (
            <form className="space-y-6" onSubmit={handleSignUp}>
              {/* 닉네임 */}
              <div>
                <label htmlFor="nickname" className="block text-sm font-medium text-gray-300">
                  닉네임 *
                </label>
                <input
                  id="nickname"
                  name="nickname"
                  type="text"
                  required
                  value={formData.nickname}
                  onChange={handleChange}
                  className="mt-1 w-full px-3 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="프롬프트마스터"
                />
                <p className="mt-1 text-xs text-gray-400">다른 사용자에게 표시되는 이름입니다</p>
              </div>

              {/* 이메일 */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300">
                  이메일 *
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="mt-1 w-full px-3 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="your@email.com"
                />
              </div>

              {/* 비밀번호 */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-300">
                  비밀번호 *
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="mt-1 w-full px-3 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="••••••••"
                />
                <p className="mt-1 text-xs text-gray-400">8자 이상, 영문/숫자/특수문자 포함</p>
              </div>

              {/* 비밀번호 확인 */}
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300">
                  비밀번호 확인 *
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={`mt-1 w-full px-3 py-3 bg-white border rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 transition-colors ${
                    formData.confirmPassword && formData.password !== formData.confirmPassword
                      ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                      : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                  }`}
                  placeholder="••••••••"
                />
                {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                  <p className="mt-1 text-xs text-red-600">비밀번호가 일치하지 않습니다</p>
                )}
              </div>

              {/* 약관 동의 */}
              <div className="flex items-start">
                <input
                  id="terms"
                  name="terms"
                  type="checkbox"
                  required
                  className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="terms" className="ml-3 text-sm text-gray-300">
                  <span className="font-medium text-blue-400">이용약관</span> 및{' '}
                  <span className="font-medium text-blue-400">개인정보처리방침</span>에 동의합니다 *
                </label>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isLoading ? '가입 중...' : '회원가입'}
              </button>
            </form>
            )}

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
                  이미 계정이 있으신가요?{' '}
                  <Link to="/auth/login" className="font-medium text-blue-400 hover:text-blue-300">
                    로그인
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

export default RegisterPage;