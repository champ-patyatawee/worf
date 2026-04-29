export type UserStatus = 'online' | 'offline' | 'busy' | 'away';

export type ChannelType = 'public' | 'private' | 'direct';

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  status: UserStatus;
  role?: 'admin' | 'user' | 'agent';
  createdAt: Date;
  updatedAt?: Date;
}

export interface Channel {
  id: string;
  name: string;
  type: ChannelType;
  description?: string;
  members: string[];
  createdAt: Date;
  updatedAt?: Date;
}

export interface Message {
  id: string;
  channelId: string;
  userId: string;
  user?: User;
  content: string;
  createdAt: Date;
  updatedAt?: Date;
  attachments?: Attachment[];
  reactions?: Reaction[];
  threadCount?: number;
  thread?: Message[];
  images?: ChatImage[];
  links?: LinkPreview[];
  isError?: boolean;  // For agent error messages
}

export interface DirectMessage {
  id: string;
  participants: string[];
  lastMessage?: Message;
  createdAt: Date;
  updatedAt?: Date;
}

export interface Attachment {
  id: string;
  type: 'image' | 'file';
  url: string;
  name: string;
  size: number;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  mimeType?: string;
}

export interface Reaction {
  id: string;
  userId: string;
  emoji: string;
  createdAt: Date;
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface ApiError {
  status: number;
  message: string;
}

export interface SearchResult {
  type: 'message' | 'channel' | 'user';
  id: string;
  title: string;
  description?: string;
  matchedText?: string;
  channelId?: string;
  userId?: string;
}

export interface PresenceUpdate {
  userId: string;
  status: UserStatus;
}

// Image-related types
export interface ChatImage {
  id: string;
  messageId?: string;
  url: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  fileSize: number;
  mimeType: string;
  name?: string;
  createdAt: Date;
}

export interface LinkPreview {
  id: string;
  messageId?: string;
  url: string;
  title?: string;
  description?: string;
  imageUrl?: string;
  favicon?: string;
  createdAt: Date;
}

export interface ImageUpload {
  id: string;
  file: File;
  preview: string;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
  result?: ChatImage;
}

export interface PresignedUrlResponse {
  uploadUrl: string;
  imageId: string;
  key: string;
}

export interface LinkPreviewResponse {
  title?: string;
  description?: string;
  image?: string;
  favicon?: string;
}
