import { create } from 'zustand';
import { User, AuthState } from '../types';
import { useCartStore } from './cartStore';
import { usePurchaseStore } from './purchaseStore';
import { userApi } from '../services/api';

// 확장된 사용자 정보 타입
interface UserInfo {
  nickname: string;
  bio: string;
  credit: number;
  email?: string;
}

interface AuthStore extends AuthState {
  // 사용자 상세 정보
  userInfo: UserInfo | null;
  isUserInfoLoading: boolean;
  userInfoError: string | null;
  
  // 액션
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (email: string, password: string, name: string, role: 'buyer' | 'seller') => Promise<void>;
  setUser: (user: User | null) => void;
  checkAuth: () => void;
  
  // 사용자 정보 관련
  fetchUserInfo: () => Promise<UserInfo | null>;
  updateUserInfo: (data: Partial<UserInfo>) => void;
  clearUserInfo: () => void;
}

// 초기 인증 상태 확인
const getInitialAuthState = () => {
  const token = localStorage.getItem('accessToken');
  return !!token;
};

// 진행 중인 요청을 추적하기 위한 변수
let fetchUserInfoPromise: Promise<UserInfo | null> | null = null;

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  isAuthenticated: getInitialAuthState(),
  isLoading: false,
  
  // 사용자 상세 정보
  userInfo: null,
  isUserInfoLoading: false,
  userInfoError: null,

  checkAuth: () => {
    const token = localStorage.getItem('accessToken');
    set({ isAuthenticated: !!token });
  },

  // 사용자 정보 가져오기 (중복 요청 방지)
  fetchUserInfo: async () => {
    const state = get();
    
    // 이미 정보가 있으면 반환
    if (state.userInfo) {
      return state.userInfo;
    }
    
    // 이미 요청 중이면 기존 Promise 반환
    if (fetchUserInfoPromise) {
      return fetchUserInfoPromise;
    }
    
    // 토큰 없으면 null 반환
    const token = localStorage.getItem('accessToken');
    if (!token) {
      return null;
    }
    
    set({ isUserInfoLoading: true, userInfoError: null });
    
    // 새 요청 시작
    fetchUserInfoPromise = (async () => {
      try {
        const response = await userApi.getMe();
        const userInfo: UserInfo = {
          nickname: response.data.nickname || '',
          bio: response.data.bio || '',
          credit: response.data.credit || 0,
          email: response.data.email,
        };
        set({ userInfo, isUserInfoLoading: false });
        return userInfo;
      } catch (error: any) {
        const errorMessage = error.response?.data?.message || '사용자 정보를 불러오는데 실패했습니다.';
        set({ userInfoError: errorMessage, isUserInfoLoading: false });
        
        // 401 에러면 로그아웃 처리
        if (error.response?.status === 401) {
          get().logout();
        }
        return null;
      } finally {
        fetchUserInfoPromise = null;
      }
    })();
    
    return fetchUserInfoPromise;
  },

  // 사용자 정보 업데이트 (로컬)
  updateUserInfo: (data: Partial<UserInfo>) => {
    const state = get();
    if (state.userInfo) {
      set({ userInfo: { ...state.userInfo, ...data } });
    }
  },

  // 사용자 정보 초기화
  clearUserInfo: () => {
    set({ userInfo: null, isUserInfoLoading: false, userInfoError: null });
    fetchUserInfoPromise = null;
  },

  login: async (email: string, _password: string) => {
    set({ isLoading: true });
    try {
      const dummyUser: User = {
        id: '1',
        email,
        name: '테스트 사용자',
        role: 'both',
        createdAt: new Date().toISOString(),
      };
      
      localStorage.setItem('user', JSON.stringify(dummyUser));
      set({ user: dummyUser, isAuthenticated: true, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: () => {
    localStorage.removeItem('user');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('idToken');
    // 장바구니 및 구매 내역 비우기
    useCartStore.getState().clearCart();
    usePurchaseStore.getState().clearPurchases();
    // 사용자 정보 초기화
    fetchUserInfoPromise = null;
    set({ 
      user: null, 
      isAuthenticated: false,
      userInfo: null,
      isUserInfoLoading: false,
      userInfoError: null,
    });
  },

  register: async (email: string, _password: string, name: string, role: 'buyer' | 'seller') => {
    set({ isLoading: true });
    try {
      const dummyUser: User = {
        id: Date.now().toString(),
        email,
        name,
        role,
        createdAt: new Date().toISOString(),
      };
      
      localStorage.setItem('user', JSON.stringify(dummyUser));
      set({ user: dummyUser, isAuthenticated: true, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  setUser: (user: User | null) => {
    set({ user, isAuthenticated: !!user });
  },
}));
