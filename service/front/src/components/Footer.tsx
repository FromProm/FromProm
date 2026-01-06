const Footer = () => {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">P</span>
              </div>
              <span className="text-xl font-bold">FromProm</span>
            </div>
            <p className="text-gray-400 mb-4">
              고품질 프롬프트를 거래하는 전문 마켓플레이스입니다. 
              성능 지표 기반의 검증된 프롬프트를 만나보세요.
            </p>
          </div>
          
          <div>
            <h3 className="font-semibold mb-4">서비스</h3>
            <ul className="space-y-2 text-gray-400">
              <li><a href="#" className="hover:text-white">마켓플레이스</a></li>
              <li><a href="#" className="hover:text-white">성능 분석</a></li>
              <li><a href="#" className="hover:text-white">판매자 도구</a></li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-semibold mb-4">지원</h3>
            <ul className="space-y-2 text-gray-400">
              <li><a href="#" className="hover:text-white">도움말</a></li>
              <li><a href="#" className="hover:text-white">문의하기</a></li>
              <li><a href="#" className="hover:text-white">개발자 API</a></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
          <p>&copy; 2024 FromProm. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;