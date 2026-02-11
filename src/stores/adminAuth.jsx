import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useAdminAuthStore = create(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      adminToken: null,
      adminUser: null,
      loginTime: null,
      
      login: (token, username) => {
        set({
          isAuthenticated: true,
          adminToken: token,
          adminUser: { username },
          loginTime: Date.now(),
        });
      },
      
      logout: () => {
        set({
          isAuthenticated: false,
          adminToken: null,
          adminUser: null,
          loginTime: null,
        });
      },

      isSessionValid: () => {
        const { isAuthenticated, loginTime } = get();
        
        if (!isAuthenticated || !loginTime) {
          return false;
        }

        const sessionTimeout = parseInt(import.meta.env.VITE_ADMIN_SESSION_TIMEOUT || '1800') * 1000; // convert to milliseconds
        const currentTime = Date.now();
        const elapsedTime = currentTime - loginTime;

        if (elapsedTime > sessionTimeout) {
          // Session expired, auto logout
          get().logout();
          return false;
        }

        return true;
      },

      refreshSession: () => {
        const { isAuthenticated } = get();
        if (isAuthenticated) {
          set({ loginTime: Date.now() });
        }
      },
    }),
    {
      name: 'admin-auth-storage',
    }
  )
);

export default useAdminAuthStore;
