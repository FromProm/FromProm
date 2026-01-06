import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { categories } from '../services/dummyData';

const PromptCreatePage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '사실/정보/근거 요구',
    price: '',
    content: '',
    tags: '',
    preview: '',
    llmModel: 'GPT-4',
    llmVersion: 'gpt-4-turbo-preview'
  });

  const [examples, setExamples] = useState([
    { input: '', output: '' },
    { input: '', output: '' },
    { input: '', output: '' }
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const llmModels = [
    { name: 'GPT-4', versions: ['gpt-4-turbo-preview', 'gpt-4-0125-preview', 'gpt-4-1106-preview'] },
    { name: 'GPT-3.5', versions: ['gpt-3.5-turbo-0125', 'gpt-3.5-turbo-1106'] },
    { name: 'Claude', versions: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'] },
    { name: 'Gemini', versions: ['gemini-pro', 'gemini-pro-vision'] }
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // LLM 모델이 변경되면 첫 번째 버전으로 자동 설정
    if (name === 'llmModel') {
      const selectedModel = llmModels.find(model => model.name === value);
      if (selectedModel) {
        setFormData(prev => ({
          ...prev,
          llmVersion: selectedModel.versions[0]
        }));
      }
    }
  };

  const handleExampleChange = (index: number, field: 'input' | 'output', value: string) => {
    setExamples(prev => prev.map((example, i) =>
      i === index ? { ...example, [field]: value } : example
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // 여기서 실제 API 호출을 할 예정
    setTimeout(() => {
      setIsSubmitting(false);
      alert('프롬프트가 성공적으로 등록되었습니다!');
      navigate('/marketplace');
    }, 2000);
  };

  const selectedModel = llmModels.find(model => model.name === formData.llmModel);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-blue-50 to-white">
      {/* 메인 콘텐츠 */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* 페이지 헤더 */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">프롬프트 등록</h1>
            <p className="text-gray-600">고품질 프롬프트를 등록하고 수익을 창출하세요</p>
          </div>

          {/* 등록 폼 */}
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="bg-white border border-gray-200 rounded-lg p-8 shadow-lg shadow-blue-500/10">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">기본 정보</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 제목 */}
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

                {/* 카테고리 */}
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

                {/* 가격 */}
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

                {/* LLM 모델 */}
                <div>
                  <label htmlFor="llmModel" className="block text-sm font-medium text-gray-700 mb-2">
                    LLM 모델 *
                  </label>
                  <select
                    id="llmModel"
                    name="llmModel"
                    required
                    value={formData.llmModel}
                    onChange={handleChange}
                    className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                  >
                    {llmModels.map((model) => (
                      <option key={model.name} value={model.name}>{model.name}</option>
                    ))}
                  </select>
                </div>

                {/* LLM 버전 */}
                <div>
                  <label htmlFor="llmVersion" className="block text-sm font-medium text-gray-700 mb-2">
                    모델 버전 *
                  </label>
                  <select
                    id="llmVersion"
                    name="llmVersion"
                    required
                    value={formData.llmVersion}
                    onChange={handleChange}
                    className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                  >
                    {selectedModel?.versions.map((version) => (
                      <option key={version} value={version}>{version}</option>
                    ))}
                  </select>
                </div>

                {/* 설명 */}
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

                {/* 태그 */}
                <div className="md:col-span-2">
                  <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-2">
                    태그
                  </label>
                  <input
                    type="text"
                    id="tags"
                    name="tags"
                    value={formData.tags}
                    onChange={handleChange}
                    placeholder="코드리뷰, GPT-4, 개발, 품질관리 (쉼표로 구분)"
                    className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* 프롬프트 내용 */}
            <div className="bg-white border border-gray-200 rounded-lg p-8 shadow-lg shadow-blue-500/10">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">프롬프트 내용</h2>

              <div className="space-y-6">
                {/* 미리보기 */}
                <div>
                  <label htmlFor="preview" className="block text-sm font-medium text-gray-700 mb-2">
                    미리보기 (공개) *
                  </label>
                  <textarea
                    id="preview"
                    name="preview"
                    required
                    rows={3}
                    value={formData.preview}
                    onChange={handleChange}
                    placeholder="구매자가 볼 수 있는 프롬프트 미리보기를 작성하세요..."
                    className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors resize-none"
                  />
                  <p className="text-xs text-gray-500 mt-1">구매 전 사용자에게 공개되는 내용입니다</p>
                </div>

                {/* 전체 내용 */}
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
                    placeholder="구매 후 제공될 완전한 프롬프트를 작성하세요..."
                    className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors resize-none"
                  />
                  <p className="text-xs text-gray-500 mt-1">구매 후에만 공개되는 완전한 프롬프트입니다</p>
                </div>
              </div>
            </div>

            {/* 예시 입력/출력 */}
            <div className="bg-white border border-gray-200 rounded-lg p-8 shadow-lg shadow-blue-500/10">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">예시 입력/출력</h2>
              <p className="text-sm text-gray-600 mb-6">구매자가 프롬프트의 성능을 확인할 수 있도록 3개의 예시를 제공해주세요.</p>

              <div className="space-y-8">
                {examples.map((example, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-6 bg-gray-50">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">예시 {index + 1}</h3>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          입력 예시
                        </label>
                        <textarea
                          rows={4}
                          value={example.input}
                          onChange={(e) => handleExampleChange(index, 'input', e.target.value)}
                          placeholder="사용자가 입력할 내용을 작성하세요..."
                          className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors resize-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          출력 예시
                        </label>
                        <textarea
                          rows={4}
                          value={example.output}
                          onChange={(e) => handleExampleChange(index, 'output', e.target.value)}
                          placeholder="AI가 생성할 결과를 작성하세요..."
                          className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors resize-none"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

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