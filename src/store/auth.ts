import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

interface UserProfile {
  id: string;
  nama: string;
  email: string;
  role: 'admin' | 'kasir';
}

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  checkSession: () => Promise<void>;
  signUp: (email: string, password: string, nama: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  profile: null,
  isLoading: true,
  checkSession: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();
          
        set({ user: session.user, profile, isLoading: false });
      } else {
        set({ user: null, profile: null, isLoading: false });
      }
    } catch (error) {
      console.error('Error checking session:', error);
      set({ user: null, profile: null, isLoading: false });
    }
  },
  signUp: async (email, password, nama) => {
    const { data: { user }, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          nama
        }
      }
    });
    
    if (error) throw error;
    if (user) {
      set({ user });
      // Profile will be created by the DB trigger
    }
  },
  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, profile: null });
  }
}));
