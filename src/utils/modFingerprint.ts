import { getActiveModSlot, getModBundle } from '@/utils/moddingStore';

export type ModFingerprint = {
  slotId: string;
  bundleHash: string;
};

function hashStringFNV1a(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }

  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function getCurrentModFingerprint(): ModFingerprint {
  const slotId = getActiveModSlot();
  const bundleHash = hashStringFNV1a(JSON.stringify(getModBundle()));
  return { slotId, bundleHash };
}

export function getModMismatchWarning(meta: { modSlotId?: string; modBundleHash?: string } | null | undefined): string | null {
  if (!meta?.modSlotId || !meta?.modBundleHash) return null;

  const current = getCurrentModFingerprint();

  if (meta.modSlotId === current.slotId && meta.modBundleHash === current.bundleHash) {
    return null;
  }

  if (meta.modSlotId !== current.slotId) {
    return `This save was created with mod slot "${meta.modSlotId}", but you are currently using "${current.slotId}". Loading may behave differently.`;
  }

  return 'This save was created with a different mod bundle than you currently have active. Loading may behave differently.';
}
