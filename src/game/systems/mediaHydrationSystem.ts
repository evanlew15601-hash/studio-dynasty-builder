import type { GameState, MediaState } from '@/types/game';
import type { TickSystem } from '../core/types';
import { MediaEngine } from '@/components/game/MediaEngine';
import { MediaResponseSystem } from '@/components/game/MediaResponseSystem';

const EMPTY_MEDIA_STATE: MediaState = {
  engine: { history: [], memories: [], eventQueue: [] },
  response: { campaigns: [], reactions: [], nextCampaignId: 1 },
};

export const MediaHydrationSystem: TickSystem = {
  id: 'mediaHydration',
  label: 'Hydrate media systems',
  onTick: (state) => {
    const mediaState = state.mediaState ?? EMPTY_MEDIA_STATE;
    MediaEngine.hydrate(mediaState);
    MediaResponseSystem.hydrate(mediaState);
    return state as GameState;
  },
};
