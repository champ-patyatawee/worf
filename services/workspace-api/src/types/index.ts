import { Request } from 'express';
import { User, Channel, Message, Reaction, ChannelMember, ChatImage, ChatLink, ImageMetadata } from '@prisma/client';

// Re-export Prisma types
export type { User, Channel, Message, Reaction, ChannelMember, ChatImage, ChatLink, ImageMetadata };

export interface ChatImageWithRelations extends ChatImage {
  metadata?: ImageMetadata | null;
}

// Extended types with relations
export interface UserWithRelations extends User {
  channels?: ChannelMember[];
}

export interface ChannelWithMembers extends Channel {
  members: ChannelMember[];
}

export interface MessageWithRelations extends Message {
  user: User;
  reactions: Reaction[];
  replies?: Message[];
  channel?: Channel;
  images?: ChatImage[];
}

// Auth types
export interface JwtPayload {
  userId: string;
  email: string;
  role?: 'admin' | 'user' | 'agent'; // 'agent' kept for backward compat with existing tokens
}

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

// DTO types
export interface RegisterInput {
  email: string;
  password: string;
  name: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface CreateChannelInput {
  name: string;
  description?: string;
  type?: 'public' | 'private' | 'direct';
}

export interface UpdateChannelInput {
  name?: string;
  description?: string;
}

export interface SendMessageInput {
  content?: string;
  channelId?: string;
  threadId?: string;
  imageIds?: string[];
}

export interface AddReactionInput {
  emoji: string;
}

export interface UpdateStatusInput {
  status: 'online' | 'offline' | 'busy' | 'away';
}

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Socket.io types
export interface ServerToClientEvents {
  receive_message: (message: MessageWithRelations) => void;
  message_sent: (message: MessageWithRelations) => void;
  typing_start: (data: { userId: string; channelId: string }) => void;
  typing_stop: (data: { userId: string; channelId: string }) => void;
  presence_update: (data: { userId: string; status: User['status'] }) => void;
  user_joined: (data: { userId: string; channelId: string }) => void;
  user_left: (data: { userId: string; channelId: string }) => void;
  online_users: (users: Array<{ userId: string; socketId: string; status: string }>) => void;
  error: (error: { message: string }) => void;
  // Shell events
  shell_created: (data: { sessionId: string; containerId: string; containerName: string }) => void;
  shell_output: (data: { sessionId: string; data: string }) => void;
  shell_error: (data: { sessionId: string; error: string }) => void;
  shell_closed: (data: { sessionId: string; reason: string }) => void;
  shell_resized: (data: { sessionId: string; cols: number; rows: number }) => void;
}

export interface ClientToServerEvents {
  join_channel: (channelId: string) => void;
  leave_channel: (channelId: string) => void;
  send_message: (data: { channelId: string; content: string; threadId?: string }) => void;
  typing_start: (channelId: string) => void;
  typing_stop: (channelId: string) => void;
  update_presence: (status: User['status']) => void;
  // Shell events
  create_shell: (data?: { containerId?: string; containerName?: string }) => void;
  shell_input: (data: { sessionId: string; data: string }) => void;
  shell_resize: (data: { sessionId: string; cols: number; rows: number }) => void;
  shell_close: (sessionId: string) => void;
}

// Image upload types
export interface ImageUploadInput {
  messageId?: string;
}

export interface PresignedUrlInput {
  filename: string;
  contentType: string;
  fileSize?: number;
}

export interface PresignedUrlResponse {
  uploadUrl: string;
  publicUrl: string;
}

export interface LinkPreviewInput {
  url: string;
}

export interface LinkPreviewResponse {
  url: string;
  title: string | null;
  description: string | null;
  imageUrl: string | null;
  favicon: string | null;
  siteName: string | null;
}
