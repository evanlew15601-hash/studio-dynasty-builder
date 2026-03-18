/// <reference types="vite/client" />

declare interface ImportMetaEnv {
  readonly VITE_STEAM_STREAMING_WARS_DLC_APP_ID?: string;
}

declare interface ImportMeta {
  readonly env: ImportMetaEnv;
}
