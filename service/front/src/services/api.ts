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
};

export default api;
