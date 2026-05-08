import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout';
import { Login, Register, Channel, DirectMessage, DirectMessages, ProfileSettings, SettingsLayout, AIProvider, PromptTemplates, Note, Tools, Search, SearchResult, Notes, Kanban, ChatSessionPage, Dashboard } from '@/pages';
import { usePresence } from '@/hooks/usePresence';

function App() {
  usePresence();

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
            <Route path="/ai-chat" element={<ChatSessionPage />} />
            <Route path="/ai-chat/:sessionId" element={<ChatSessionPage />} />
            <Route path="/notes" element={<Notes />} />
            <Route path="/notes/:slug" element={<Notes />} />
            <Route path="/search" element={<Search />} />
            <Route path="/search-result/:messageId" element={<SearchResult />} />
            <Route path="/profile-settings" element={<ProfileSettings />} />

            {/* Settings routes (admin only) */}
            <Route path="/settings" element={<SettingsLayout />}>
              <Route index element={<Navigate to="/settings/ai" replace />} />
              <Route path="ai" element={<AIProvider />} />
              <Route path="prompts" element={<PromptTemplates />} />
              <Route path="note" element={<Note />} />
              <Route path="tools" element={<Tools />} />
            </Route>
          </Route>

          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/channels" replace />} />
          <Route path="*" element={<Navigate to="/channels" replace />} />
        </Routes>
        
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
