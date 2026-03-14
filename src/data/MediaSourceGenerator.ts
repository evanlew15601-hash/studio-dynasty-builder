import type { Genre, MediaSource } from '@/types/game';
import type { ModBundle } from '@/types/modding';
import { applyPatchesByKey, getPatchesForEntity } from '@/utils/modding';
import { getModBundle } from '@/utils/moddingStore';

export class MediaSourceGenerator {
  private static sources: MediaSource[] = [];

  private static buildBaseSources(): MediaSource[] {
    if (this.sources.length > 0) return this.sources;

    const mediaOutlets: Omit<MediaSource, 'id'>[] = [
      // Major Trade Publications
      {
        name: 'Showbiz Ledger',
        type: 'trade_publication',
        credibility: 95,
        bias: 0,
        reach: 85,
        specialties: ['drama', 'comedy', 'action', 'thriller'] as Genre[],
        established: 1905,
      },
      {
        name: 'The Studio Reporter',
        type: 'trade_publication',
        credibility: 92,
        bias: 5,
        reach: 80,
        specialties: ['drama', 'biography', 'documentary'] as Genre[],
        established: 1930,
      },
      {
        name: 'Deadline Daily',
        type: 'blog',
        credibility: 88,
        bias: -5,
        reach: 75,
        specialties: ['action', 'thriller', 'superhero'] as Genre[],
        established: 2006,
      },

      // Mainstream Entertainment
      {
        name: 'Screen Weekly',
        type: 'magazine',
        credibility: 78,
        bias: 10,
        reach: 70,
        specialties: ['comedy', 'romance', 'family'] as Genre[],
        established: 1990,
      },
      {
        name: 'PopLife Magazine',
        type: 'magazine',
        credibility: 65,
        bias: 15,
        reach: 90,
        specialties: ['romance', 'drama', 'biography'] as Genre[],
        established: 1974,
      },

      // Newspapers
      {
        name: 'Los Angeles Gazette',
        type: 'newspaper',
        credibility: 85,
        bias: -10,
        reach: 65,
        specialties: ['drama', 'documentary', 'historical'] as Genre[],
        established: 1881,
      },
      {
        name: 'New York Ledger',
        type: 'newspaper',
        credibility: 90,
        bias: -15,
        reach: 60,
        specialties: ['drama', 'documentary'] as Genre[],
        established: 1851,
      },

      // Genre-Specific
      {
        name: 'Empire Screen',
        type: 'magazine',
        credibility: 80,
        bias: 5,
        reach: 55,
        specialties: ['action', 'sci-fi', 'fantasy', 'superhero'] as Genre[],
        established: 1989,
      },
      {
        name: 'Fangorama',
        type: 'magazine',
        credibility: 75,
        bias: 20,
        reach: 40,
        specialties: ['horror', 'thriller'] as Genre[],
        established: 1979,
      },

      // Digital & Social
      {
        name: 'The Industry Rundown',
        type: 'blog',
        credibility: 82,
        bias: 0,
        reach: 65,
        specialties: ['drama', 'comedy', 'documentary'] as Genre[],
        established: 2009,
      },
      {
        name: 'BuzzWire',
        type: 'blog',
        credibility: 45,
        bias: 25,
        reach: 95,
        specialties: ['romance', 'drama'] as Genre[],
        established: 2005,
      },
      {
        name: 'Screen Rave',
        type: 'blog',
        credibility: 70,
        bias: 10,
        reach: 85,
        specialties: ['superhero', 'sci-fi', 'fantasy', 'action'] as Genre[],
        established: 2003,
      },

      // TV Networks
      {
        name: 'Tonight Entertainment',
        type: 'tv_network',
        credibility: 68,
        bias: 20,
        reach: 80,
        specialties: ['romance', 'comedy', 'family'] as Genre[],
        established: 1981,
      },
      {
        name: 'Access Spotlight',
        type: 'tv_network',
        credibility: 62,
        bias: 25,
        reach: 75,
        specialties: ['romance', 'drama', 'comedy'] as Genre[],
        established: 1996,
      },

      // Social Media Influencers
      {
        name: 'FilmChirper Collective',
        type: 'social_media',
        credibility: 55,
        bias: -5,
        reach: 70,
        specialties: ['drama', 'documentary'] as Genre[],
        established: 2010,
      },
      {
        name: 'Box Office Briefing',
        type: 'social_media',
        credibility: 72,
        bias: 0,
        reach: 60,
        specialties: ['action', 'superhero', 'family'] as Genre[],
        established: 2012,
      },
    ];

    this.sources = mediaOutlets.map((outlet, index) => ({
      id: `source_${index + 1}`,
      ...outlet,
    }));

    return this.sources;
  }

  static getBaseMediaSources(): MediaSource[] {
    return this.buildBaseSources();
  }

  static generateMediaSources(mods?: ModBundle): MediaSource[] {
    const base = this.buildBaseSources();
    const bundle = mods ?? getModBundle();
    const patches = getPatchesForEntity(bundle, 'mediaSource');
    return applyPatchesByKey(base, patches, (s) => s.id);
  }

  static getSourcesByType(type: MediaSource['type'], mods?: ModBundle): MediaSource[] {
    return this.generateMediaSources(mods).filter((source) => source.type === type);
  }

  static getSourcesByCredibility(minCredibility: number, mods?: ModBundle): MediaSource[] {
    return this.generateMediaSources(mods).filter((source) => source.credibility >= minCredibility);
  }

  static getRandomSource(mods?: ModBundle): MediaSource {
    const sources = this.generateMediaSources(mods);
    return sources[Math.floor(Math.random() * sources.length)];
  }

  static getSourceForEvent(eventType: string, preferHighCredibility = false, mods?: ModBundle): MediaSource {
    const sources = this.generateMediaSources(mods);

    if (preferHighCredibility) {
      const credibleSources = sources.filter((s) => s.credibility >= 80);
      if (credibleSources.length) {
        return credibleSources[Math.floor(Math.random() * credibleSources.length)];
      }
    }

    switch (eventType) {
      case 'scandal':
      case 'rumor': {
        const gossipSources = sources.filter((s) => s.credibility < 70);
        if (gossipSources.length) {
          return gossipSources[Math.floor(Math.random() * gossipSources.length)];
        }
        break;
      }
      case 'award_win':
      case 'award_nomination':
      case 'box_office': {
        const tradeSources = sources.filter((s) => s.type === 'trade_publication');
        if (tradeSources.length) {
          return tradeSources[Math.floor(Math.random() * tradeSources.length)];
        }
        break;
      }
      case 'casting_announcement':
      case 'interview': {
        const entertainmentSources = sources.filter((s) => s.type === 'magazine' || s.type === 'blog');
        if (entertainmentSources.length) {
          return entertainmentSources[Math.floor(Math.random() * entertainmentSources.length)];
        }
        break;
      }
    }

    return this.getRandomSource(mods);
  }
}