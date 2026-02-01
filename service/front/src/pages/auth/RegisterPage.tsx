import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { userApi } from '../../services/api';
import LightPillar from '../../components/LightPillar';
import SplitText from '../../components/SplitText';
import AnimatedContent from '../../components/AnimatedContent';
import { getFriendlyErrorMessage } from '../../utils/errorMessages';

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    nickname: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [termsError, setTermsError] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUpComplete, setIsSignUpComplete] = useState(false);
  const navigate = useNavigate();

  // 회원가입 요청
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!termsAgreed) {
      setTermsError(true);
      return;
    }
    setTermsError(false);
    
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
      alert('회원가입이 완료되었습니다. 이메일로 전송된 인증 코드를 입력해주세요.');
    } catch (error: any) {
      alert(getFriendlyErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  // Cognito 이메일 인증 코드 확인
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
      alert('이메일 인증이 완료되었습니다! 로그인 페이지로 이동합니다.');
      navigate('/auth/login');
    } catch (error: any) {
      alert(getFriendlyErrorMessage(error));
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
      alert(getFriendlyErrorMessage(error));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div className="relative min-h-screen overflow-hidden" style={{ background: 'linear-gradient(180deg, #05050A 0%, #020204 100%)', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* LightPillar 배경 효과 */}
      <div className="absolute inset-0 z-0 opacity-30">
        <LightPillar
          topColor="#3ACCEF"
          bottomColor="#3ACCEF"
          intensity={1}
          rotationSpeed={0.3}
          glowAmount={0.002}
          pillarWidth={3}
          pillarHeight={0.4}
          noiseIntensity={0.5}
          pillarRotation={25}
          interactive={false}
          mixBlendMode="screen"
          quality="medium"
        />
      </div>
      
      {/* 그라데이션 오버레이 */}
      <div 
        className="absolute inset-0 z-[1] pointer-events-none"
        style={{ 
          background: 'radial-gradient(60% 60% at 50% 40%, rgba(124,108,255,0.15), transparent)'
        }}
      />

      <div className="relative z-10 flex flex-col justify-center py-8 sm:py-12 px-4 sm:px-6 lg:px-8 min-h-screen">
        {/* 상단 로고와 제목 */}
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="flex items-center justify-center mb-6 sm:mb-8">
            <Link to="/" className="flex items-center space-x-2 mr-4">
              <div className="w-9 h-8 sm:w-11 sm:h-10 rounded-md overflow-hidden flex items-center justify-center shadow-lg">
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
              <h2 className="text-xl sm:text-2xl font-bold text-white">FromProm</h2>
            </Link>
          </div>
          
          <div className="flex justify-center items-center space-x-3 mb-3">
            <SplitText
              text="회원가입"
              className="text-2xl sm:text-3xl font-bold text-white"
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
              className="text-gray-300 text-sm sm:text-base"
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

        <div className="mt-6 sm:mt-8 sm:mx-auto sm:w-full sm:max-w-md">
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
            <div className="bg-gray-900/40 backdrop-blur-sm border border-gray-700/50 py-6 sm:py-8 px-4 shadow-2xl sm:rounded-xl sm:px-10">
              {/* 회원가입 완료 후 인증 코드 입력 화면 */}
              {isSignUpComplete ? (
                <div className="space-y-5 sm:space-y-6">
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
                    className="w-full py-3 px-4 border border-transparent rounded-lg text-sm font-medium text-white bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-600 hover:from-cyan-600 hover:via-blue-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-[1.02] active:scale-[0.98]"
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
                <form className="space-y-5 sm:space-y-6" onSubmit={handleSignUp}>
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
                    <p className="mt-1 text-xs text-gray-400">8자 이상, 대문자를 포함한 영문/숫자/특수문자 포함</p>
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
                  <div className={`p-3 rounded-lg transition-all ${termsError ? 'bg-red-500/10 border border-red-500/50 animate-pulse' : 'bg-transparent'}`}>
                    <div className="flex items-start">
                      <input
                        id="terms"
                        name="terms"
                        type="checkbox"
                        checked={termsAgreed}
                        onChange={(e) => {
                          setTermsAgreed(e.target.checked);
                          if (e.target.checked) setTermsError(false);
                        }}
                        className={`mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 rounded ${termsError ? 'border-red-500 ring-2 ring-red-500/50' : 'border-gray-300'}`}
                      />
                      <label htmlFor="terms" className="ml-3 text-sm text-gray-300">
                        <button type="button" onClick={() => setShowTermsModal(true)} className="font-medium text-blue-400 hover:text-blue-300 underline">이용약관 및 개인정보처리방침</button>에 동의합니다 *
                      </label>
                    </div>
                    {termsError && (
                      <div className="mt-2 flex items-center gap-2 text-red-400 text-sm font-medium">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        약관에 동의해주세요
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 px-4 border border-transparent rounded-lg text-sm font-medium text-white bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-600 hover:from-cyan-600 hover:via-blue-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-[1.02] active:scale-[0.98]"
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

      {/* 약관 모달 */}
      {showTermsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-white">이용약관 및 개인정보처리방침</h3>
              <button onClick={() => setShowTermsModal(false)} className="text-gray-400 hover:text-white text-2xl">&times;</button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh] text-gray-300 text-sm space-y-6">
              <section>
                <h4 className="text-white font-semibold mb-2">제1조 (목적)</h4>
                <p>본 약관은 FromProm(이하 "회사")이 제공하는 프롬프트 마켓플레이스 서비스(이하 "서비스")의 이용과 관련하여 회사와 이용자 간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.</p>
              </section>
              <section>
                <h4 className="text-white font-semibold mb-2">제2조 (서비스 이용)</h4>
                <p>1. 서비스는 회원가입 후 이용 가능합니다.<br/>2. 회원은 본 약관 및 회사가 정한 규정을 준수해야 합니다.<br/>3. 회사는 서비스 운영상 필요한 경우 사전 공지 후 서비스를 변경할 수 있습니다.</p>
              </section>
              <section>
                <h4 className="text-white font-semibold mb-2">제3조 (개인정보 수집 및 이용)</h4>
                <p>1. 회사는 서비스 제공을 위해 필요한 최소한의 개인정보를 수집합니다.<br/>2. 수집 항목: 이메일, 닉네임, 비밀번호(암호화 저장)<br/>3. 수집 목적: 회원 식별, 서비스 제공, 고객 지원<br/>4. 보유 기간: 회원 탈퇴 시까지</p>
              </section>
              <section>
                <h4 className="text-white font-semibold mb-2">제4조 (개인정보 보호)</h4>
                <p>회사는 이용자의 개인정보를 안전하게 관리하며, 법령에 따른 경우를 제외하고 제3자에게 제공하지 않습니다.</p>
              </section>
              <section>
                <h4 className="text-white font-semibold mb-2">제5조 (이용자의 의무)</h4>
                <p>1. 이용자는 타인의 권리를 침해하거나 불법적인 행위를 해서는 안 됩니다.<br/>2. 이용자는 자신의 계정 정보를 안전하게 관리해야 합니다.</p>
              </section>
            </div>
            <div className="p-4 border-t border-gray-700">
              <button onClick={() => setShowTermsModal(false)} className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegisterPage;
