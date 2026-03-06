export function isTauriRuntime(): boolean {
  if (typeof window === 'undefined') return false;

  const w = window as any;
  return !!(w.__TAURI_INTERNALS__ || w.__TAURI__);
}

async function invokeTauri<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke } = await import('@tauri-apps/api/core');
  return await invoke<T>(cmd, args as any);
}

export async function saveSlotJson(slotId: string, snapshotJson: string): Promise<void> {
  await invokeTauri('save_slot', { slotId, snapshotJson });
}

export async function loadSlotJson(slotId: string): Promise<string | null> {
  return await invokeTauri<string | null>('load_slot', { slotId });
}

export async function listSlots(): Promise<string[]> {
  return await invokeTauri<string[]>('list_slots');
}

export async function deleteSlot(slotId: string): Promise<void> {
  await invokeTauri('delete_slot', { slotId });
}
