import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-12">
        {/* 로고 + 슬로건 */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <img src="/logo.png" alt="FromProm" className="w-10 h-9 rounded-lg" />
            <span className="text-xl font-bold">FromProm</span>
          </div>
          <p className="text-gray-400">
            AI 기반으로 프롬프트 품질 보증 및 합리적인 구매까지 한번에.
          </p>
        </div>

        {/* 링크 */}
        <div className="flex items-center justify-center space-x-4 text-sm text-gray-400 mb-8">
          <Link to="/docs" className="hover:text-white transition-colors">
            사용 가이드
          </Link>
          <span className="text-gray-600">|</span>
          <Link to="/contact" className="hover:text-white transition-colors">
            1:1 문의
          </Link>
        </div>

        {/* 회사 정보 */}
        <div className="border-t border-gray-800 pt-8 text-center text-gray-500 text-sm space-y-1">
          <p className="font-medium text-gray-400">FromProm</p>
          <p>대표 신의진</p>
          <p>김영동 이찬종 오지은 고유나</p>
          <p>이메일 : tlsdmlwls@gmail.com</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
