import { create } from "zustand";
import { persist } from "zustand/middleware";
import { signIn as signInService, signUp as signUpService } from "@/services/auth";
import type { AuthStore } from "./types";

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      signIn: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const { user, token } = await signInService({ email, password });
          set({ user, token, isAuthenticated: true, isLoading: false });
        } catch (e) {
          const message =
            e instanceof Error ? e.message : "Sign in failed";
          set({ error: message, isLoading: false });
        }
      },

      signUp: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const { user, token } = await signUpService({ email, password });
          set({ user, token, isAuthenticated: true, isLoading: false });
        } catch (e) {
          const message =
            e instanceof Error ? e.message : "Sign up failed";
          set({ error: message, isLoading: false });
        }
      },

      signOut: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          error: null,
        });
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: "mini-map-auth",
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
