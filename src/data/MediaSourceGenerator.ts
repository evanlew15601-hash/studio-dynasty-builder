import { MediaSource, MediaItem, MediaEvent, MediaMemory, MediaCampaign, Genre } from '@/types/game';

export class MediaSourceGenerator {
  private static sources: MediaSource[] = [];

  static generateMediaSources(): MediaSource[] {
    if (this.sources.length > 0) return this.sources;

    const mediaOutlets = [
      // Major Trade Publications
      {
        name: "Variety",
        type: 'trade_publication' as const,
        credibility: 95,
        bias: 0,
        reach: 85,
        specialties: ['drama', 'comedy', 'action', 'thriller'] as Genre[],
        established: 1905
      },
      {
        name: "The Hollywood Reporter",
        type: 'trade_publication' as const,
        credibility: 92,
        bias: 5,
        reach: 80,
        specialties: ['drama', 'biography', 'documentary'] as Genre[],
        established: 1930
      },
      {
        name: "Deadline Hollywood",
        type: 'blog' as const,
        credibility: 88,
        bias: -5,
        reach: 75,
        specialties: ['action', 'thriller', 'superhero'] as Genre[],
        established: 2006
      },

      // Mainstream Entertainment
      {
        name: "Entertainment Weekly",
        type: 'magazine' as const,
        credibility: 78,
        bias: 10,
        reach: 70,
        specialties: ['comedy', 'romance', 'family'] as Genre[],
        established: 1990
      },
      {
        name: "People Magazine",
        type: 'magazine' as const,
        credibility: 65,
        bias: 15,
        reach: 90,
        specialties: ['romance', 'drama', 'biography'] as Genre[],
        established: 1974
      },

      // Newspapers
      {
        name: "Los Angeles Times",
        type: 'newspaper' as const,
        credibility: 85,
        bias: -10,
        reach: 65,
        specialties: ['drama', 'documentary', 'historical'] as Genre[],
        established: 1881
      },
      {
        name: "The New York Times",
        type: 'newspaper' as const,
        credibility: 90,
        bias: -15,
        reach: 60,
        specialties: ['drama', 'documentary'] as Genre[],
        established: 1851
      },

      // Genre-Specific
      {
        name: "Empire Magazine",
        type: 'magazine' as const,
        credibility: 80,
        bias: 5,
        reach: 55,
        specialties: ['action', 'sci-fi', 'fantasy', 'superhero'] as Genre[],
        established: 1989
      },
      {
        name: "Fangoria",
        type: 'magazine' as const,
        credibility: 75,
        bias: 20,
        reach: 40,
        specialties: ['horror', 'thriller'] as Genre[],
        established: 1979
      },

      // Digital & Social
      {
        name: "The Wrap",
        type: 'blog' as const,
        credibility: 82,
        bias: 0,
        reach: 65,
        specialties: ['drama', 'comedy', 'documentary'] as Genre[],
        established: 2009
      },
      {
        name: "TMZ",
        type: 'blog' as const,
        credibility: 45,
        bias: 25,
        reach: 95,
        specialties: ['romance', 'drama'] as Genre[],
        established: 2005
      },
      {
        name: "Screen Rant",
        type: 'blog' as const,
        credibility: 70,
        bias: 10,
        reach: 85,
        specialties: ['superhero', 'sci-fi', 'fantasy', 'action'] as Genre[],
        established: 2003
      },

      // TV Networks
      {
        name: "Entertainment Tonight",
        type: 'tv_network' as const,
        credibility: 68,
        bias: 20,
        reach: 80,
        specialties: ['romance', 'comedy', 'family'] as Genre[],
        established: 1981
      },
      {
        name: "Access Hollywood", 
        type: 'tv_network' as const,
        credibility: 62,
        bias: 25,
        reach: 75,
        specialties: ['romance', 'drama', 'comedy'] as Genre[],
        established: 1996
      },

      // Social Media Influencers
      {
        name: "FilmTwitter Collective",
        type: 'social_media' as const,
        credibility: 55,
        bias: -5,
        reach: 70,
        specialties: ['drama', 'documentary'] as Genre[],
        established: 2010
      },
      {
        name: "Box Office Insider",
        type: 'social_media' as const,
        credibility: 72,
        bias: 0,
        reach: 60,
        specialties: ['action', 'superhero', 'family'] as Genre[],
        established: 2015
      }
    ];

    this.sources = mediaOutlets.map((outlet, index) => ({
      id: `source_${index + 1}`,
      ...outlet
    }));

    return this.sources;
  }

  static getSourcesByType(type: MediaSource['type']): MediaSource[] {
    return this.generateMediaSources().filter(source => source.type === type);
  }

  static getSourcesByCredibility(minCredibility: number): MediaSource[] {
    return this.generateMediaSources().filter(source => source.credibility >= minCredibility);
  }

  static getRandomSource(): MediaSource {
    const sources = this.generateMediaSources();
    return sources[Math.floor(Math.random() * sources.length)];
  }

  static getSourceForEvent(eventType: string, preferHighCredibility: boolean = false): MediaSource {
    const sources = this.generateMediaSources();
    
    if (preferHighCredibility) {
      const credibleSources = sources.filter(s => s.credibility >= 80);
      return credibleSources[Math.floor(Math.random() * credibleSources.length)];
    }

    // Different sources for different types of stories
    switch (eventType) {
      case 'scandal':
      case 'rumor':
        const gossipSources = sources.filter(s => s.credibility < 70);
        return gossipSources[Math.floor(Math.random() * gossipSources.length)];
      
      case 'award_win':
      case 'box_office':
        const tradeSources = sources.filter(s => s.type === 'trade_publication');
        return tradeSources[Math.floor(Math.random() * tradeSources.length)];
      
      case 'casting_announcement':
      case 'interview':
        const entertainmentSources = sources.filter(s => 
          s.type === 'magazine' || s.type === 'blog'
        );
        return entertainmentSources[Math.floor(Math.random() * entertainmentSources.length)];
      
      default:
        return this.getRandomSource();
    }
  }
}