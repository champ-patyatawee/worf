import { create } from 'zustand';
import type { User, UserStatus } from '@/types';
import { api } from '@/services/api';

const statusOrder: Record<UserStatus, number> = {
  online: 0,
  busy: 1,
  away: 2,
  offline: 3,
};

interface UserState {
  users: User[];
  currentDMUserId: string | null;
  isLoading: boolean;
  error: string | null;

  fetchUsers: () => Promise<void>;
  getUserById: (userId: string) => User | undefined;
  updateUserStatus: (userId: string, status: UserStatus) => void;
  setCurrentDMUser: (userId: string | null) => void;
  onlineUsers: () => User[];
  sortedUsers: () => User[];
}

export const useUserStore = create<UserState>()((set, get) => ({
  users: [],
  currentDMUserId: null,
  isLoading: false,
  error: null,

  fetchUsers: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.getUsers();
      const { data } = response as { success: boolean; data: User[] };
      set({ users: data, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch users',
        isLoading: false,
      });
    }
  },

  getUserById: (userId: string) => {
    return get().users.find((u) => u.id === userId);
  },

  updateUserStatus: (userId: string, status: UserStatus) => {
    set((state) => ({
      users: state.users.map((u) =>
        u.id === userId ? { ...u, status } : u
      ),
    }));
  },

  setCurrentDMUser: (userId: string | null) => {
    set({ currentDMUserId: userId });
  },

  onlineUsers: () => {
    return get().users.filter((user) => user.status === 'online');
  },

  sortedUsers: () => {
    return [...get().users].sort((a, b) => {
      const statusDiff = statusOrder[a.status] - statusOrder[b.status];
      if (statusDiff !== 0) return statusDiff;
      return a.name.localeCompare(b.name);
    });
  },
}));
