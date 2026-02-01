import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { creditApi } from '../services/api';

export interface PurchasedPrompt {
  id: string;
  title: string;
  price: number;
  category: string;
  sellerName: string;
  description: string;
  content: string;
  rating: number;
  purchasedAt: string;
  downloadCount: number;
}

interface PurchaseStore {
  purchasedPrompts: PurchasedPrompt[];
  purchasedPromptIds: string[]; // 구매한 프롬프트 ID 목록 (빠른 조회용)
  isLoading: boolean;
  addPurchasedPrompt: (prompt: Omit<PurchasedPrompt, 'purchasedAt' | 'downloadCount'>) => void;
  addPurchasedPromptId: (promptId: string) => void;
  getPurchasedPrompts: () => PurchasedPrompt[];
  isPurchased: (id: string) => boolean;
  incrementDownloadCount: (id: string) => void;
  clearPurchases: () => void;
  fetchPurchaseHistory: () => Promise<void>;
  syncWithBackend: () => Promise<void>;
}

export const usePurchaseStore = create<PurchaseStore>()(
  persist(
    (set, get) => ({
      purchasedPrompts: [],
      purchasedPromptIds: [],
      isLoading: false,

      addPurchasedPrompt: (prompt) => {
        const { purchasedPrompts, purchasedPromptIds } = get();
        const existingPrompt = purchasedPrompts.find(p => p.id === prompt.id);
        
        if (!existingPrompt) {
          set({
            purchasedPrompts: [
              ...purchasedPrompts,
              {
                ...prompt,
                purchasedAt: new Date().toISOString(),
                downloadCount: 0
              }
            ],
            purchasedPromptIds: [...new Set([...purchasedPromptIds, prompt.id])]
          });
        }
      },

      addPurchasedPromptId: (promptId) => {
        const { purchasedPromptIds } = get();
        if (!purchasedPromptIds.includes(promptId)) {
          set({
            purchasedPromptIds: [...purchasedPromptIds, promptId]
          });
        }
      },

      getPurchasedPrompts: () => {
        const { purchasedPrompts } = get();
        return purchasedPrompts.sort((a, b) => 
          new Date(b.purchasedAt).getTime() - new Date(a.purchasedAt).getTime()
        );
      },

      isPurchased: (id) => {
        const { purchasedPromptIds } = get();
        return purchasedPromptIds.includes(id);
      },

      incrementDownloadCount: (id) => {
        set(state => ({
          purchasedPrompts: state.purchasedPrompts.map(prompt =>
            prompt.id === id
              ? { ...prompt, downloadCount: prompt.downloadCount + 1 }
              : prompt
          )
        }));
      },

      clearPurchases: () => {
        set({ purchasedPrompts: [], purchasedPromptIds: [] });
      },

      // 백엔드에서 구매 이력 가져오기
      fetchPurchaseHistory: async () => {
        const token = localStorage.getItem('accessToken');
        if (!token) return;

        set({ isLoading: true });
        try {
          const response = await creditApi.getPurchaseHistory();
          if (response.data.success && response.data.purchases) {
            // 구매한 프롬프트 ID 목록 추출
            const promptIds: string[] = [];
            response.data.purchases.forEach((purchase: any) => {
              if (purchase.promptIds) {
                promptIds.push(...purchase.promptIds);
              }
            });
            
            set(state => ({
              purchasedPromptIds: [...new Set([...state.purchasedPromptIds, ...promptIds])]
            }));
          }
        } catch (error) {
          console.error('Failed to fetch purchase history:', error);
        } finally {
          set({ isLoading: false });
        }
      },

      // 백엔드와 동기화 (로그인 시 호출)
      syncWithBackend: async () => {
        await get().fetchPurchaseHistory();
      },
    }),
    {
      name: 'purchase-storage',
    }
  )
);