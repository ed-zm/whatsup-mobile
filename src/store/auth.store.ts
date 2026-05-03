import { create } from 'zustand';

import {
  clearSecureSession,
  getSecureSession,
  saveSecureSession,
} from '@/services/auth/secureAuthStorage';

export type AuthUser = {
  id: string;
  phoneNumber: string;
  displayName?: string;
  avatarUrl?: string;
};

type AuthState = {
  currentUser: AuthUser | null;
  jwt: string | null;
  isAuthenticated: boolean;
  isHydratingSession: boolean;
  hydrateSession: () => Promise<void>;
  signIn: (payload: { user: AuthUser; jwt: string }) => Promise<void>;
  signOut: () => Promise<void>;
};

export const useAuthStore = create<AuthState>()((set) => ({
  currentUser: null,
  jwt: null,
  isAuthenticated: false,
  isHydratingSession: true,
  hydrateSession: async () => {
    const session = await getSecureSession();

    set({
      currentUser: session
        ? {
            id: session.userId,
            phoneNumber: '',
          }
        : null,
      jwt: session?.jwt ?? null,
      isAuthenticated: Boolean(session),
      isHydratingSession: false,
    });
  },
  signIn: async ({ user, jwt }) => {
    await saveSecureSession({ jwt, userId: user.id });

    set({
      currentUser: user,
      jwt,
      isAuthenticated: true,
    });
  },
  signOut: async () => {
    await clearSecureSession();

    set({
      currentUser: null,
      jwt: null,
      isAuthenticated: false,
    });
  },
}));
