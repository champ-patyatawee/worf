import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type ModalType = 'createChannel' | 'inviteUser' | 'channelSettings' | null;
type NavTab = 'dashboard' | 'chat' | 'note' | 'kanban' | 'ai-chat' | 'settings';

function getInitialNavTab(): NavTab {
  const path = window.location.pathname;
  if (path.startsWith('/dashboard')) return 'dashboard';
  if (path.startsWith('/notes')) return 'note';
  if (path.startsWith('/kanban')) return 'kanban';
  if (path.startsWith('/ai-chat')) return 'ai-chat';
  if (path.startsWith('/settings')) return 'settings';
  if (path.startsWith('/channels') || path.startsWith('/messages') || path.startsWith('/search')) return 'chat';
  return 'chat';
}

interface UIState {
  sidebarCollapsed: boolean;
  activeNavTab: NavTab;
  activeModal: ModalType;
  searchQuery: string;

  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setActiveNavTab: (tab: NavTab) => void;
  openModal: (modal: ModalType) => void;
  closeModal: () => void;
  setSearchQuery: (query: string) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      activeNavTab: getInitialNavTab(),
      activeModal: null,
      searchQuery: '',

      toggleSidebar: () => {
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed }));
      },

      setSidebarCollapsed: (collapsed: boolean) => {
        set({ sidebarCollapsed: collapsed });
      },

      setActiveNavTab: (tab: NavTab) => {
        set({ activeNavTab: tab });
      },

      openModal: (modal: ModalType) => {
        set({ activeModal: modal });
      },

      closeModal: () => {
        set({ activeModal: null });
      },

      setSearchQuery: (query: string) => {
        set({ searchQuery: query });
      },
    }),
    {
      name: 'workspace-ui',
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    }
  )
);
