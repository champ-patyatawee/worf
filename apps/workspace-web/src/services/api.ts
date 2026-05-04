import type { AuthResponse, Channel, ChatImage, LinkPreview, LinkPreviewResponse, Message, PresignedUrlResponse, User } from '@/types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

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

class ApiService {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;

    const token = getToken();

    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      credentials: 'include',
      ...options,
    };

    const response = await fetch(url, config);

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || 'Request failed');
    }

    return response.json();
  }

  get<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    const query = params ? `?${new URLSearchParams(params)}` : '';
    return this.request<T>(`${endpoint}${query}`);
  }

  post<T>(endpoint: string, data: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  put<T>(endpoint: string, data: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  // Auth endpoints
  async register(data: { email: string; password: string; name: string }): Promise<AuthResponse> {
    return this.post<AuthResponse>('/api/auth/register', data);
  }

  async login(data: { email: string; password: string }): Promise<AuthResponse> {
    return this.post<AuthResponse>('/api/auth/login', data);
  }

  async logout(): Promise<void> {
    await this.post<void>('/api/auth/logout', {});
  }

  async getMe(): Promise<User> {
    return this.get<User>('/api/auth/me');
  }

  // Channel endpoints
  async getChannels(): Promise<Channel[]> {
    return this.get<Channel[]>('/api/channels');
  }

  async getChannel(id: string): Promise<Channel> {
    return this.get<Channel>(`/api/channels/${id}`);
  }

  async createChannel(data: { name: string; type: 'public' | 'private'; description?: string }): Promise<Channel> {
    return this.post<Channel>('/api/channels', data);
  }

  async updateChannel(id: string, data: Partial<Channel>): Promise<Channel> {
    return this.put<Channel>(`/api/channels/${id}`, data);
  }

  async deleteChannel(id: string): Promise<void> {
    return this.delete<void>(`/api/channels/${id}`);
  }

  async inviteToChannel(channelId: string, userId: string): Promise<void> {
    return this.post<void>(`/api/channels/${channelId}/invite`, { userId });
  }

  async getChannelMembers(channelId: string): Promise<any[]> {
    return this.get<any[]>(`/api/channels/${channelId}/members`);
  }

  async removeChannelMember(channelId: string, userId: string): Promise<void> {
    return this.delete<void>(`/api/channels/${channelId}/members/${userId}`);
  }

  // Message endpoints
  async getChannelMessages(channelId: string, params?: { before?: string; after?: string; limit?: number }): Promise<Message[]> {
    return this.get<Message[]>(`/api/channels/${channelId}/messages`, params as Record<string, string>);
  }

  async sendMessage(channelId: string, content: string, imageIds?: string[], threadId?: string): Promise<Message> {
    return this.post<Message>(`/api/channels/${channelId}/messages`, { 
      content,
      ...(imageIds && imageIds.length > 0 && { imageIds }),
      ...(threadId && { threadId })
    });
  }

  async getMessageThread(messageId: string): Promise<Message[]> {
    return this.get<Message[]>(`/api/messages/${messageId}/thread`);
  }

  async getMessage(messageId: string): Promise<Message> {
    return this.get<Message>(`/api/messages/${messageId}`);
  }

  async addReaction(messageId: string, emoji: string): Promise<void> {
    return this.post<void>(`/api/messages/${messageId}/reactions`, { emoji });
  }

  // User endpoints
  async getUsers(): Promise<User[]> {
    return this.get<User[]>('/api/users');
  }

  async getUser(id: string): Promise<User> {
    return this.get<User>(`/api/users/${id}`);
  }

  async updateUserStatus(id: string, status: string): Promise<User> {
    return this.put<User>(`/api/users/${id}/status`, { status });
  }

  async getDMMessages(userId: string, params?: { before?: string; after?: string; limit?: number }): Promise<{ messages: any[]; pagination?: any }> {
    return this.get<{ messages: any[]; pagination?: any }>(`/api/users/${userId}/messages`, params as Record<string, string>);
  }

  async sendDM(userId: string, content: string): Promise<Message> {
    return this.post<Message>(`/api/users/${userId}/messages`, { content });
  }

  async sendDMWithImages(userId: string, content: string, imageIds?: string[]): Promise<Message> {
    return this.post<Message>(`/api/users/${userId}/messages`, { 
      content,
      ...(imageIds && imageIds.length > 0 && { imageIds })
    });
  }

  async getDMConversations(): Promise<any[]> {
    return this.get<any[]>('/api/dm');
  }

  async markDMAsRead(recipientId: string): Promise<void> {
    return this.put<void>(`/api/dm/${recipientId}/read`, {});
  }

  async deleteDMConversation(recipientId: string): Promise<void> {
    return this.delete<void>(`/api/dm/${recipientId}`);
  }

  // Image upload endpoints
  private async requestWithUpload<T>(
    endpoint: string,
    formData: FormData,
    onProgress?: (progress: number) => void
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const token = getToken();

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            resolve(JSON.parse(xhr.responseText));
          } catch {
            resolve(xhr.responseText as unknown as T);
          }
        } else {
          try {
            const error = JSON.parse(xhr.responseText);
            reject(new Error(error.message || 'Upload failed'));
          } catch {
            reject(new Error('Upload failed'));
          }
        }
      });

      xhr.addEventListener('error', () => reject(new Error('Upload failed')));

      xhr.open('POST', url);
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }
      xhr.send(formData);
    });
  }

  async uploadImage(
    channelId: string,
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<{ success: boolean; data: ChatImage }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('channelId', channelId);
    
    return this.requestWithUpload<{ success: boolean; data: ChatImage }>(
      '/api/chat/images/upload',
      formData,
      onProgress
    );
  }

  async getPresignedUrl(channelId: string, fileName: string, mimeType: string): Promise<PresignedUrlResponse> {
    return this.post<PresignedUrlResponse>('/api/chat/images/presigned-url', {
      channelId,
      fileName,
      mimeType,
    });
  }

  async uploadToPresignedUrl(
    presignedUrl: string,
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    const formData = new FormData();
    formData.append('file', file);

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error('Upload to storage failed'));
        }
      });

      xhr.addEventListener('error', () => reject(new Error('Upload failed')));
      xhr.open('PUT', presignedUrl);
      xhr.setRequestHeader('Content-Type', file.type);
      xhr.send(file);
    });
  }

  async getImage(imageId: string): Promise<ChatImage> {
    return this.get<ChatImage>(`/api/chat/images/${imageId}`);
  }

  async deleteImage(imageId: string): Promise<void> {
    return this.delete<void>(`/api/chat/images/${imageId}`);
  }

// Link preview endpoints
  async getLinkPreview(url: string): Promise<LinkPreviewResponse> {
    return this.get<LinkPreviewResponse>('/api/chat/links/preview', { url });
  }

  async getLinkPreviews(messageId: string): Promise<LinkPreview[]> {
    return this.get<LinkPreview[]>('/api/chat/links', { messageId });
  }

  // Agent endpoints
  async getAgents(): Promise<any[]> {
    const response = await this.get<{ success: boolean; data: any[] }>('/api/agents');
    return response.data;
  }

  async getAgent(id: string): Promise<any> {
    return this.get<{ success: boolean; data: any }>(`/api/agents/${id}`);
  }

  async getAgentByName(name: string): Promise<any> {
    return this.get<{ success: boolean; data: any }>(`/api/agents/name/${name}`);
  }

  async createAgent(data: any): Promise<any> {
    return this.post<any>('/api/agents', data);
  }

  async updateAgent(id: string, data: any): Promise<any> {
    return this.put<any>(`/api/agents/${id}`, data);
  }

  async deleteAgent(id: string): Promise<void> {
    return this.delete<void>(`/api/agents/${id}`);
  }

  // AI Provider endpoints
  async getAIProviders(): Promise<any[]> {
    const response = await this.get<{ success: boolean; data: any[] }>('/api/ai-providers');
    return response.data;
  }

  async createAIProvider(data: any): Promise<any> {
    return this.post<any>('/api/ai-providers', data);
  }

  async updateAIProvider(id: string, data: any): Promise<any> {
    return this.put<any>(`/api/ai-providers/${id}`, data);
  }

  async deleteAIProvider(id: string): Promise<void> {
    return this.delete<void>(`/api/ai-providers/${id}`);
  }

  // Search endpoints
  async searchMessages(
    query: string,
    options?: { channelNames?: string[]; dmUserNames?: string[]; limit?: number; offset?: number; mode?: 'fts' | 'semantic' }
  ): Promise<{ success: boolean; data: any[]; total: number; query: string; mode?: string }> {
    const params: Record<string, string> = { q: query };
    if (options?.channelNames?.length) params.channelIds = options.channelNames.join(',');
    if (options?.dmUserNames?.length) params.dmUserIds = options.dmUserNames.join(',');
    if (options?.limit) params.limit = String(options.limit);
    if (options?.offset) params.offset = String(options.offset);
    if (options?.mode) params.mode = options.mode;
    return this.get<{ success: boolean; data: any[]; total: number; query: string; mode?: string }>('/api/search', params);
  }
}

export const api = new ApiService();
