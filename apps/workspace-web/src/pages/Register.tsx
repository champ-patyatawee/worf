import { Navigate } from 'react-router-dom';
import { RegisterForm } from '@/components/forms';
import { useAuth } from '@/hooks/useAuth';

export function Register() {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/channels" replace />;
  }

  return <RegisterForm />;
}
