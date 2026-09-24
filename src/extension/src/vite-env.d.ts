/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_ENABLE_MOCK_CONTEXT?: string;
  readonly VITE_SUPPORTED_WORK_ITEM_TYPES?: string;
  readonly VITE_TIME_CODE_FIELD?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
