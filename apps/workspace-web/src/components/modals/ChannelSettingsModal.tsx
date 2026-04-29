import { useState, useEffect } from 'react';
import { Trash2, UserX, Crown } from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common';
import { Avatar } from '@/components/common/Avatar';
import { api } from '@/services/api';

interface ChannelSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  channelId: string;
  channelName: string;
  channelDescription?: string;
  isAdmin: boolean;
  onDeleteSuccess?: () => void;
}

interface Member {
  user: {
    id: string;
    name: string;
    email: string;
  };
  role: 'admin' | 'member';
}

export function ChannelSettingsModal({
  isOpen,
  onClose,
  channelId,
  channelName,
  isAdmin,
  onDeleteSuccess,
}: ChannelSettingsModalProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchMembers();
    }
  }, [isOpen, channelId]);

  const fetchMembers = async () => {
    setIsLoading(true);
    try {
      const response = await api.getChannelMembers(channelId);
      const membersData = (response as any).data || response;
      setMembers(membersData || []);
    } catch (err) {
      console.error('Failed to fetch members:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    try {
      await api.removeChannelMember(channelId, userId);
      setMembers(members.filter(m => m.user.id !== userId));
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to remove member');
    }
  };

  const handleDeleteChannel = async () => {
    setIsDeleting(true);
    setError(null);
    try {
      await api.deleteChannel(channelId);
      onDeleteSuccess?.();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to delete channel');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    setShowDeleteConfirm(false);
    setError(null);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <div className="px-6 pb-6">
        <div className="mb-5">
          <h2 className="text-base font-medium text-[var(--color-text-primary)]">#{channelName} settings</h2>
        </div>

        <div className="space-y-5">
          {error && (
            <div
              className="text-sm px-3 py-2.5 rounded-[var(--radius-md)] border-2 shadow-[var(--shadow-sm)]"
              style={{
                color: 'var(--color-error)',
                backgroundColor: 'var(--color-bg-secondary)',
                borderColor: 'var(--color-error)',
              }}
            >
              {error}
            </div>
          )}

          <div>
            <h3 className="text-sm font-medium text-[var(--color-text-secondary)] mb-2">
              Members ({members.length})
            </h3>
            {isLoading ? (
              <div className="text-center py-4 text-sm text-[var(--color-text-tertiary)]">Loading...</div>
            ) : (
              <div
                className="rounded-[var(--radius-md)] overflow-hidden border-2 border-[var(--color-border-primary)] shadow-[var(--shadow-sm)] divide-y divide-[var(--color-border-secondary)]"
              >
                {members.map((member) => (
                  <div
                    key={member.user.id}
                    className="p-3 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar
                        name={member.user.name}
                        size="sm"
                      />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium text-[var(--color-text-primary)]">{member.user.name}</p>
                          {member.role === 'admin' && (
                            <Crown className="h-3 w-3 text-[var(--color-warning)]" />
                          )}
                        </div>
                        <p className="text-xs text-[var(--color-text-tertiary)]">{member.user.email}</p>
                      </div>
                    </div>
                    {isAdmin && member.role !== 'admin' && (
                      <button
                        onClick={() => handleRemoveMember(member.user.id)}
                        className="p-1 rounded text-[var(--color-text-tertiary)] hover:text-[var(--color-error)] hover:bg-[var(--color-bg-hover)] transition-colors"
                        title="Remove member"
                      >
                        <UserX className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {isAdmin && (
            <div className="pt-4 border-t-2 border-[var(--color-border-primary)]">
              <h3 className="text-sm font-medium text-[var(--color-error)] mb-2">Danger zone</h3>
              {!showDeleteConfirm ? (
                <Button
                  variant="danger"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full"
                >
                  <Trash2 className="h-4 w-4 mr-1.5" />
                  Delete Channel
                </Button>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-[var(--color-text-secondary)]">
                    Are you sure? This action cannot be undone.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      onClick={() => setShowDeleteConfirm(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="danger"
                      onClick={handleDeleteChannel}
                      isLoading={isDeleting}
                      className="flex-1"
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {!isAdmin && (
            <Button onClick={handleClose} className="w-full">
              Close
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}