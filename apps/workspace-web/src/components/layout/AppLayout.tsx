import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Sidebar } from './Sidebar';
import { IconSidebar } from './IconSidebar';
import { NoteSidebar } from '@/components/notes/NoteSidebar';
import { KanbanSidebar } from '@/components/kanban/KanbanSidebar';
import { AgentSidebar } from '@/components/agents/AgentSidebar';
import { useUIStore } from '@/stores/uiStore';
import { Modal } from '@/components/common/Modal';
import { ChannelForm } from '@/components/forms/ChannelForm';
import { Menu, PanelLeftClose } from 'lucide-react';
import { cn } from '@/utils/cn';

export function AppLayout() {
  const { isAuthenticated, isLoading } = useAuth();
  const { sidebarCollapsed, toggleSidebar, setSidebarCollapsed, activeNavTab, setActiveNavTab, activeModal, closeModal } = useUIStore();
  const location = useLocation();
  const touchStartX = useRef<number | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Sync activeNavTab with route
  useEffect(() => {
    const path = location.pathname;
    if (path.startsWith('/dashboard')) {
      setActiveNavTab('dashboard');
    } else if (path.startsWith('/notes')) {
      setActiveNavTab('note');
    } else if (path.startsWith('/kanban')) {
      setActiveNavTab('kanban');
    } else if (path.startsWith('/channels') || path.startsWith('/messages') || path.startsWith('/search')) {
      setActiveNavTab('chat');
    } else if (path.startsWith('/agents')) {
      setActiveNavTab('agent');
    }
  }, [location.pathname, setActiveNavTab]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;

    const touchEndX = e.changedTouches[0].clientX;
    const deltaX = touchEndX - touchStartX.current;

    if (activeNavTab === 'chat') {
      if (deltaX > 50 && !sidebarCollapsed) {
        toggleSidebar();
      } else if (deltaX < -50 && sidebarCollapsed) {
        toggleSidebar();
      }
    }

    touchStartX.current = null;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
        <div className="animate-spin rounded-full h-7 w-7 border-2" style={{ borderColor: 'var(--color-text-tertiary)', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const isChatTab = activeNavTab === 'chat';
  const isNoteTab = activeNavTab === 'note';
  const isKanbanTab = activeNavTab === 'kanban';
  const isAgentTab = activeNavTab === 'agent';

  return (
    <div
      className="flex h-screen"
      style={{ backgroundColor: 'var(--color-bg-primary)' }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Mobile overlay for chat sidebar */}
      {isMobile && isChatTab && !sidebarCollapsed && (
        <div
          className="fixed inset-0 z-30 bg-black/20"
          onClick={toggleSidebar}
        />
      )}

      {/* Icon Sidebar - always visible */}
      <div className="fixed md:static inset-y-0 left-0 z-50">
        <IconSidebar />
      </div>

      {/* Chat Sidebar - only when chat tab is active */}
      {isChatTab && (
        <>
          <div
            className={cn(
              'fixed md:hidden inset-y-0 left-[64px] z-40 transition-transform duration-200 ease-out',
              sidebarCollapsed ? '-translate-x-full' : 'translate-x-0'
            )}
          >
            <Sidebar />
          </div>
          <div
            className={cn(
              'hidden md:flex h-full overflow-hidden transition-all duration-200 ease-out',
              sidebarCollapsed ? 'w-0 opacity-0' : 'w-[260px] opacity-100'
            )}
          >
            <div className="w-[260px] h-full flex-shrink-0">
              <Sidebar />
            </div>
          </div>
        </>
      )}

      {/* Note Sidebar - only when note tab is active */}
      {isNoteTab && (
        <>
          <div
            className={cn(
              'fixed md:hidden inset-y-0 left-[64px] z-40 transition-transform duration-200 ease-out',
              sidebarCollapsed ? '-translate-x-full' : 'translate-x-0'
            )}
          >
            <NoteSidebar />
          </div>
          <div
            className={cn(
              'hidden md:flex h-full overflow-hidden transition-all duration-200 ease-out',
              sidebarCollapsed ? 'w-0 opacity-0' : 'w-[260px] opacity-100'
            )}
          >
            <div className="w-[260px] h-full flex-shrink-0">
              <NoteSidebar />
            </div>
          </div>
        </>
      )}

      {/* Agent Sidebar - only when agent tab is active */}
      {isAgentTab && (
        <>
          <div
            className={cn(
              'fixed md:hidden inset-y-0 left-[64px] z-40 transition-transform duration-200 ease-out',
              sidebarCollapsed ? '-translate-x-full' : 'translate-x-0'
            )}
          >
            <AgentSidebar />
          </div>
          <div
            className={cn(
              'hidden md:flex h-full overflow-hidden transition-all duration-200 ease-out',
              sidebarCollapsed ? 'w-0 opacity-0' : 'w-[260px] opacity-100'
            )}
          >
            <div className="w-[260px] h-full flex-shrink-0">
              <AgentSidebar />
            </div>
          </div>
        </>
      )}

      {/* Kanban Sidebar - only when kanban tab is active */}
      {isKanbanTab && (
        <>
          <div
            className={cn(
              'fixed md:hidden inset-y-0 left-[64px] z-40 transition-transform duration-200 ease-out',
              sidebarCollapsed ? '-translate-x-full' : 'translate-x-0'
            )}
          >
            <KanbanSidebar />
          </div>
          <div
            className={cn(
              'hidden md:flex h-full overflow-hidden transition-all duration-200 ease-out',
              sidebarCollapsed ? 'w-0 opacity-0' : 'w-[260px] opacity-100'
            )}
          >
            <div className="w-[260px] h-full flex-shrink-0">
              <KanbanSidebar />
            </div>
          </div>
        </>
      )}

      <main className="flex-1 flex flex-col overflow-hidden ml-[64px] md:ml-0" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
        {isMobile && isChatTab && (
          <button
            onClick={toggleSidebar}
            className="absolute top-3 left-3 z-20 w-9 h-9 flex items-center justify-center rounded-[var(--radius-md)] transition-all duration-100 border-2"
            style={{
              backgroundColor: 'var(--color-bg-secondary)',
              borderColor: 'var(--color-border-primary)',
              boxShadow: '2px 2px 0px #0D0D0D',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-accent-primary)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border-primary)'; }}
          >
            {sidebarCollapsed ? (
              <Menu className="h-4 w-4" style={{ color: 'var(--color-text-secondary)' }} />
            ) : (
              <PanelLeftClose className="h-4 w-4" style={{ color: 'var(--color-text-secondary)' }} />
            )}
          </button>
        )}
        <Outlet />
      </main>

      {activeModal === 'createChannel' && (
        <Modal isOpen={true} onClose={closeModal} title="Create Channel">
          <ChannelForm onClose={closeModal} />
        </Modal>
      )}
    </div>
  );
}
