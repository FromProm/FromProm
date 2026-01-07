import axios from 'axios';

// 백엔드 서버 URL을 한 곳에서 관리
const API_BASE_URL = 'http://localhost:8080';

// axios 인스턴스 생성
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
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

  // 크레딧 충전
  chargeCredit: (amount: number) =>
    api.post('/api/users/credit/charge', { amount }),

  // 크레딧 사용
  useCredit: (data: { amount: number; description: string }) =>
    api.post('/api/users/credit/use', data),
};

export default api;
