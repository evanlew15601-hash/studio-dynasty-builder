import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { Franchise, GameState, Script } from '@/types/game';
import { ScriptDevelopment } from '@/components/game/ScriptDevelopment';
import { createDefaultScriptCoverage } from '@/utils/scriptCoverage';

const { toast } = vi.hoisted(() => ({
  toast: vi.fn(),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast, toasts: [], dismiss: vi.fn() }),
  toast,
}));

function makeBaseGameState(overrides: Partial<GameState> = {}): GameState {
  return {
    studio: {
      id: 'studio-1',
      name: 'Test Studio',
      reputation: 50,
      budget: 100_000_000,
      founded: 2000,
      specialties: ['drama'],
    },
    currentYear: 2024,
    currentWeek: 1,
    currentQuarter: 1,
    projects: [],
    talent: [],
    scripts: [],
    competitorStudios: [],
    marketConditions: {
      trendingGenres: ['drama'],
      audiencePreferences: [],
      economicClimate: 'stable',
      technologicalAdvances: [],
      regulatoryChanges: [],
      seasonalTrends: [],
      competitorReleases: [],
    },
    eventQueue: [],
    boxOfficeHistory: [],
    awardsCalendar: [],
    industryTrends: [],
    allReleases: [],
    topFilmsHistory: [],
    franchises: [],
    publicDomainIPs: [],
    ...overrides,
  };
}

function makeReadyCoverage(): Script['coverage'] {
  const base = createDefaultScriptCoverage();

  const markAll = (stage: keyof typeof base.stages) => {
    base.stages[stage] = {
      ...base.stages[stage],
      checklist: base.stages[stage].checklist.map((item) => ({ ...item, completed: true })),
    };
  };

  markAll('polish');
  markAll('final');

  return base;
}

function makeScript(overrides: Partial<Script> = {}): Script {
  return {
    id: 'script-1',
    title: 'Test Script',
    genre: 'drama',
    logline: 'A test story.',
    writer: 'In-house',
    pages: 120,
    quality: 50,
    budget: 10_000_000,
    developmentStage: 'polish',
    themes: [],
    targetAudience: 'general',
    estimatedRuntime: 120,
    characteristics: {
      tone: 'balanced',
      pacing: 'steady',
      dialogue: 'naturalistic',
      visualStyle: 'realistic',
      commercialAppeal: 5,
      criticalPotential: 5,
      cgiIntensity: 'minimal',
    },
    coverage: makeReadyCoverage(),
    ...overrides,
  };
}

describe('ScriptDevelopment - stage switching and finalization gating', () => {
  beforeEach(() => {
    toast.mockClear();
  });

  it('persists the selected development stage when creating a script', async () => {
    const user = userEvent.setup();

    const onProjectCreate = vi.fn();
    const onScriptUpdate = vi.fn();

    render(
      <ScriptDevelopment
        gameState={makeBaseGameState()}
        onProjectCreate={onProjectCreate}
        onScriptUpdate={onScriptUpdate}
      />
    );

    await user.click(screen.getByRole('button', { name: /new script/i }));

    await user.type(screen.getByLabelText(/project title/i), 'My New Script');
    await user.type(screen.getByLabelText(/^logline$/i), 'A logline for testing.');

    // DevelopmentStageControl renders Radix ToggleGroup items with aria-labels
    await user.click(screen.getByLabelText('Treatment'));

    await user.click(screen.getByRole('button', { name: /create script/i }));

    expect(onScriptUpdate).toHaveBeenCalledTimes(1);
    expect(onScriptUpdate.mock.calls[0][0].developmentStage).toBe('treatment');
    expect(onProjectCreate).not.toHaveBeenCalled();
  });

  it('persists stage selection when creating a franchise script (does not auto-force final)', async () => {
    const user = userEvent.setup();

    const onProjectCreate = vi.fn();
    const onScriptUpdate = vi.fn();

    const franchise: Franchise = {
      id: 'f-1',
      title: 'Space Saga',
      originDate: '2024-01-01',
      creatorStudioId: 'studio-1',
      genre: ['sci-fi'],
      tone: 'epic',
      parodySource: 'Star Wars',
      entries: [],
      status: 'active',
      franchiseTags: [],
      culturalWeight: 50,
      cost: 0,
    };

    render(
      <ScriptDevelopment
        gameState={makeBaseGameState({ franchises: [franchise] })}
        selectedFranchise={franchise.id}
        onProjectCreate={onProjectCreate}
        onScriptUpdate={onScriptUpdate}
      />
    );

    await user.click(screen.getByRole('button', { name: /new script/i }));

    await user.click(screen.getByLabelText('Treatment'));
    await user.click(screen.getByRole('button', { name: /create script/i }));

    expect(onScriptUpdate).toHaveBeenCalledTimes(1);
    expect(onScriptUpdate.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        developmentStage: 'treatment',
        sourceType: 'franchise',
        franchiseId: franchise.id,
      })
    );

    expect(onProjectCreate).not.toHaveBeenCalled();
  });

  it('finalizes a valid script from the library, updates it to final, and toasts success', async () => {
    const user = userEvent.setup();

    const onProjectCreate = vi.fn();
    const onScriptUpdate = vi.fn();

    const script = makeScript({
      id: 'good-script',
      title: 'Ready Script',
      budget: 10_000_000,
      developmentStage: 'polish',
      characters: [],
    });

    render(
      <ScriptDevelopment
        gameState={makeBaseGameState({ scripts: [script] })}
        onProjectCreate={onProjectCreate}
        onScriptUpdate={onScriptUpdate}
      />
    );

    const heading = screen.getByRole('heading', { name: 'Ready Script' });
    const scriptCard = heading.closest('div')?.parentElement;
    expect(scriptCard).toBeTruthy();

    await user.click(within(scriptCard as HTMLElement).getByRole('button', { name: /finalize/i }));

    expect(onScriptUpdate).toHaveBeenCalledTimes(1);
    expect(onScriptUpdate.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        id: 'good-script',
        developmentStage: 'final',
      })
    );

    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Script Finalized',
      })
    );
  });

  it('blocks finalization when coverage checklists are incomplete and shows a destructive toast', async () => {
    const user = userEvent.setup();

    const onProjectCreate = vi.fn();
    const onScriptUpdate = vi.fn();

    const script = makeScript({
      id: 'coverage-blocked',
      title: 'Coverage Blocked',
      coverage: createDefaultScriptCoverage(),
    });

    render(
      <ScriptDevelopment
        gameState={makeBaseGameState({ scripts: [script] })}
        onProjectCreate={onProjectCreate}
        onScriptUpdate={onScriptUpdate}
      />
    );

    const heading = screen.getByRole('heading', { name: 'Coverage Blocked' });
    const scriptCard = heading.closest('div')?.parentElement;
    expect(scriptCard).toBeTruthy();

    await user.click(within(scriptCard as HTMLElement).getByRole('button', { name: /finalize/i }));

    expect(onScriptUpdate).not.toHaveBeenCalled();
    expect(onProjectCreate).not.toHaveBeenCalled();

    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Coverage Incomplete',
        variant: 'destructive',
      })
    );
  });

  it('blocks finalization when validation fails (budget) and shows a destructive toast', async () => {
    const user = userEvent.setup();

    const onProjectCreate = vi.fn();
    const onScriptUpdate = vi.fn();

    const invalidScript = makeScript({
      id: 'bad-script',
      title: 'Broken Script',
      budget: 0,
      developmentStage: 'polish',
    });

    render(
      <ScriptDevelopment
        gameState={makeBaseGameState({ scripts: [invalidScript] })}
        onProjectCreate={onProjectCreate}
        onScriptUpdate={onScriptUpdate}
      />
    );

    const heading = screen.getByRole('heading', { name: 'Broken Script' });
    const scriptCard = heading.closest('div')?.parentElement;
    expect(scriptCard).toBeTruthy();

    // Confirms the script is currently not final.
    expect(within(scriptCard as HTMLElement).getAllByText('polish').length).toBeGreaterThan(0);

    await user.click(within(scriptCard as HTMLElement).getByRole('button', { name: /finalize/i }));

    expect(onScriptUpdate).not.toHaveBeenCalled();
    expect(onProjectCreate).not.toHaveBeenCalled();

    expect(toast).toHaveBeenCalledTimes(1);
    expect(toast.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        title: 'Cannot Finalize',
        variant: 'destructive',
      })
    );
    expect(String(toast.mock.calls[0][0].description)).toContain('Budget must be > 0.');
  });
});
