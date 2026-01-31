import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import LightPillar from '../components/LightPillar';
import { useAuthStore } from '../store/authStore';

const DocsPage = () => {
  const { isAuthenticated, logout } = useAuthStore();
  const navigate = useNavigate();

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
              {/* 메뉴 순서: 사용 가이드 > 마켓 > 장바구니 > 마이페이지 */}
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
            <div className="flex items-center space-x-4">
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
          </div>
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
            판매자는 자신의 프롬프트를 등록하고, 구매자는 검증된 지표를 통해 신뢰할 수 있는 프롬프트를 구매할 수 있습니다.
          </p>
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
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6">
              <h3 className="text-xl font-semibold text-white mb-3 flex items-center gap-2">
         토큰 사용량 (Token Usage)
              </h3>
              <p className="text-gray-400 mb-4">판매자가 등록한 프롬프트의 토큰 수를 측정합니다. 효율적인 프롬프트일수록 적은 토큰을 사용합니다.</p>
              <div className="bg-slate-900/50 rounded-lg p-4 text-sm text-gray-500">
                <strong className="text-gray-300">계산 방식 :</strong> 프롬프트에서 변수 부분을 제외한, 고정된 부분의 토큰 수를 측정하여 제공합니다.
              </div>
            </div>

            <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6">
              <h3 className="text-xl font-semibold text-white mb-3 flex items-center gap-2">
                출력 대비 정보 밀도 (Information Density)
              </h3>
              <p className="text-gray-400 mb-4">생성된 출력에 유용한 정보가 얼마나 포함되어 있는지 평가합니다. 불필요한 반복 없이 정보를 전달하는지 측정합니다.</p>
              <div className="bg-slate-900/50 rounded-lg p-4 text-sm text-gray-500">
                <strong className="text-gray-300">계산 방식 :</strong> n-gram을 통해 출력 텍스트의 의미 있는 정보량을 분석하여 제공합니다.
              </div>
            </div>

            <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6">
              <h3 className="text-xl font-semibold text-white mb-3 flex items-center gap-2">
                응답의 일관성 (Consistency)
              </h3>
              <p className="text-gray-400 mb-4">동일한 프롬프트를 같은 모델로 여러 번 실행했을 때 결과가 얼마나 일관되게 나오는지 측정합니다. 높은 일관성은 프롬프트의 안정성을 의미합니다.</p>
              <div className="bg-slate-900/50 rounded-lg p-4 text-sm text-gray-500">
                <strong className="text-gray-300">계산 방식:</strong> 동일 조건에서 반복 실행 후 출력 임베딩 간의 유사도를 계산합니다.
              </div>
            </div>

            <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6">
              <h3 className="text-xl font-semibold text-white mb-3 flex items-center gap-2">
                버전별 일관성 (Model Consistency)
              </h3>
              <p className="text-gray-400 mb-4">동일한 모델의 다른 버전에서 프롬프트를 실행했을 때 결과가 얼마나 일관되는지 평가합니다. 버전에 덜 의존적인 프롬프트일수록 높은 점수를 받습니다.</p>
              <div className="bg-slate-900/50 rounded-lg p-4 text-sm text-gray-500">
                <strong className="text-gray-300">계산 방식:</strong> 여러 버전의 출력에 대한 임베딩의 유사도를 계산합니다.
              </div>
            </div>

            <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6">
              <h3 className="text-xl font-semibold text-white mb-3 flex items-center gap-2">
                환각 탐지 (Hallucination Detection)
              </h3>
              <p className="text-gray-400 mb-4">AI가 사실이 아닌 정보를 생성하는 '환각' 현상을 탐지합니다. 환각 탐지 점수가 높을수록 프롬프트가 신뢰할 수 있는 결과를 생성함을 의미합니다.</p>
              <div className="bg-slate-900/50 rounded-lg p-4 text-sm text-gray-500">
                <strong className="text-gray-300">계산 방식 :</strong> 출력 내 주장(claim)을 추출하고 외부 근거와 대조하여 사실 여부를 검증합니다.
              </div>
            </div>

            <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6">
              <h3 className="text-xl font-semibold text-white mb-3 flex items-center gap-2">
                적합성 (Fitness)
              </h3>
              <p className="text-gray-400 mb-4">프롬프트의 의도와 생성된 결과가 얼마나 관련성이 높은지 평가합니다. 사용자가 원하는 답변을 정확하게 제공하는지 측정합니다.</p>
              <div className="bg-slate-900/50 rounded-lg p-4 text-sm text-gray-500">
                <strong className="text-gray-300">계산 방식 :</strong> 입력 프롬프트에서 명시된 조건과 방향성이 출력에서 잘 지켜지고 있는지 평가합니다.
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
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              to="/marketplace"
              className="bg-white text-black font-bold px-8 py-3 rounded-lg hover:bg-gray-100 transition-all text-center whitespace-nowrap"
            >
              프롬프트 둘러보기
            </Link>
            <Link
              to="/prompt/create"
              className="border-2 border-slate-500 text-white font-semibold px-8 py-3 rounded-lg hover:border-white hover:bg-white/10 transition-all text-center whitespace-nowrap"
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
