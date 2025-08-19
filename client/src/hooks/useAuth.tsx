import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

export interface AuthState {
  isAuthenticated: boolean;
  user: string | null;
  isLoading: boolean;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    isLoading: true
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['/api/auth/check'],
    queryFn: async () => {
      const response = await fetch('/api/auth/check', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to check auth');
      return response.json();
    },
    refetchOnWindowFocus: false,
    refetchOnMount: true
  });

  useEffect(() => {
    if (!isLoading) {
      setAuthState({
        isAuthenticated: data?.isAuthenticated || false,
        user: data?.user || null,
        isLoading: false
      });
    }
  }, [data, isLoading]);

  const login = async (credentials: { username: string; password: string }) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
      credentials: 'include'
    });

    if (response.ok) {
      await refetch();
      return { success: true };
    } else {
      const error = await response.json();
      return { success: false, error: error.error };
    }
  };

  const logout = async () => {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include'
    });
    setAuthState({
      isAuthenticated: false,
      user: null,
      isLoading: false
    });
  };

  return {
    ...authState,
    login,
    logout
  };
}