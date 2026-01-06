import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
  addPurchasedPrompt: (prompt: Omit<PurchasedPrompt, 'purchasedAt' | 'downloadCount'>) => void;
  getPurchasedPrompts: () => PurchasedPrompt[];
  isPurchased: (id: string) => boolean;
  incrementDownloadCount: (id: string) => void;
}

export const usePurchaseStore = create<PurchaseStore>()(
  persist(
    (set, get) => ({
      purchasedPrompts: [],

      addPurchasedPrompt: (prompt) => {
        const { purchasedPrompts } = get();
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
            ]
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
        const { purchasedPrompts } = get();
        return purchasedPrompts.some(prompt => prompt.id === id);
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
    }),
    {
      name: 'purchase-storage',
    }
  )
);