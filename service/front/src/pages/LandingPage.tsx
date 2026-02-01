import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../store/authStore';
import { useCartStore } from '../store/cartStore';
import { usePurchaseStore } from '../store/purchaseStore';
import { promptApi } from '../services/api';
import { promptTypeToCategory } from '../services/dummyData';
import TextType from '../components/TextType';
import LightPillar from '../components/LightPillar';
import TiltCard from '../components/TiltCard';
import Footer from '../components/Footer';

// 인기 프롬프트 타입
interface PopularPrompt {
  promptId: string;
  title: string;
  description: string;
  category: string;
  price: number;
  likeCount: number;
  nickname: string;
}

const LandingPage = () => {
  const { isAuthenticated } = useAuthStore();
  const { clearCart } = useCartStore();
  const { clearPurchases } = usePurchaseStore();
  const [popularPrompts, setPopularPrompts] = useState<PopularPrompt[]>([]);
  const [isLoadingPrompts, setIsLoadingPrompts] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 인기 프롬프트 가져오기 (좋아요 50개 이상)
  useEffect(() => {
    const fetchPopularPrompts = async () => {
      try {
        const response = await promptApi.getAllPrompts(100);
        if (response.data.success) {
          const filtered = (response.data.prompts || [])
            .filter((p: PopularPrompt) => (p.likeCount || 0) >= 3)
            .sort((a: PopularPrompt, b: PopularPrompt) => (b.likeCount || 0) - (a.likeCount || 0))
            .slice(0, 10);
          setPopularPrompts(filtered);
        }
      } catch (error) {
        console.error('Failed to fetch popular prompts:', error);
      } finally {
        setIsLoadingPrompts(false);
      }
    };
    fetchPopularPrompts();
  }, []);

  // 무한 스크롤 애니메이션 - CSS 기반으로 변경
  useEffect(() => {
    if (!scrollRef.current || popularPrompts.length === 0) return;
    
    const scrollContainer = scrollRef.current;
    
    // 호버 시 멈춤
    const handleMouseEnter = () => {
      scrollContainer.style.animationPlayState = 'paused';
    };
    const handleMouseLeave = () => {
      scrollContainer.style.animationPlayState = 'running';
    };
    
    scrollContainer.addEventListener('mouseenter', handleMouseEnter);
    scrollContainer.addEventListener('mouseleave', handleMouseLeave);
    
    return () => {
      scrollContainer.removeEventListener('mouseenter', handleMouseEnter);
      scrollContainer.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [popularPrompts]);

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('idToken');
    clearCart();
    clearPurchases();
    window.location.reload();
  };

  return (
    <div className="relative min-h-screen overflow-hidden" style={{ background: 'linear-gradient(180deg, #05050A 0%, #020204 100%)', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* LightPillar 배경 효과 */}
      <div className="absolute top-0 left-0 right-0 z-0 opacity-30" style={{ height: '150vh' }}>
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
          quality="high"
        />
        {/* 아래로 페이드아웃 */}
        <div className="absolute bottom-0 left-0 right-0 h-64" style={{ background: 'linear-gradient(to bottom, transparent, #020204)' }} />
      </div>
      
      {/* 그라데이션 오버레이 */}
      <div 
        className="absolute top-0 left-0 right-0 z-[1] pointer-events-none"
        style={{ 
          height: '100vh',
          background: 'radial-gradient(60% 60% at 50% 40%, rgba(124,108,255,0.15), transparent)'
        }}
      />

      {/* 헤더 */}
      <header className="relative z-10 border-b border-slate-800/50 bg-slate-900/30 backdrop-blur-xl">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14">
            <motion.div
              className="flex items-center"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="flex items-center space-x-3">
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
                  <div className="w-10 h-9 bg-white rounded-md flex items-center justify-center" style={{display: 'none'}}>
                    <span className="text-black font-bold text-base">P</span>
                  </div>
                </div>
                <span className="text-xl font-semibold text-white tracking-tight">FromProm</span>
              </div>
              {/* 메뉴 순서: 사용 가이드 > 마켓 > 장바구니 > 마이페이지 (프롬프트 등록은 우측으로) */}
              <nav className="hidden md:flex items-center space-x-6 ml-6">
                <Link to="/docs" className="text-gray-300 hover:text-white text-sm font-medium transition-colors">
                  사용 가이드
                </Link>
                <Link to="/marketplace" className="text-gray-300 hover:text-white text-sm font-medium transition-colors">
                  마켓
                </Link>
                {isAuthenticated && (
                  <>
                    <Link to="/cart" className="text-gray-300 hover:text-white text-sm font-medium transition-colors">
                      장바구니
                    </Link>
                    <Link to="/dashboard" className="text-gray-300 hover:text-white text-sm font-medium transition-colors">
                      마이페이지
                    </Link>
                  </>
                )}
              </nav>
            </motion.div>

            <motion.div
              className="hidden md:flex items-center space-x-6"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              {isAuthenticated ? (
                <div className="flex items-center space-x-4">
                  <Link to="/prompt/create" className="bg-blue-200 text-blue-900 font-medium px-3 py-1.5 rounded-md text-sm hover:bg-blue-900 hover:text-white transition-colors animate-bounce-subtle">
                    프롬프트 등록
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="text-red-400 hover:text-red-300 font-medium text-sm transition-colors"
                  >
                    로그아웃
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-4">
                  <Link
                    to="/auth/login"
                    state={{ from: '/' }}
                    className="text-gray-300 hover:text-white font-medium text-sm transition-colors"
                  >
                    로그인
                  </Link>
                  <Link
                    to="/auth/register"
                    className="bg-white text-black font-medium px-4 py-2 rounded-md text-sm hover:bg-gray-100 transition-colors"
                  >
                    회원가입
                  </Link>
                </div>
              )}
            </motion.div>

            {/* 모바일 햄버거 메뉴 버튼 */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-md text-gray-300 hover:text-white hover:bg-slate-800/50 transition-colors"
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
            <div className="md:hidden py-4 border-t border-slate-700/50">
              {isAuthenticated ? (
                <div className="space-y-3">
                  <Link
                    to="/docs"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block px-3 py-2 text-gray-300 hover:text-white hover:bg-slate-800/50 rounded-lg font-medium transition-colors"
                  >
                    사용 가이드
                  </Link>
                  <Link
                    to="/marketplace"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block px-3 py-2 text-gray-300 hover:text-white hover:bg-slate-800/50 rounded-lg font-medium transition-colors"
                  >
                    마켓
                  </Link>
                  <Link
                    to="/cart"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block px-3 py-2 text-gray-300 hover:text-white hover:bg-slate-800/50 rounded-lg font-medium transition-colors"
                  >
                    장바구니
                  </Link>
                  <Link
                    to="/dashboard"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block px-3 py-2 text-gray-300 hover:text-white hover:bg-slate-800/50 rounded-lg font-medium transition-colors"
                  >
                    마이페이지
                  </Link>
                  <Link
                    to="/prompt/create"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block px-3 py-2 text-gray-300 hover:text-white hover:bg-slate-800/50 rounded-lg font-bold transition-colors"
                  >
                    프롬프트 등록
                  </Link>
                  <button
                    onClick={() => {
                      handleLogout();
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg font-medium transition-colors"
                  >
                    로그아웃
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <Link
                    to="/docs"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block px-3 py-2 text-gray-300 hover:text-white hover:bg-slate-800/50 rounded-lg font-medium transition-colors"
                  >
                    사용 가이드
                  </Link>
                  <Link
                    to="/marketplace"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block px-3 py-2 text-gray-300 hover:text-white hover:bg-slate-800/50 rounded-lg font-medium transition-colors"
                  >
                    마켓
                  </Link>
                  <Link
                    to="/auth/login"
                    state={{ from: '/' }}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block px-3 py-2 text-gray-300 hover:text-white hover:bg-slate-800/50 rounded-lg font-medium transition-colors"
                  >
                    로그인
                  </Link>
                  <Link
                    to="/auth/register"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block px-3 py-2 text-center bg-white text-black font-medium rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    회원가입
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="relative z-10">
        <div className="w-full px-4 sm:px-6 lg:px-8 pt-20 pb-16">
          {/* 히어로 섹션 */}
          <div className="text-center max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 -mb-4">
                <span className="text-sm font-medium text-blue-300">프롬프트 성능 검증 플랫폼</span>
              </div>

              <h1 className="mb-0 tracking-tight text-center overflow-visible">
                <TextType
                  text={["FROMPROM"]}
                  className="text-white drop-shadow-2xl text-[12vw] sm:text-[8vw]"
                  style={{ 
                    fontFamily: 'system-ui, -apple-system, sans-serif', 
                    letterSpacing: '-0.05em',
                    fontWeight: 900,
                    whiteSpace: 'nowrap',
                    display: 'inline-flex',
                    WebkitTextStroke: '2px white'
                  }}
                  typingSpeed={180}
                  pauseDuration={3000}
                  showCursor
                  cursorCharacter="_"
                  cursorClassName="text-white"
                  deletingSpeed={80}
                  loop={false}
                  cursorBlinkDuration={0.5}
                />
              </h1>
            </motion.div>

            <motion.p 
              className="text-xl md:text-2xl text-gray-200 mt-8 mb-4 max-w-3xl mx-auto leading-relaxed font-medium"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
            >
              프롬프트의 가치를 <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-400 font-extrabold">수치로 증명</span>합니다
            </motion.p>

            {/* CTA 버튼 */}
            <motion.div
              className="flex flex-col justify-center items-center gap-4 mb-32"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              {/* 두 버튼 - 마켓, 가이드 */}
              <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
                <Link
                  to="/marketplace"
                  className="bg-white text-black font-bold px-6 py-2.5 rounded-lg hover:bg-gray-100 transition-all text-base shadow-lg hover:shadow-xl hover:scale-105"
                >
                  프롬프트 둘러보기
                </Link>

                <Link
                  to="/docs"
                  className="px-6 py-2.5 rounded-lg bg-blue-800/70 border border-cyan-400/60 text-white font-bold text-base text-center hover:bg-blue-700/80 hover:border-cyan-300/70 transition-all animate-bounce-subtle"
                >
                  사용 가이드 보기
                </Link>
              </div>
            </motion.div>

          </div>
        </div>

        {/* 이 달의 인기 프롬프트 - 전체 너비 무한 스크롤 캐러셀 */}
        {!isLoadingPrompts && popularPrompts.length > 0 && (
          <motion.div
            className="mt-8 pb-20"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            <h2 className="text-4xl font-bold text-white mb-4 text-center">
              인기 프롬프트
            </h2>
            <div className="relative w-full overflow-hidden">
              {/* 좌우 페이드 효과 - 랜딩페이지 배경색과 맞춤 */}
              <div className="absolute left-0 top-0 bottom-0 w-24 sm:w-48 bg-gradient-to-r from-[#020204] to-transparent z-10 pointer-events-none" />
              <div className="absolute right-0 top-0 bottom-0 w-24 sm:w-48 bg-gradient-to-l from-[#020204] to-transparent z-10 pointer-events-none" />
              
              {/* 스크롤 컨테이너 */}
              <div
                ref={scrollRef}
                className="flex gap-4 sm:gap-6 py-6 px-4 animate-scroll-left"
              >
                {/* 무한 스크롤을 위해 아이템 복제 */}
                {[...popularPrompts, ...popularPrompts].map((prompt, index) => (
                  <TiltCard
                    key={`${prompt.promptId}-${index}`}
                    rotateAmplitude={10}
                    scaleOnHover={1.02}
                  >
                    <Link
                      to={`/prompt/${prompt.promptId}`}
                      className="block flex-shrink-0 w-[260px] h-[200px] sm:w-[320px] sm:h-[220px] bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-md border border-slate-700/60 rounded-xl p-4 sm:p-6 hover:border-indigo-500/50 hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-300 group flex flex-col"
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xs sm:text-sm text-slate-200 bg-slate-700/60 px-2 sm:px-3 py-1 rounded-lg font-medium truncate max-w-[140px] sm:max-w-[180px]">
                          {promptTypeToCategory[prompt.category] || prompt.category}
                        </span>
                        <span className="text-xs sm:text-sm text-red-400 flex items-center gap-1 font-medium">
                          ❤️ {prompt.likeCount}
                        </span>
                      </div>
                      <h3 className="text-base sm:text-lg text-white font-bold mb-2 line-clamp-1 group-hover:text-indigo-300 transition-colors">
                        {prompt.title}
                      </h3>
                      <p className="text-slate-400 text-sm line-clamp-2 mb-auto leading-relaxed">
                        {prompt.description}
                      </p>
                      <div className="flex items-center justify-between pt-3 border-t border-slate-700/50 mt-3">
                        <span className="text-xs sm:text-sm text-slate-500 truncate max-w-[100px]">by {prompt.nickname || '익명'}</span>
                        <span className="text-indigo-400 font-bold text-base sm:text-lg">{prompt.price}P</span>
                      </div>
                    </Link>
                  </TiltCard>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* 인기 프롬프트 로딩 중 */}
        {isLoadingPrompts && (
          <div className="mt-16 pb-20 text-center">
            <div className="w-10 h-10 mx-auto border-2 border-slate-600 border-t-white rounded-full animate-spin"></div>
          </div>
        )}

        {/* 인기 프롬프트가 없을 때 */}
        {!isLoadingPrompts && popularPrompts.length === 0 && (
          <motion.div
            className="mt-16 pb-20 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            <p className="text-slate-500 text-lg">아직 인기 프롬프트가 없습니다</p>
          </motion.div>
        )}
      </main>

      {/* Footer - 스크롤 시 자연스럽게 나타남 */}
      <div className="relative z-10 mt-40">
        <Footer />
      </div>
    </div>
  );
};

export default LandingPage;