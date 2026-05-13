/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_WS_URL: string;
  readonly VITE_PROXY_URL: string;
  readonly VITE_NOTE_API_URL: string;
  readonly VITE_KANBAN_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
