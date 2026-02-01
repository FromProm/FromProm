import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import LightPillar from '../components/LightPillar';
import { useAuthStore } from '../store/authStore';

const DocsPage = () => {
  const { isAuthenticated, logout } = useAuthStore();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="relative min-h-screen overflow-hidden" style={{ background: 'linear-gradient(180deg, #05050A 0%, #020204 100%)', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* LightPillar 배경 효과 */}
      <div className="absolute inset-0 z-0 opacity-20">
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

      {/* 헤더 */}
      <header className="relative z-10 border-b border-slate-800/50 bg-slate-900/30 backdrop-blur-xl">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14">
            <div className="flex items-center">
              <Link to="/" className="flex items-center space-x-3">
                <div className="w-10 h-9 rounded-md overflow-hidden">
                  <img src="/logo.png" alt="FromProm Logo" className="w-full h-full object-cover" />
                </div>
                <span className="text-xl font-semibold text-white">FromProm</span>
              </Link>
              {/* 데스크톱 메뉴 */}
              <nav className="hidden md:flex items-center space-x-6 ml-6">
                <Link to="/docs" className="text-blue-400 font-bold text-sm transition-colors">
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
            </div>
            
            {/* 데스크톱 우측 메뉴 */}
            <div className="hidden md:flex items-center space-x-4">
              {isAuthenticated ? (
                <>
                  <Link to="/prompt/create" className="bg-blue-200 text-blue-900 font-medium px-3 py-1.5 rounded-md text-sm hover:bg-blue-900 hover:text-white transition-colors animate-bounce-subtle">
                    프롬프트 등록
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="text-red-400 hover:text-red-300 font-medium text-sm transition-colors"
                  >
                    로그아웃
                  </button>
                </>
              ) : (
                <>
                  <Link to="/auth/login" className="text-gray-300 hover:text-white font-medium text-sm transition-colors">
                    로그인
                  </Link>
                  <Link to="/auth/register" className="bg-white text-black font-medium px-4 py-2 rounded-md text-sm hover:bg-gray-100 transition-colors">
                    회원가입
                  </Link>
                </>
              )}
            </div>

            {/* 모바일 햄버거 버튼 */}
            <button
              className="md:hidden p-2 text-gray-300 hover:text-white"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
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

          {/* 모바일 메뉴 */}
          {isMobileMenuOpen && (
            <div className="md:hidden py-4 border-t border-slate-700/50">
              {isAuthenticated ? (
                <div className="space-y-3">
                  <Link
                    to="/docs"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block px-3 py-2 text-blue-400 bg-blue-900/20 font-bold rounded-lg"
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
                    onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }}
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
                    className="block px-3 py-2 text-blue-400 bg-blue-900/20 font-bold rounded-lg"
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
      <main className="relative z-10 max-w-5xl mx-auto px-4 py-16">
        {/* 서비스 소개 */}
        <motion.section
          className="mb-20"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-6">
            <span className="block sm:inline">FromProm</span>
            <span className="block sm:inline"> 서비스 가이드</span>
          </h1>
          <p className="text-base sm:text-xl text-gray-300 leading-relaxed">
            FromProm은 <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-orange-400 font-semibold">AI를 기반으로 프롬프트의 성능을 객관적으로 검증</span>하고 거래할 수 있는 마켓플레이스입니다.
            <br />
            판매자는 프롬프트를 등록하여 AI 검증을 통한 품질 보증의 기회를 얻고, 구매자는 검증된 지표를 통해 신뢰할 수 있는 프롬프트를 구매할 수 있습니다.
          </p>
        </motion.section>

        {/* 프롬프트란? */}
        <motion.section
          className="mb-20"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.05 }}
        >
          <h2 className="text-3xl font-bold text-white mb-8 flex items-center gap-3">
            <span className="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center text-cyan-400">💡</span>
            프롬프트란?
          </h2>
          <div className="md:bg-slate-800/40 md:backdrop-blur-sm md:border md:border-slate-700/50 md:rounded-2xl md:p-8">
            <p className="text-gray-300 text-lg mb-6 leading-relaxed">
              <span className="text-white font-semibold">프롬프트(Prompt)</span>는 AI에게 원하는 결과를 얻기 위해 입력하는 <span className="text-cyan-400 font-medium">명령어 또는 질문</span>입니다.
              잘 작성된 프롬프트는 AI로부터 더 정확하고 유용한 답변을 이끌어낼 수 있습니다.
            </p>
            
            <div className="md:bg-slate-900/60 md:rounded-xl md:p-6 mb-6">
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <span className="text-yellow-400">✨</span> 플레이스홀더 사용법
              </h3>
              <p className="text-gray-400 mb-4">
                FromProm의 프롬프트는 <span className="text-yellow-400 font-mono bg-slate-800 px-2 py-0.5 rounded">{'{{변수명}}'}</span> 형태의 플레이스홀더를 사용합니다.
                구매 후 플레이스홀더 부분에 원하는 내용을 입력하면 나만의 맞춤형 프롬프트가 완성됩니다.
              </p>
              
              <div className="space-y-4">
                <div className="bg-slate-800/80 rounded-lg p-4">
                  <p className="text-sm text-gray-500 mb-2">📝 프롬프트 예시</p>
                  <p className="text-gray-300 font-mono text-sm leading-relaxed">
                    "<span className="text-yellow-400">{'{{제품명}}'}</span>의 특징을 강조하는 마케팅 문구를 작성해줘. 
                    타겟 고객은 <span className="text-yellow-400">{'{{타겟층}}'}</span>이고, 
                    <span className="text-yellow-400">{'{{톤앤매너}}'}</span> 느낌으로 부탁해."
                  </p>
                </div>
                
                <div className="bg-slate-800/80 rounded-lg p-4">
                  <p className="text-sm text-gray-500 mb-2">✅ 실제 사용 예시</p>
                  <p className="text-gray-300 font-mono text-sm leading-relaxed">
                    "<span className="text-green-400">무선 이어폰</span>의 특징을 강조하는 마케팅 문구를 작성해줘. 
                    타겟 고객은 <span className="text-green-400">20대 직장인</span>이고, 
                    <span className="text-green-400">세련되고 감성적인</span> 느낌으로 부탁해."
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <span className="text-blue-400 text-xl">💡</span>
              <p className="text-gray-300 text-sm">
                <span className="text-white font-medium">Tip:</span> 플레이스홀더에 구체적인 내용을 입력할수록 AI가 더 정확한 결과를 생성합니다.
                예를 들어 "제품"보다는 "무선 블루투스 이어폰"처럼 상세하게 입력해보세요.
              </p>
            </div>
          </div>
        </motion.section>

        {/* 프롬프트 유형 */}
        <motion.section
          className="mb-20"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.08 }}
        >
          <h2 className="text-3xl font-bold text-white mb-8 flex items-center gap-3">
            <span className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center text-orange-400">📂</span>
            프롬프트 유형
          </h2>
          <p className="text-gray-400 mb-8">FromProm에서는 프롬프트를 3가지 유형으로 분류합니다. 각 유형에 맞는 프롬프트를 찾아보세요.</p>
          
          <div className="grid gap-6">
            {/* 정보형 */}
            <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 hover:border-blue-500/50 transition-colors">
              <div className="flex flex-col md:flex-row md:items-start gap-4">
                <div className="w-14 h-14 bg-blue-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-3xl">📊</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-bold text-white">정보형</h3>
                    <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded-full">사실 / 정보 / 근거</span>
                  </div>
                  <p className="text-gray-300 mb-4">
                    정확한 정보, 사실, 데이터 분석을 요청하는 프롬프트입니다.
                    리서치, 분석, 설명이 필요한 작업에 적합합니다.
                  </p>
                  <div className="bg-slate-900/50 rounded-lg p-4">
                    <p className="text-sm text-gray-500 mb-2">💬 활용 예시</p>
                    <ul className="text-gray-400 text-sm space-y-1">
                      <li>• "2024년 이커머스 시장 트렌드를 분석해줘"</li>
                      <li>• "개인정보보호법 주요 조항을 쉽게 설명해줘"</li>
                      <li>• "경쟁사 A와 B의 마케팅 전략을 비교 분석해줘"</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* 글 창작형 */}
            <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 hover:border-green-500/50 transition-colors">
              <div className="flex flex-col md:flex-row md:items-start gap-4">
                <div className="w-14 h-14 bg-green-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-3xl">✍️</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-bold text-white">글 창작형</h3>
                    <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full">글 창작 / 생성</span>
                  </div>
                  <p className="text-gray-300 mb-4">
                    창의적인 글, 스토리, 카피라이팅을 생성하는 프롬프트입니다.
                    마케팅 문구, 블로그 글, 소설 등 텍스트 콘텐츠 제작에 활용됩니다.
                  </p>
                  <div className="bg-slate-900/50 rounded-lg p-4">
                    <p className="text-sm text-gray-500 mb-2">💬 활용 예시</p>
                    <ul className="text-gray-400 text-sm space-y-1">
                      <li>• "MZ세대를 타겟으로 한 감성적인 제품 소개글 써줘"</li>
                      <li>• "SEO 최적화된 블로그 포스트를 작성해줘"</li>
                      <li>• "판타지 소설의 흥미로운 도입부를 써줘"</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* 이미지 창작형 */}
            <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 hover:border-purple-500/50 transition-colors">
              <div className="flex flex-col md:flex-row md:items-start gap-4">
                <div className="w-14 h-14 bg-purple-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-3xl">🎨</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-bold text-white">이미지 창작형</h3>
                    <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-1 rounded-full">이미지 창작 / 생성</span>
                  </div>
                  <p className="text-gray-300 mb-4">
                    AI 이미지 생성 도구(Midjourney, DALL-E, Stable Diffusion 등)를 위한 프롬프트입니다.
                    일러스트, 사진, 디자인 등 시각적 콘텐츠 제작에 활용됩니다.
                  </p>
                  <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-4">
                    <span className="text-yellow-400 text-lg">⚠️</span>
                    <p className="text-gray-300 text-sm">
                      <span className="text-yellow-400 font-medium">필수:</span> 이미지 창작형 프롬프트는 <span className="text-yellow-400 font-medium">영어로 작성</span>해야 정상적으로 작동합니다.
                    </p>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-4">
                    <p className="text-sm text-gray-500 mb-2">💬 활용 예시</p>
                    <ul className="text-gray-400 text-sm space-y-1">
                      <li>• "Cyberpunk city with neon lights, night scene"</li>
                      <li>• "Cute animal character illustration, pastel colors"</li>
                      <li>• "Minimal product mockup, white background"</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        {/* 구매자 가이드 */}
        <motion.section
          className="mb-20"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <h2 className="text-3xl font-bold text-white mb-8 flex items-center gap-3">
            <span className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center text-blue-400">🛒</span>
            구매자 가이드
          </h2>
          <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8">
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-white mb-3">1. 프롬프트 탐색</h3>
                <p className="text-gray-400">마켓플레이스에서 카테고리별로 프롬프트를 탐색하세요. 사실/근거 기반, 글 작성, 이미지 생성, 글 작성 등 다양한 분야의 프롬프트가 준비되어 있습니다.</p>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-3">2. 성능 지표 확인</h3>
                <p className="text-gray-400">각 프롬프트의 응답의 일관성, 환각 탐지, 적합성 등 AI가 분석한 객관적인 성능 지표를 확인하세요.</p>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-3">3. 구매 및 사용</h3>
                <p className="text-gray-400">마음에 드는 프롬프트를 구매하면 즉시 사용할 수 있습니다. 구매한 프롬프트는 마이페이지에서 언제든 확인 가능합니다.</p>
              </div>
            </div>
          </div>
        </motion.section>

        {/* 판매자 가이드 */}
        <motion.section
          className="mb-20"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <h2 className="text-3xl font-bold text-white mb-8 flex items-center gap-3">
            <span className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center text-green-400">💰</span>
            판매자 가이드
          </h2>
          <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8">
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-white mb-3">1. 프롬프트 등록</h3>
                <p className="text-gray-400">자신만의 프롬프트를 등록하세요. 제목, 설명, 카테고리, 가격을 설정할 수 있습니다.</p>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-3">2. AI 성능 분석</h3>
                <p className="text-gray-400">등록된 프롬프트는 AI가 자동으로 분석하여 성능 지표를 생성합니다. 높은 점수의 프롬프트는 더 많은 관심을 받습니다. 좋은 프롬프트를 업로드 하여 품질 보증의 기회를 잡아보세요.</p>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-3">3. 수익 창출</h3>
                <p className="text-gray-400">프롬프트가 판매될 때마다 수익이 발생합니다. 대시보드에서 판매 현황과 수익을 확인하세요.</p>
              </div>
            </div>
          </div>
        </motion.section>

        {/* 성능 지표 설명 */}
        <motion.section
          className="mb-20"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <h2 className="text-3xl font-bold text-white mb-8 flex items-center gap-3">
            <span className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center text-purple-400">📊</span>
            성능 지표 설명
          </h2>
          <p className="text-gray-400 mb-8">FromProm은 AI를 활용해 프롬프트의 품질을 객관적으로 평가합니다. 각 지표가 높을수록 더 좋은 프롬프트예요!</p>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6">
              <h3 className="text-xl font-semibold text-white mb-3">
                토큰 사용 수
              </h3>
              <p className="text-gray-400 mb-4">프롬프트의 길이를 측정합니다. 같은 결과를 얻는다면 짧고 간결한 프롬프트가 더 효율적이에요.</p>
              <div className="bg-slate-900/50 rounded-lg p-4 text-sm text-gray-500 mb-3">
                <strong className="text-gray-300">쉽게 말하면:</strong> 프롬프트가 얼마나 간결한지 보여줍니다. 숫자가 낮을수록 비용 효율적!
              </div>
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-sm">
                <p className="text-blue-300 font-medium mb-1">💡 예시</p>
                <p className="text-gray-400">"마케팅 문구 써줘" (15토큰) vs "제품 특징을 강조한 20대 타겟 마케팅 문구 작성" (35토큰)</p>
              </div>
            </div>

            <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6">
              <h3 className="text-xl font-semibold text-white mb-3">
                출력 대비 정보 밀도
              </h3>
              <p className="text-gray-400 mb-4">AI 응답에 유용한 정보가 얼마나 알차게 담겨있는지 평가합니다. 같은 말 반복 없이 핵심만 전달하는지 확인해요.</p>
              <div className="bg-slate-900/50 rounded-lg p-4 text-sm text-gray-500 mb-3">
                <strong className="text-gray-300">쉽게 말하면:</strong> 응답이 뻔한 말 반복 없이 알찬 내용으로 채워져 있는지 측정합니다.
              </div>
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-sm">
                <p className="text-blue-300 font-medium mb-1">💡 예시</p>
                <p className="text-gray-400">❌ "이 제품은 정말 정말 정말 정말 좋습니다. 진짜 좋고 너무 좋아요."<br/>✅ "이 제품은 배터리 20시간, 무게 150g으로 휴대성이 뛰어납니다."</p>
              </div>
            </div>

            <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6">
              <h3 className="text-xl font-semibold text-white mb-3">
                응답의 일관성
              </h3>
              <p className="text-gray-400 mb-4">같은 프롬프트를 여러 번 사용해도 비슷한 품질의 결과가 나오는지 측정합니다. 일관성이 높으면 매번 안정적인 결과를 기대할 수 있어요.</p>
              <div className="bg-slate-900/50 rounded-lg p-4 text-sm text-gray-500 mb-3">
                <strong className="text-gray-300">쉽게 말하면:</strong> "이 프롬프트 쓰면 매번 좋은 결과 나올까?" 에 대한 답이에요.
              </div>
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-sm">
                <p className="text-blue-300 font-medium mb-1">💡 예시</p>
                <p className="text-gray-400">같은 프롬프트로 5번 테스트 → 5번 모두 비슷한 퀄리티 = 높은 일관성 ✅</p>
              </div>
            </div>

            <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6">
              <h3 className="text-xl font-semibold text-white mb-3">
                버전별 일관성
              </h3>
              <p className="text-gray-400 mb-4">AI 모델이 업데이트되어도 프롬프트가 잘 작동하는지 평가합니다. 점수가 높으면 오래 사용할 수 있는 프롬프트예요.</p>
              <div className="bg-slate-900/50 rounded-lg p-4 text-sm text-gray-500 mb-3">
                <strong className="text-gray-300">쉽게 말하면:</strong> AI가 새 버전으로 바뀌어도 계속 잘 작동하는 프롬프트인지 확인합니다.
              </div>
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-sm">
                <p className="text-blue-300 font-medium mb-1">💡 예시</p>
                <p className="text-gray-400">GPT-3.5에서 만든 프롬프트가 GPT-4에서도 동일하게 작동 = 높은 호환성 ✅</p>
              </div>
            </div>

            <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6">
              <h3 className="text-xl font-semibold text-white mb-3">
                환각 탐지
              </h3>
              <p className="text-gray-400 mb-4">AI가 거짓 정보나 지어낸 내용을 말하는 '환각' 현상이 얼마나 적은지 측정합니다. 점수가 높을수록 신뢰할 수 있는 답변을 생성해요.</p>
              <div className="bg-slate-900/50 rounded-lg p-4 text-sm text-gray-500 mb-3">
                <strong className="text-gray-300">쉽게 말하면:</strong> AI가 없는 말 지어내지 않고 정확한 정보만 전달하는지 검증합니다.
              </div>
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-sm">
                <p className="text-blue-300 font-medium mb-1">💡 예시</p>
                <p className="text-gray-400">❌ "아인슈타인은 1950년 노벨상 수상" (거짓)<br/>✅ "아인슈타인은 1921년 노벨 물리학상 수상" (사실)</p>
              </div>
            </div>

            <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6">
              <h3 className="text-xl font-semibold text-white mb-3">
                적합성
              </h3>
              <p className="text-gray-400 mb-4">프롬프트가 요청한 대로 AI가 정확히 응답하는지 평가합니다. 원하는 형식, 톤, 내용이 잘 반영되는지 확인해요.</p>
              <div className="bg-slate-900/50 rounded-lg p-4 text-sm text-gray-500 mb-3">
                <strong className="text-gray-300">쉽게 말하면:</strong> "내가 원하는 대로 결과가 나오나?" 를 측정합니다.
              </div>
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-sm">
                <p className="text-blue-300 font-medium mb-1">💡 예시</p>
                <p className="text-gray-400">"3줄로 요약해줘" 요청 → 실제로 3줄로 응답 = 높은 적합성 ✅</p>
              </div>
            </div>
          </div>
        </motion.section>

        {/* CTA */}
        <motion.section
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <h2 className="text-2xl font-bold text-white mb-6">지금 바로 시작하세요</h2>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
            <Link
              to="/marketplace"
              className="bg-white text-black font-bold px-8 py-3 rounded-lg hover:bg-gray-100 transition-all text-center whitespace-nowrap"
            >
              프롬프트 둘러보기
            </Link>
            <Link
              to="/prompt/create"
              className="border-2 border-slate-500 text-white font-bold px-8 py-3 rounded-lg hover:border-white hover:bg-white/10 transition-all text-center whitespace-nowrap"
            >
              프롬프트 등록하기
            </Link>
          </div>
        </motion.section>
      </main>
    </div>
  );
};

export default DocsPage;
