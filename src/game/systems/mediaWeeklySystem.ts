import type { GameState, TalentPerson } from '@/types/game';
import type { TickSystem } from '../core/types';
import { MediaEngine } from '@/game/media/mediaEngine';
import { MediaResponseSystem } from '@/game/media/mediaResponseSystem';
import { MediaReputationIntegration } from '@/game/media/mediaReputationIntegration';

export const MediaWeeklySystem: TickSystem = {
  id: 'mediaWeekly',
  label: 'Media week processing',
  dependsOn: ['mediaHydration', 'industryGossip'],
  onTick: (state, ctx) => {
    if (state.mode === 'online') return state;

    // Clone the pieces that the legacy media systems mutate in-place.
    const nextTalent = (state.talent || []).map((t0): TalentPerson => ({
      ...t0,
      studioLoyalty: t0.studioLoyalty ? { ...t0.studioLoyalty } : undefined,
    }));

    const next: GameState = {
      ...state,
      studio: { ...state.studio },
      talent: nextTalent,
    };

    const reputationBefore = next.studio.reputation;

    MediaResponseSystem.processWeeklyCampaigns(next);

    const triggered = MediaEngine.triggerAutomaticEvents(next, ctx.prevState);
    const newItems = MediaEngine.processMediaEvents(next);

    MediaReputationIntegration.processWeeklyReputationUpdates(next);

    const reputationAfter = next.studio.reputation;
    const reputationDelta = reputationAfter - reputationBefore;

    if (newItems.length > 0 || triggered.length > 0) {
      ctx.recap.push({
        type: 'media',
        title: 'Media coverage',
        body: `${newItems.length} new story${newItems.length === 1 ? '' : 'ies'} published this week.`,
        severity: 'info',
      });
    }

    if (Math.abs(reputationDelta) >= 0.05) {
      ctx.recap.push({
        type: 'media',
        title: 'Reputation shift',
        body: `Media coverage changed your reputation by ${reputationDelta >= 0 ? '+' : ''}${reputationDelta.toFixed(1)}.`,
        severity: reputationDelta >= 0 ? 'good' : 'bad',
      });
    }

    return {
      ...next,
      mediaState: {
        engine: MediaEngine.snapshot(),
        response: MediaResponseSystem.snapshot(),
      },
    } as GameState;
  },
};
