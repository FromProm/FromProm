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
  sellerSub?: string; // 판매자 USER ID (백엔드 구매 API용)
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

// AI 평가 지표 타입 (DynamoDB evaluation_metrics)
export interface EvaluationMetrics {
  consistency: number;        // 응답 일관성 (0-100)
  hallucination: number;      // 환각 탐지 점수 (0-100, 높을수록 환각 적음)
  information_density: number; // 정보 밀도 (0-100)
  model_variance: number;     // 모델 변이성 (0-100, 낮을수록 안정적)
  relevance: number;          // 관련성 (0-100)
  token_usage: number;        // 토큰 사용량 점수 (0-100)
  final_score: number;        // 최종 점수 (0-100)
  overall_feedback?: string;  // AI 피드백 텍스트
  prompt_type?: string;       // 프롬프트 타입
}

// 성능 지표 타입 (레거시 호환용)
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