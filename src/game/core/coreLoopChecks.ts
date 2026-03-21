import type { GameState, Project } from '@/types/game';
import type { TickSystem } from './types';
import { isPrimaryStreamingFilm } from '@/utils/projectMedium';

export type CoreLoopIssue = {
  check: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
  message: string;
  code: string;
};

function isReleasedLikeStatus(status: Project['status'] | undefined): boolean {
  return status === 'released' || status === 'distribution' || status === 'archived' || status === 'completed';
}



export function checkTickOrdering(systems: readonly TickSystem[]): CoreLoopIssue[] {
  const issues: CoreLoopIssue[] = [];
  const indexById = new Map<string, number>();
  systems.forEach((s, i) => indexById.set(s.id, i));

  const requireBefore = (beforeId: string, afterId: string, code: string, message: string) => {
    const before = indexById.get(beforeId);
    const after = indexById.get(afterId);
    if (before == null || after == null) return;
    if (before > after) {
      issues.push({ check: 1, code, message });
    }
  };

  requireBefore('scheduledReleases', 'boxOffice', 'tick.order.scheduledReleases_before_boxOffice', 'Scheduled releases must run before box office.');
  requireBefore(
    'scheduledReleases',
    'postTheatricalRevenue',
    'tick.order.scheduledReleases_before_postTheatricalRevenue',
    'Scheduled releases must run before post-theatrical processing.'
  );
  requireBefore('boxOffice', 'postTheatricalRevenue', 'tick.order.boxOffice_before_postTheatricalRevenue', 'Box office must run before post-theatrical processing.');
  requireBefore(
    'postTheatricalRevenue',
    'studioRevenue',
    'tick.order.postTheatricalRevenue_before_studioRevenue',
    'Post-theatrical processing must run before studio revenue accounting.'
  );
  requireBefore('studioRevenue', 'loanPayments', 'tick.order.studioRevenue_before_loanPayments', 'Studio revenue should be applied before loan payments.');
  requireBefore('loanPayments', 'studioEconomy', 'tick.order.loanPayments_before_studioEconomy', 'Loan payments should be applied before studio economy (overhead/burn) runs.');
  requireBefore(
    'platformOutputDeal',
    'platformEconomy',
    'tick.order.platformOutputDeal_before_platformEconomy',
    'Output deal windows should be created before platform economy KPIs are computed.'
  );
  requireBefore(
    'awardsSeason',
    'mediaWeekly',
    'tick.order.awardsSeason_before_mediaWeekly',
    'MediaWeekly should run after awards so trade coverage can include awards outcomes.'
  );

  return issues;
}

export function validateGameState(state: GameState): CoreLoopIssue[] {
  const issues: CoreLoopIssue[] = [];

  const pushIssue = (issue: CoreLoopIssue) => {
    issues.push(issue);
  };

  // ---------------------------------------------------------------------------
  // Check 3: State duplication (cast/crew/contract lists)
  // ---------------------------------------------------------------------------

  for (const project of state.projects || []) {
    if (!project) continue;

    const castIds = new Set<string>();
    const crewIds = new Set<string>();

    for (const r of project.cast || []) {
      if (!r?.talentId) continue;
      if (castIds.has(r.talentId)) {
        pushIssue({
          check: 3,
          code: 'project.credits.duplicate_cast',
          message: `Project "${project.id}" has duplicate cast entries for talentId "${r.talentId}".`,
        });
      }
      castIds.add(r.talentId);
    }

    for (const r of project.crew || []) {
      if (!r?.talentId) continue;
      if (crewIds.has(r.talentId)) {
        pushIssue({
          check: 3,
          code: 'project.credits.duplicate_crew',
          message: `Project "${project.id}" has duplicate crew entries for talentId "${r.talentId}".`,
        });
      }
      crewIds.add(r.talentId);
    }

    for (const id of castIds) {
      if (crewIds.has(id)) {
        pushIssue({
          check: 3,
          code: 'project.credits.talent_in_cast_and_crew',
          message: `Project "${project.id}" has talentId "${id}" listed in both cast and crew.`,
        });
      }
    }

    const contracted = new Set<string>();
    for (const c of project.contractedTalent || []) {
      if (!c?.talentId) continue;
      if (contracted.has(c.talentId)) {
        pushIssue({
          check: 3,
          code: 'project.contracts.duplicate_contractedTalent',
          message: `Project "${project.id}" has duplicate contractedTalent entries for talentId "${c.talentId}".`,
        });
      }
      contracted.add(c.talentId);
    }
  }

  // ---------------------------------------------------------------------------
  // Check 4: Project status/phase drift
  // ---------------------------------------------------------------------------

  const currentAbs = state.currentYear * 52 + state.currentWeek;

  for (const project of state.projects || []) {
    if (!project) continue;

    if (isReleasedLikeStatus(project.status)) {
      const w = typeof project.releaseWeek === 'number' ? project.releaseWeek : typeof project.scheduledReleaseWeek === 'number' ? project.scheduledReleaseWeek : null;
      const y = typeof project.releaseYear === 'number' ? project.releaseYear : typeof project.scheduledReleaseYear === 'number' ? project.scheduledReleaseYear : null;

      if (w == null || y == null) {
        pushIssue({
          check: 4,
          code: 'project.released_like.missing_release_date',
          message: `Project "${project.id}" is "${project.status}" but has no releaseWeek/releaseYear (or scheduledReleaseWeek/Year).`,
        });
      } else {
        const releaseAbs = y * 52 + w;
        if (releaseAbs > currentAbs) {
          pushIssue({
            check: 4,
            code: 'project.released_like.release_in_future',
            message: `Project "${project.id}" is "${project.status}" but its release date is in the future (Y${y}W${w}).`,
          });
        }
      }

      if (project.phaseDuration > 0) {
        pushIssue({
          check: 4,
          code: 'project.released_like.phaseDuration_positive',
          message: `Project "${project.id}" is "${project.status}" but has phaseDuration=${project.phaseDuration}.`,
        });
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Check 5: Double counting / medium leakage (streaming-first films in box office)
  // ---------------------------------------------------------------------------

  const theatricalReleaseIds = new Set<string>();
  for (const w of state.boxOfficeHistory || []) {
    for (const r of w?.releases || []) {
      if (r?.projectId) theatricalReleaseIds.add(r.projectId);
    }
  }

  for (const project of state.projects || []) {
    if (!project) continue;

    if (isPrimaryStreamingFilm(project)) {
      const boxOfficeTotal = Math.max(0, Math.floor(project.metrics?.boxOfficeTotal ?? 0));
      if (boxOfficeTotal > 0) {
        pushIssue({
          check: 5,
          code: 'project.streaming_first.has_box_office_total',
          message: `Primary streaming film "${project.id}" has boxOfficeTotal=${boxOfficeTotal}.`,
        });
      }

      if (theatricalReleaseIds.has(project.id)) {
        pushIssue({
          check: 5,
          code: 'project.streaming_first.appears_in_box_office_history',
          message: `Primary streaming film "${project.id}" appears in boxOfficeHistory releases.`,
        });
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Check 6: AI vs player parity (AI projects leaking into player projects list)
  // ---------------------------------------------------------------------------

  const playerStudioName = state.studio?.name;
  for (const project of state.projects || []) {
    if (!project) continue;
    if (project.studioName && playerStudioName && project.studioName !== playerStudioName) {
      pushIssue({
        check: 6,
        code: 'ai_project.in_player_projects',
        message: `AI project "${project.id}" (studioName="${project.studioName}") is present in state.projects.`,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Check 7: Market clamps/conservation
  // ---------------------------------------------------------------------------

  const market = state.platformMarket as any;
  if (market) {
    const total = typeof market.totalAddressableSubs === 'number' ? market.totalAddressableSubs : null;
    const playerSubs = Math.max(0, Math.floor(market.player?.subscribers ?? 0));
    const rivalsSubs = (market.rivals || []).reduce((sum: number, r: any) => sum + Math.max(0, Math.floor(r?.subscribers ?? 0)), 0);
    const accounted = playerSubs + rivalsSubs;

    if (total != null && total > 0) {
      if (!Number.isFinite(accounted) || accounted < 0) {
        pushIssue({
          check: 7,
          code: 'platform.subscribers.non_finite',
          message: `Platform market accounted subscribers is invalid: ${accounted}.`,
        });
      }

      if (accounted > total * 1.2) {
        pushIssue({
          check: 7,
          code: 'platform.subscribers.exceeds_tam',
          message: `Platform market subscribers exceed TAM too much: accounted=${accounted} tam=${total}.`,
        });
      }
    }

    const churnRate = market.lastWeek?.player?.churnRate;
    if (typeof churnRate === 'number') {
      if (!Number.isFinite(churnRate) || churnRate < 0 || churnRate > 1) {
        pushIssue({
          check: 7,
          code: 'platform.churnRate.out_of_range',
          message: `Platform churnRate out of range: ${churnRate}.`,
        });
      }
    }
  }

  // Basic numeric sanity (catches NaNs across the loop)
  const numbersToCheck: Array<{ n: number; label: string }> = [
    { n: state.studio?.budget ?? 0, label: 'studio.budget' },
    { n: state.studio?.debt ?? 0, label: 'studio.debt' },
    { n: state.studio?.reputation ?? 0, label: 'studio.reputation' },
  ];

  for (const { n, label } of numbersToCheck) {
    if (!Number.isFinite(n)) {
      pushIssue({ check: 7, code: 'numbers.nan', message: `Non-finite number detected at ${label}: ${String(n)}` });
    }
  }

  // ---------------------------------------------------------------------------
  // Check 8: Collection uniqueness + event queue sanity
  // ---------------------------------------------------------------------------

  const seenProjectIds = new Set<string>();
  for (const p of state.projects || []) {
    if (!p?.id) continue;
    if (seenProjectIds.has(p.id)) {
      pushIssue({
        check: 8,
        code: 'projects.duplicate_id',
        message: `Duplicate project id in state.projects: "${p.id}".`,
      });
    }
    seenProjectIds.add(p.id);
  }

  const seenEventIds = new Set<string>();
  for (const e of state.eventQueue || []) {
    const id = (e as any)?.id;
    if (typeof id !== 'string' || id.length === 0) continue;
    if (seenEventIds.has(id)) {
      pushIssue({
        check: 8,
        code: 'eventQueue.duplicate_id',
        message: `Duplicate event id in eventQueue: "${id}".`,
      });
    }
    seenEventIds.add(id);
  }

  // ---------------------------------------------------------------------------
  // Check 9: Post-theatrical release window consistency
  // ---------------------------------------------------------------------------

  const absWeek = (week: number, year: number) => year * 52 + week;
  const nowAbs = absWeek(state.currentWeek, state.currentYear);

  for (const project of state.projects || []) {
    if (!project) continue;

    const releases = (project.postTheatricalReleases || []) as any[];
    if (releases.length === 0) continue;

    const seenReleaseIds = new Set<string>();
    for (const rel of releases) {
      const relId = rel?.id;
      if (typeof relId === 'string') {
        if (seenReleaseIds.has(relId)) {
          pushIssue({
            check: 9,
            code: 'postTheatrical.duplicate_release_id',
            message: `Project "${project.id}" has duplicate postTheatrical release id "${relId}".`,
          });
        }
        seenReleaseIds.add(relId);
      }

      if (rel?.projectId && rel.projectId !== project.id) {
        pushIssue({
          check: 9,
          code: 'postTheatrical.projectId_mismatch',
          message: `Post-theatrical release "${relId ?? 'unknown'}" has projectId="${rel.projectId}", expected "${project.id}".`,
        });
      }

      const durationWeeks = Math.max(0, Math.floor(rel?.durationWeeks ?? 0));
      const weeksActive = Math.max(0, Math.floor(rel?.weeksActive ?? 0));

      // Some older saves may omit durationWeeks for planned windows; treat it as a hard issue only if it has started accruing.
      if (durationWeeks === 0 && weeksActive > 0) {
        pushIssue({
          check: 9,
          code: 'postTheatrical.durationWeeks_zero',
          message: `Post-theatrical release "${relId ?? 'unknown'}" has durationWeeks=0.`,
        });
      }

      if (weeksActive > durationWeeks && durationWeeks > 0) {
        pushIssue({
          check: 9,
          code: 'postTheatrical.weeksActive_exceeds_duration',
          message: `Post-theatrical release "${relId ?? 'unknown'}" has weeksActive=${weeksActive} > durationWeeks=${durationWeeks}.`,
        });
      }

      const weeklyRevenue = rel?.weeklyRevenue;
      if (typeof weeklyRevenue === 'number') {
        if (!Number.isFinite(weeklyRevenue) || weeklyRevenue < 0) {
          pushIssue({
            check: 9,
            code: 'postTheatrical.weeklyRevenue_invalid',
            message: `Post-theatrical release "${relId ?? 'unknown'}" has invalid weeklyRevenue=${String(weeklyRevenue)}.`,
          });
        }
      }

      const totalRevenue = rel?.revenue;
      if (typeof totalRevenue === 'number') {
        if (!Number.isFinite(totalRevenue) || totalRevenue < 0) {
          pushIssue({
            check: 9,
            code: 'postTheatrical.revenue_invalid',
            message: `Post-theatrical release "${relId ?? 'unknown'}" has invalid revenue=${String(totalRevenue)}.`,
          });
        }
      }

      const rw = rel?.releaseWeek;
      const ry = rel?.releaseYear;
      if (typeof rw === 'number' && typeof ry === 'number') {
        const startAbs = absWeek(rw, ry);
        const lpw = rel?.lastProcessedWeek;
        const lpy = rel?.lastProcessedYear;
        if (typeof lpw === 'number' && typeof lpy === 'number') {
          const lastAbs = absWeek(lpw, lpy);
          if (lastAbs > nowAbs) {
            pushIssue({
              check: 9,
              code: 'postTheatrical.lastProcessed_in_future',
              message: `Post-theatrical release "${relId ?? 'unknown'}" has lastProcessed in the future (Y${lpy}W${lpw}).`,
            });
          }
          if (lastAbs < startAbs - 60) {
            pushIssue({
              check: 9,
              code: 'postTheatrical.lastProcessed_too_far_before_start',
              message: `Post-theatrical release "${relId ?? 'unknown'}" has lastProcessed far before start (start=Y${ry}W${rw} last=Y${lpy}W${lpw}).`,
            });
          }
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Check 10: Talent contract consistency
  // ---------------------------------------------------------------------------

  const activeContractsByTalentId = new Map<string, { projectId: string; weeksRemaining: number; contractWeeks: number }[]>();

  for (const project of state.projects || []) {
    if (!project) continue;
    for (const c of project.contractedTalent || []) {
      const tid = c?.talentId;
      if (!tid) continue;

      const weeksRemaining = Math.max(0, Math.floor(c?.weeksRemaining ?? 0));
      const contractWeeks = Math.max(0, Math.floor(c?.contractWeeks ?? 0));

      if (contractWeeks > 0 && weeksRemaining > contractWeeks) {
        pushIssue({
          check: 10,
          code: 'talent.contract.weeksRemaining_exceeds_contractWeeks',
          message: `Project "${project.id}" contractedTalent "${tid}" has weeksRemaining=${weeksRemaining} > contractWeeks=${contractWeeks}.`,
        });
      }

      const list = activeContractsByTalentId.get(tid) || [];
      list.push({ projectId: project.id, weeksRemaining, contractWeeks });
      activeContractsByTalentId.set(tid, list);
    }
  }

  for (const t of state.talent || []) {
    if (!t?.id) continue;

    const listed = activeContractsByTalentId.get(t.id) || [];
    const hasActive = listed.some((x) => x.weeksRemaining > 0);

    if (t.contractStatus === 'contracted') {
      const currentContractWeeksRaw = (t as any).currentContractWeeks;
      if (typeof currentContractWeeksRaw === 'number') {
        const wk = Math.max(0, Math.floor(currentContractWeeksRaw));
        if (wk <= 0 && hasActive) {
          pushIssue({
            check: 10,
            code: 'talent.contract.currentContractWeeks_non_positive',
            message: `Talent "${t.id}" is contractStatus="contracted" but currentContractWeeks is ${wk}.`,
          });
        }
      }

      if (!hasActive) {
        pushIssue({
          check: 10,
          code: 'talent.contract.contracted_without_project_entry',
          message: `Talent "${t.id}" is contractStatus="contracted" but is not present in any project.contractedTalent with weeksRemaining > 0.`,
        });
      }
    }
  }

  return issues;
}
