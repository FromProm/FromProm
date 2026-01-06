import { Prompt, PerformanceMetrics } from '../types';

// 더미 성능 지표 생성
const createDummyMetrics = (): PerformanceMetrics => ({
  accuracy: Math.floor(Math.random() * 20) + 80, // 80-100
  responseTime: Math.floor(Math.random() * 500) + 100, // 100-600ms
  tokenEfficiency: Math.floor(Math.random() * 30) + 70, // 70-100
  costPerQuery: Math.random() * 0.05 + 0.01, // $0.01-0.06
  successRate: Math.floor(Math.random() * 15) + 85, // 85-100
});

// 더미 프롬프트 데이터
export const dummyPrompts: Prompt[] = [
  {
    id: '1',
    title: 'GPT-4 코드 리뷰 전문 프롬프트',
    description: '코드 품질 향상을 위한 전문적인 리뷰 프롬프트입니다. 보안, 성능, 가독성을 종합적으로 분석합니다.',
    category: '사실/정보/근거 요구',
    price: 29.99,
    sellerId: 'seller1',
    sellerName: '김개발',
    preview: 'You are an expert code reviewer. Analyze the following code for security vulnerabilities, performance issues, and code quality. Provide specific recommendations for improvement...',
    performanceMetrics: createDummyMetrics(),
    tags: ['코드리뷰', 'GPT-4', '개발', '품질관리'],
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-20T15:30:00Z',
    salesCount: 156,
    rating: 4.8,
    reviewCount: 42,
    llmModel: 'GPT-4',
    llmVersion: 'gpt-4-turbo-preview'
  },
  {
    id: '2',
    title: '마케팅 카피라이팅 최적화 프롬프트',
    description: '전환율을 높이는 마케팅 문구 생성을 위한 검증된 프롬프트입니다.',
    category: '글 창작 및 생성',
    price: 19.99,
    sellerId: 'seller2',
    sellerName: '박마케터',
    preview: 'Create compelling marketing copy that converts. Focus on emotional triggers, clear value propositions, and strong call-to-actions...',
    performanceMetrics: createDummyMetrics(),
    tags: ['마케팅', '카피라이팅', '전환율', 'A/B테스트'],
    createdAt: '2024-01-10T09:00:00Z',
    updatedAt: '2024-01-18T11:20:00Z',
    salesCount: 89,
    rating: 4.6,
    reviewCount: 23,
    llmModel: 'GPT-3.5',
    llmVersion: 'gpt-3.5-turbo-0125'
  },
  {
    id: '3',
    title: '데이터 분석 인사이트 추출 프롬프트',
    description: '복잡한 데이터에서 비즈니스 인사이트를 도출하는 전문 프롬프트입니다.',
    category: '사실/정보/근거 요구',
    price: 39.99,
    sellerId: 'seller3',
    sellerName: '이분석가',
    preview: 'Analyze the provided dataset and extract key business insights. Focus on trends, patterns, and actionable recommendations...',
    performanceMetrics: createDummyMetrics(),
    tags: ['데이터분석', '인사이트', '비즈니스', '통계'],
    createdAt: '2024-01-05T14:00:00Z',
    updatedAt: '2024-01-22T16:45:00Z',
    salesCount: 67,
    rating: 4.9,
    reviewCount: 18,
    llmModel: 'Claude',
    llmVersion: 'claude-3-opus'
  },
  {
    id: '4',
    title: '창의적 스토리텔링 프롬프트',
    description: '독창적이고 매력적인 스토리를 생성하는 창작 전문 프롬프트입니다.',
    category: '글 창작 및 생성',
    price: 24.99,
    sellerId: 'seller4',
    sellerName: '최작가',
    preview: 'Craft an engaging story with the following elements: compelling characters, vivid settings, and emotional depth...',
    performanceMetrics: createDummyMetrics(),
    tags: ['창작', '스토리텔링', '소설', '시나리오'],
    createdAt: '2024-01-12T11:30:00Z',
    updatedAt: '2024-01-19T13:15:00Z',
    salesCount: 134,
    rating: 4.7,
    reviewCount: 31,
    llmModel: 'GPT-4',
    llmVersion: 'gpt-4-0125-preview'
  },
  {
    id: '5',
    title: 'AI 아트 프롬프트 생성기',
    description: '고품질 AI 이미지 생성을 위한 최적화된 프롬프트 템플릿입니다.',
    category: '이미지 창작 및 생성',
    price: 34.99,
    sellerId: 'seller5',
    sellerName: '정아티스트',
    preview: 'Create stunning AI artwork with optimized prompts for Midjourney, DALL-E, and Stable Diffusion. Include style, composition, and technical parameters...',
    performanceMetrics: createDummyMetrics(),
    tags: ['AI아트', '이미지생성', 'Midjourney', 'DALL-E'],
    createdAt: '2024-01-08T16:00:00Z',
    updatedAt: '2024-01-21T10:30:00Z',
    salesCount: 45,
    rating: 4.9,
    reviewCount: 12,
    llmModel: 'Gemini',
    llmVersion: 'gemini-pro-vision'
  },
];

export const categories = [
  'All',
  '사실/정보/근거 요구',
  '글 창작 및 생성',
  '이미지 창작 및 생성',
];