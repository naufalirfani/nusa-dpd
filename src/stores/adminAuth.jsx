import { create } from 'zustand';
import { adminVerifyToken } from '../config/api';

let initPromise = null;
let verifyPromiseByToken = new Map();

async function verifyTokenOnce(token) {
  if (!token) {
    return { success: false, valid: false };
  }

  if (verifyPromiseByToken.has(token)) {
    return verifyPromiseByToken.get(token);
  }

  const promise = (async () => {
    try {
      return await adminVerifyToken(token);
    } finally {
      verifyPromiseByToken.delete(token);
    }
  })();

  verifyPromiseByToken.set(token, promise);
  return promise;
}

const useAdminAuthStore = create((set, get) => ({
  isAuthenticated: false,
  adminToken: null,
  adminUser: null,
  isVerifying: false,
  hasInitialized: false,

  initializeAuth: async () => {
    if (get().hasInitialized && !get().isVerifying) {
      return get().isAuthenticated;
    }

    if (initPromise) {
      return initPromise;
    }

    initPromise = (async () => {
      try {
        const token = sessionStorage.getItem('admin_token');

        if (!token) {
          set({
            hasInitialized: true,
            isAuthenticated: false,
            adminToken: null,
            adminUser: null,
            isVerifying: false,
          });
          return false;
        }

        set({ isVerifying: true });
        const result = await verifyTokenOnce(token);

        if (result.success && result.valid) {
          set({
            hasInitialized: true,
            isAuthenticated: true,
            adminToken: token,
            adminUser: result.payload || null,
            isVerifying: false,
          });
          return true;
        }

        sessionStorage.removeItem('admin_token');
        set({
          hasInitialized: true,
          isAuthenticated: false,
          adminToken: null,
          adminUser: null,
          isVerifying: false,
        });
        return false;
      } catch (error) {
        console.error('Error initializing auth:', error);
        set({
          hasInitialized: true,
          isAuthenticated: false,
          adminToken: null,
          adminUser: null,
          isVerifying: false,
        });
        return false;
      } finally {
        initPromise = null;
      }
    })();

    return initPromise;
  },

  login: (token, username, email) => {
    sessionStorage.setItem('admin_token', token);

    set({
      isAuthenticated: true,
      adminToken: token,
      adminUser: { username, email },
      hasInitialized: true,
    });
  },

  logout: () => {
    sessionStorage.removeItem('admin_token');

    set({
      isAuthenticated: false,
      adminToken: null,
      adminUser: null,
      isVerifying: false,
      hasInitialized: true,
    });
  },

  verifyToken: async () => {
    const token = get().adminToken || sessionStorage.getItem('admin_token');

    if (!token) {
      return false;
    }

    try {
      const result = await verifyTokenOnce(token);

      if (result.success && result.valid) {
        if (result.payload) {
          set({ adminUser: result.payload });
        }
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error verifying token:', error);
      return false;
    }
  },

  isSessionValid: async () => {
    const { isAuthenticated, adminToken } = get();

    if (!isAuthenticated || !adminToken) {
      return false;
    }

    return get().verifyToken();
  },

  getToken: () => {
    return get().adminToken || sessionStorage.getItem('admin_token');
  },
}));

export default useAdminAuthStore;