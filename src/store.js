import { create } from 'zustand';

// Store without auto-login persistence (Always starts at Landing page for explicit user login)
export const useStore = create((set) => ({
  user: null,         // Starts null - user must explicitly log in
  profile: null,      // User dating profile
  loading: false,     // Auth loading state
  
  setUser: (user) => {
    set({ user });
  },

  setProfile: (profile) => {
    set({ profile });
  },

  setLoading: (loading) => set({ loading }),
  
  clearStore: () => {
    localStorage.clear();
    set({ user: null, profile: null });
  }
}));
