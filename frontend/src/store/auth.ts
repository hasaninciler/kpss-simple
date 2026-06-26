import { create } from 'zustand';
import api from '@/lib/api';

interface User { id: number; name: string; email: string; role: string; xp: number; streak: number; }
interface AuthStore {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  fetchMe: () => Promise<void>;
}

export const useAuth = create<AuthStore>((set) => ({
  user: null,
  loading: false,

  login: async (email, password) => {
    set({ loading: true });
    try {
      const { data } = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', data.token);
      set({ user: data.user });
    } finally { set({ loading: false }); }
  },

  register: async (name, email, password) => {
    set({ loading: true });
    try {
      const { data } = await api.post('/auth/register', { name, email, password });
      localStorage.setItem('token', data.token);
      set({ user: data.user });
    } finally { set({ loading: false }); }
  },

  logout: () => {
    localStorage.removeItem('token');
    set({ user: null });
    window.location.href = '/login';
  },

  fetchMe: async () => {
    try {
      const { data } = await api.get('/auth/me');
      set({ user: data });
    } catch { localStorage.removeItem('token'); }
  },
}));
