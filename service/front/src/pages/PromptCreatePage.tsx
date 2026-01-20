import { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { categories, getCategoryModels } from '../services/dummyData';
import { promptApi } from '../services/api';
import AnimatedContent from '../components/AnimatedContent';
import SplitText from '../components/SplitText';

// 변수 추출 함수: {{변수명}} 패턴에서 변수명 추출
const extractVariables = (content: string): string[] => {
  const regex = /\{\{([^}]+)\}\}/g;
  const variables: string[] = [];
  let match;
  while ((match = regex.exec(content)) !== null) {
    const varName = match[1].trim();
    if (varName && !variables.includes(varName)) {
      variables.push(varName);
    }
  }
  return variables;
};

// 예시 입력 타입
interface ExampleInput {
  [key: string]: string;
}

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
  const [exampleInputs, setExampleInputs] = useState<ExampleInput[]>([{}, {}, {}]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 프롬프트 내용에서 변수 추출
  const extractedVariables = useMemo(() => {
    return extractVariables(formData.content);
  }, [formData.content]);

  // 변수가 변경되면 예시 입력 초기화
  useEffect(() => {
    if (extractedVariables.length > 0) {
      setExampleInputs(prev => prev.map(example => {
        const newExample: ExampleInput = {};
        extractedVariables.forEach(varName => {
          newExample[varName] = example[varName] || '';
        });
        return newExample;
      }));
    }
  }, [extractedVariables]);

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

  const handleExampleInputChange = (exampleIndex: number, varName: string, value: string) => {
    setExampleInputs(prev => prev.map((example, i) => 
      i === exampleIndex ? { ...example, [varName]: value } : example
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let examples: Array<{ inputValues: Array<{ key: string; value: string }> }>;
      let inputs: Array<{ key: string; value: string }>;

      if (extractedVariables.length > 0) {
        // 변수가 있을 때: 변수별 값으로 예시 구성
        examples = exampleInputs
          .filter(example => {
            return extractedVariables.every(varName => example[varName]?.trim());
          })
          .map(example => ({
            inputValues: extractedVariables.map(varName => ({
              key: varName,
              value: example[varName] || ''
            }))
          }));

        inputs = extractedVariables.map(varName => ({
          key: varName,
          value: ''
        }));
      } else {
        // 변수가 없을 때: 일반 텍스트 입력
        examples = exampleInputs
          .filter(example => example['input']?.trim())
          .map(example => ({
            inputValues: [{ key: 'input', value: example['input'] || '' }]
          }));

        inputs = [];
      }

      const response = await promptApi.create({
        title: formData.title,
        description: formData.description,
        category: formData.category,
        price: parseInt(formData.price),
        content: formData.content,
        model: formData.model,
        inputs: inputs,
        examples: examples,
      });
      
      console.log('프롬프트 등록 응답:', response.data);
      alert('프롬프트가 성공적으로 등록되었습니다! AI 검증이 완료되면 마켓플레이스에 공개됩니다.');
      navigate('/dashboard');
    } catch (error: any) {
      console.error('프롬프트 등록 실패:', error);
      const message = error.response?.data?.message || error.response?.data || '프롬프트 등록에 실패했습니다.';
      alert(typeof message === 'string' ? message : '프롬프트 등록에 실패했습니다.');
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
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-700">
                  💡 예시 입력은 AI 성능 검증에 사용되며, 검증 완료 후 마켓플레이스에서 구매자들에게 공개됩니다.
                </p>
              </div>
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
                    전체 프롬프트
                  </label>
                  <textarea
                    id="content"
                    name="content"
                    required
                    rows={8}
                    value={formData.content}
                    onChange={handleChange}
                    placeholder={"프롬프트를 작성하세요. 변수는 {{변수명}} 형식으로 입력하세요.\n\n예시:\n{{주제}}에 대해 {{형식}}으로 설명해주세요."}
                    className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors resize-none font-mono"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    구매 후에만 공개되는 프롬프트입니다.
                  </p>
                  
                  {/* 추출된 변수 표시 */}
                  {extractedVariables.length > 0 && (
                    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-800 font-medium mb-2">📌 감지된 변수:</p>
                      <div className="flex flex-wrap gap-2">
                        {extractedVariables.map((varName, idx) => (
                          <span key={idx} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                            {`{{${varName}}}`}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            </AnimatedContent>

            {/* 예시 입력 */}
            <AnimatedContent once distance={50} duration={0.6} delay={0.2}>
            <div className="bg-gradient-to-br from-blue-100 via-blue-50 to-white border border-gray-200 rounded-lg p-8 shadow-lg shadow-blue-500/10">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">예시 입력</h2>
              <p className="text-sm text-gray-600 mb-4">
                프롬프트 성능 검증을 위해 3개의 예시 입력을 제공해주세요.
                {extractedVariables.length > 0 && (
                  <span className="text-blue-600"> 각 변수에 대한 값을 입력하세요.</span>
                )}
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-700">
                  💡 예시 입력은 AI 성능 검증에 사용되며, 검증 완료 후 마켓플레이스에서 구매자들에게 공개됩니다.
                </p>
              </div>

              {extractedVariables.length === 0 ? (
                /* 변수가 없을 때: 일반 텍스트 입력 */
                <div className="space-y-6">
                  {exampleInputs.map((example, index) => (
                    <div key={index}>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        예시 입력 {index + 1} *
                      </label>
                      <textarea
                        rows={4}
                        required
                        value={example['input'] || ''}
                        onChange={(e) => handleExampleInputChange(index, 'input', e.target.value)}
                        placeholder={`예시 입력 ${index + 1}을 작성하세요...`}
                        className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors resize-none"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                /* 변수가 있을 때: 변수별 입력 필드 */
                <div className="space-y-8">
                  {exampleInputs.map((example, exampleIndex) => (
                    <div key={exampleIndex} className="bg-white border border-gray-200 rounded-lg p-6">
                      <h3 className="text-lg font-medium text-gray-900 mb-4 pb-2 border-b border-gray-100">
                        예시 {exampleIndex + 1}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {extractedVariables.map((varName, varIndex) => (
                          <div key={varIndex}>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              <span className="text-blue-600 font-mono">{`{{${varName}}}`}</span>
                            </label>
                            <input
                              type="text"
                              required
                              value={example[varName] || ''}
                              onChange={(e) => handleExampleInputChange(exampleIndex, varName, e.target.value)}
                              placeholder={`${varName} 값을 입력하세요`}
                              className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                            />
                          </div>
                        ))}
                      </div>
                      
                      {/* 미리보기 */}
                      {Object.values(example).some(v => v) && (
                        <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                          <p className="text-xs text-gray-500 mb-2 font-medium">미리보기:</p>
                          <p className="text-sm text-gray-700 font-mono whitespace-pre-wrap">
                            {extractedVariables.reduce((content, varName) => {
                              return content.replace(
                                new RegExp(`\\{\\{${varName}\\}\\}`, 'g'),
                                example[varName] ? `[${example[varName]}]` : `{{${varName}}}`
                              );
                            }, formData.content)}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
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
