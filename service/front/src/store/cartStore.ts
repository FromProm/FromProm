import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  id: string;
  title: string;
  price: number;
  category: string;
  sellerName: string;
  sellerSub: string;  // 판매자 USER ID (백엔드 구매 API용)
  description: string;
  rating: number;
  addedAt: string;
}

interface CartStore {
  items: CartItem[];
  addToCart: (item: Omit<CartItem, 'addedAt'>) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  getTotalPrice: () => number;
  getItemCount: () => number;
  isInCart: (id: string) => boolean;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addToCart: (item) => {
        const { items } = get();
        const existingItem = items.find(cartItem => cartItem.id === item.id);
        
        if (!existingItem) {
          set({
            items: [...items, { ...item, addedAt: new Date().toISOString() }]
          });
        }
      },

      removeFromCart: (id) => {
        set(state => ({
          items: state.items.filter(item => item.id !== id)
        }));
      },

      clearCart: () => {
        set({ items: [] });
      },

      getTotalPrice: () => {
        const { items } = get();
        return items.reduce((total, item) => total + item.price, 0);
      },

      getItemCount: () => {
        const { items } = get();
        return items.length;
      },

      isInCart: (id) => {
        const { items } = get();
        return items.some(item => item.id === id);
      },
    }),
    {
      name: 'cart-storage',
    }
  )
);