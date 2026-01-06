import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../store/authStore';

const LandingPage = () => {
  const { isAuthenticated } = useAuthStore();

  return (
    <div className="relative min-h-screen bg-black">
      {/* 조금 더 밝은 배경 */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-gray-800/60 via-gray-900 to-black" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-blue-600/15 to-transparent blur-3xl" />
      </div>

      {/* 헤더 */}
      <header className="relative z-10 border-b border-blue-900/30 bg-blue-900/20 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <motion.div
              className="flex items-center space-x-3"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
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
                <div className="w-10 h-10 bg-white rounded-md flex items-center justify-center" style={{display: 'none'}}>
                  <span className="text-black font-bold text-base">P</span>
                </div>
              </div>
              <span className="text-xl font-semibold text-white tracking-tight">FromProm</span>
            </motion.div>

            <motion.div
              className="flex items-center space-x-6"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <nav className="hidden md:flex items-center space-x-8">
                <Link to="/marketplace" className="text-gray-300 hover:text-white text-sm font-medium transition-colors">
                  Platform
                </Link>
                <Link to="#" className="text-gray-300 hover:text-white text-sm font-medium transition-colors">
                  Pricing
                </Link>
                <Link to="#" className="text-gray-300 hover:text-white text-sm font-medium transition-colors">
                  Docs
                </Link>
              </nav>

              {isAuthenticated ? (
                <Link
                  to="/marketplace"
                  className="bg-white text-black font-medium px-4 py-2 rounded-md text-sm hover:bg-gray-100 transition-colors"
                >
                  Dashboard
                </Link>
              ) : (
                <div className="flex items-center space-x-4">
                  <Link
                    to="/auth/login"
                    className="text-gray-300 hover:text-white font-medium text-sm transition-colors"
                  >
                    Sign in
                  </Link>
                  <Link
                    to="/auth/register"
                    className="bg-white text-black font-medium px-4 py-2 rounded-md text-sm hover:bg-gray-100 transition-colors"
                  >
                    Get started
                  </Link>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
          {/* 히어로 섹션 */}
          <div className="text-center max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 mb-8">
                <span className="text-sm font-medium text-blue-300">프롬프트 성능 검증 플랫폼</span>
              </div>

              <h1 className="text-6xl md:text-8xl lg:text-[5.5rem] font-bold mb-8 tracking-tight">
                <span className="block text-white mb-4 drop-shadow-2xl">프롬프트의 가치를</span>
                <span className="block bg-gradient-to-r from-red-500 via-purple-400 to-cyan-400 bg-clip-text text-transparent drop-shadow-lg">
                  수치로 증명합니다
                </span>
              </h1>
            </motion.div>

            <motion.p
              className="text-xl md:text-1xl text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed font-medium"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              데이터 기반 성능 검증을 통해 검증된 프롬프트를 제공합니다.
              <br className="hidden md:block" />
              토큰 효율성과 정확도를 동시에 확보하세요.
            </motion.p>

            {/* CTA 버튼 */}
            <motion.div
              className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-16"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              <Link
                to="/marketplace"
                className="bg-white text-black font-semibold px-8 py-3 rounded-md hover:bg-gray-100 transition-colors text-sm"
              >
                프롬프트 둘러보기
              </Link>

              <Link
                to="/prompt/create"
                className="border border-gray-700 text-white font-medium px-8 py-3 rounded-md hover:border-gray-600 hover:bg-gray-900/50 transition-colors text-sm"
              >
                프롬프트 등록하기
              </Link>
            </motion.div>

            {/* 이 달의 인기 프롬프트 Top 5 */}
            <motion.div
              className="max-w-3xl mx-auto"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
            >
              <h2 className="text-3xl font-bold text-white mb-10 text-center">이 달의 인기 프롬프트 Top 5</h2>
              <div className="space-y-4">
                {[
                  { rank: 1, id: "1", title: "GPT-4 코드 리뷰 전문가", category: "사실/정보/근거 요구", views: "12.5K", saves: "2.1K", hearts: "892" },
                  { rank: 2, id: "2", title: "마케팅 카피 최적화", category: "글 창작 및 생성", views: "8.9K", saves: "1.8K", hearts: "654" },
                  { rank: 3, id: "3", title: "데이터 분석 인사이트", category: "사실/정보/근거 요구", views: "7.2K", saves: "1.5K", hearts: "523" },
                  { rank: 4, id: "4", title: "창의적 스토리텔링", category: "글 창작 및 생성", views: "6.8K", saves: "1.2K", hearts: "445" },
                  { rank: 5, id: "5", title: "AI 아트 프롬프트", category: "이미지 창작 및 생성", views: "5.4K", saves: "987", hearts: "321" }
                ].map((prompt, index) => (
                  <motion.div
                    key={index}
                    className="bg-gray-900/50 border border-gray-800/50 rounded-lg p-6 backdrop-blur-sm hover:border-gray-700/50 transition-all cursor-pointer group"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.7 + index * 0.1 }}
                    onClick={() => window.location.href = `/prompt/${prompt.id}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-black text-lg font-bold shadow-lg">
                          {prompt.rank}
                        </div>
                        <div>
                          <h3 className="text-white text-lg font-semibold mb-1 group-hover:text-gray-200 transition-colors">
                            {prompt.title}
                          </h3>
                          <span className="text-sm text-gray-400 bg-gray-800/50 px-3 py-1 rounded-full">{prompt.category}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-6 text-sm text-gray-400">
                        <span className="flex items-center space-x-1">
                          <span>👁</span>
                          <span>{prompt.views}</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <span>📌</span>
                          <span>{prompt.saves}</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <span>❤️</span>
                          <span>{prompt.hearts}</span>
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>

        {/* 신뢰성 섹션 */}
        <motion.div
          className="border-t border-gray-800/50 bg-gray-900/20 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.8 }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="text-center mb-12">
              <h2 className="text-2xl font-bold text-white mb-4">
                Trusted by leading AI teams
              </h2>
              <p className="text-gray-400 max-w-2xl mx-auto">
                Enterprise customers rely on our platform for mission-critical AI applications
              </p>
            </div>

            {/* 가상의 로고들 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 items-center opacity-50">
              <div className="bg-gray-800/30 h-12 rounded flex items-center justify-center">
                <span className="text-gray-500 font-semibold text-sm">TechCorp</span>
              </div>
              <div className="bg-gray-800/30 h-12 rounded flex items-center justify-center">
                <span className="text-gray-500 font-semibold text-sm">DataFlow</span>
              </div>
              <div className="bg-gray-800/30 h-12 rounded flex items-center justify-center">
                <span className="text-gray-500 font-semibold text-sm">AI Labs</span>
              </div>
              <div className="bg-gray-800/30 h-12 rounded flex items-center justify-center">
                <span className="text-gray-500 font-semibold text-sm">CloudTech</span>
              </div>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default LandingPage;