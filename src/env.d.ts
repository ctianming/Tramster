/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_COZE_WORKFLOW_URL: string
  readonly VITE_COZE_WORKFLOW_ID: string
  readonly VITE_COZE_BOT_URL: string
  readonly VITE_COZE_BOT_ID: string
  readonly VITE_COZE_API_TOKEN: string
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_SUPABASE_BUCKET_NAME: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
} 