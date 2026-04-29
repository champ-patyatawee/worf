import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '@/hooks/useAuth';
import { Button, Input, Avatar } from '@/components/common';
import { Camera } from 'lucide-react';

interface SettingsFormData {
  name: string;
  email: string;
  status: 'online' | 'offline' | 'busy' | 'away';
}

export function ProfileSettings() {
  const { user, logout } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<SettingsFormData>({
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
      status: user?.status || 'online',
    },
  });

  const onSubmit = async (_data: SettingsFormData) => {
    setIsSaving(true);
    setMessage(null);
    try {
      // TODO: Implement settings update API
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setMessage({ type: 'success', text: 'Settings saved successfully!' });
    } catch {
      setMessage({ type: 'error', text: 'Failed to save settings' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-secondary py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-text-primary mb-6">Profile Settings</h1>

        {message && (
          <div
            className={`mb-4 p-3 rounded-[var(--radius-md)] text-sm border-2 shadow-[var(--shadow-sm)] ${
              message.type === 'success'
                ? 'bg-status-success/10 text-status-success border-status-success/30'
                : 'bg-status-error/10 text-status-error border-status-error/30'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Profile Section */}
        <div className="bg-bg-primary rounded-[var(--radius-lg)] shadow-[var(--shadow-card)] border-2 border-[var(--color-border-primary)] p-6 mb-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Profile</h2>

          <div className="flex items-center gap-4 mb-6">
            <div className="relative">
              <Avatar name={user?.name || ''} src={user?.avatar} size="lg" />
              <button className="absolute bottom-0 right-0 p-1 bg-bg-secondary rounded-full border-2 border-[var(--color-border-primary)] hover:bg-bg-hover">
                <Camera className="h-4 w-4 text-text-secondary" />
              </button>
            </div>
            <div>
              <p className="font-medium text-text-primary">{user?.name}</p>
              <p className="text-sm text-text-tertiary">{user?.email}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-text-primary mb-1">
                Display Name
              </label>
              <Input
                id="name"
                {...register('name', { required: 'Name is required' })}
                error={!!errors.name}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-[var(--color-error)]">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-text-primary mb-1">
                Email
              </label>
              <Input
                id="email"
                type="email"
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
                <p className="mt-1 text-sm text-[var(--color-error)]">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Status
              </label>
              <select
                {...register('status')}
                className="h-10 w-full rounded-[var(--radius-md)] border-2 border-[var(--color-border-primary)] bg-[var(--color-bg-primary)] px-3 py-2 text-sm focus:outline-none focus:shadow-[4px_4px_0px_#0D0D0D] focus:border-[var(--color-accent-primary)]"
              >
                <option value="online">Online</option>
                <option value="offline">Offline</option>
                <option value="busy">Busy</option>
                <option value="away">Away</option>
              </select>
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit" isLoading={isSaving} disabled={!isDirty}>
                Save Changes
              </Button>
            </div>
          </form>
        </div>

        {/* Account Section */}
        <div className="bg-bg-primary rounded-[var(--radius-lg)] shadow-[var(--shadow-card)] border-2 border-[var(--color-border-primary)] p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Account</h2>
          <p className="text-sm text-text-secondary mb-4">
            Need to sign out? Click the button below.
          </p>
          <Button variant="danger" onClick={logout}>
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
}
