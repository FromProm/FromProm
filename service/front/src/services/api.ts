import axios from 'axios';
import { categoryToPromptType } from './dummyData';

// 백엔드 서버 URL을 한 곳에서 관리
// 프로덕션: '' (EKS ALB Ingress)
// 개발: http://localhost:33000
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

// axios 인스턴스 생성
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
  },
});

// 요청 인터셉터: 토큰 자동 추가
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// User API
export const userApi = {
  // 회원가입
  signUp: (data: { email: string; password: string; nickname: string }) =>
    api.post('/api/users/signup', data),

  // 이메일 인증 확인
  confirm: (data: { email: string; code: string }) =>
    api.post('/api/users/confirm', data),

  // 인증 코드 재전송
  resendCode: (email: string) =>
    api.post('/api/users/resend-code', { email }),

  // 로그인
  login: (data: { email: string; password: string }) =>
    api.post('/api/users/login', data),

  // 로그아웃
  logout: () => api.post('/api/users/logout'),

  // 내 정보 조회
  getMe: () => api.get('/api/users/me'),

  // 닉네임 중복 확인
  checkNickname: (nickname: string) =>
    api.post('/api/users/check-nickname', { nickname }),


  // 이메일 중복 확인
  checkEmail: (email: string) =>
    api.post('/api/users/check-email', { email }),

  // 이메일 인증 코드 발송 (회원가입 전)
  sendVerificationCode: (email: string) =>
    api.post('/api/users/send-verification-code', { email }),

  // 이메일 인증 코드 확인 (회원가입 전)
  verifyCode: (email: string, code: string) =>
    api.post('/api/users/verify-code', { email, code }),

  // 토큰 재발급
  refreshToken: (refreshToken: string) =>
    api.post('/api/users/refresh', { refreshToken }),

  // 비밀번호 변경 (로그인 상태)
  changePassword: (data: { oldPassword: string; newPassword: string }) =>
    api.post('/api/users/change-password', data),

  // 비밀번호 찾기 - 이메일 발송
  forgotPassword: (email: string) =>
    api.post('/api/users/forgot-password', { email }),

  // 비밀번호 찾기 - 코드 확인 및 새 비밀번호 설정
  confirmPassword: (data: { email: string; confirmationCode: string; newPassword: string }) =>
    api.post('/api/users/confirm-password', data),

  // 프로필 수정 (닉네임, 소개글, 프로필 이미지)
  updateProfile: (data: { nickname?: string; bio?: string; profileImage?: string }) =>
    api.patch('/api/users/profile', data),

  // 회원 탈퇴
  withdraw: () => api.delete('/api/users/withdraw'),

};

// Credit API
export const creditApi = {
  // 크레딧 잔액 조회
  getBalance: () => api.get('/api/credit/balance'),

  // 크레딧 충전
  charge: (data: { amount: number; paymentMethod?: string; paymentId?: string }) =>
    api.post('/api/credit/charge', data),

  // 단일 프롬프트 구매
  purchasePrompt: (data: { sellerSub: string; promptPrice: number; promptTitle: string; promptId?: string }) =>
    api.post('/api/credit/purchase', data),

  // 장바구니 일괄 구매
  purchaseCart: (items: Array<{
    id: string;
    title: string;
    price: number;
    category: string;
    sellerName: string;
    description: string;
    rating: number;
    sellerSub: string;
  }>) => api.post('/api/credit/purchase/cart', { items }),

  // 구매 내역 조회
  getPurchaseHistory: () => api.get('/api/credit/purchases'),

  // 최근 구매 내역 조회 (페이징)
  getRecentPurchases: (limit: number = 10) => api.get(`/api/credit/purchases/recent?limit=${limit}`),

  // 전체 크레딧 히스토리 조회
  getCreditHistory: () => api.get('/api/credit/history'),
};

// Prompt API
export const promptApi = {
  // 프롬프트 등록 (auth-service - 인증 필요)
  create: (data: {
    title: string;
    description: string;
    category: string;
    price: number;
    content: string;
    model: string;
    inputs: Array<{ key: string; value: string }>;
    examples: Array<{ inputValues: Array<{ key: string; value: string }> }>;
  }) => api.post('/api/prompts/registration', {
    title: data.title,
    promptType: categoryToPromptType(data.category),
    price: data.price,
    model: data.model,
    description: data.description,
    content: data.content,
    inputs: data.inputs,
    examples: data.examples,
  }),

  // 모든 프롬프트 목록 조회 (search-service - 인증 불필요)
  getAllPrompts: (limit: number = 50) => api.get(`/api/search/prompts/all?limit=${limit}&_t=${Date.now()}`),

  // 내가 등록한 프롬프트 목록 조회 (auth-service - 인증 필요)
  getMyPrompts: () => api.get('/api/prompts/my'),

  // 프롬프트 상세 정보 조회 (search-service - 인증 불필요)
  getPromptDetail: (promptId: string) => api.get(`/api/search/prompts/${promptId}`),

  // 프롬프트 상세 + 댓글 목록 통합 조회 (search-service - 인증 불필요)
  getPromptDetailWithComments: (promptId: string) => api.get(`/api/search/prompts/${promptId}/detail`),

  // 프롬프트 통계 조회 (search-service - 인증 불필요)
  getPromptStats: (promptId: string) => api.get(`/api/search/prompts/${promptId}/stats`),

  // 프롬프트 댓글 목록 조회 (search-service - 인증 불필요)
  getPromptComments: (promptId: string) => api.get(`/api/search/prompts/${promptId}/comments`),

  // 프롬프트 삭제 (auth-service - 인증 필요)
  deletePrompt: (promptId: string) => api.delete(`/api/prompts/${promptId}`),
};

// Interaction API (좋아요, 북마크, 댓글)
export const interactionApi = {
  // 좋아요 추가
  addLike: (promptId: string) =>
    api.post(`/api/prompts/${promptId}/like`),

  // 좋아요 취소
  deleteLike: (promptId: string) =>
    api.delete(`/api/prompts/${promptId}/like`),

  // 북마크 추가
  addBookmark: (promptId: string) =>
    api.post(`/api/prompts/${promptId}/bookmark`),

  // 북마크 취소
  deleteBookmark: (promptId: string) =>
    api.delete(`/api/prompts/${promptId}/bookmark`),

  // 댓글 추가
  addComment: (promptId: string, content: string) =>
    api.post(`/api/prompts/${promptId}/comments`, { content }),

  // 댓글 수정
  updateComment: (promptId: string, commentSK: string, content: string) =>
    api.patch(`/api/prompts/${promptId}/comments`, { commentSK, content }),

  // 댓글 삭제
  deleteComment: (promptId: string, commentSK: string) =>
    api.delete(`/api/prompts/${promptId}/comments/${commentSK}`),
};

export default api;
