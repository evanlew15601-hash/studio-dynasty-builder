import { describe, expect, it } from 'vitest';
import { SystemIntegration } from '@/components/game/SystemIntegration';

describe('SystemIntegration release guardrails', () => {
  it('fails the Project-Release Pipeline check when a project has a planned date but is not marked scheduled-for-release', () => {
    const pipelineTest = SystemIntegration.getIntegrationTests().find(t => t.name === 'Project-Release Pipeline');
    expect(pipelineTest).toBeTruthy();

    const result = pipelineTest!.test({
      currentWeek: 10,
      currentYear: 2024,
      currentQuarter: 1,
      projects: [
        {
          id: 'film-1',
          title: 'Film 1',
          status: 'marketing',
          currentPhase: 'marketing',
          scheduledReleaseWeek: 20,
          scheduledReleaseYear: 2024,
        },
      ],
    } as any);

    expect(result.passed).toBe(false);
    expect(result.message).toContain('planned release date');
  });
});
