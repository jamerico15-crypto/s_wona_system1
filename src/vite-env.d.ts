/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_NOCODB_URL: string;
  readonly VITE_NOCODB_TOKEN: string;
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
