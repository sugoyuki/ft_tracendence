/// <reference types="vite/client" />

interface ImportMeta {
  readonly env: {
    readonly VITE_BACKEND_URL: string;
    [key: string]: string | undefined;
  };
}
