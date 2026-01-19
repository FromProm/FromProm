import { create } from 'zustand';
import { User, AuthState } from '../types';
import { useCartStore } from './cartStore';
import { usePurchaseStore } from './purchaseStore';

interface AuthStore extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (email: string, password: string, name: string, role: 'buyer' | 'seller') => Promise<void>;
  setUser: (user: User | null) => void;
  checkAuth: () => void;
}

// 초기 인증 상태 확인
const getInitialAuthState = () => {
  const token = localStorage.getItem('accessToken');
  return !!token;
};

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isAuthenticated: getInitialAuthState(),
  isLoading: false,

  checkAuth: () => {
    const token = localStorage.getItem('accessToken');
    set({ isAuthenticated: !!token });
  },

  login: async (email: string, _password: string) => {
    set({ isLoading: true });
    try {
      // TODO: 실제 API 호출로 대체
      // 더미 데이터로 테스트
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
    // 장바구니 및 구매 내역 비우기
    useCartStore.getState().clearCart();
    usePurchaseStore.getState().clearPurchases();
    set({ user: null, isAuthenticated: false });
  },

  register: async (email: string, _password: string, name: string, role: 'buyer' | 'seller') => {
    set({ isLoading: true });
    try {
      // TODO: 실제 API 호출로 대체
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