import type { Franchise, GameEvent, GameState } from '@/types/game';
import type { TickSystem } from '../core/types';
import { stableInt } from '@/utils/stableRandom';

const GLOBAL_COOLDOWN_WEEKS = 52;
const PER_FRANCHISE_COOLDOWN_WEEKS = 156;

const ACTIVE_INVITE_DURATION_WEEKS = 39;
const REBOOTED_INVITE_DURATION_WEEKS = 52;

function absWeek(week: number, year: number): number {
  return year * 52 + week;
}

function weekStartDate(week: number, year: number): Date {
  return new Date(Date.UTC(year, 0, 1 + (week - 1) * 7));
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function scoreCandidate(franchise: Franchise): number {
  const fatigue = clamp(franchise.criticalFatigue ?? 0, 0, 100);
  const statusBonus = franchise.status === 'rebooted' ? 12 : 0;
  return (franchise.culturalWeight ?? 0) - fatigue * 0.5 + statusBonus;
}

function reputationRequirement(franchise: Franchise): number {
  const cw = clamp(franchise.culturalWeight ?? 0, 0, 100);
  return clamp(30 + cw * 0.35, 35, 80);
}

function inviteChance(franchise: Franchise, reputation: number): number {
  const cw = clamp(franchise.culturalWeight ?? 0, 0, 100);
  const rep = clamp(reputation, 0, 100);

  const base = 0.06;
  const popBoost = Math.max(0, cw - 70) * 0.002;
  const repBoost = Math.max(0, rep - 40) * 0.0015;

  // Quarterly check means this is already rare; keep the ceiling modest.
  return clamp(base + popBoost + repBoost, 0.06, 0.22);
}

export const FranchiseInvitationSystem: TickSystem = {
  id: 'franchiseInvitations',
  label: 'Franchise invitations',
  onTick: (state, ctx) => {
    if (state.mode === 'online') return state;

    const weekIndex = absWeek(ctx.week, ctx.year);

    // Always clean up expired/consumed invitations.
    let studio = state.studio;
    const inv = studio.franchiseInvitation;
    const invExpired = !!inv && inv.expiresWeekIndex <= weekIndex;
    const invConsumed = !!inv && (inv.usesRemaining ?? 0) <= 0;

    if (inv && (invExpired || invConsumed)) {
      studio = { ...studio, franchiseInvitation: undefined };
    }

    // If something is already waiting on the player, don't add more.
    if ((state.eventQueue || []).length > 0) {
      return studio === state.studio ? state : { ...state, studio };
    }

    const activeInvitation = studio.franchiseInvitation;
    if (activeInvitation && activeInvitation.expiresWeekIndex > weekIndex && activeInvitation.usesRemaining > 0) {
      return studio === state.studio ? state : { ...state, studio };
    }

    // Keep it rare: evaluate quarterly.
    if (ctx.week % 13 !== 0) {
      return studio === state.studio ? state : { ...state, studio };
    }

    const lastOffer = studio.lastFranchiseInvitationWeekIndex ?? -999_999;
    if (weekIndex - lastOffer < GLOBAL_COOLDOWN_WEEKS) {
      return studio === state.studio ? state : { ...state, studio };
    }

    // Only start offering once the player is a real player in the market.
    const hasReleasedFeature = (state.projects || []).some((p) => p.type === 'feature' && p.status === 'released');
    if (!hasReleasedFeature) {
      return studio === state.studio ? state : { ...state, studio };
    }

    const licensed = new Set(studio.licensedFranchiseIds ?? []);
    const cooldowns = studio.franchiseInvitationCooldowns ?? {};

    const reputation = clamp(studio.reputation ?? 0, 0, 100);

    const candidates = (state.franchises || [])
      .filter((f) => f.creatorStudioId === 'world')
      .filter((f) => !licensed.has(f.id))
      .filter((f) => f.status === 'active' || f.status === 'rebooted')
      .filter((f) => (f.culturalWeight ?? 0) >= 75)
      .filter((f) => (f.criticalFatigue ?? 0) <= 60)
      .filter((f) => weekIndex >= (cooldowns[f.id] ?? 0))
      .filter((f) => reputation >= reputationRequirement(f));

    if (candidates.length === 0) {
      return studio === state.studio ? state : { ...state, studio };
    }

    const picked = [...candidates].sort((a, b) => scoreCandidate(b) - scoreCandidate(a))[0];

    const chance = inviteChance(picked, reputation);
    const universeSeed = state.universeSeed ?? 0;
    const roll = stableInt(`${universeSeed}|franchiseInvite|roll|${weekIndex}|${picked.id}`, 0, 9999) / 10000;

    if (roll > chance) {
      return studio === state.studio ? state : { ...state, studio };
    }

    const duration = picked.status === 'rebooted' ? REBOOTED_INVITE_DURATION_WEEKS : ACTIVE_INVITE_DURATION_WEEKS;
    const expiresWeekIndex = weekIndex + duration;

    const event: GameEvent = {
      id: `franchiseInvite:${weekIndex}:${picked.id}`,
      title: `Rights-holder invitation: ${picked.title}`,
      description:
        `A rights holder is opening up a slot for a new ${picked.title} entry. ` +
        `You can accept a one-off invitation to develop a single film under their banner.\n\n` +
        `• 1 film slot (not ownership)\n` +
        `• Expires in ${duration} weeks`,
      type: 'opportunity',
      triggerDate: weekStartDate(ctx.week, ctx.year),
      data: {
        kind: 'franchise:invitation',
        franchiseId: picked.id,
        offeredWeekIndex: weekIndex,
        expiresWeekIndex,
      },
      choices: [
        {
          id: 'accept',
          text: 'Accept invitation',
          consequences: [],
        },
        {
          id: 'decline',
          text: 'Decline',
          consequences: [],
        },
      ],
    };

    ctx.recap.push({
      type: 'market',
      title: 'Invitation received',
      body: `${picked.title} rights holder reached out with a one-off production invitation.`,
      severity: 'info',
    });

    return {
      ...state,
      studio,
      eventQueue: [...(state.eventQueue || []), event],
    };
  },
};
