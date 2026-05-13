import type { Board, Task } from '@/types/kanban';

const API_BASE = import.meta.env.VITE_KANBAN_API_URL || 'http://localhost:8000';

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

export const kanbanApi = {
  // Boards
  async getBoards(): Promise<Board[]> {
    const res = await fetch(`${API_BASE}/api/boards`, {
      headers: { ...authHeaders() },
    });
    return res.json();
  },

  async getBoard(id: string): Promise<Board> {
    const res = await fetch(`${API_BASE}/api/boards/${id}`, {
      headers: { ...authHeaders() },
    });
    if (!res.ok) throw new Error('Board not found');
    return res.json();
  },

  async createBoard(name: string, description?: string): Promise<Board> {
    const res = await fetch(`${API_BASE}/api/boards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ name, description: description || '' }),
    });
    return res.json();
  },

  async deleteBoard(id: string): Promise<void> {
    await fetch(`${API_BASE}/api/boards/${id}`, {
      method: 'DELETE',
      headers: { ...authHeaders() },
    });
  },

  // Tasks
  async createTask(task: {
    title: string;
    description?: string;
    priority?: string;
    status?: string;
    board_id: string;
  }): Promise<Task> {
    const res = await fetch(`${API_BASE}/api/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(task),
    });
    return res.json();
  },

  async updateTask(id: string, data: {
    title?: string;
    description?: string;
    priority?: string;
    status?: string;
  }): Promise<Task> {
    const res = await fetch(`${API_BASE}/api/tasks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async deleteTask(id: string): Promise<void> {
    await fetch(`${API_BASE}/api/tasks/${id}`, {
      method: 'DELETE',
      headers: { ...authHeaders() },
    });
  },

  async moveTask(id: string, status: 'todo' | 'in_progress' | 'done'): Promise<void> {
    const res = await fetch(`${API_BASE}/api/tasks/${id}/move`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) throw new Error('Failed to move task');
  },
};