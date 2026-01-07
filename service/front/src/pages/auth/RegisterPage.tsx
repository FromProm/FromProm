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
  const [cognitoVerificationCode, setCognitoVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [isSignUpComplete, setIsSignUpComplete] = useState(false);
  const navigate = useNavigate();

  // 이메일 인증번호 발송
  const handleSendVerificationCode = async () => {
    if (!formData.email) {
      alert('이메일을 입력해주세요.');
      return;
    }

    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      alert('올바른 이메일 형식을 입력해주세요.');
      return;
    }

    setIsLoading(true);
    try {
      await userApi.sendVerificationCode(formData.email);
      setIsCodeSent(true);
      alert('인증 코드가 이메일로 발송되었습니다.');
    } catch (error: any) {
      const message = error.response?.data || '인증 코드 발송에 실패했습니다.';
      alert(message);
    } finally {
      setIsLoading(false);
    }
  };

  // 이메일 인증번호 확인
  const handleVerifyCode = async () => {
    if (!verificationCode) {
      alert('인증 코드를 입력해주세요.');
      return;
    }

    setIsLoading(true);
    try {
      await userApi.verifyCode(formData.email, verificationCode);
      setIsEmailVerified(true);
      alert('이메일 인증이 완료되었습니다.');
    } catch (error: any) {
      const message = error.response?.data || '인증에 실패했습니다.';
      alert(message);
    } finally {
      setIsLoading(false);
    }
  };

  // 회원가입 요청
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isEmailVerified) {
      alert('이메일 인증을 완료해주세요.');
      return;
    }
    
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
      alert('회원가입이 완료되었습니다. Cognito 이메일 인증 코드를 입력해주세요.');
    } catch (error: any) {
      const message = error.response?.data || '회원가입에 실패했습니다.';
      alert(message);
    } finally {
      setIsLoading(false);
    }
  };

  // Cognito 이메일 인증 코드 확인
  const handleCognitoVerify = async () => {
    if (!cognitoVerificationCode) {
      alert('인증 코드를 입력해주세요.');
      return;
    }

    setIsLoading(true);
    try {
      await userApi.confirm({
        email: formData.email,
        code: cognitoVerificationCode,
      });
      alert('회원가입이 완료되었습니다! 로그인 페이지로 이동합니다.');
      navigate('/auth/login');
    } catch (error: any) {
      const message = error.response?.data || '인증에 실패했습니다.';
      alert(message);
    } finally {
      setIsLoading(false);
    }
  };

  // Cognito 인증 코드 재전송
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
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // 이메일이 변경되면 인증 상태 초기화
    if (name === 'email') {
      setIsEmailVerified(false);
      setIsCodeSent(false);
      setVerificationCode('');
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
                <img 
                  src="/logo.png" 
                  alt="FromProm Logo" 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    const sibling = e.currentTarget.nextElementSibling as HTMLElement;
                    if (sibling) sibling.style.display = 'flex';
                  }}
                />
                <div className="w-10 h-10 bg-white rounded-md flex items-center justify-center shadow-lg" style={{display: 'none'}}>
                  <span className="text-black font-bold text-base">P</span>
                </div>
              </div>
              <h2 className="text-2xl font-bold text-white">FromProm</h2>
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
              {/* 회원가입 완료 후 Cognito 인증 코드 입력 화면 */}
              {isSignUpComplete ? (
                <div className="space-y-6">
                  <div className="text-center">
                    <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-white">최종 이메일 인증</h3>
                    <p className="mt-2 text-sm text-gray-400">
                      {formData.email}로 전송된 최종 인증 코드를 입력해주세요.
                    </p>
                  </div>

                  <div>
                    <label htmlFor="cognitoVerificationCode" className="block text-sm font-medium text-gray-300">
                      인증 코드
                    </label>
                    <input
                      id="cognitoVerificationCode"
                      type="text"
                      value={cognitoVerificationCode}
                      onChange={(e) => setCognitoVerificationCode(e.target.value)}
                      className="mt-1 w-full px-3 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-center text-lg tracking-widest"
                      placeholder="000000"
                      maxLength={6}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleCognitoVerify}
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

                  {/* 이메일 + 인증번호 발송 버튼 */}
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-300">
                      이메일 *
                    </label>
                    <div className="mt-1 flex gap-2">
                      <input
                        id="email"
                        name="email"
                        type="email"
                        required
                        value={formData.email}
                        onChange={handleChange}
                        disabled={isEmailVerified}
                        className={`flex-1 px-3 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${isEmailVerified ? 'bg-gray-100' : ''}`}
                        placeholder="your@email.com"
                      />
                      <button
                        type="button"
                        onClick={handleSendVerificationCode}
                        disabled={isLoading || isEmailVerified || !formData.email}
                        className="px-4 py-3 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                      >
                        {isLoading ? '발송 중...' : isCodeSent ? '재발송' : '인증번호 발송'}
                      </button>
                    </div>
                    {isEmailVerified && (
                      <p className="mt-1 text-xs text-green-500 flex items-center gap-1">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        이메일 인증 완료
                      </p>
                    )}
                  </div>

                  {/* 인증번호 입력 (코드 발송 후에만 표시) */}
                  {isCodeSent && !isEmailVerified && (
                    <div>
                      <label htmlFor="verificationCode" className="block text-sm font-medium text-gray-300">
                        인증번호 *
                      </label>
                      <div className="mt-1 flex gap-2">
                        <input
                          id="verificationCode"
                          type="text"
                          value={verificationCode}
                          onChange={(e) => setVerificationCode(e.target.value)}
                          className="flex-1 px-3 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                          placeholder="인증번호 6자리"
                          maxLength={6}
                        />
                        <button
                          type="button"
                          onClick={handleVerifyCode}
                          disabled={isLoading || !verificationCode}
                          className="px-4 py-3 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                        >
                          {isLoading ? '확인 중...' : '인증번호 확인'}
                        </button>
                      </div>
                      <p className="mt-1 text-xs text-gray-400">이메일로 전송된 6자리 인증번호를 입력해주세요</p>
                    </div>
                  )}

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
                      <p className="mt-1 text-xs text-red-500">비밀번호가 일치하지 않습니다</p>
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
                    disabled={isLoading || !isEmailVerified}
                    className="w-full py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {isLoading ? '가입 중...' : '회원가입'}
                  </button>
                  {!isEmailVerified && (
                    <p className="text-xs text-center text-gray-400">이메일 인증을 완료해야 회원가입이 가능합니다</p>
                  )}
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
