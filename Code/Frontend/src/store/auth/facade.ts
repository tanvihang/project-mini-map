import { useAuthStore } from "./store";

export const authFacade = {
  user: () => useAuthStore((s) => s.user),
  isAuthenticated: () => useAuthStore((s) => s.isAuthenticated),
  isLoading: () => useAuthStore((s) => s.isLoading),
  error: () => useAuthStore((s) => s.error),
  signIn: (email: string, password: string) =>
    useAuthStore.getState().signIn(email, password),
  signUp: (email: string, password: string) =>
    useAuthStore.getState().signUp(email, password),
  signOut: () => useAuthStore.getState().signOut(),
  clearError: () => useAuthStore.getState().clearError(),
};
