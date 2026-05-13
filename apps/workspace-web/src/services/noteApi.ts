import type { Folder, Page } from '@/types/note';

const API_BASE = import.meta.env.VITE_NOTE_API_URL || 'http://localhost:3000';

function getToken(): string | null {
  try {
    const stored = localStorage.getItem('workspace-auth');
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    return parsed.state?.token || null;
  } catch {
    return null;
  }
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export const noteApi = {
  // Folders
  async getFolders(): Promise<Folder[]> {
    const res = await fetch(`${API_BASE}/api/folders`, {
      headers: { ...authHeaders() },
    });
    return res.json();
  },

  async createFolder(name: string): Promise<Folder> {
    const res = await fetch(`${API_BASE}/api/folders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ name }),
    });
    return res.json();
  },

  async renameFolder(id: string, name: string): Promise<Folder> {
    const res = await fetch(`${API_BASE}/api/folders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ name }),
    });
    return res.json();
  },

  async deleteFolder(id: string): Promise<void> {
    await fetch(`${API_BASE}/api/folders/${id}`, {
      method: 'DELETE',
      headers: { ...authHeaders() },
    });
  },

  // Pages
  async getPage(id: string): Promise<Page> {
    const res = await fetch(`${API_BASE}/api/pages/${id}`, {
      headers: { ...authHeaders() },
    });
    if (!res.ok) throw new Error('Page not found');
    return res.json();
  },

  async getPageBySlug(slug: string): Promise<Page> {
    const res = await fetch(`${API_BASE}/api/pages/slug/${slug}`, {
      headers: { ...authHeaders() },
    });
    if (!res.ok) throw new Error('Page not found');
    return res.json();
  },

  async createPage(folderId: string | null, title?: string): Promise<Page> {
    const res = await fetch(
      folderId ? `${API_BASE}/api/folders/${folderId}/pages` : `${API_BASE}/api/pages`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ title }),
      }
    );
    return res.json();
  },

  async updatePage(id: string, data: { title?: string; content?: any }): Promise<Page> {
    const res = await fetch(`${API_BASE}/api/pages/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async deletePage(id: string): Promise<void> {
    await fetch(`${API_BASE}/api/pages/${id}`, {
      method: 'DELETE',
      headers: { ...authHeaders() },
    });
  },

  async getPagesInFolder(folderId: string): Promise<Page[]> {
    const res = await fetch(`${API_BASE}/api/folders/${folderId}/pages`, {
      headers: { ...authHeaders() },
    });
    return res.json();
  },

  async getRootPages(): Promise<Page[]> {
    const res = await fetch(`${API_BASE}/api/pages`, {
      headers: { ...authHeaders() },
    });
    return res.json();
  },

  // AI
  async complete(textBefore: string, textAfter: string): Promise<{ completion: string }> {
    const res = await fetch(`${API_BASE}/api/ai/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ textBefore, textAfter }),
    });
    if (!res.ok) throw new Error('AI completion failed');
    return res.json();
  },

  async generate(prompt: string, context?: string): Promise<{ content: string }> {
    const res = await fetch(`${API_BASE}/api/ai/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ prompt, context }),
    });
    if (!res.ok) throw new Error('AI generation failed');
    return res.json();
  },

  async edit(text: string, instruction: string): Promise<{ content: string }> {
    const res = await fetch(`${API_BASE}/api/ai/edit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ text, instruction }),
    });
    if (!res.ok) throw new Error('AI edit failed');
    return res.json();
  },

  // Settings
  async getNoteAiProvider(): Promise<any> {
    const res = await fetch(`${API_BASE}/api/settings/ai-provider`, {
      headers: { ...authHeaders() },
    });
    const json = await res.json();
    return json.data;
  },

  async selectNoteAiProvider(providerId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/api/settings/ai-provider`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ providerId }),
    });
    const json = await res.json();
    return json.data;
  },
};