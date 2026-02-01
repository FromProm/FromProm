import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Header from '../components/Header';

const ContactPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    category: '일반 문의',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // 실제로는 API 호출하여 문의 내용 저장
    // 여기서는 이메일로 전송하는 것처럼 시뮬레이션
    await new Promise(resolve => setTimeout(resolve, 1000));

    setIsSubmitting(false);
    setIsSubmitted(true);
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className="w-20 h-20 mx-auto mb-6 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-4xl">✅</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">문의가 접수되었습니다</h1>
            <p className="text-gray-600 mb-8">
              소중한 의견 감사합니다. 빠른 시일 내에 답변 드리겠습니다.
            </p>
            <Link
              to="/marketplace"
              className="inline-block bg-blue-900 text-white font-medium px-6 py-3 rounded-lg hover:bg-blue-800 transition-colors"
            >
              마켓플레이스로 돌아가기
            </Link>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <div className="max-w-2xl mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-3xl font-bold text-gray-900 mb-2">1:1 문의</h1>
          <p className="text-gray-600 mb-8">
            서비스 이용 중 불편한 점이나 개선 사항이 있으시면 알려주세요.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6 bg-gradient-to-br from-blue-100 via-blue-50 to-white rounded-xl p-6 border border-blue-200 shadow-lg">
            {/* 이름 */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                이름
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="이름을 입력해주세요"
              />
            </div>

            {/* 이메일 */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                이메일
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="답변 받으실 이메일을 입력해주세요"
              />
            </div>

            {/* 문의 유형 */}
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                문의 유형
              </label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                <option value="일반 문의">일반 문의</option>
                <option value="서비스 개선 제안">서비스 개선 제안</option>
                <option value="버그 신고">버그 신고</option>
                <option value="결제 문의">결제 문의</option>
                <option value="기타">기타</option>
              </select>
            </div>

            {/* 문의 내용 */}
            <div>
              <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                문의 내용
              </label>
              <textarea
                id="message"
                name="message"
                value={formData.message}
                onChange={handleChange}
                required
                rows={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="문의 내용을 자세히 작성해주세요"
              />
            </div>

            {/* 제출 버튼 */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-blue-900 text-white font-medium py-3 rounded-lg hover:bg-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  전송 중...
                </>
              ) : (
                '문의하기'
              )}
            </button>
          </form>

          {/* 안내 문구 */}
          <div className="mt-8 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              💡 문의 내용은 <strong>tlsdmlwls@gmail.com</strong>으로 전달됩니다.
              <br />
              영업일 기준 1~2일 내에 답변 드리겠습니다.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ContactPage;
