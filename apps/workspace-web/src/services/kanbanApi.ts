import type { Board, Task } from '@/types/kanban';

const API_BASE = import.meta.env.VITE_KANBAN_API_URL || 'http://localhost:8000';

export const kanbanApi = {
  // Boards
  async getBoards(): Promise<Board[]> {
    const res = await fetch(`${API_BASE}/api/boards`);
    return res.json();
  },

  async getBoard(id: string): Promise<Board> {
    const res = await fetch(`${API_BASE}/api/boards/${id}`);
    if (!res.ok) throw new Error('Board not found');
    return res.json();
  },

  async createBoard(name: string, description?: string): Promise<Board> {
    const res = await fetch(`${API_BASE}/api/boards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description: description || '' }),
    });
    return res.json();
  },

  async deleteBoard(id: string): Promise<void> {
    await fetch(`${API_BASE}/api/boards/${id}`, { method: 'DELETE' });
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
      headers: { 'Content-Type': 'application/json' },
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async deleteTask(id: string): Promise<void> {
    await fetch(`${API_BASE}/api/tasks/${id}`, { method: 'DELETE' });
  },

  async moveTask(id: string, status: 'todo' | 'in_progress' | 'done'): Promise<void> {
    const res = await fetch(`${API_BASE}/api/tasks/${id}/move`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) throw new Error('Failed to move task');
  },
};
