import { create } from 'zustand';

export const useStore = create((set) => ({
  user: null,         // Firebase auth user
  profile: null,      // User's dating profile from Firestore
  loading: true,      // Auth loading state
  
  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setLoading: (loading) => set({ loading }),
  
  clearStore: () => set({ user: null, profile: null })
}));
