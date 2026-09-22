import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      setAuth: (data) => set({
        user: data.user,
        accessToken: data.access,
        refreshToken: data.refresh,
      }),
      clearAuth: () => set({ user: null, accessToken: null, refreshToken: null }),
      refreshAuthToken: async () => {
        const { refreshToken } = useAuthStore.getState();
        if (!refreshToken) {
          useAuthStore.getState().clearAuth();
          return false;
        }

        try {
          const baseUrl = import.meta.env.VITE_API_URL || '/api';
          const response = await fetch(`${baseUrl}/auth/token/refresh/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refresh: refreshToken }),
          });

          if (!response.ok) {
            throw new Error('Refresh failed');
          }

          const data = await response.json();
          set({
            accessToken: data.access,
            // Simple JWT by default only returns a new access token, 
            // but if it uses rotate refresh tokens, it might return a new refresh token too.
            refreshToken: data.refresh || refreshToken, 
          });
          return true;
        } catch (error) {
          console.error('Failed to refresh token', error);
          useAuthStore.getState().clearAuth();
          return false;
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
    }
  )
)

export default useAuthStore
