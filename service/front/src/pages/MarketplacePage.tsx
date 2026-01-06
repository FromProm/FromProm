import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { dummyPrompts, categories } from '../services/dummyData';
import { useCartStore } from '../store/cartStore';
import { usePurchaseStore } from '../store/purchaseStore';

const MarketplacePage = () => {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const { addToCart, isInCart } = useCartStore();
  const { isPurchased } = usePurchaseStore();

  const handleAddToCart = (prompt: any, e: React.MouseEvent) => {
    e.stopPropagation(); // 카드 클릭 이벤트 방지
    if (!isInCart(prompt.id) && !isPurchased(prompt.id)) {
      addToCart({
        id: prompt.id,
        title: prompt.title,
        price: prompt.price,
        category: prompt.category,
        sellerName: prompt.sellerName,
        description: prompt.description,
        rating: prompt.rating
      });
    }
  };

  const filteredPrompts = dummyPrompts.filter(prompt => {
    const matchesCategory = selectedCategory === 'All' || prompt.category === selectedCategory;
    const matchesSearch = prompt.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prompt.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-blue-50 to-white">
      {/* 메인 콘텐츠 */}
      <main className="w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* 페이지 헤더 */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">프롬프트 마켓플레이스</h1>
          <p className="text-gray-600">검증된 고품질 AI 프롬프트를 찾아보세요</p>
        </div>

        {/* 검색 및 필터 */}
        <div className="mb-8 space-y-4 flex flex-col items-center">
          {/* 검색바 */}
          <div className="relative w-full max-w-md">
            <input
              type="text"
              placeholder="프롬프트 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors shadow-lg shadow-blue-500/20"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* 카테고리 필터 */}
          <div className="flex flex-wrap justify-center gap-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selectedCategory === category
                  ? 'bg-blue-900 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:border-blue-900 hover:text-blue-900'
                  }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* 프롬프트 그리드 */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          {filteredPrompts.map((prompt, index) => (
            <motion.div
              key={prompt.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-white border border-gray-200 rounded-lg p-6 shadow-lg shadow-blue-500/10 hover:shadow-xl hover:shadow-blue-500/20 hover:border-gray-300 transition-all cursor-pointer group"
              onClick={() => window.location.href = `/prompt/${prompt.id}`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                    {prompt.category}
                  </span>
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-xs text-green-600 font-medium">Verified</span>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-gray-900">{prompt.price}P</div>
                </div>
              </div>

              <h3 className="text-gray-900 text-lg font-semibold mb-2 group-hover:text-gray-700 transition-colors">
                {prompt.title}
              </h3>

              <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                {prompt.description}
              </p>

              <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                <span>by {prompt.sellerName}</span>
                <div className="flex items-center space-x-1">
                  <span>⭐</span>
                  <span>{prompt.rating}</span>
                  <span>({prompt.reviewCount})</span>
                </div>
              </div>

              {/* 통계 정보 */}
              <div className="flex items-center justify-between text-xs text-gray-500 border-t border-gray-200 pt-4">
                <div className="flex items-center space-x-4">
                  <span className="flex items-center space-x-1">
                    <span>👁</span>
                    <span>{(prompt.salesCount * 8.5).toFixed(0)}K</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <span>📌</span>
                    <span>{(prompt.salesCount * 1.2).toFixed(0)}</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <span>❤️</span>
                    <span>{(prompt.salesCount * 0.8).toFixed(0)}</span>
                  </span>
                </div>
                <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-2 py-1 rounded text-xs font-medium">
                  HOT
                </div>
              </div>

              {/* 액션 버튼 */}
              <div className="mt-4 flex space-x-2">
                {isPurchased(prompt.id) ? (
                  <div className="flex-1 bg-green-100 text-green-800 px-3 py-2 rounded text-xs font-medium text-center">
                    ✓ 구매 완료
                  </div>
                ) : (
                  <>
                    <button
                      onClick={(e) => handleAddToCart(prompt, e)}
                      disabled={isInCart(prompt.id)}
                      className={`flex-1 px-3 py-2 rounded text-xs font-medium transition-colors ${isInCart(prompt.id)
                        ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                        : 'border border-blue-900 text-blue-900 hover:bg-blue-50'
                        }`}
                    >
                      {isInCart(prompt.id) ? '장바구니에 있음' : '장바구니'}
                    </button>
                    <Link
                      to={`/purchase/${prompt.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 bg-blue-900 text-white px-3 py-2 rounded text-xs font-medium hover:bg-blue-800 transition-colors text-center"
                    >
                      구매
                    </Link>
                  </>
                )}
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* 결과 없음 */}
        {filteredPrompts.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-600 text-lg mb-2">검색 결과가 없습니다</div>
            <p className="text-gray-500 text-sm">다른 키워드나 카테고리를 시도해보세요</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default MarketplacePage;