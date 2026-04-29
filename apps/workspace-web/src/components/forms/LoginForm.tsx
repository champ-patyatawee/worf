import { useForm } from 'react-hook-form';
import { useAuth } from '@/hooks/useAuth';
import { Button, Input } from '@/components/common';
import { Link, useNavigate } from 'react-router-dom';

interface LoginFormData {
  email: string;
  password: string;
}

export function LoginForm() {
  const { login, isLoading, error } = useAuth();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>();

  const onSubmit = async (data: LoginFormData) => {
    try {
      await login(data.email, data.password);
      navigate('/channels');
    } catch {
      // Error is handled by the store
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      <div className="w-full max-w-[400px] px-6 animate-slideUp">
        <div className="text-center mb-10">
          <h1 className="text-[28px] font-extrabold tracking-tight mb-2" style={{ color: 'var(--color-text-primary)', lineHeight: '34px' }}>
            Sign in
          </h1>
          <p className="text-[15px]" style={{ color: 'var(--color-text-secondary)' }}>
            to continue to your workspace
          </p>
        </div>

        <div
          className="rounded-[var(--radius-xl)] p-7 border-2 border-[var(--color-border-primary)]"
          style={{
            backgroundColor: 'var(--color-bg-secondary)',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <div
                className="text-[15px] px-4 py-3 rounded-[var(--radius-md)] border-2"
                style={{
                  color: 'var(--color-error)',
                  backgroundColor: 'rgba(251, 113, 133, 0.08)',
                  borderColor: 'var(--color-error)',
                }}
              >
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-[12px] font-bold" style={{ color: 'var(--color-text-secondary)' }}>
                Email address
              </label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                {...register('email', {
                  required: 'Email is required',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Invalid email address',
                  },
                })}
                error={!!errors.email}
              />
              {errors.email && (
                <p className="text-[13px] font-medium" style={{ color: 'var(--color-error)' }}>{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-[12px] font-bold" style={{ color: 'var(--color-text-secondary)' }}>
                Password
              </label>
              <Input
                id="password"
                type="password"
                placeholder="Your password"
                {...register('password', {
                  required: 'Password is required',
                  minLength: {
                    value: 6,
                    message: 'Password must be at least 6 characters',
                  },
                })}
                error={!!errors.password}
              />
              {errors.password && (
                <p className="text-[13px] font-medium" style={{ color: 'var(--color-error)' }}>{errors.password.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full mt-3"
              isLoading={isLoading}
              size="lg"
            >
              Sign In
            </Button>

            <p className="text-center text-[15px]" style={{ color: 'var(--color-text-secondary)' }}>
              Don't have an account?{' '}
              <Link
                to="/register"
                className="font-bold transition-colors"
                style={{ color: 'var(--color-accent-primary)' }}
              >
                Create one
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
