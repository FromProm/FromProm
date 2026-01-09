import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { categories, getCategoryModels } from '../services/dummyData';
import { promptApi } from '../services/api';
import AnimatedContent from '../components/AnimatedContent';
import SplitText from '../components/SplitText';

const PromptCreatePage = () => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const alertShownRef = useRef(false);
  
  const defaultCategory = '사실/정보/근거 요구';
  const defaultModels = getCategoryModels(defaultCategory);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: defaultCategory,
    price: '',
    content: '',
    preview: '',
    model: defaultModels[0] || '',
  });

  const [availableModels, setAvailableModels] = useState<string[]>(defaultModels);
  const [exampleInputs, setExampleInputs] = useState(['', '', '']);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 로그인 상태 확인
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      if (!alertShownRef.current) {
        alertShownRef.current = true;
        alert('로그인이 필요한 서비스입니다.');
        navigate('/auth/login', { replace: true });
      }
    } else {
      setIsAuthenticated(true);
    }
  }, [navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // 카테고리가 변경되면 해당 카테고리의 모델 목록으로 업데이트
    if (name === 'category') {
      const models = getCategoryModels(value);
      setAvailableModels(models);
      setFormData(prev => ({
        ...prev,
        category: value,
        model: models[0] || '',
      }));
    }
  };

  const handleExampleInputChange = (index: number, value: string) => {
    setExampleInputs(prev => prev.map((input, i) => i === index ? value : input));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // 예시 입력을 새로운 구조로 변환
      const examples = exampleInputs
        .filter(input => input.trim() !== '')
        .map(input => ({
          inputValues: [{ key: 'input', value: input }]
        }));

      await promptApi.create({
        title: formData.title,
        description: formData.description,
        category: formData.category,
        price: parseInt(formData.price),
        content: formData.content,
        model: formData.model,
        inputs: [],  // 입력 필드 정의 (필요시 추가)
        examples: examples,
      });
      alert('프롬프트가 성공적으로 등록되었습니다!');
      navigate('/marketplace');
    } catch (error: any) {
      const message = error.response?.data || '프롬프트 등록에 실패했습니다.';
      alert(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 인증 확인 중이면 로딩 표시
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-gray-600">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="mb-8">
            <div>
              <SplitText
                text="프롬프트 등록"
                className="text-3xl font-bold text-gray-900 mb-2"
                delay={50}
                duration={0.6}
                ease="power3.out"
                splitType="chars"
                from={{ opacity: 0, y: 30 }}
                to={{ opacity: 1, y: 0 }}
                threshold={0.1}
                rootMargin="-50px"
                textAlign="left"
                tag="h1"
              />
            </div>
            <div>
              <SplitText
                text="고품질 프롬프트를 등록하고 수익을 창출하세요"
                className="text-gray-600"
                delay={30}
                duration={0.5}
                ease="power3.out"
                splitType="words"
                from={{ opacity: 0, y: 20 }}
                to={{ opacity: 1, y: 0 }}
                threshold={0.1}
                rootMargin="-50px"
                textAlign="left"
                tag="p"
              />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            <AnimatedContent once distance={50} duration={0.6} delay={0}>
            <div className="bg-gradient-to-br from-blue-100 via-blue-50 to-white border border-gray-200 rounded-lg p-8 shadow-lg shadow-blue-500/10">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">기본 정보</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                    프롬프트 제목 *
                  </label>
                  <input
                    type="text"
                    id="title"
                    name="title"
                    required
                    value={formData.title}
                    onChange={handleChange}
                    placeholder="예: GPT-4 코드 리뷰 전문가"
                    className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                  />
                </div>

                <div>
                  <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                    카테고리 *
                  </label>
                  <select
                    id="category"
                    name="category"
                    required
                    value={formData.category}
                    onChange={handleChange}
                    className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                  >
                    {categories.filter(cat => cat !== 'All').map((category) => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-2">
                    가격 (P) *
                  </label>
                  <input
                    type="number"
                    id="price"
                    name="price"
                    required
                    min="1"
                    step="1"
                    value={formData.price}
                    onChange={handleChange}
                    placeholder="299"
                    className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                  />
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="model" className="block text-sm font-medium text-gray-700 mb-2">
                    AI 모델 *
                  </label>
                  <select
                    id="model"
                    name="model"
                    required
                    value={formData.model}
                    onChange={handleChange}
                    className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                  >
                    {availableModels.map((model) => (
                      <option key={model} value={model}>{model}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">선택한 카테고리에 따라 사용 가능한 모델이 결정됩니다</p>
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                    프롬프트 설명 *
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    required
                    rows={4}
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="프롬프트의 기능과 특징을 자세히 설명해주세요..."
                    className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors resize-none"
                  />
                </div>
              </div>
            </div>
            </AnimatedContent>

            {/* 프롬프트 내용 */}
            <AnimatedContent once distance={50} duration={0.6} delay={0.1}>
            <div className="bg-gradient-to-br from-blue-100 via-blue-50 to-white border border-gray-200 rounded-lg p-8 shadow-lg shadow-blue-500/10">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">프롬프트 내용</h2>
              {formData.category === '이미지 창작 및 생성' && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
                  <p className="text-sm text-orange-700 font-medium">
                    ⚠️ 이미지 생성 모델은 영어 프롬프트만 지원합니다. 프롬프트를 영어로 작성해주세요.
                  </p>
                </div>
              )}

              <div className="space-y-6">
                <div>
                  <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
                    전체 프롬프트 (비공개) *
                  </label>
                  <textarea
                    id="content"
                    name="content"
                    required
                    rows={8}
                    value={formData.content}
                    onChange={handleChange}
                    placeholder={"구매 후 제공될 완전한 프롬프트를 작성하세요..."}
                    className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors resize-none"
                  />
                  <p className="text-xs text-gray-500 mt-1">구매 후에만 공개되는 완전한 프롬프트입니다</p>
                </div>
              </div>
            </div>
            </AnimatedContent>

            {/* 예시 입력 */}
            <AnimatedContent once distance={50} duration={0.6} delay={0.2}>
            <div className="bg-gradient-to-br from-blue-100 via-blue-50 to-white border border-gray-200 rounded-lg p-8 shadow-lg shadow-blue-500/10">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">예시 입력</h2>
              <p className="text-sm text-gray-600 mb-6">프롬프트 성능 검증을 위해 3개의 예시 입력을 제공해주세요.</p>

              <div className="space-y-6">
                {exampleInputs.map((input, index) => (
                  <div key={index}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      예시 입력 {index + 1} *
                    </label>
                    <textarea
                      rows={4}
                      required
                      value={input}
                      onChange={(e) => handleExampleInputChange(index, e.target.value)}
                      placeholder={`예시 입력 ${index + 1}을 작성하세요...`}
                      className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors resize-none"
                    />
                  </div>
                ))}
              </div>
            </div>
            </AnimatedContent>

            {/* 제출 버튼 */}
            <div className="flex items-center justify-between">
              <Link
                to="/marketplace"
                className="text-blue-900 hover:text-blue-800 font-bold text-lg transition-colors"
              >
                ← 마켓플레이스로 돌아가기
              </Link>

              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold px-8 py-3 rounded-md hover:from-blue-700 hover:to-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? '등록 중...' : '프롬프트 등록하기'}
              </button>
            </div>
          </form>
        </motion.div>
      </main>
    </div>
  );
};

export default PromptCreatePage;
