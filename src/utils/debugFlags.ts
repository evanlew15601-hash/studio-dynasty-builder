export function isDebugUiEnabled(): boolean {
  return import.meta.env.DEV;
}

export function isVerboseLoggingEnabled(): boolean {
  return import.meta.env.DEV;
}
