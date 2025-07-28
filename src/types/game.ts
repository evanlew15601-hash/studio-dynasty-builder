// Studio Magnate Core Game Types

export interface Studio {
  id: string;
  name: string;
  reputation: number;
  budget: number;
  founded: number;
  specialties: Genre[];
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

export interface TalentPerson {
  id: string;
  name: string;
  type: 'actor' | 'director' | 'writer' | 'producer' | 'cinematographer' | 'editor' | 'composer';
  age: number;
  gender?: string;
  experience: number;
  reputation: number;
  marketValue: number;
  traits?: string[];
  specialties?: Genre[];
  genres: Genre[];
  contractStatus: 'available' | 'contracted' | 'exclusive' | 'retired';
  salary?: number;
  awards?: string[];
  careerStage?: 'unknown' | 'rising' | 'established' | 'veteran' | 'legend';
  personality?: PersonalityTrait[];
  relationships?: { [personId: string]: RelationshipType };
  availabilityCalendar?: DateRange[];
  availability: DateRange;
  agent?: string;
  currentContractWeeks?: number;
  weeklyOverhead?: number;
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
  status: 'development' | 'pre-production' | 'production' | 'post-production' | 'marketing' | 'release' | 'distribution' | 'archived' | 'released' | 'filming' | 'completed' | 'ready-for-marketing' | 'ready-for-release';
  postTheatricalEligible?: boolean;
  theatricalEndDate?: Date;
  metrics: ProjectMetrics;
  phaseDuration: number; // weeks remaining in current phase
  contractedTalent: ContractedTalent[];
  developmentProgress: DevelopmentProgress;
  marketingCampaign?: MarketingCampaign;
  releaseStrategy?: ReleaseStrategy;
  releaseWeek?: number;
  releaseYear?: number;
  postTheatricalReleases?: PostTheatricalRelease[];
  readyForMarketing?: boolean;
  readyForRelease?: boolean;
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
  metaCriticScore?: number;
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

export interface GameState {
  studio: Studio;
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
}

export interface EventChoice {
  text: string;
  consequences: EventConsequence[];
  requirements?: EventRequirement[];
}

export interface EventConsequence {
  type: 'budget' | 'reputation' | 'talent-relationship' | 'market-share' | 'technology-access';
  impact: number;
  description: string;
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
  releaseDate: Date;
  revenue: number;
  weeklyRevenue: number;
  weeksActive: number;
  status: 'planned' | 'active' | 'declining' | 'ended';
  cost: number;
}