import type { Project, StudioAward } from '@/types/game';

export interface AwardShowNomination {
  project: Project & { studioId?: string };
  category: string;
  score: number;
  won?: boolean;
  award?: StudioAward;
  talentName?: string;
}

export interface AwardShowCeremony {
  ceremonyName: string;
  year: number;
  nominations: Record<string, AwardShowNomination[]>;
  winners: Record<string, AwardShowNomination>;
}
