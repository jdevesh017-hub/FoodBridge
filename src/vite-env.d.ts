/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEMO_MODE?: string;
  readonly VITE_CARTO_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
