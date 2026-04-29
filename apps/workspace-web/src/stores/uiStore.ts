import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type ModalType = 'createChannel' | 'inviteUser' | 'channelSettings' | null;
type NavTab = 'dashboard' | 'chat' | 'note' | 'kanban' | 'agent';

function getInitialNavTab(): NavTab {
  const path = window.location.pathname;
  if (path.startsWith('/notes')) return 'note';
  if (path.startsWith('/kanban')) return 'kanban';
  if (path.startsWith('/agents')) return 'agent';
  if (path.startsWith('/channels') || path.startsWith('/messages') || path.startsWith('/search')) return 'chat';
  return 'chat';
}

interface AgentWebViewState {
  isOpen: boolean;
  agentName: string;
  agentDisplayName?: string;
  webViewUrl: string;
}

interface UIState {
  sidebarCollapsed: boolean;
  activeNavTab: NavTab;
  activeModal: ModalType;
  searchQuery: string;
  agentWebView: AgentWebViewState;

  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setActiveNavTab: (tab: NavTab) => void;
  openModal: (modal: ModalType) => void;
  closeModal: () => void;
  setSearchQuery: (query: string) => void;
  openAgentWebView: (agentName: string, webViewUrl: string, agentDisplayName?: string) => void;
  closeAgentWebView: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      activeNavTab: getInitialNavTab(),
      activeModal: null,
      searchQuery: '',
      agentWebView: {
        isOpen: false,
        agentName: '',
        agentDisplayName: undefined,
        webViewUrl: '',
      },

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

      openAgentWebView: (agentName: string, webViewUrl: string, agentDisplayName?: string) => {
        set({
          agentWebView: {
            isOpen: true,
            agentName,
            agentDisplayName,
            webViewUrl,
          },
        });
      },

      closeAgentWebView: () => {
        set({
          agentWebView: {
            isOpen: false,
            agentName: '',
            agentDisplayName: undefined,
            webViewUrl: '',
          },
        });
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
