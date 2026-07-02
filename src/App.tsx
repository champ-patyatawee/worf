import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import { Dashboard } from "./pages/Dashboard";
import { SprintProject } from "./pages/SprintProject";
import { ProjectPage } from "./pages/ProjectPage";
import { OKRs } from "./pages/OKRs";
import { OKRDetail } from "./pages/OKRDetail";
import { ChatSessionPage } from "./pages/chat/ChatSessionPage";
import { Notes } from "./pages/Notes";
import { SettingsLayout } from "./pages/settings/SettingsLayout";
import { AIProvider } from "./pages/settings/AIProvider";
import { PromptTemplates } from "./pages/settings/PromptTemplates";
import { TerminalSettings } from "./pages/settings/TerminalSettings";
import { NavigationShortcuts } from "./pages/settings/NavigationShortcuts";
import { BackupRestore } from "./pages/settings/BackupRestore";

// Redirect helper: reads :boardId from URL and redirects to /project/:boardId
function RedirectToProject() {
  const { boardId } = useParams<{ boardId: string }>();
  return <Navigate to={`/project/${boardId}`} replace />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />
          {/* Unified project page — NEW */}
          <Route path="/project" element={<ProjectPage />} />
          <Route path="/project/:boardId" element={<ProjectPage />} />
          {/* Projects listing */}
          <Route path="/projects" element={<Navigate to="/project" replace />} />
          {/* Legacy routes — redirects for backward compatibility */}
          <Route path="/kanban" element={<Navigate to="/project" replace />} />
          <Route path="/kanban/:boardId" element={<RedirectToProject />} />
          <Route path="/projects/:boardId" element={<RedirectToProject />} />
          {/* Keep SprintProject accessible for direct legacy access */}
          <Route path="/sprint/:boardId" element={<SprintProject />} />
          <Route path="/okr" element={<OKRs />} />
          <Route path="/okr/:id" element={<OKRDetail />} />
          <Route path="/ai-chat" element={<ChatSessionPage />} />
          <Route path="/ai-chat/:sessionId" element={<ChatSessionPage />} />
          <Route path="/notes" element={<Notes />} />
          <Route path="/notes/:slug" element={<Notes />} />
          <Route path="/settings" element={<SettingsLayout />}>
            <Route index element={<Navigate to="/settings/ai" replace />} />
            <Route path="ai" element={<AIProvider />} />
            <Route path="prompts" element={<PromptTemplates />} />
            <Route path="terminal" element={<TerminalSettings />} />
            <Route path="navigation" element={<NavigationShortcuts />} />
            <Route path="backup" element={<BackupRestore />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
