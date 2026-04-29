import { useState } from 'react';
import { Search, UserPlus, X } from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { Button, Input } from '@/components/common';
import { Avatar } from '@/components/common/Avatar';
import { api } from '@/services/api';
import type { User } from '@/types';

interface InviteUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  channelId: string;
  channelName: string;
  onInviteSuccess?: () => void;
}

export function InviteUserModal({ isOpen, onClose, channelId, channelName, onInviteSuccess }: InviteUserModalProps) {
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!search.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.getUsers();
      const usersData = (response as any).data || response;
      const allUsers = Array.isArray(usersData) ? usersData : [];
      const filtered = allUsers.filter((u: User) =>
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        u.name.toLowerCase().includes(search.toLowerCase())
      );
      setUsers(filtered);
    } catch (err) {
      setError('Failed to search users');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInvite = async () => {
    if (!selectedUser) return;
    setIsInviting(true);
    setError(null);
    try {
      await api.inviteToChannel(channelId, selectedUser.id);
      onInviteSuccess?.();
      onClose();
      setSearch('');
      setUsers([]);
      setSelectedUser(null);
    } catch (err: any) {
      setError('User is already a member of this channel');
    } finally {
      setIsInviting(false);
    }
  };

  const handleClose = () => {
    setSearch('');
    setUsers([]);
    setSelectedUser(null);
    setError(null);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <div className="px-6 pb-6">
        <div className="mb-4">
          <h2 className="text-base font-medium text-[var(--color-text-primary)]">Invite people to #{channelName}</h2>
        </div>

        <div className="space-y-4">
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

          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                placeholder="Search by email or name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSearch(); } }}
              />
            </div>
            <Button onClick={handleSearch} isLoading={isLoading} variant="secondary">
              <Search className="h-4 w-4" />
            </Button>
          </div>

          {users.length > 0 && (
            <div
              className="rounded-[var(--radius-md)] overflow-hidden border-2 border-[var(--color-border-primary)] shadow-[var(--shadow-sm)] divide-y divide-[var(--color-border-secondary)]"
            >
              {users.map((user) => (
                <div
                  key={user.id}
                  onClick={() => setSelectedUser(user)}
                  className={`p-3 cursor-pointer transition-colors duration-75 ${
                    selectedUser?.id === user.id
                      ? 'bg-[var(--color-bg-hover)]'
                      : 'hover:bg-[var(--color-bg-hover)]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Avatar
                      name={user.name}
                      src={user.avatar}
                      size="sm"
                      status={user.status}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">{user.name}</p>
                      <p className="text-xs text-[var(--color-text-tertiary)] truncate">{user.email}</p>
                    </div>
                    {selectedUser?.id === user.id && (
                      <div
                        className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: 'var(--color-text-primary)' }}
                      >
                        <span className="text-[var(--color-bg-primary)] text-xs">✓</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {users.length === 0 && search && !isLoading && (
            <p className="text-sm text-[var(--color-text-tertiary)] text-center py-4">No users found</p>
          )}

          {selectedUser && (
            <div
              className="flex items-center justify-between p-3 rounded-[var(--radius-md)] border-2 border-[var(--color-border-primary)] shadow-[var(--shadow-sm)]"
              style={{ backgroundColor: 'var(--color-bg-secondary)' }}
            >
              <div className="flex items-center gap-3">
                <Avatar
                  name={selectedUser.name}
                  src={selectedUser.avatar}
                  size="sm"
                  status={selectedUser.status}
                />
                <div>
                  <p className="text-sm font-medium text-[var(--color-text-primary)]">{selectedUser.name}</p>
                  <p className="text-xs text-[var(--color-text-tertiary)]">{selectedUser.email}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="p-1 rounded text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button variant="secondary" onClick={handleClose} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleInvite}
              isLoading={isInviting}
              disabled={!selectedUser}
              className="flex-1"
            >
              <UserPlus className="h-4 w-4 mr-1" />
              Invite
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}