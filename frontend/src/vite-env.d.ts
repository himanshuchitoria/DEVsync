/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_SOCKET_URL?: string;
  // add other VITE_* vars here
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
