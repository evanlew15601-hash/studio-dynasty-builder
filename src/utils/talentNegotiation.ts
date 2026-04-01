import type { Project, Studio, TalentPerson } from '@/types/game';
import { stableFloat01 } from '@/utils/stableRandom';

function absWeekIndex(week: number, year: number): number {
  return year * 52 + week;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function clamp01(n: number): number {
  return clamp(n, 0, 1);
}

export type TalentRequiredType = 'actor' | 'director';

export type TalentInterestLevel = 'eager' | 'interested' | 'neutral' | 'hesitant' | 'uninterested';

export function getStudioInterestRecord(
  talent: TalentPerson,
  studioId: string
): { interest: number; lastContactWeekIndex?: number; rejectedUntilWeekIndex?: number } {
  const rec = talent.studioInterest?.[studioId];
  if (!rec) return { interest: 50 };
  return {
    interest: clamp(rec.interest ?? 50, 0, 100),
    lastContactWeekIndex: rec.lastContactWeekIndex,
    rejectedUntilWeekIndex: rec.rejectedUntilWeekIndex,
  };
}

export function recordStudioNegotiationOutcome(params: {
  talent: TalentPerson;
  studioId: string;
  currentWeek: number;
  currentYear: number;
  interestScore: number;
  outcome: 'signed' | 'rejected';
}): NonNullable<TalentPerson['studioInterest']> {
  const { talent, studioId, currentWeek, currentYear, interestScore, outcome } = params;

  const currentAbs = absWeekIndex(currentWeek, currentYear);
  const prev = getStudioInterestRecord(talent, studioId);

  let nextInterest = prev.interest;
  let rejectedUntilWeekIndex = prev.rejectedUntilWeekIndex;

  if (outcome === 'signed') {
    // Move toward a friendly baseline for studios they've worked with.
    nextInterest = Math.round(prev.interest + (70 - prev.interest) * 0.35);
    rejectedUntilWeekIndex = undefined;
  } else {
    // Rejection makes them colder for a while.
    nextInterest = Math.round(prev.interest + (35 - prev.interest) * 0.25);

    const cooldown = interestScore < 25 ? 12 : interestScore < 40 ? 6 : 3;
    rejectedUntilWeekIndex = Math.max(rejectedUntilWeekIndex ?? 0, currentAbs + cooldown);
  }

  return {
    ...(talent.studioInterest || {}),
    [studioId]: {
      interest: clamp(nextInterest, 0, 100),
      lastContactWeekIndex: currentAbs,
      rejectedUntilWeekIndex,
    },
  };
}

export function describeTalentInterest(score: number): { level: TalentInterestLevel; label: string } {
  const s = clamp(score, 0, 100);

  if (s >= 80) return { level: 'eager', label: 'Eager' };
  if (s >= 65) return { level: 'interested', label: 'Interested' };
  if (s >= 45) return { level: 'neutral', label: 'Neutral' };
  if (s >= 25) return { level: 'hesitant', label: 'Hesitant' };
  return { level: 'uninterested', label: 'Not Interested' };
}

export function defaultContractWeeksForRole(requiredType: TalentRequiredType, importance?: string): number {
  if (requiredType === 'director') return 20;
  if (importance === 'lead') return 16;
  if (importance === 'supporting') return 12;
  return 8;
}

export function computeTalentInterestScore(params: {
  talent: TalentPerson;
  studio: Studio;
  project: Project;
  requiredType: TalentRequiredType;
  importance?: string;
}): number {
  const { talent, studio, project, requiredType, importance } = params;

  const studioRep = clamp(studio.reputation ?? 50, 0, 100);
  const talentRep = clamp(talent.reputation ?? 50, 0, 100);
  const scriptQuality = clamp(project.script?.quality ?? 60, 0, 100);
  const burnout = clamp(talent.burnoutLevel ?? 0, 0, 100);

  const studioMemory = getStudioInterestRecord(talent, studio.id);

  let score = 50;

  score += (studioRep - talentRep) * 0.35;
  score += (scriptQuality - 60) * 0.6;

  // Per-studio memory nudges outcomes without dominating core factors.
  score += (studioMemory.interest - 50) * 0.25;

  const genre = project.script?.genre;
  if (genre && (talent.genres || []).includes(genre as any)) score += 10;

  if (requiredType === 'director' && talent.type === 'director') score += 6;
  if (requiredType === 'actor' && talent.type === 'actor') score += 4;

  if (importance === 'lead') score += 6;
  if (importance === 'supporting') score += 2;

  // Burnout makes talent harder to book.
  score -= burnout * 0.25;

  return clamp(Math.round(score), 0, 100);
}

export function computeTalentAskWeeklyPay(params: {
  talent: TalentPerson;
  studio: Studio;
  project: Project;
  requiredType: TalentRequiredType;
  importance?: string;
}): { interestScore: number; askWeeklyPay: number } {
  const { talent } = params;

  const interestScore = computeTalentInterestScore(params);

  const baseWeekly = Math.max(0, Math.round((talent.marketValue ?? 0) / 52));

  let multiplier = 1.0;

  if (interestScore >= 80) multiplier = 0.9;
  else if (interestScore >= 65) multiplier = 1.0;
  else if (interestScore >= 45) multiplier = 1.15;
  else if (interestScore >= 25) multiplier = 1.4;
  else multiplier = 2.0;

  // Star premium.
  multiplier += Math.max(0, (talent.reputation ?? 50) - 60) * 0.004;

  const askWeeklyPay = Math.max(0, Math.round(baseWeekly * multiplier));
  return { interestScore, askWeeklyPay };
}

export type TalentNegotiationResult =
  | {
      accepted: true;
      interestScore: number;
      askWeeklyPay: number;
      weeklyPay: number;
    }
  | {
      accepted: false;
      interestScore: number;
      askWeeklyPay: number;
      reason: 'not-interested' | 'held' | 'budget';
    };

export type TalentOfferResponse =
  | {
      status: 'accepted';
      interestScore: number;
      askWeeklyPay: number;
      weeklyPay: number;
      contractWeeks: number;
    }
  | {
      status: 'counter';
      interestScore: number;
      askWeeklyPay: number;
      counterWeeklyPay: number;
      contractWeeks: number;
    }
  | {
      status: 'rejected';
      interestScore: number;
      askWeeklyPay: number;
      reason: 'held' | 'cooldown' | 'not-interested' | 'too-low';
      rejectedUntilWeekIndex?: number;
    };

export function computeTalentAgentAsk(params: {
  talent: TalentPerson;
  studio: Studio;
  project: Project;
  requiredType: TalentRequiredType;
  importance?: string;
  contractWeeks: number;
  week: number;
  year: number;
}): { interestScore: number; askWeeklyPay: number; rejectedUntilWeekIndex?: number; blockedReason?: 'cooldown' | 'held' } {
  const { talent, studio, project, requiredType, importance, contractWeeks, week, year } = params;

  const currentAbs = absWeekIndex(week, year);
  const studioMem = getStudioInterestRecord(talent, studio.id);

  if (typeof studioMem.rejectedUntilWeekIndex === 'number' && studioMem.rejectedUntilWeekIndex > currentAbs) {
    const { interestScore, askWeeklyPay } = computeTalentAskWeeklyPay({ talent, studio, project, requiredType, importance });
    return {
      interestScore,
      askWeeklyPay,
      rejectedUntilWeekIndex: studioMem.rejectedUntilWeekIndex,
      blockedReason: 'cooldown',
    };
  }

  if (talent.contractStatus !== 'available') {
    const { interestScore, askWeeklyPay } = computeTalentAskWeeklyPay({ talent, studio, project, requiredType, importance });
    return { interestScore, askWeeklyPay, blockedReason: 'held' };
  }

  const base = computeTalentAskWeeklyPay({ talent, studio, project, requiredType, importance });
  let askWeeklyPay = base.askWeeklyPay;

  const defaultWeeks = defaultContractWeeksForRole(requiredType, importance);
  if (contractWeeks < Math.round(defaultWeeks * 0.75)) {
    askWeeklyPay = Math.round(askWeeklyPay * 1.15);
  } else if (contractWeeks > Math.round(defaultWeeks * 1.25)) {
    askWeeklyPay = Math.round(askWeeklyPay * 0.95);
  }

  const hardballRoll = stableFloat01(`${studio.id}|${talent.id}|${project.id}|ask|hardball|${year}|${week}`);
  if (base.interestScore < 55 && hardballRoll < 0.2) {
    askWeeklyPay = Math.round(askWeeklyPay * 1.1);
  }

  return { interestScore: base.interestScore, askWeeklyPay };
}

export function evaluateTalentOffer(params: {
  talent: TalentPerson;
  studio: Studio;
  project: Project;
  requiredType: TalentRequiredType;
  importance?: string;
  offerWeeklyPay: number;
  contractWeeks: number;
  week: number;
  year: number;
}): TalentOfferResponse {
  const { talent, studio, project, requiredType, importance, offerWeeklyPay, contractWeeks, week, year } = params;

  const ask = computeTalentAgentAsk({ talent, studio, project, requiredType, importance, contractWeeks, week, year });

  if (ask.blockedReason === 'cooldown') {
    return {
      status: 'rejected',
      interestScore: ask.interestScore,
      askWeeklyPay: ask.askWeeklyPay,
      reason: 'cooldown',
      rejectedUntilWeekIndex: ask.rejectedUntilWeekIndex,
    };
  }

  if (ask.blockedReason === 'held') {
    return {
      status: 'rejected',
      interestScore: ask.interestScore,
      askWeeklyPay: ask.askWeeklyPay,
      reason: 'held',
    };
  }

  const interestScore = ask.interestScore;
  const askWeeklyPay = Math.max(0, ask.askWeeklyPay);

  if (offerWeeklyPay >= askWeeklyPay) {
    return { status: 'accepted', interestScore, askWeeklyPay, weeklyPay: offerWeeklyPay, contractWeeks };
  }

  const counterThreshold = interestScore >= 65 ? 0.9 : interestScore >= 45 ? 0.85 : 1.0;
  if (offerWeeklyPay >= Math.round(askWeeklyPay * counterThreshold)) {
    const counterWeeklyPay = askWeeklyPay;
    return { status: 'counter', interestScore, askWeeklyPay, counterWeeklyPay, contractWeeks };
  }

  // Too far apart.
  return { status: 'rejected', interestScore, askWeeklyPay, reason: interestScore < 20 ? 'not-interested' : 'too-low' };
}

/**
 * Minimal deterministic negotiation:
 * - Compute interest from studio rep + script quality + genre fit.
 * - If interest is extremely low, they won't engage.
 * - Otherwise, they accept if you meet their ask. We auto-meet the ask.
 */
export function negotiateTalentContract(params: {
  talent: TalentPerson;
  studio: Studio;
  project: Project;
  requiredType: TalentRequiredType;
  importance?: string;
  week: number;
  year: number;
}): TalentNegotiationResult {
  const { talent, week, year } = params;

  const currentAbs = absWeekIndex(week, year);
  const studioMem = getStudioInterestRecord(talent, params.studio.id);

  if (typeof studioMem.rejectedUntilWeekIndex === 'number' && studioMem.rejectedUntilWeekIndex > currentAbs) {
    const { interestScore, askWeeklyPay } = computeTalentAskWeeklyPay(params);
    return { accepted: false, interestScore, askWeeklyPay, reason: 'not-interested' };
  }

  if (talent.contractStatus !== 'available') {
    const { interestScore, askWeeklyPay } = computeTalentAskWeeklyPay(params);
    return { accepted: false, interestScore, askWeeklyPay, reason: 'held' };
  }

  const { interestScore, askWeeklyPay } = computeTalentAskWeeklyPay(params);

  if (interestScore < 20) {
    return { accepted: false, interestScore, askWeeklyPay, reason: 'not-interested' };
  }

  // A small deterministic chance of "playing hardball" when interest is mediocre.
  const roll = stableFloat01(`${params.studio.id}|${talent.id}|${params.project.id}|hardball|${year}|${week}`);
  const hardball = interestScore < 45 && roll < 0.25;
  const weeklyPay = hardball ? Math.round(askWeeklyPay * 1.1) : askWeeklyPay;

  return { accepted: true, interestScore, askWeeklyPay, weeklyPay };
}
