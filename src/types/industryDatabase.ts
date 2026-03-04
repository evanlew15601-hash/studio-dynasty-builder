import type { Genre } from './game';

export type IndustryTalentType = 'actor' | 'director';

export interface FilmDbRecord {
  id: string;
  title: string;
  studioName: string;
  releaseWeek?: number;
  releaseYear?: number;
  genre?: Genre;
  budget?: number;
  boxOfficeTotal?: number;
  criticsScore?: number;
  audienceScore?: number;
}

export interface TvShowDbRecord {
  id: string;
  title: string;
  studioName: string;
  releaseWeek?: number;
  releaseYear?: number;
  genre?: Genre;
  budget?: number;
  totalViews?: number;
  audienceShare?: number;
  criticsScore?: number;
  audienceScore?: number;
}

export interface TalentDbRecord {
  id: string;
  name: string;
  type: IndustryTalentType;
  age?: number;
  fame?: number;
  reputation?: number;
  marketValue?: number;
  awardsCount?: number;
  filmographyCount?: number;
  genres?: Genre[];
}

export type AwardRecordType = 'studio' | 'talent';

export interface AwardDbRecord {
  id: string;
  awardType: AwardRecordType;
  year: number;
  ceremony: string;
  category: string;
  prestige: number;
  studioName: string;
  projectId: string;
  projectTitle?: string;
  talentId?: string;
  talentName?: string;
}

export interface StudioDbRecord {
  id: string;
  name: string;
  founded?: number;
  reputation?: number;
  specialties?: Genre[];
}

export type ProviderType = 'streaming' | 'cable';

export interface ProviderDbRecord {
  id: string;
  name: string;
  type: ProviderType;
  tier?: 'major' | 'mid' | 'niche';
  description?: string;
  reach?: number; // 0-100 abstract audience reach
}

export interface IndustryDatabase {
  version: 1;
  updatedAt: string;
  films: FilmDbRecord[];
  tvShows: TvShowDbRecord[];
  talent: TalentDbRecord[];
  awards: AwardDbRecord[];
  studios: StudioDbRecord[];
  providers: ProviderDbRecord[];
}
