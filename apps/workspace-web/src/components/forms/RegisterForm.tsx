import { useForm } from 'react-hook-form';
import { useAuth } from '@/hooks/useAuth';
import { Button, Input } from '@/components/common';
import { Link } from 'react-router-dom';

interface RegisterFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export function RegisterForm() {
  const { register: registerUser, isLoading, error } = useAuth();
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>();

  const password = watch('password');

  const onSubmit = async (data: RegisterFormData) => {
    try {
      await registerUser(data.email, data.password, data.name);
    } catch {
      // Error is handled by the store
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      <div className="w-full max-w-[400px] px-6 animate-slideUp">
        <div className="text-center mb-10">
          <h1 className="text-[28px] font-extrabold tracking-tight mb-2" style={{ color: 'var(--color-text-primary)', lineHeight: '34px' }}>
            Create account
          </h1>
          <p className="text-[15px]" style={{ color: 'var(--color-text-secondary)' }}>
            Get started with your workspace
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
              <label htmlFor="name" className="block text-[12px] font-bold" style={{ color: 'var(--color-text-secondary)' }}>
                Full name
              </label>
              <Input
                id="name"
                type="text"
                placeholder="Your name"
                {...register('name', {
                  required: 'Name is required',
                  minLength: {
                    value: 2,
                    message: 'Name must be at least 2 characters',
                  },
                })}
                error={!!errors.name}
              />
              {errors.name && (
                <p className="text-[13px] font-medium" style={{ color: 'var(--color-error)' }}>{errors.name.message}</p>
              )}
            </div>

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
                placeholder="Create a password"
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

            <div className="space-y-1.5">
              <label htmlFor="confirmPassword" className="block text-[12px] font-bold" style={{ color: 'var(--color-text-secondary)' }}>
                Confirm password
              </label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                {...register('confirmPassword', {
                  required: 'Please confirm your password',
                  validate: (value) =>
                    value === password || 'Passwords do not match',
                })}
                error={!!errors.confirmPassword}
              />
              {errors.confirmPassword && (
                <p className="text-[13px] font-medium" style={{ color: 'var(--color-error)' }}>{errors.confirmPassword.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full mt-3"
              isLoading={isLoading}
              size="lg"
            >
              Create Account
            </Button>

            <p className="text-center text-[15px]" style={{ color: 'var(--color-text-secondary)' }}>
              Already have an account?{' '}
              <Link
                to="/login"
                className="font-bold transition-colors"
                style={{ color: 'var(--color-accent-primary)' }}
              >
                Sign in
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
