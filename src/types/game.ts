// Studio Magnate Core Game Types

import type { SeasonData, StreamingContract } from './streamingTypes';

// Franchise System Types
export interface Franchise {
  id: string;
  title: string;
  originDate: string; // YYYY-MM-DD
  creatorStudioId: string;
  genre: Genre[];
  tone: 'dark' | 'light' | 'pulpy' | 'serious' | 'comedic' | 'epic';
  parodySource?: string; // Internal identity key for role sets + dedupe (not necessarily player-facing)
  /** Optional, player-facing "Inspired by …" label. If absent, UI should not display inspiration info. */
  inspirationLabel?: string;
  /** Optional, lore-only: what kind of property this franchise originated as. */
  originMedium?: 'film' | 'tv' | 'novel' | 'comic' | 'game' | 'toyline' | 'animation' | 'other';
  entries: string[]; // Film IDs in this franchise
  status: 'active' | 'dormant' | 'rebooted' | 'retired';
  franchiseTags: string[];
  culturalWeight: number; // 0-100, affects buzz and marketing
  lastEntryDate?: string;
  totalBoxOffice?: number;
  averageRating?: number;
  merchandisingPotential?: number;
  fanbaseSize?: number;
  criticalFatigue?: number; // 0-100, increases with poor sequels
  description?: string; // Bio/background for player familiarity
  cost: number; // Cost to license/use franchise based on cultural weight
}

// Public Domain System Types
export interface PublicDomainIP {
  id: string;
  name: string;
  domainType: 'literature' | 'mythology' | 'folklore' | 'historical' | 'religious';
  dateEnteredDomain: string; // YYYY-MM-DD
  coreElements: string[]; // Key characters, themes, settings
  genreFlexibility: Genre[]; // What genres this can work in
  notableAdaptations: string[]; // Film IDs of previous adaptations
  reputationScore: number; // 0-100, how iconic/recognizable
  adaptationFatigue?: number; // 0-100, increases with overuse
  lastAdaptationDate?: string;
  culturalRelevance?: number; // Changes over time
  requiredElements?: string[]; // Core elements that must be present
  suggestedCharacters?: ScriptCharacter[];
  description?: string; // Bio/background for player familiarity
  cost: number; // Always 0 for public domain
}

export interface Loan {
  id: string;
  amount: number;
  interestRate: number;
  termWeeks: number;
  weeklyPayment: number;
  remainingBalance: number;
  weeksRemaining: number;
  missedPayments: number;
  status: 'active' | 'paid' | 'defaulted';
}

export interface Studio {
  id: string;
  name: string;
  reputation: number;
  budget: number;
  founded: number;
  loans?: Loan[];
  specialties: Genre[];
  debt?: number;
  lastProjectWeek?: number;
  weeksSinceLastProject?: number;
  awards?: StudioAward[];
  awardsThisYear?: number;
  prestige?: number; // 0-100, separate from reputation
  // Worldbuilding / lore (player-facing)
  personality?: string;
  businessTendency?: string;
  brandIdentity?: string;
  biography?: string;
  releaseFrequency?: number;
  riskTolerance?: 'conservative' | 'moderate' | 'aggressive';
}

export type Gender = 'Male' | 'Female';

export type Race =
  | 'White'
  | 'Black'
  | 'Asian'
  | 'Latino'
  | 'Middle Eastern'
  | 'Indigenous'
  | 'Mixed'
  | 'Other';

export interface ScriptCharacter {
  id: string;
  name: string;
  description?: string;
  importance: 'lead' | 'supporting' | 'minor' | 'crew';
  traits?: string[];
  relationships?: { characterId: string; relationship: string }[];
  assignedTalentId?: string;
  requiredType?: 'actor' | 'director';
  ageRange?: [number, number];
  requiredGender?: Gender;
  requiredRace?: Race;
  requiredNationality?: string;
  // Franchise/IP linkage for imported roles
  franchiseId?: string; // Global franchise this role belongs to (immutable linkage)
  franchiseCharacterId?: string; // Stable character_id from franchise DB
  roleTemplateId?: string; // Template mapping for casting/awards
  locked?: boolean; // Prevent accidental deletion for imported characters
  localOverrides?: Partial<Pick<ScriptCharacter, 'name' | 'description' | 'traits' | 'ageRange' | 'requiredGender' | 'requiredRace' | 'requiredNationality'>>; // Stored separately from global DB
}

export interface TalentPerson {
  id: string;
  name: string;
  type: 'actor' | 'director' | 'writer' | 'producer' | 'cinematographer' | 'editor' | 'composer';
  age: number;
  gender?: Gender;
  race?: Race;
  nationality?: string;
  experience: number;
  reputation: number;
  marketValue: number;
  traits?: string[];
  specialties?: Genre[];
  genres: Genre[];
  contractStatus: 'available' | 'contracted' | 'exclusive' | 'retired' | 'busy';
  busyUntilWeek?: number;
  salary?: number;
  awards?: TalentAward[];
  careerStage?: 'unknown' | 'rising' | 'established' | 'veteran' | 'legend';
  personality?: PersonalityTrait[];
  relationships?: { [personId: string]: RelationshipType };
  /** Optional: player-facing notes to enrich relationships beyond a single enum. */
  relationshipNotes?: { [personId: string]: string };
  availabilityCalendar?: DateRange[];
  availability: DateRange;
  agent?: TalentAgent;
  currentContractWeeks?: number;
  weeklyOverhead?: number;
  // Worldbuilding / lore (player-facing)
  archetype?: string;
  narratives?: string[];
  movementTags?: string[];
  careerStartYear?: number;
  quirks?: string[];
  isNotable?: boolean;
  // Enhanced talent properties
  biography?: string;
  /** Absolute week index (year * 52 + week) of last credited release. */
  lastWorkWeek?: number;
  retired?: { year: number; week: number; reason: 'age' | 'burnout' | 'inactivity' | 'scandal' | 'unknown' };
  careerEvolution?: CareerEvent[];
  publicImage?: number; // 0-100, separate from reputation
  scandals?: Scandal[];
  // Director-specific properties
  directingStyle?: string;
  temperament?: string;
  budgetApproach?: string;
  avgCriticalScore?: number;
  avgBoxOfficeMultiplier?: number;
  // Advanced talent management
  burnoutLevel?: number; // 0-100, higher = more tired
  studioLoyalty?: { [studioId: string]: number }; // 0-100 loyalty per studio
  chemistry?: { [talentId: string]: number }; // -100 to 100 chemistry with other talent
  futureHolds?: TalentHold[]; // Pre-contracts and reservations
  recentProjects?: string[]; // Last 5 project IDs for burnout tracking
  // Fame & filmography
  fame?: number; // 0-100 star power that affects box office
  filmography?: Array<{
    projectId: string;
    title: string;
    role: string;
    year?: number;
    boxOffice?: number;
  }>;
}

export interface Script {
  id: string;
  title: string;
  genre: Genre;
  logline: string;
  writer: string;
  pages: number;
  quality: number;
  budget: number;
  developmentStage: 'concept' | 'treatment' | 'first-draft' | 'polish' | 'final';
  themes: string[];
  targetAudience: 'general' | 'mature' | 'teen' | 'family';
  estimatedRuntime: number;
  characteristics: ScriptCharacteristics;
  characters?: ScriptCharacter[];
  sourceType?: 'original' | 'franchise' | 'public-domain' | 'adaptation';
  franchiseId?: string;
  publicDomainId?: string;
}

export interface ScriptCharacteristics {
  tone: 'dark' | 'light' | 'balanced' | 'satirical' | 'dramatic';
  pacing: 'slow-burn' | 'fast-paced' | 'episodic' | 'steady';
  dialogue: 'naturalistic' | 'stylized' | 'witty' | 'philosophical';
  visualStyle: 'realistic' | 'stylized' | 'minimal' | 'epic';
  commercialAppeal: number; // 1-10
  criticalPotential: number; // 1-10
  cgiIntensity: 'practical' | 'minimal' | 'moderate' | 'heavy';
}



export interface CareerEvent {
  week: number;
  year: number;
  type: 'breakthrough' | 'comeback' | 'retirement' | 'scandal' | 'award' | 'flop';
  description: string;
  impactOnReputation: number;
  impactOnMarketValue: number;
  /** Optional: source project that caused this event (for idempotence + UI drilldown). */
  sourceProjectId?: string;
}

export interface Scandal {
  id: string;
  type: 'personal' | 'professional' | 'legal' | 'social';
  severity: 'minor' | 'moderate' | 'major' | 'career-ending';
  description: string;
  weekOccurred: number;
  yearOccurred: number;
  resolved: boolean;
  reputationImpact: number;
  marketValueImpact: number;
}

export interface TalentTrait {
  id: string;
  name: string;
  description: string;
  type: 'positive' | 'negative' | 'neutral';
  impact: TraitImpact;
}

export interface TraitImpact {
  budgetModifier?: number;
  qualityModifier?: number;
  timeModifier?: number;
  genreBonus?: Genre[];
  audienceAppeal?: number;
  criticalReception?: number;
}

export interface PersonalityTrait {
  name: string;
  intensity: number; // 1-5
  description: string;
}

export interface ProductionRole {
  talentId: string;
  role: string;
  salary: number;
  points?: number;
  contractTerms: {
    duration: Date;
    exclusivity: boolean;
    merchandising: boolean;
    sequelOptions: number;
  };
}

export interface ContractTerms {
  duration: number; // in months
  exclusivity: boolean;
  backendPoints?: number;
  bonusClause?: string;
  creativeControl?: number; // 1-10 scale
}

export interface Project {
  id: string;
  title: string;
  script: Script;
  type: 'feature' | 'series' | 'limited-series' | 'documentary';
  currentPhase: ProductionPhase;
  budget: ProjectBudget;
  cast: ProductionRole[];
  crew: ProductionRole[];
  timeline: ProjectTimeline;
  locations: Location[];
  distributionStrategy: DistributionStrategy;
  status: 'development' | 'pre-production' | 'production' | 'post-production' | 'marketing' | 'release' | 'distribution' | 'archived' | 'released' | 'filming' | 'completed' | 'ready-for-marketing' | 'ready-for-release' | 'scheduled-for-release';
  postTheatricalEligible?: boolean;
  theatricalEndDate?: Date;
  metrics: ProjectMetrics;
  phaseDuration: number; // weeks remaining in current phase
  studioName?: string; // For AI projects, tracks which studio produced it
  contractedTalent: ContractedTalent[];
  developmentProgress: DevelopmentProgress;
  marketingCampaign?: MarketingCampaign;
  awardsCampaign?: AwardsCampaign;
  releaseStrategy?: ReleaseStrategy;
  releaseWeek?: number;
  releaseYear?: number;
  scheduledReleaseWeek?: number;
  scheduledReleaseYear?: number;
  hasReleasedPostTheatrical?: boolean;
  postTheatricalRevenue?: number;
  releaseDate?: string;
  postTheatricalReleases?: PostTheatricalRelease[];
  readyForMarketing?: boolean;
  readyForRelease?: boolean;
  // Franchise & Public Domain Integration
  franchiseId?: string; // If part of a franchise
  franchisePosition?: number; // Which entry in the franchise (1, 2, 3...)
  publicDomainId?: string; // If adapting public domain IP
  adaptationType?: 'faithful' | 'modern' | 'reimagined' | 'parody'; // How it adapts the source
  legacyBonus?: number; // Marketing/buzz bonus from franchise/PD recognition
  sequelPotential?: number; // 0-100, how likely this is to spawn sequels
  // Casting confirmation & star power
  castingConfirmed?: boolean;
  starPowerBonus?: number; // 0.0-0.5 multiplier added to box office from cast fame
  // Marketing system data
  marketingData?: {
    currentBuzz: number;
    totalSpent: number;
    campaigns: Array<{
      type: string;
      cost: number;
      buzz: number;
      week: number;
      year: number;
    }>;
  };
  // TV / Streaming-specific fields (optional)
  seasons?: SeasonData[];
  currentSeason?: number;
  totalOrderedSeasons?: number;
  /**
   * Episode count for the current season.
   *
   * This is used as the primary source of truth by TV episode + deal systems.
   * If absent, systems fall back to seasons[] metadata or legacy heuristics.
   */
  episodeCount?: number;
  releaseFormat?: 'weekly' | 'binge' | 'batch';
  /**
   * Optional streaming premiere deal information for direct-to-streaming film releases.
   * This is signed before release and used to determine the launch platform and advance payment.
   */
  streamingPremiereDeal?: {
    providerId: string;
    signedWeek: number;
    signedYear: number;
    upfrontPayment: number;
    marketingSupport: number;
  };

  /**
   * Optional streaming contract information for TV/streaming projects.
   * This is used by the StreamingContractSystem and saved as part of GameState.
   */
  streamingContract?: StreamingContract;
}

export interface ProjectBudget {
  total: number;
  allocated: BudgetAllocation;
  spent: BudgetAllocation;
  overages: BudgetAllocation;
}

export interface BudgetAllocation {
  aboveTheLine: number; // talent, director, producer
  belowTheLine: number; // crew, equipment
  postProduction: number;
  marketing: number;
  distribution: number;
  contingency: number;
}

export interface ProjectTimeline {
  preProduction: DateRange;
  principalPhotography: DateRange;
  postProduction: DateRange;
  release: Date;
  milestones: Milestone[];
}

export interface Milestone {
  name: string;
  date: Date;
  completed: boolean;
  dependencies: string[];
}

export interface Location {
  id: string;
  name: string;
  type: 'studio' | 'practical' | 'backlot' | 'international';
  cost: number;
  availability: DateRange[];
  logistics: LocationLogistics;
}

export interface LocationLogistics {
  crewAccommodation: boolean;
  equipmentRental: boolean;
  permits: string[];
  weatherRisk: number; // 1-10
  accessibilityRating: number; // 1-10
}

export interface DistributionStrategy {
  primary: DistributionChannel;
  international: DistributionChannel[];
  windows: ReleaseWindow[];
  marketingBudget: number;
  targetOpeningWeekend?: number;
  expectedStreams?: number;
}

export interface DistributionChannel {
  platform: string;
  type: 'theatrical' | 'streaming' | 'vod' | 'television' | 'festival';
  revenue: RevenueModel;
  exclusivityPeriod?: number;
}

export interface RevenueModel {
  type: 'box-office' | 'licensing' | 'subscription-share' | 'per-view';
  studioShare: number; // percentage
  minimumGuarantee?: number;
}

export interface ReleaseWindow {
  platform: string;
  startDate: Date;
  exclusivityDays: number;
}

export interface ProjectMetrics {
  boxOfficeTotal?: number;
  streamingViews?: number;
  criticsScore?: number;
  audienceScore?: number;
  awards?: string[];
  socialMediaMentions?: number;
  internationalSales?: number;
  inTheaters?: boolean;
  theaterCount?: number;
  boxOfficeStatus?: string;
  lastWeeklyRevenue?: number;
  weeksSinceRelease?: number;
  theatricalRunLocked?: boolean;
  lastWeeklyReport?: any;
  boxOffice?: BoxOfficeMetrics;
  streaming?: StreamingMetrics;
  critical?: CriticalMetrics;
  culturalImpact?: number;
  totalRevenue?: number;
  // Enhanced financial tracking
  financials?: ProjectFinancials;
  // Optional: lightweight public-facing metadata for league-shared releases.
  sharedDirectorName?: string;
  sharedTopCastNames?: string[];
  sharedFranchiseTitle?: string;
  sharedPublicDomainName?: string;
}

export interface ProjectFinancials {
  totalCosts: number;
  totalRevenue: number;
  netProfit: number;
  profitMargin: number; // percentage
  roi: number; // return on investment percentage
  costBreakdown: CostBreakdown;
  revenueBreakdown: RevenueBreakdown;
  weeklyProfitHistory: WeeklyProfitData[];
  paybackWeek?: number; // week when project became profitable
  currentStatus: 'loss' | 'breakeven' | 'profit';
}

export interface CostBreakdown {
  development: number;
  preProduction: number;
  production: number;
  postProduction: number;
  marketing: number;
  distribution: number;
  talent: number;
  overhead: number;
  contingency: number;
  total: number;
}

export interface RevenueBreakdown {
  boxOffice: number;
  international: number;
  streaming: number;
  licensing: number;
  merchandise: number;
  awards: number;
  total: number;
}

export interface WeeklyProfitData {
  week: number;
  year: number;
  weeklyRevenue: number;
  weeklyCosts: number;
  weeklyProfit: number;
  cumulativeProfit: number;
}

export interface BoxOfficeMetrics {
  openingWeekend: number;
  domesticTotal: number;
  internationalTotal: number;
  production: number;
  marketing: number;
  profit: number;
  theaters: number;
  weeks: number;
}

export interface StreamingMetrics {
  viewsFirstWeek: number;
  totalViews: number;
  completionRate: number;
  audienceShare: number;
  watchTimeHours: number;
  subscriberGrowth: number;
}

export interface CriticalMetrics {
  criticIndexScore?: number;
  audienceScore?: number;
  criticsConsensus: string;
  controversies?: string[];
  culturalMoments?: string[];
}

export interface Award {
  name: string;
  category: string;
  year: number;
  won: boolean;
  ceremony: string;
  prestige: number; // 1-10
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface ContractedTalent {
  talentId: string;
  role: string;
  weeklyPay: number;
  contractWeeks: number;
  weeksRemaining: number;
  startWeek: number;
}

export interface DevelopmentProgress {
  scriptCompletion: number; // 0-100%
  budgetApproval: number; // 0-100%
  talentAttached: number; // 0-100%
  locationSecured: number; // 0-100%
  completionThreshold: number; // percentage needed to advance
  issues: DevelopmentIssue[];
}

export interface DevelopmentIssue {
  id: string;
  type: 'budget' | 'creative' | 'talent' | 'location' | 'legal';
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  weeksToResolve: number;
  cost?: number;
  reputationImpact?: number;
  ignored?: boolean;
  ignoredWeeks?: number;
  consequences?: IssueConsequence[];
}

export interface Producer extends TalentPerson {
  producerType: 'executive' | 'line' | 'creative' | 'associate';
  specialTraits: ProducerTrait[];
}

export interface ProducerTrait {
  name: string;
  description: string;
  effect: ProducerEffect;
}

export interface ProducerEffect {
  scoutingBonus?: number;
  budgetEfficiency?: number;
  talentAttraction?: number;
  crisisManagement?: number;
  genreSpecialty?: Genre[];
}

export type Genre = 
  | 'action' | 'adventure' | 'comedy' | 'drama' | 'horror' | 'thriller'
  | 'romance' | 'sci-fi' | 'fantasy' | 'documentary' | 'animation'
  | 'musical' | 'western' | 'war' | 'biography' | 'crime' | 'mystery'
  | 'superhero' | 'family' | 'sports' | 'historical';

export type ProductionPhase = 
  | 'development' | 'pre-production' | 'production' | 'post-production' | 'marketing' | 'release' | 'distribution';

export type RelationshipType = 
  | 'professional' | 'friendly' | 'romantic' | 'rivals' | 'mentor-mentee' | 'hostile';

// Advanced Talent Management Types
export interface TalentAgent {
  id: string;
  name: string;
  agency: string;
  powerLevel: number; // 1-10, affects negotiation strength
  commission: number; // Percentage taken from deals
  specialties: Genre[];
  clientList: string[]; // Talent IDs
  reputation: number;
  connectionStrength: number; // Ability to get priority deals
}

export interface TalentHold {
  id: string;
  talentId: string;
  studioId: string;
  projectId?: string;
  startWeek: number;
  endWeek: number;
  year: number;
  type: 'hold' | 'pre-contract' | 'exclusive';
  terms?: {
    salary?: number;
    bonuses?: number;
    perks?: string[];
  };
  status: 'pending' | 'confirmed' | 'expired' | 'cancelled';
}

export interface ChemistryEvent {
  id: string;
  talent1Id: string;
  talent2Id: string;
  projectId: string;
  interactionType: 'positive' | 'negative' | 'neutral';
  magnitude: number; // How much it affects chemistry
  description: string;
  week: number;
  year: number;
}

export interface BurnoutCalculation {
  talentId: string;
  recentProjects: number; // Projects in last 52 weeks
  intensityScore: number; // Based on budget/pressure of recent projects
  recoveryWeeks: number; // Weeks since last project
  currentBurnout: number; // 0-100
}

// ===== COMPREHENSIVE MEDIA SYSTEM =====

export interface MediaSource {
  id: string;
  name: string;
  type: 'newspaper' | 'magazine' | 'blog' | 'social_media' | 'trade_publication' | 'tv_network';
  credibility: number; // 0-100, affects how much impact their stories have
  bias: number; // -100 to 100, affects sentiment of stories they generate
  reach: number; // 0-100, affects how many people see their stories
  specialties: Genre[]; // Which film genres they cover best
  established: number; // Year founded, affects credibility
}

export interface MediaItem {
  id: string;
  source: MediaSource;
  type: 'news' | 'review' | 'rumor' | 'interview' | 'social_post' | 'editorial' | 'leak';
  headline: string;
  content: string;
  publishDate: {
    week: number;
    year: number;
  };
  targets: {
    studios?: string[]; // Studio IDs
    talent?: string[]; // Talent IDs  
    projects?: string[]; // Project IDs
    films?: string[]; // Released film IDs
  };
  sentiment: 'positive' | 'neutral' | 'negative';
  impact: {
    reach: number; // How many people saw this
    credibility: number; // How believable it is
    virality: number; // How likely to spawn follow-up stories
    intensity: number; // How strong the sentiment is
  };
  tags: string[]; // For categorization and searching
  relatedEvents?: string[]; // IDs of game events that triggered this
}

export interface MediaEvent {
  id: string;
  type: 'casting_announcement' | 'production_start' | 'production_wrap' | 'release' | 'box_office' | 
        'award_nomination' | 'award_win' | 'scandal' | 'interview' | 'exclusive' | 'leak' | 'rumor';
  triggerType: 'automatic' | 'player_action' | 'random' | 'competitor_action';
  priority: 'low' | 'medium' | 'high' | 'breaking';
  entities: {
    studios?: string[];
    talent?: string[];
    projects?: string[];
    films?: string[];
  };
  eventData: any; // Flexible data specific to event type
  week: number;
  year: number;
  processed: boolean; // Has this generated media yet?
}

export interface MediaMemory {
  entityId: string; // Studio, talent, or project ID
  entityType: 'studio' | 'talent' | 'project' | 'film';
  reputationImpact: number; // Cumulative media impact on reputation
  sentimentHistory: Array<{
    week: number;
    year: number;
    sentiment: 'positive' | 'neutral' | 'negative';
    intensity: number;
  }>;
  majorStories: string[]; // IDs of significant media items
  currentBuzz: number; // 0-100, how much attention they're getting
  lastMajorStory?: {
    week: number;
    year: number;
    type: string;
    sentiment: 'positive' | 'neutral' | 'negative';
  };
}

export interface MediaCampaign {
  id: string;
  studioId: string;
  name: string;
  type: 'pr_boost' | 'damage_control' | 'product_placement' | 'exclusive_access' | 'social_media_blitz';
  targets: {
    projects?: string[];
    talent?: string[];
    studio?: boolean;
  };
  budget: number;
  duration: {
    startWeek: number;
    endWeek: number;
    year: number;
  };
  status: 'planned' | 'active' | 'completed' | 'cancelled';
  effectiveness: number; // 0-100, how well it's working
  generatedMedia: string[]; // IDs of media items created by this campaign
}

export interface MediaReaction {
  mediaItemId: string;
  reactionType: 'player_response' | 'automatic_consequence' | 'follow_up_story';
  action: 'deny' | 'confirm' | 'deflect' | 'counter_attack' | 'capitalize' | 'ignore';
  impact: {
    reputationChange: number;
    moraleChange: number;
    publicPerceptionChange: number;
  };
  cost?: number; // For paid responses like PR campaigns
}

export interface WorldHistoryEntry {
  id: string;
  kind:
    | 'talent_debut'
    | 'talent_breakthrough'
    | 'talent_flop'
    | 'talent_comeback'
    | 'talent_retirement'
    | 'talent_scandal'
    | 'talent_rivalry'
    | 'industry_era'
    | 'genre_shift'
    | 'award_win'
    | 'box_office_record'
    | 'studio_milestone';
  week: number;
  year: number;
  title: string;
  body: string;
  entityIds?: {
    studioIds?: string[];
    talentIds?: string[];
    projectIds?: string[];
  };
  importance?: 1 | 2 | 3 | 4 | 5;
}

export interface WorldYearbookEntry {
  id: string;
  year: number;
  title: string;
  body: string;
}

export interface PlayerLegacy {
  studioId: string;
  totalAwards: number;
  totalBoxOffice: number;
  totalReleases: number;
  bestYearByAwards?: { year: number; awards: number };
  biggestHit?: { projectId: string; title: string; boxOffice: number; year: number };
}

/**
 * Studio governance and operational constraints.
 *
 * Ownership provides authority, but capability is constrained by stakeholder pressure,
 * capital availability, and industry conditions.
 */
export interface StudioGovernance {
  /** How supportive leadership is of the current strategy (0-100). */
  boardConfidence: number;

  /** Internal constraints: your own organization pushing back. */
  internalPressure: {
    board: number;
    finance: number;
    investors: number;
  };

  /** External constraints: the industry pushing back. */
  externalPressure: {
    competition: number;
    talent: number;
    market: number;
  };

  /** What the studio can reliably execute at once. */
  capability: {
    maxActiveProjects: number;
  };

  /** Absolute week index (year * 52 + week) of last update (optional, for migrations/telemetry). */
  lastUpdatedWeekIndex?: number;
}

export interface GameState {
  /** Stable seed for worldbuilding (used to derive deterministic per-save procedural content). */
  universeSeed?: number;
  /** Current PRNG state for deterministic simulation (if using the engine tick pipeline). */
  rngState?: number;
  /** Optional: identifies how this state was created (useful for Online League rules). */
  mode?: 'single' | 'online';
  studio: Studio;
  /** Studio governance + constraint model (optional for backwards-compatible saves). */
  governance?: StudioGovernance;
  currentYear: number;
  currentWeek: number;
  currentQuarter: number;
  projects: Project[];
  talent: TalentPerson[];
  scripts: Script[];
  competitorStudios: Studio[];
  marketConditions: MarketConditions;
  eventQueue: GameEvent[];
  boxOfficeHistory: BoxOfficeWeek[];
  awardsCalendar: AwardsEvent[];
  industryTrends: IndustryTrend[];
  // Enhanced game state
  allReleases: (Project | BoxOfficeRelease)[]; // Includes AI studio releases
  topFilmsHistory: TopFilmsWeek[];
  // Long-horizon progression
  worldHistory?: WorldHistoryEntry[];
  worldYearbooks?: WorldYearbookEntry[];
  playerLegacy?: PlayerLegacy;
  // Franchise & Public Domain Systems
  franchises: Franchise[];
  publicDomainIPs: PublicDomainIP[];
  publicDomainSources?: PublicDomainIP[];
  aiStudioProjects?: Project[];
}

export interface TopFilmsWeek {
  week: number;
  year: number;
  topFilms: TopFilmEntry[];
}

export interface TopFilmEntry {
  projectId: string;
  title: string;
  studioName: string;
  weeklyGross: number;
  totalGross: number;
  position: number;
  trend: 'rising' | 'falling' | 'stable' | 'new';
  receptionTags: string[];
}

export interface BoxOfficeWeek {
  week: number;
  year: number;
  releases: BoxOfficeRelease[];
  totalRevenue: number;
}

export interface BoxOfficeRelease {
  projectId: string;
  title: string;
  studio: string;
  weeklyRevenue: number;
  totalRevenue: number;
  theaters: number;
  weekInRelease: number;
}

export interface MarketConditions {
  trendingGenres: Genre[];
  audiencePreferences: AudiencePreference[];
  economicClimate: 'boom' | 'stable' | 'recession';
  technologicalAdvances: TechAdvancement[];
  regulatoryChanges: RegulatoryChange[];
  seasonalTrends: SeasonalTrend[];
  competitorReleases: CompetitorRelease[];
  awardsSeasonActive?: boolean; // Jan-Mar boost
}

export interface AudiencePreference {
  demographic: string;
  preferredGenres: Genre[];
  platformPreference: string[];
  spendingPower: number;
}

export interface TechAdvancement {
  name: string;
  description: string;
  costImpact: number;
  qualityImpact: number;
  adoptionYear: number;
}

export interface RegulatoryChange {
  name: string;
  description: string;
  impact: 'positive' | 'negative' | 'neutral';
  affectedAreas: string[];
}

export interface GameEvent {
  id: string;
  title: string;
  description: string;
  type: 'market' | 'talent' | 'technology' | 'regulatory' | 'crisis' | 'opportunity';
  triggerDate: Date;
  choices?: EventChoice[];
  autoResolve?: boolean;
  /** Optional event payload for engine/UI systems (kept small and serializable). */
  data?: any;
}

export interface EventChoice {
  /** Stable identifier for programmatic handling (optional for legacy events). */
  id?: string;
  text: string;
  consequences: EventConsequence[];
  requirements?: EventRequirement[];
}

export interface EventConsequence {
  type: 'budget' | 'reputation' | 'talent-relationship' | 'market-share' | 'technology-access';
  impact: number;
  description: string;
  /** Optional targeting for relationship consequences. */
  target?: {
    talentId?: string;
    otherTalentId?: string;
    studioId?: string;
    projectId?: string;
  };
  /** Relationship axis to apply when type === 'talent-relationship'. */
  relationship?: 'loyalty' | 'chemistry';
}

export interface EventRequirement {
  type: 'budget' | 'reputation' | 'talent' | 'technology';
  threshold: number;
  description: string;
}

export interface MarketingCampaign {
  id: string;
  strategy: MarketingStrategy;
  budgetAllocated: number;
  budgetSpent: number;
  duration: number; // weeks
  weeksRemaining: number;
  activities: MarketingActivity[];
  buzz: number; // 0-100
  targetAudience: string[];
  effectiveness: number; // 0-100
  isActive?: boolean;
}

export interface MarketingStrategy {
  type: 'traditional' | 'digital' | 'grassroots' | 'premium' | 'festival';
  channels: MarketingChannel[];
  targeting: AudienceTargeting;
}

export interface MarketingChannel {
  name: string;
  type: 'tv' | 'digital' | 'print' | 'outdoor' | 'social' | 'events' | 'pr';
  cost: number;
  reach: number;
  effectiveness: number;
}

export interface AudienceTargeting {
  demographic: string[];
  psychographic: string[];
  geographic: string[];
  platforms: string[];
}

export interface MarketingActivity {
  id: string;
  type: 'trailer' | 'tv-spot' | 'press-junket' | 'test-screening' | 'premiere' | 'social-campaign';
  name: string;
  cost: number;
  duration: number;
  weeksRemaining: number;
  impact: MarketingImpact;
  status: 'planned' | 'active' | 'completed';
}

export interface MarketingImpact {
  buzzIncrease: number;
  audienceReach: number;
  criticalAttention: number;
  industryAwareness?: number;
  socialMedia?: number;
}

export interface ReleaseStrategy {
  type: 'wide' | 'limited' | 'platform' | 'festival' | 'streaming';
  theatersCount?: number;
  /** For direct-to-streaming premieres, identifies the platform selected via a premiere deal. */
  streamingProviderId?: string;
  premiereDate: Date;
  rolloutPlan: ReleaseRollout[];
  specialEvents: SpecialEvent[];
  pressStrategy: PressStrategy;
}

export interface ReleaseRollout {
  week: number;
  markets: string[];
  theatersAdded: number;
  marketingPush: boolean;
}

export interface SpecialEvent {
  type: 'premiere' | 'gala' | 'festival-screening' | 'press-conference';
  date: Date;
  location: string;
  cost: number;
  expectedImpact: number;
  attendees: string[];
}

export interface PressStrategy {
  embargoDate?: Date;
  reviewScreenings: number;
  pressJunkets: number;
  interviews: number;
  expectedCriticalReception: number;
}

export interface IssueConsequence {
  type: 'budget-overrun' | 'schedule-delay' | 'reputation-loss' | 'talent-dissatisfaction' | 'quality-drop';
  severity: number; // 1-10
  description: string;
  budgetImpact?: number;
  scheduleImpact?: number; // weeks
  reputationImpact?: number;
  qualityImpact?: number;
}

export interface PostTheatricalRelease {
  id: string;
  projectId: string;
  platform: 'streaming' | 'digital' | 'physical' | 'tv-licensing';
  /** Optional platform identifier for deals (e.g., streamflix) */
  providerId?: string;
  releaseDate: Date;
  revenue: number;
  weeklyRevenue: number;
  weeksActive: number;
  status: 'planned' | 'active' | 'declining' | 'ended';
  cost: number;
  durationWeeks?: number;
  lastProcessedWeek?: number;
  lastProcessedYear?: number;
}

// Awards & Recognition System Interfaces
export interface StudioAward {
  id: string;
  projectId: string;
  /** Optional: allows seeding historical awards without creating full Project objects. */
  projectTitle?: string;
  category: string;
  ceremony: string;
  year: number;
  prestige: number; // 1-10
  reputationBoost: number;
  revenueBoost?: number;
}

export interface TalentAward {
  id: string;
  talentId: string;
  projectId: string;
  /** Optional: allows seeding historical awards without creating full Project objects. */
  projectTitle?: string;
  category: string;
  ceremony: string;
  year: number;
  prestige: number; // 1-10
  reputationBoost: number;
  marketValueBoost?: number;
}

export interface AwardsEvent {
  id: string;
  name: string;
  ceremony:
    | 'Crown'
    | 'Crystal Ring'
    | 'Critics Circle'
    | 'Beacon TV'
    | 'Britannia Screen'
    | 'Performers Guild'
    | 'Directors Circle'
    | 'Writers Circle';
  category: string;
  eligibilityWeek: number; // nomination week
  ceremonyWeek: number; // awards ceremony week
  year: number;
  prestige: number; // 1-10
  eligibleProjects: string[]; // project IDs
  qualityThreshold: number; // minimum quality score needed
  genreBonus?: Genre[]; // genres that get bonus consideration
}

export interface AwardsCampaign {
  projectId: string;
  targetCategories: string[];
  budget: number;
  budgetSpent: number;
  duration: number; // weeks
  weeksRemaining: number;
  effectiveness: number; // 0-100
  activities: AwardsCampaignActivity[];
}

export interface AwardsCampaignActivity {
  type: 'screenings' | 'advertising' | 'events' | 'consultants' | 'talent-support';
  name: string;
  cost: number;
  effectivenessBoost: number;
  prestigeBoost: number;
}

// Market Competition & Trends Interfaces
export interface IndustryTrend {
  id: string;
  name: string;
  type: 'genre' | 'technology' | 'audience' | 'business';
  description: string;
  impact: TrendImpact;
  duration: number; // weeks remaining
  strength: number; // 1-10
}

export interface TrendImpact {
  affectedGenres?: Genre[];
  boxOfficeModifier?: number; // percentage change
  productionCostModifier?: number;
  audienceInterest?: number;
  criticalReception?: number;
  talentAvailability?: number;
}

export interface SeasonalTrend {
  season: 'spring' | 'summer' | 'fall' | 'winter' | 'holiday';
  weeks: number[]; // weeks of year when active
  name: string;
  description: string;
  impact: SeasonalImpact;
}

export interface SeasonalImpact {
  favoredGenres: Genre[];
  boxOfficeMultiplier: number;
  audienceSize: number; // relative audience size
  competitionLevel: number; // 1-10
}

export interface CompetitorRelease {
  id: string;
  title: string;
  studio: string;
  genre: Genre;
  budget: number;
  quality: number;
  marketing: number;
  releaseWeek: number;
  releaseYear: number;
  expectedRevenue: number;
  targetAudience: string[];
  marketingBuzz: number;
}

export interface MarketCompetition {
  weeklyReleases: CompetitorRelease[];
  genreOversaturation: { [genre: string]: number }; // 0-100
  audienceAttention: number; // 0-100, how much attention is available
  marketingNoise: number; // 0-100, how crowded the marketing space is
}

// TV Development System (matching film development patterns)
export interface TVShowScript {
  id: string;
  title: string;
  genre: string;
  format: 'sitcom' | 'drama' | 'reality' | 'documentary' | 'limited-series' | 'anthology';
  developmentStage: 'concept' | 'outline' | 'pilot-script' | 'series-bible' | 'ready-for-production';
  quality: number;
  budget: { perEpisode: number; totalSeason: number; };
  episodeCount: number;
  studioId: string;
  createdWeek: number;
  createdYear: number;
}

export interface TVShowProject {
  id: string;
  script: TVShowScript;
  currentPhase: 'pre-production' | 'production' | 'post-production' | 'ready-to-air';
  cast: Array<{ talentId: string; role: string; salary: number; }>;
  castingConfirmed: boolean;
  budget: { allocated: number; spent: number; remaining: number; };
}