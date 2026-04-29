import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Button, Input } from '@/components/common';
import { useChannelStore } from '@/stores/channelStore';
import { api } from '@/services/api';
import { createChannelSlug } from '@/utils/slug';
import { Hash, Lock, X } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { Channel } from '@/types';

interface ChannelFormData {
  name: string;
  description?: string;
  type: 'public' | 'private';
}

interface ChannelFormProps {
  onClose: () => void;
}

export function ChannelForm({ onClose }: ChannelFormProps) {
  const navigate = useNavigate();
  const addChannel = useChannelStore((state) => state.addChannel);
  const [serverError, setServerError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<'public' | 'private'>('public');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ChannelFormData>({
    defaultValues: {
      type: 'public',
    },
  });

  const onSubmit = async (formData: ChannelFormData) => {
    setServerError(null);
    try {
      const response = await api.createChannel(formData);
      const { data } = response as { success: boolean; data: Channel };
      addChannel(data);
      onClose();
      navigate(`/channels/${createChannelSlug(data.name)}`);
    } catch (error: any) {
      console.error('Failed to create channel:', error);
      const errorMessage = error?.response?.data?.error || 'Failed to create channel. Please try again.';
      setServerError(errorMessage);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div
        className="relative w-full max-w-[480px] rounded-[var(--radius-xl)] p-8 animate-scaleIn border-2 border-[var(--color-border-primary)]"
        style={{
          backgroundColor: 'var(--color-bg-secondary)',
          boxShadow: 'var(--shadow-modal)',
        }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-[var(--radius-sm)] transition-all border-2 border-transparent hover:border-[var(--color-border-primary)] hover:bg-[var(--color-bg-hover)]"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-6">
          <h2 className="text-[22px] font-extrabold" style={{ color: 'var(--color-text-primary)', lineHeight: '28px' }}>
            Create a channel
          </h2>
          <p className="text-[15px] mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            Channels are where conversations happen around a topic.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {serverError && (
            <div
              className="text-[15px] px-4 py-3 rounded-[var(--radius-md)] border-2 font-medium"
              style={{
                color: 'var(--color-error)',
                backgroundColor: 'rgba(251, 113, 133, 0.08)',
                borderColor: 'var(--color-error)',
              }}
            >
              {serverError}
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="name" className="block text-[12px] font-bold" style={{ color: 'var(--color-text-secondary)' }}>
              Channel name
            </label>
            <div className="relative">
              <Hash className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--color-accent-primary)' }} />
              <Input
                id="name"
                placeholder="e.g. engineering"
                className="pl-11"
                {...register('name', {
                  required: 'Channel name is required',
                  pattern: {
                    value: /^[a-z0-9-]+$/,
                    message: 'Lowercase letters, numbers, and hyphens only',
                  },
                })}
                error={!!errors.name}
              />
            </div>
            {errors.name && (
              <p className="text-[13px] font-medium" style={{ color: 'var(--color-error)' }}>{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="description" className="block text-[12px] font-bold" style={{ color: 'var(--color-text-secondary)' }}>
              Description <span className="font-normal" style={{ color: 'var(--color-text-tertiary)' }}>(optional)</span>
            </label>
            <Input
              id="description"
              placeholder="What's this channel about?"
              {...register('description')}
            />
          </div>

          <div className="space-y-2">
            <label className="block text-[12px] font-bold" style={{ color: 'var(--color-text-secondary)' }}>
              Visibility
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label
                className={cn(
                  'relative flex items-start gap-3 p-4 rounded-[var(--radius-md)] border-2 cursor-pointer transition-all duration-150',
                  selectedType === 'public'
                    ? 'border-[var(--color-accent-primary)] shadow-[2px_2px_0px_#0D0D0D]'
                    : 'border-[var(--color-border-primary)] hover:border-[var(--color-text-secondary)]'
                )}
                style={selectedType === 'public' ? { backgroundColor: 'var(--color-accent-subtle)' } : {}}
              >
                <input
                  type="radio"
                  value="public"
                  {...register('type')}
                  className="sr-only"
                  onChange={() => setSelectedType('public')}
                />
                <Hash className="h-5 w-5 mt-0.5 flex-shrink-0" style={{ color: selectedType === 'public' ? 'var(--color-accent-primary)' : 'var(--color-text-secondary)' }} />
                <div>
                  <span className="text-[15px] font-bold" style={{ color: 'var(--color-text-primary)' }}>Public</span>
                  <p className="text-[13px] mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>Anyone can view and join</p>
                </div>
              </label>
              <label
                className={cn(
                  'relative flex items-start gap-3 p-4 rounded-[var(--radius-md)] border-2 cursor-pointer transition-all duration-150',
                  selectedType === 'private'
                    ? 'border-[var(--color-accent-primary)] shadow-[2px_2px_0px_#0D0D0D]'
                    : 'border-[var(--color-border-primary)] hover:border-[var(--color-text-secondary)]'
                )}
                style={selectedType === 'private' ? { backgroundColor: 'var(--color-accent-subtle)' } : {}}
              >
                <input
                  type="radio"
                  value="private"
                  {...register('type')}
                  className="sr-only"
                  onChange={() => setSelectedType('private')}
                />
                <Lock className="h-5 w-5 mt-0.5 flex-shrink-0" style={{ color: selectedType === 'private' ? 'var(--color-accent-primary)' : 'var(--color-text-secondary)' }} />
                <div>
                  <span className="text-[15px] font-bold" style={{ color: 'var(--color-text-primary)' }}>Private</span>
                  <p className="text-[13px] mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>Only invited members</p>
                </div>
              </label>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting} className="flex-1">
              Create Channel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
