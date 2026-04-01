import type { Script } from '@/types/game';

export function isTvScript(script: Script): boolean {
  return script.characteristics?.pacing === 'episodic' || script.estimatedRuntime < 60;
}
