import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../services/api';
import { authService } from '../services';
import type { User } from '../types';

/**
 * Authentication state.
 *
 * The JWT lives in an httpOnly cookie, which JavaScript cannot read. So rather
 * than decoding a token, the app asks `/auth/me` who it is talking to. A 401 is
 * a normal answer ("nobody"), not an error, which is why it resolves to `null`
 * instead of throwing.
 */

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (input: {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
  }) => Promise<User>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const CURRENT_USER_QUERY_KEY = ['auth', 'me'] as const;

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: CURRENT_USER_QUERY_KEY,
    queryFn: async (): Promise<User | null> => {
      try {
        const response = await authService.me();
        return response.data.user;
      } catch (error) {
        if (error instanceof ApiError && error.isUnauthorized) return null;
        throw error;
      }
    },
    staleTime: 60_000,
    retry: false,
  });

  const setUser = useCallback(
    (user: User) => {
      queryClient.setQueryData(CURRENT_USER_QUERY_KEY, user);
    },
    [queryClient],
  );

  const loginMutation = useMutation({
    mutationFn: (input: { email: string; password: string }) => authService.login(input),
  });

  const registerMutation = useMutation({
    mutationFn: (input: { name: string; email: string; password: string; confirmPassword: string }) =>
      authService.register(input),
  });

  const login = useCallback(
    async (email: string, password: string) => {
      const response = await loginMutation.mutateAsync({ email, password });
      setUser(response.data.user);
      // Any cached figures belong to the previous session.
      await queryClient.invalidateQueries();
      return response.data.user;
    },
    [loginMutation, queryClient, setUser],
  );

  const register = useCallback(
    async (input: { name: string; email: string; password: string; confirmPassword: string }) => {
      const response = await registerMutation.mutateAsync(input);
      setUser(response.data.user);
      await queryClient.invalidateQueries();
      return response.data.user;
    },
    [registerMutation, queryClient, setUser],
  );

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      // Clear local state even if the network call failed — the user asked to
      // sign out, so the UI must not keep showing their data.
      queryClient.setQueryData(CURRENT_USER_QUERY_KEY, null);
      queryClient.clear();
    }
  }, [queryClient]);

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: CURRENT_USER_QUERY_KEY });
  }, [queryClient]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: data ?? null,
      isLoading,
      login,
      register,
      logout,
      setUser,
      refresh,
    }),
    [data, isLoading, login, register, logout, setUser, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside an AuthProvider.');
  return context;
};
