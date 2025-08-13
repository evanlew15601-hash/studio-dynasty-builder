import { useEffect, useState } from 'react';
import { GameState, Project, Studio, StudioAward } from '@/types/game';
import { getAwardShowsForYear } from '@/data/AwardsSchedule';
import { useToast } from '@/hooks/use-toast';

// Headless awards season engine: runs nominations and ceremonies regardless of UI phase
export function useAwardsEngine(
  gameState: GameState,
  onStudioUpdate: (updates: Partial<Studio>) => void
) {
  const { toast } = useToast();

  const [processedCeremonies, setProcessedCeremonies] = useState<Set<string>>(new Set());
  const [seasonMomentum, setSeasonMomentum] = useState<Record<string, number>>({});
  const [seasonNominations, setSeasonNominations] = useState<
    Record<string, { year: number; categories: Record<string, Array<{ project: Project; score: number }>> }>
  >({});

  const isAwardsSeasonActive = gameState.currentWeek >= 1 && gameState.currentWeek <= 12;

  const getEligibleProjects = (): Project[] => {
    const playerProjects = gameState.projects.filter(
      (project) =>
        project.status === 'released' &&
        project.releaseYear === gameState.currentYear - 1 &&
        project.metrics?.criticsScore &&
        project.metrics.criticsScore >= 60
    );

    const aiProjects = gameState.allReleases.filter((release): release is Project =>
      'script' in release &&
      release.status === 'released' &&
      release.releaseYear === gameState.currentYear - 1 &&
      release.metrics?.criticsScore &&
      release.metrics.criticsScore >= 60
    );

    return [...playerProjects, ...aiProjects];
  };

  const calculateAwardsProbability = (project: Project): number => {
    const criticsScore = project.metrics?.criticsScore || 0;
    const audienceScore = project.metrics?.audienceScore || 0;
    const boxOffice = project.metrics?.boxOfficeTotal || 0;
    const budget = project.budget.total;

    let probability = (criticsScore + audienceScore) / 2;
    if (boxOffice > budget * 1.5) probability += 10;
    if (isAwardsSeasonActive) {
      if (project.script.genre === 'drama') probability += 15;
      if (project.script.genre === 'biography') probability += 10;
      if (project.script.genre === 'historical') probability += 8;
    }
    return Math.min(100, Math.max(0, probability));
  };

  const getShowConfig = (ceremonyName: string) => {
    const schedule = getAwardShowsForYear(gameState.currentYear);
    const show = schedule.find((s) => s.name === ceremonyName);

    const base = (() => {
      switch (ceremonyName) {
        case 'Golden Globe':
          return {
            prestige: 6,
            categories: ['Best Picture - Drama', 'Best Director'],
            nominationWeek: 2,
            ceremonyWeek: 6,
            momentumBonus: 8,
          } as const;
        case 'Critics Choice':
          return {
            prestige: 5,
            categories: ['Best Film', 'Best Acting'],
            nominationWeek: 3,
            ceremonyWeek: 8,
            momentumBonus: 6,
          } as const;
        default:
          return {
            prestige: 10,
            categories: ['Best Picture', 'Best Director', 'Best Actor'],
            nominationWeek: 4,
            ceremonyWeek: 10,
            momentumBonus: 12,
          } as const; // Oscar
      }
    })();

    return {
      ...base,
      nominationWeek: show?.nominationWeek ?? base.nominationWeek,
      ceremonyWeek: show?.ceremonyWeek ?? base.ceremonyWeek,
    };
  };

  const announceNominations = (ceremonyName: string) => {
    const key = `${ceremonyName}-${gameState.currentYear}`;
    if (seasonNominations[key]) return; // idempotent

    const { categories } = getShowConfig(ceremonyName);
    const eligible = getEligibleProjects();

    const categoriesMap: Record<string, Array<{ project: Project; score: number }>> = {};

    categories.forEach((category) => {
      const ranked = eligible
        .map((project) => {
          const base = calculateAwardsProbability(project);
          const momentum = seasonMomentum[project.id] || 0;
          const categoryBias = category.toLowerCase().includes('director')
            ? 5
            : category.toLowerCase().includes('actor')
            ? 3
            : 0;
          const score = Math.min(100, base + momentum + categoryBias + (Math.random() * 6 - 3));
          return { project, score };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
      categoriesMap[category] = ranked;
    });

    setSeasonNominations((prev) => ({
      ...prev,
      [key]: { year: gameState.currentYear, categories: categoriesMap },
    }));

    console.log(`[AwardsEngine] ${ceremonyName} nominations announced for Y${gameState.currentYear}`);
    toast({
      title: `${ceremonyName} Nominations Announced`,
      description: `Top contenders selected across ${categories.length} categories.`,
    });
  };

  const triggerAwardsCeremony = (ceremonyName: string) => {
    const { categories, ceremonyWeek, prestige, momentumBonus } = getShowConfig(ceremonyName);
    const key = `${ceremonyName}-${gameState.currentYear}`;
    if (gameState.currentWeek !== ceremonyWeek) return;
    if (processedCeremonies.has(key)) return;

    if (!seasonNominations[key]) {
      announceNominations(ceremonyName);
    }
    const nominationsRecord = seasonNominations[key];
    if (!nominationsRecord) return;

    const flatForModal: Array<{ project: Project; category: string; won: boolean; award?: StudioAward }> = [];
    const winnersThisShow: string[] = [];

    categories.forEach((category) => {
      const nominees = nominationsRecord.categories[category] || [];
      if (nominees.length === 0) return;
      const weighted = nominees.map((n, idx) => ({
        ...n,
        weight: (nominees.length - idx) * 1.5 + (seasonMomentum[n.project.id] || 0) / 10,
      }));
      const totalWeight = weighted.reduce((s, w) => s + (w as any).weight, 0);
      let r = Math.random() * totalWeight;
      let winner = weighted[0] as any;
      for (const w of weighted as any[]) {
        r -= w.weight;
        if (r <= 0) {
          winner = w;
          break;
        }
      }

      nominees.forEach((n) => {
        const won = n.project.id === winner.project.id;
        const award: StudioAward | undefined = won
          ? {
              id: `award-${Date.now()}-${Math.random()}`,
              projectId: n.project.id,
              category,
              ceremony: ceremonyName,
              year: gameState.currentYear,
              prestige,
              reputationBoost: prestige * 2,
              revenueBoost: n.project.budget.total * (prestige / 100),
            }
          : undefined;
        flatForModal.push({ project: n.project, category, won, award });
        if (won) winnersThisShow.push(n.project.id);
      });
    });

    setProcessedCeremonies((prev) => new Set(prev).add(key));

    if (winnersThisShow.length > 0) {
      setSeasonMomentum((prev) => {
        const next = { ...prev };
        winnersThisShow.forEach((pid) => {
          next[pid] = (next[pid] || 0) + momentumBonus;
        });
        return next;
      });
    }

    if (flatForModal.length > 0) {
      const wonAwards = flatForModal
        .filter((n) => n.won && n.award)
        .map((n) => n.award!)
        .filter((a) => gameState.projects.some((p) => p.id === a.projectId));

      if (wonAwards.length > 0) {
        const totalReputation = wonAwards.reduce((sum, award) => sum + award.reputationBoost, 0);
        const totalRevenue = wonAwards.reduce((sum, award) => sum + award.revenueBoost, 0);
        onStudioUpdate({
          reputation: Math.min(100, (gameState.studio.reputation || 0) + totalReputation),
          budget: (gameState.studio.budget || 0) + totalRevenue,
          awards: [...(gameState.studio.awards || []), ...wonAwards],
        });
      }

      console.log(
        `[AwardsEngine] ${ceremonyName} ceremony processed for Y${gameState.currentYear} (awards: ${flatForModal.length})`
      );
      toast({
        title: `${ceremonyName} Winners Announced`,
        description: `${flatForModal.filter((f) => f.won).length} category winners selected.`,
      });
    }
  };

  // Reset season each year/week 1
  useEffect(() => {
    if (gameState.currentWeek === 1) {
      setProcessedCeremonies(new Set());
      setSeasonNominations({});
      setSeasonMomentum({});
      console.log(`[AwardsEngine] Reset season state for Y${gameState.currentYear}`);
    }
  }, [gameState.currentYear, gameState.currentWeek]);

  // Weekly triggers
  useEffect(() => {
    if (!isAwardsSeasonActive) return;
    const shows = getAwardShowsForYear(gameState.currentYear);

    shows.forEach((s) => {
      if (gameState.currentWeek === s.nominationWeek) announceNominations(s.name);
    });
    shows.forEach((s) => triggerAwardsCeremony(s.name));
  }, [gameState.currentWeek, isAwardsSeasonActive, gameState.currentYear]);
}
