import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout';
import { Login, Register, Channel, DirectMessage, DirectMessages, ProfileSettings, SettingsLayout, AIProvider, Agents, Note, Search, SearchResult, Notes, Kanban, AgentChat, Dashboard } from '@/pages';
import { AgentWebViewModal } from '@/components/modals/AgentWebViewModal';
import { usePresence } from '@/hooks/usePresence';
import { useUIStore } from '@/stores/uiStore';

function App() {
  usePresence();
  
  const agentWebView = useUIStore((s) => s.agentWebView);
  const closeAgentWebView = useUIStore((s) => s.closeAgentWebView);

  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected routes */}
          <Route element={<AppLayout />}>
            <Route path="/channels" element={<Navigate to="/channels/general" replace />} />
            <Route path="/channels/:id" element={<Channel />} />
            <Route path="/messages" element={<DirectMessages />} />
            <Route path="/messages/:dmSlug" element={<DirectMessage />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/kanban" element={<Kanban />} />
            <Route path="/kanban/:boardId" element={<Kanban />} />
            <Route path="/agents" element={<AgentChat />} />
            <Route path="/agents/:agentSlug" element={<AgentChat />} />
            <Route path="/notes" element={<Notes />} />
            <Route path="/notes/:slug" element={<Notes />} />
            <Route path="/search" element={<Search />} />
            <Route path="/search-result/:messageId" element={<SearchResult />} />
            <Route path="/profile-settings" element={<ProfileSettings />} />
          </Route>

          {/* Settings routes (admin only) */}
          <Route path="/settings" element={<SettingsLayout />}>
            <Route index element={<Navigate to="/settings/ai" replace />} />
            <Route path="ai" element={<AIProvider />} />
            <Route path="agents" element={<Agents />} />
            <Route path="note" element={<Note />} />
          </Route>

          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/channels" replace />} />
          <Route path="*" element={<Navigate to="/channels" replace />} />
        </Routes>
        
        {/* Global Modals */}
        <AgentWebViewModal
          isOpen={agentWebView.isOpen}
          onClose={closeAgentWebView}
          agentName={agentWebView.agentName}
          agentDisplayName={agentWebView.agentDisplayName}
          webViewUrl={agentWebView.webViewUrl}
        />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
