import { ChildProcess } from 'child_process';

// Shell session types
export interface ShellSession {
  id: string;
  userId: string;
  containerId: string;
  containerName: string;
  process: ChildProcess;
  createdAt: Date;
  lastActivity: Date;
  socketId: string;
  cols: number;
  rows: number;
  isActive: boolean;
}

// WebSocket events for shell
export interface ShellServerToClientEvents {
  shell_output: (data: { sessionId: string; data: string }) => void;
  shell_error: (data: { sessionId: string; error: string }) => void;
  shell_closed: (data: { sessionId: string; reason: string }) => void;
  shell_resized: (data: { sessionId: string; cols: number; rows: number }) => void;
}

export interface ShellClientToServerEvents {
  shell_input: (data: { sessionId: string; data: string }) => void;
  shell_resize: (data: { sessionId: string; cols: number; rows: number }) => void;
  shell_close: (sessionId: string) => void;
}

// API request/response types
export interface OpenShellRequest {
  containerId?: string;
  containerName?: string;
}

export interface OpenShellResponse {
  sessionId: string;
  containerId: string;
  containerName: string;
  created: boolean;
}

export interface ResizeShellRequest {
  sessionId: string;
  cols: number;
  rows: number;
}

export interface CloseShellRequest {
  sessionId: string;
}

// Shell session state stored in Redis or memory
export interface ShellSessionState {
  id: string;
  userId: string;
  containerId: string;
  containerName: string;
  socketId: string;
  cols: number;
  rows: number;
  createdAt: string;
  lastActivity: string;
}
