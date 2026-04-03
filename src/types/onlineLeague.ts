export type LeagueReleasedProjectSnapshot = {
  id: string;
  title: string;
  studioName: string;
  type: string;
  genre?: string;
  budgetTotal?: number;
  runtimeMins?: number;
  releaseWeek?: number;
  releaseYear?: number;
  releaseLabel?: string;
  logline?: string;
  director?: string;
  topCast?: string[];
  criticsScore?: number;
  audienceScore?: number;
  boxOfficeTotal?: number;
  lastWeeklyRevenue?: number;
  weeksSinceRelease?: number;
  inTheaters?: boolean;
  publicDomainId?: string;
  publicDomainName?: string;
  franchiseId?: string;
  franchiseTitle?: string;
  releaseFormat?: string;
  totalEpisodes?: number;
  episodesAired?: number;
};

export type OnlineLeagueTurnStateSlice = {
  studio: { id: string; name: string } | null;
  projects: Array<{ id: string; title: string }>;
  releasedProjects?: LeagueReleasedProjectSnapshot[];
};
