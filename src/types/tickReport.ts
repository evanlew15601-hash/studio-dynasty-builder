export type TickRecapSeverity = 'info' | 'good' | 'bad' | 'warning';

export type TickRecapType =
  | 'financial'
  | 'release'
  | 'award'
  | 'talent'
  | 'media'
  | 'market'
  | 'system';

export type TickSystemReport = {
  id: string;
  label: string;
  ms: number;
  highlights?: string[];
  warnings?: string[];
};

export type TickRecapCard = {
  type: TickRecapType;
  title: string;
  body: string;
  severity?: TickRecapSeverity;
  relatedIds?: {
    projectId?: string;
    talentId?: string;
    studioId?: string;
  };
};

export type TickReportSummary = {
  budgetDelta?: number;
  reputationDelta?: number;
  newReleases?: number;
  awardsWon?: number;
};

export type TickReport = {
  week: number;
  year: number;
  startedAtIso: string;
  finishedAtIso: string;
  totalMs: number;
  systems: TickSystemReport[];
  recap: TickRecapCard[];
  summary?: TickReportSummary;
};
