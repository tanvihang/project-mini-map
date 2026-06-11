import { create } from "zustand";
import { persist } from "zustand/middleware";
import { signIn as signInService, signUp as signUpService } from "@/services/auth";
import type { AuthResponse } from "@/types/auth";
import type { AuthStore } from "./types";

function toUser(res: AuthResponse) {
  return {
    userId: res.userId,
    email: res.email,
    displayName: res.displayName,
  };
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      signIn: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const res = await signInService({ email, password });
          if (!res.isSuccess) {
            set({ error: "Sign in failed", isLoading: false });
            return;
          }
          set({ user: toUser(res), isAuthenticated: true, isLoading: false });
        } catch (e) {
          const message =
            e instanceof Error ? e.message : "Sign in failed";
          set({ error: message, isLoading: false });
        }
      },

      signUp: async (email, password, displayName) => {
        set({ isLoading: true, error: null });
        try {
          const res = await signUpService({ email, password, displayName });
          if (!res.isSuccess) {
            set({ error: "Sign up failed", isLoading: false });
            return;
          }
          set({ user: toUser(res), isAuthenticated: true, isLoading: false });
        } catch (e) {
          const message =
            e instanceof Error ? e.message : "Sign up failed";
          set({ error: message, isLoading: false });
        }
      },

      signOut: () => {
        set({
          user: null,
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
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
