// 사용자 타입
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'buyer' | 'seller' | 'both';
  avatar?: string;
  createdAt: string;
}

// 프롬프트 타입 (OpenSearch 스키마 기반)
export interface Prompt {
  promptId: string;
  title: string;
  description: string;
  content: string;
  category: string;
  model: string;
  nickname: string;
  userId: string;
  status: string;
  price: number;
  createdAt: string;
  updatedAt: string;
  examplesS3Url?: string;
  evaluationMetrics?: EvaluationMetrics;
  examples?: PromptExample[];
  // DynamoDB 통계 (search-service에서 병합)
  likeCount?: number;
  bookmarkCount?: number;
  commentCount?: number;
  isLiked?: boolean;
  isBookmarked?: boolean;
  // 검색 점수
  score?: number;
}

// 프롬프트 예시 타입
export interface PromptExample {
  index: number;
  input: {
    inputType: string;
    content: string;
  };
  output: string;
}

// AI 평가 지표 타입 (OpenSearch 스키마 기반)
export interface EvaluationMetrics {
  finalScore: number;
  relevance: number;
  consistency: number;
  hallucination: number;
  informationDensity: number;
  modelVariance: number;
  tokenUsage: number;
  promptType?: string;
  overallFeedback?: string;
}

// 프롬프트 통계 타입 (DynamoDB)
export interface PromptStats {
  promptId: string;
  likeCount: number;
  bookmarkCount: number;
  commentCount: number;
  isLiked?: boolean;
  isBookmarked?: boolean;
}

// 댓글 타입
export interface Comment {
  commentId: string;
  content: string;
  userId: string;
  nickname: string;
  createdAt: string;
  updatedAt: string;
}

// 성능 지표 타입 (레거시 호환용)
export interface PerformanceMetrics {
  accuracy: number;
  responseTime: number;
  tokenEfficiency: number;
  costPerQuery: number;
  successRate: number;
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