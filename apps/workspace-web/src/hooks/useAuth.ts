import { useAuthStore } from '@/stores/authStore';

export function useAuth() {
  const { user, isAuthenticated, isLoading, login, register, logout, error, clearError } =
    useAuthStore();

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    register,
    logout,
    clearError,
  };
}
