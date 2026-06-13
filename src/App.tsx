import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import { Dashboard } from "./pages/Dashboard";
import { Notes } from "./pages/Notes";
import { Kanban } from "./pages/Kanban";
import { ChatSessionPage } from "./pages/chat/ChatSessionPage";
import { SettingsLayout } from "./pages/settings/SettingsLayout";
import { AIProvider } from "./pages/settings/AIProvider";
import { NoteSettings } from "./pages/settings/NoteSettings";
import { PromptTemplates } from "./pages/settings/PromptTemplates";
import { TerminalSettings } from "./pages/settings/TerminalSettings";
import { NavigationShortcuts } from "./pages/settings/NavigationShortcuts";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/notes" element={<Notes />} />
          <Route path="/notes/:slug" element={<Notes />} />
          <Route path="/kanban" element={<Kanban />} />
          <Route path="/kanban/:boardId" element={<Kanban />} />
          <Route path="/ai-chat" element={<ChatSessionPage />} />
          <Route path="/ai-chat/:sessionId" element={<ChatSessionPage />} />
          <Route path="/settings" element={<SettingsLayout />}>
            <Route index element={<Navigate to="/settings/ai" replace />} />
            <Route path="ai" element={<AIProvider />} />
            <Route path="note" element={<NoteSettings />} />
            <Route path="prompts" element={<PromptTemplates />} />
            <Route path="terminal" element={<TerminalSettings />} />
            <Route path="navigation" element={<NavigationShortcuts />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
