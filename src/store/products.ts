import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export interface Product {
  id: string;
  nama_produk: string;
  kategori_id: string;
  categories?: { nama: string }; // Joined from Supabase
  kategori: string; // We'll keep this for UI compatibility (mapped from categories)
  harga: number;
  stok: number;
  barcode: string | null;
  gambar: string | null;
  created_at: string;
}

interface ProductState {
  products: Product[];
  isLoading: boolean;
  error: string | null;
  fetchProducts: () => Promise<void>;
  addProduct: (product: Omit<Product, 'id' | 'created_at'>) => Promise<boolean>;
  updateProduct: (id: string, product: Partial<Product>) => Promise<boolean>;
  deleteProduct: (id: string) => Promise<boolean>;
  uploadImage: (file: File) => Promise<string | null>;
}

export const useProductStore = create<ProductState>((set, get) => ({
  products: [],
  isLoading: false,
  error: null,

  fetchProducts: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          categories (
            nama
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Hitung public URL untuk gambar jika ada
      const mappedData = data?.map(item => {
        let imageUrl = item.gambar;
        if (imageUrl && !imageUrl.startsWith('http')) {
          const { data: publicUrlData } = supabase.storage
            .from('products')
            .getPublicUrl(imageUrl);
            imageUrl = publicUrlData.publicUrl;
        }

        return {
          ...item,
          gambar: imageUrl,
          kategori: item.categories?.nama || 'Tanpa Kategori',
          harga: item.harga_jual || item.harga 
        };
      }) || [];

      set({ products: mappedData as Product[] });
    } catch (err: any) {
      set({ error: err.message });
    } finally {
      set({ isLoading: false });
    }
  },

  addProduct: async (product) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('products')
        .insert([product])
        .select()
        .single();

      if (error) throw error;
      set({ products: [data as Product, ...get().products] });
      return true;
    } catch (err: any) {
      set({ error: err.message });
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  updateProduct: async (id, product) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('products')
        .update(product)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      set({
        products: get().products.map((p) => (p.id === id ? (data as Product) : p)),
      });
      return true;
    } catch (err: any) {
      set({ error: err.message });
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  deleteProduct: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      set({ products: get().products.filter((p) => p.id !== id) });
      return true;
    } catch (err: any) {
      set({ error: err.message });
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  uploadImage: async (file) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('products')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('products').getPublicUrl(filePath);
      return data.publicUrl;
    } catch (err: any) {
      set({ error: err.message });
      return null;
    }
  },
}));
