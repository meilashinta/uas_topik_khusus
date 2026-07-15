import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type UserRole = 'ADMINISTRATOR' | 'SUPERVISOR' | 'TECHNICIAN' | 'EMPLOYEE';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  departmentId?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      logout: () => {
        localStorage.removeItem('accessToken');
        set({ user: null, isAuthenticated: false });
      },
    }),
    {
      name: 'auth-storage', // key in localStorage
    }
  )
);
