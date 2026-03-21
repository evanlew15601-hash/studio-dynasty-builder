import type { Project, Studio, TalentPerson } from '@/types/game';
import { stableFloat01 } from '@/utils/stableRandom';

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function clamp01(n: number): number {
  return clamp(n, 0, 1);
}

export type TalentRequiredType = 'actor' | 'director';

export type TalentInterestLevel = 'eager' | 'interested' | 'neutral' | 'hesitant' | 'uninterested';

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

  let score = 50;

  score += (studioRep - talentRep) * 0.35;
  score += (scriptQuality - 60) * 0.6;

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

  if (talent.contractStatus !== 'available') {
    const { interestScore, askWeeklyPay } = computeTalentAskWeeklyPay(params);
    return { accepted: false, interestScore, askWeeklyPay, reason: 'held' };
  }

  const { interestScore, askWeeklyPay } = computeTalentAskWeeklyPay(params);

  if (interestScore < 15) {
    return { accepted: false, interestScore, askWeeklyPay, reason: 'not-interested' };
  }

  // A small deterministic chance of "playing hardball" when interest is mediocre.
  const roll = stableFloat01(`${params.studio.id}|${talent.id}|${params.project.id}|hardball|${year}|${week}`);
  const hardball = interestScore < 45 && roll < 0.25;
  const weeklyPay = hardball ? Math.round(askWeeklyPay * 1.1) : askWeeklyPay;

  return { accepted: true, interestScore, askWeeklyPay, weeklyPay };
}
