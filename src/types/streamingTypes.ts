// Streaming and TV-specific types for Studio Magnate

export type ProviderIdUnion =
  | 'streamflix'
  | 'primewave'
  | 'streamhub'
  | 'magicstream'
  | 'orchardstream'
  | 'premiumstream'
  // Cable networks
  | 'amotion'
  | 'flux'
  | 'dynamite'
  | 'unity'
  | 'sciwave'
  | 'chronicle';

export interface StreamingContract {
  id: string;
  /**
   * Type of deal. We reuse StreamingContract for both streaming platforms and linear/cable networks.
   */
  dealKind: 'streaming' | 'cable';
  /**
   * Authoritative identifier for the platform/network used for persistence.
   *
   * This is the field new saves should rely on.
   */
  platformId: string;
  /**
   * Legacy provider id (kept for backwards compatibility with older saves).
   */
  platform?: ProviderIdUnion;
  name: string;
  type: 'series' | 'film' | 'documentary' | 'limited-series';
  duration: number; // contract length in weeks
  startWeek: number;
  startYear: number;
  endWeek: number;
  endYear: number;

  /**
   * True when the platform owns the title long-term (e.g. a platform Original).
   *
   * When false, expired contracts should stop implying "this title is on that platform".
   */
  persistentRights?: boolean;

  // Financial terms
  upfrontPayment: number;
  episodeRate?: number; // for series
  performanceBonus: {
    viewershipThreshold: number;
    bonusAmount: number;
  }[];

  // Performance expectations
  expectedViewers: number;
  expectedCompletionRate: number; // percentage
  expectedSubscriberGrowth: number;

  // Contract status
  status: 'active' | 'fulfilled' | 'breached' | 'cancelled';
  performanceScore: number; // 0-100 based on meeting expectations
  renewalOptions?: {
    seasons: number;
    priceIncrease: number; // percentage
    newTerms?: Partial<StreamingContract>;
  };

  // Penalties and bonuses
  penaltyClause?: {
    minViewers: number;
    penaltyAmount: number;
  };
  exclusivityClause: boolean;
  marketingSupport: number; // additional marketing budget from platform

  /** Contract window tracking used by the headless simulation tick. */
  baselineStreamingViews?: number;
  observedTotalViews?: number;
  observedCompletionRate?: number;
  observedSubscriberGrowth?: number;
  lastEvaluatedWeek?: number;
  lastEvaluatedYear?: number;

  /** One-time settlement (bonus/penalty) applied at contract end. */
  settledWeek?: number;
  settledYear?: number;
  settledBonus?: number;
  settledPenalty?: number;
}

export interface EpisodeData {
  episodeNumber: number;
  seasonNumber: number;
  title: string;
  runtime: number; // minutes
  airDate?: {
    week: number;
    year: number;
  };
  
  // Performance metrics
  viewers: number;
  completionRate: number; // percentage who watched to end
  averageWatchTime: number; // minutes
  replayViews: number;
  
  // Ratings and reviews
  criticsScore?: number;
  audienceScore?: number;
  socialMentions?: number;
  
  // Production data
  productionCost: number;
  director?: string;
  writer?: string;
  guestStars?: string[];
  
  // Weekly tracking
  weeklyViews: number[];
  cumulativeViews: number;
  viewerRetention: number; // percentage from previous episode
}

export interface SeasonData {
  seasonNumber: number;
  totalEpisodes: number;
  episodesAired: number;
  releaseFormat: 'weekly' | 'binge' | 'batch'; // batch = 2-3 eps at once
  
  // Season performance
  averageViewers: number;
  seasonCompletionRate: number;
  seasonDropoffRate: number; // percentage who stopped watching
  
  // Production
  totalBudget: number;
  spentBudget: number;
  productionStatus: 'planning' | 'filming' | 'post-production' | 'complete';
  airingStatus?: 'airing' | 'complete';
  
  // Release schedule
  premiereDate?: {
    week: number;
    year: number;
  };
  finaleDate?: {
    week: number;
    year: number;
  };
  
  episodes: EpisodeData[];
}

export interface StreamingAnalytics {
  // Overall series performance
  totalViews: number;
  uniqueViewers: number;
  averageCompletionRate: number;
  bingeRate: number; // percentage who watch multiple episodes in one session
  
  // Demographic breakdown
  demographics: {
    ageGroup: string;
    percentage: number;
    engagement: number;
  }[];
  
  // Geographic performance
  regions: {
    region: string;
    viewers: number;
    engagement: number;
  }[];
  
  // Platform metrics
  subscriberImpact: {
    newSubscriptions: number;
    retainedSubscriptions: number;
    churnReduction: number;
  };
  
  // Social and cultural impact
  socialMedia: {
    mentions: number;
    sentiment: number; // -100 to 100
    trending: boolean;
    viralMoments: string[];
  };
  
  // Awards and recognition
  nominations: number;
  wins: number;
  industryBuzz: number; // 0-100
}

import type { Project } from './game';

export interface StreamingProject extends Project {
  // Streaming-specific fields
  streamingContract?: StreamingContract;
  seasons: SeasonData[];
  currentSeason: number;
  totalOrderedSeasons: number;
  
  // Release strategy
  releaseFormat: 'weekly' | 'binge' | 'batch';
  episodeSchedule?: {
    dayOfWeek: number; // 0-6, 0 = Sunday
    timeSlot: string; // for traditional broadcasters
  };
  
  // Performance tracking
  streamingAnalytics: StreamingAnalytics;
  renewalStatus: 'none' | 'under-consideration' | 'renewed' | 'cancelled';
  
  // Marketing specific to streaming
  trailerCampaigns: {
    type: 'teaser' | 'season' | 'episode' | 'character';
    releaseWeek: number;
    releaseYear: number;
    buzz: number;
    cost: number;
  }[];
  
  influencerCampaigns: {
    influencerTier: 'micro' | 'macro' | 'celebrity';
    reach: number;
    cost: number;
    engagement: number;
  }[];
  
  // Platform-specific features
  platformFeatures: {
    interactiveElements: boolean;
    behindTheScenes: boolean;
    directorCommentary: boolean;
    multiLanguageDubbing: string[]; // language codes
    accessibility: boolean;
  };
}

// TV-specific marketing campaigns
export interface TVMarketingCampaign {
  id: string;
  type: 'season-trailer' | 'episode-promos' | 'character-spotlights' | 'behind-scenes' | 
        'social-campaign' | 'influencer-partnership' | 'premiere-event' | 'fan-engagement' |
        'cross-promotion' | 'international-rollout';
  name: string;
  description: string;
  baseCost: number;
  buzzMultiplier: number;
  audienceReach: number;
  duration: number; // weeks
  platformSpecific?: boolean; // only available for streaming projects
  viewershipBonus: number; // direct impact on first week views
  retentionBonus: number; // impact on completion rates
}

// Enhanced streaming metrics for weekly updates
export interface WeeklyStreamingMetrics {
  week: number;
  year: number;
  newViews: number;
  completionRate: number;
  averageWatchTime: number;
  subscriberGrowth: number;
  socialMentions: number;
  competitorComparison: {
    rank: number; // 1-10 on platform that week
    genreRank: number;
    totalShows: number;
  };
}