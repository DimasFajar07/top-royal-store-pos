import { create } from 'zustand';
import { Product } from './products';

export interface CartItem extends Product {
  quantity: number;
}

interface CartState {
  items: CartItem[];
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  getTotal: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  
  addToCart: (product) => {
    const { items } = get();
    const existingItem = items.find((item) => item.id === product.id);

    if (existingItem) {
      if (existingItem.quantity < product.stok) {
        set({
          items: items.map((item) =>
            item.id === product.id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          ),
        });
      }
    } else {
      if (product.stok > 0) {
        set({ items: [...items, { ...product, quantity: 1 }] });
      }
    }
  },

  removeFromCart: (productId) => {
    set({ items: get().items.filter((item) => item.id !== productId) });
  },

  updateQuantity: (productId, quantity) => {
    const { items } = get();
    const itemToUpdate = items.find((item) => item.id === productId);
    
    if (!itemToUpdate) return;
    
    // Ensure quantity doesn't exceed stock and is not less than 1
    const validQuantity = Math.max(1, Math.min(quantity, itemToUpdate.stok));

    set({
      items: items.map((item) =>
        item.id === productId ? { ...item, quantity: validQuantity } : item
      ),
    });
  },

  clearCart: () => set({ items: [] }),

  getTotal: () => {
    return get().items.reduce((total, item) => total + item.harga * item.quantity, 0);
  },
}));
