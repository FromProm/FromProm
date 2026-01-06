// 사용자 타입
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'buyer' | 'seller' | 'both';
  avatar?: string;
  createdAt: string;
}

// 프롬프트 타입
export interface Prompt {
  id: string;
  title: string;
  description: string;
  category: string;
  price: number;
  sellerId: string;
  sellerName: string;
  preview: string; // 미리보기 텍스트
  fullContent?: string; // 구매 후에만 제공
  performanceMetrics: PerformanceMetrics;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  salesCount: number;
  rating: number;
  reviewCount: number;
  llmModel?: string; // LLM 모델명
  llmVersion?: string; // LLM 모델 버전
}

// 성능 지표 타입
export interface PerformanceMetrics {
  accuracy: number; // 정확도 (0-100)
  responseTime: number; // 응답 시간 (ms)
  tokenEfficiency: number; // 토큰 효율성 (0-100)
  costPerQuery: number; // 쿼리당 비용
  successRate: number; // 성공률 (0-100)
}

// 구매 내역 타입
export interface Purchase {
  id: string;
  promptId: string;
  buyerId: string;
  sellerId: string;
  price: number;
  purchasedAt: string;
  usageCount: number;
  lastUsedAt?: string;
}

// 인증 상태 타입
export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// API 응답 타입
export interface ApiResponse<T> {
  data: T;
  message: string;
  success: boolean;
}