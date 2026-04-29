import { Navigate } from 'react-router-dom';
import { LoginForm } from '@/components/forms';
import { useAuth } from '@/hooks/useAuth';

export function Login() {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/channels" replace />;
  }

  return <LoginForm />;
}
