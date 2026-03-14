import { MediaItem, MediaEvent, MediaSource, TalentPerson, Project, Studio } from '@/types/game';
import type { ModBundle } from '@/types/modding';
import { applyPatchesToRecord, getPatchesForEntity } from '@/utils/modding';
import { getModBundle } from '@/utils/moddingStore';
import { MediaSourceGenerator } from '@/data/MediaSourceGenerator';

export class MediaContentGenerator {
  private static headlines = {
    casting_announcement: [
      "{ActorName} Joins {FilmTitle} in {Role} Role",
      "EXCLUSIVE: {ActorName} Cast in {StudioName}'s {FilmTitle}",
      "{FilmTitle} Lands {ActorName} for Key Role", 
      "Breaking: {ActorName} Signs On for {FilmTitle}",
      "{StudioName} Announces {ActorName} Casting in {FilmTitle}"
    ],
    production_start: [
      "{FilmTitle} Begins Production with {ActorName}",
      "Cameras Roll on {StudioName}'s {FilmTitle}",
      "{FilmTitle} Production Officially Underway",
      "{ActorName} Spotted on {FilmTitle} Set",
      "FIRST LOOK: {FilmTitle} Production Begins"
    ],
    production_wrap: [
      "{FilmTitle} Wraps Production Ahead of Schedule",
      "{StudioName} Announces Production Wrap on {FilmTitle}",
      "It's a Wrap: Cast and Crew Finish Work on {FilmTitle}",
      "{FilmTitle} Completes Filming with {ActorName} in the Lead",
      "Final Scene Shot on {FilmTitle} as Production Concludes"
    ],
    release: [
      "Now Playing: {FilmTitle} Opens in Theaters",
      "First Reactions: {FilmTitle} Draws {ReceptionHook}",
      "{StudioName} Releases {FilmTitle} Nationwide",
      "Opening Weekend: {FilmTitle} Arrives for Audiences",
      "New Release Spotlight: {FilmTitle}"
    ],
    box_office: [
      "Box Office: {FilmTitle} Posts ${Amount}M — {BoxOfficeOutcome}",
      "{FilmTitle} Surprises with ${Amount}M Debut",
      "{FilmTitle} Stumbles with ${Amount}M Opening",
      "Box Office Report: {FilmTitle} Lands with {ReceptionHook}",
      "Audiences Turn Out for {FilmTitle}: ${Amount}M Weekend"
    ],
    award_nomination: [
      "Awards Buzz: {FilmTitle} Scores {AwardName} Nomination",
      "{ActorName} Nominated for {AwardName}",
      "{StudioName} Celebrates {AwardName} Nomination for {FilmTitle}",
      "Nomination Watch: {FilmTitle} in the Running",
      "Awards Season: {FilmTitle} Gains Momentum"
    ],
    award_win: [
      "{ActorName} Wins {AwardName} for {FilmTitle}",
      "{FilmTitle} Takes Home {AwardName} Award",
      "WINNER: {ActorName} Honored for {FilmTitle} Performance",
      "{AwardName} Goes to {FilmTitle}'s {ActorName}",
      "{StudioName}'s {FilmTitle} Wins {AwardName}"
    ],
    scandal: [
      "SCANDAL: {ActorName} Involved in {ScandalType}",
      "{ActorName} Under Fire for {ScandalType}",
      "BREAKING: {ActorName} {ScandalType} Rocks Hollywood",
      "{ActorName} Faces Backlash Over {ScandalType}",
      "CONTROVERSY: {ActorName} in Hot Water"
    ],
    rumor: [
      "RUMOR: {ActorName} and {StudioName} at Odds?",
      "Sources Say {ActorName} Unhappy with {FilmTitle}",
      "Is {ActorName} Leaving {StudioName}?",
      "Whispers: {FilmTitle} Facing Production Issues",
      "Inside Sources: {ActorName} Demands Changes"
    ],
    leak: [
      "LEAK: New Details About {FilmTitle} Emerge Online",
      "Leaked Materials Reveal More About {FilmTitle}",
      "Online Leak Sparks Chatter Around {FilmTitle}",
      "Behind-the-Scenes Leak Hits Social Media",
      "Leaked Info Fuels Speculation Around {FilmTitle}"
    ],
    interview: [
      "{ActorName} Opens Up in Candid New Interview",
      "In Conversation with {ActorName} About Career and Craft",
      "{ActorName} Talks Future Projects and Creative Risks",
      "Behind the Scenes with {ActorName}",
      "Spotlight: {ActorName} Reflects on Recent Work"
    ],
    exclusive: [
      "Exclusive: {ActorName} Teases Mysterious New Project",
      "Exclusive Q&A with {ActorName}",
      "Exclusive: Inside the World of {ActorName}",
      "Exclusive Feature: How {ActorName} Chooses Roles",
      "Exclusive Sit-Down with {ActorName}"
    ]
  };

  private static contentTemplates = {
    casting_announcement: [
      "{StudioName} has officially announced that {ActorName} will star in the upcoming {Genre} film {FilmTitle}. The {CareerStage} actor, known for {PreviousWork}, is expected to bring {Qualities} to the role.",
      "In a move that has excited fans, {ActorName} has joined the cast of {FilmTitle}. The {StudioName} production will showcase {ActorName}'s range in this {Genre} project.",
      "{ActorName} is set to headline {StudioName}'s {FilmTitle}, marking a significant collaboration between the {CareerStage} talent and the studio. Filming is expected to begin {TimeFrame}."
    ],
    production_start: [
      "Principal photography has begun on {StudioName}'s {FilmTitle}, with {ActorName} and the cast now in production. The {Genre} film is being shot on location in {Location}.",
      "{FilmTitle} officially started filming this week, with {ActorName} spotted on set for the first time. The {StudioName} production has a budget of {Budget} and is expected to wrap {TimeFrame}.",
      "Cameras are rolling on {FilmTitle} as {StudioName} begins production on their latest {Genre} project. {ActorName} leads an ensemble cast in what promises to be {Description}."
    ],
    production_wrap: [
      "After weeks of work, {FilmTitle} has officially wrapped production. {StudioName} confirmed the news as {ActorName} and the team completed final scenes in {Location}.",
      "The {Genre} project {FilmTitle} has finished filming. Insiders say post-production is now underway with an eye toward release {TimeFrame}.",
      "With principal photography complete, {StudioName}'s {FilmTitle} moves into post-production. {ActorName} is expected to begin promotional duties {TimeFrame}."
    ],
    release: [
      "{FilmTitle} has officially opened, with audiences turning out across the country. {StudioName} is positioning the {Genre} release as a key title for the season. {ReceptionSummary}",
      "The {Genre} film {FilmTitle} arrives in theaters this week. Early reactions point to {ReceptionHook}, with critics at {CriticsScore}/100 and audiences at {AudienceScore}/100.",
      "Now in theaters, {FilmTitle} represents {StudioName}'s latest bid for mainstream success. The film carries a reported budget of {Budget}. {ReceptionSummary}"
    ],
    box_office: [
      "{FilmTitle} opened to ${Amount}M domestically, making it {BoxOfficeOutcome} for {StudioName}. {ReceptionSummary}",
      "With ${Amount}M in ticket sales, {FilmTitle} is tracking as {BoxOfficeOutcome} against its {Budget} budget. Critics delivered {CriticsVerdict} ({CriticsScore}/100) while audiences report {AudienceVerdict} ({AudienceScore}/100).",
      "After a ${Amount}M debut, questions are swirling about {FilmTitle}'s legs. Reviews have been {CriticsVerdict}, and audience response is {AudienceVerdict} so far."
    ],
    award_nomination: [
      "Awards season momentum builds as {FilmTitle} earns a {AwardName} nomination. Industry watchers see the {Genre} project as a strong contender.",
      "With a {AwardName} nomination in hand, {ActorName} and {StudioName} are expected to ramp up their campaign efforts in the coming weeks.",
      "{StudioName} received a boost today with news that {FilmTitle} landed a {AwardName} nomination, fueling renewed attention from voters."
    ],
    award_win: [
      "Celebrations erupted as {FilmTitle} took home {AwardName}. {StudioName} called the win a testament to the team's work and {ActorName}'s performance.",
      "{ActorName} accepted {AwardName} for their work on {FilmTitle}, thanking collaborators and hinting at future projects.",
      "The {Genre} film {FilmTitle} was honored with {AwardName}, solidifying its status as a standout title of the year."
    ],
    scandal: [
      "A new controversy has erupted involving {ActorName}, with reports centered on {ScandalType}. Representatives declined to comment as the story spread rapidly.",
      "Social media is ablaze after claims about {ActorName} surfaced. Industry observers say the situation could affect upcoming projects if it escalates.",
      "The industry is reacting to fresh allegations tied to {ScandalType}. While details remain unconfirmed, the backlash is growing."
    ],
    rumor: [
      "Speculation is building around {ActorName}, with sources hinting at behind-the-scenes tension. Insiders say the situation could impact future collaborations.",
      "Whispers in the industry suggest {ActorName} may be weighing a major move. No official statements have been made, but chatter continues.",
      "Rumors are circulating that {FilmTitle} may face changes. While the studio has offered no confirmation, sources say discussions are ongoing."
    ],
    leak: [
      "Leaked materials tied to {FilmTitle} have surfaced online, prompting a wave of speculation. {StudioName} has not issued an official response.",
      "New leaked details about {FilmTitle} spread quickly across social platforms. Fans are dissecting every frame and line of dialogue.",
      "A behind-the-scenes leak has fueled new theories about {FilmTitle}. Industry sources say tighter security may follow on future productions."
    ],
    interview: [
      "{ActorName} sat down to discuss their recent work, long-term goals, and how they choose new roles in an ever-changing industry.",
      "In a wide-ranging conversation, {ActorName} reflected on their path through Hollywood, creative influences, and upcoming collaborations.",
      "Speaking candidly, {ActorName} shared stories from set, thoughts on the state of the industry, and what fans can expect next."
    ],
    exclusive: [
      "In an exclusive feature, {ActorName} offers a behind-the-scenes look at life on and off set, sharing how they balance fame and craft.",
      "This exclusive profile of {ActorName} explores their most iconic performances, favorite collaborators, and the risks that defined their career.",
      "Our exclusive access with {ActorName} reveals new details about upcoming projects and the personal milestones that keep them grounded."
    ]
  };

  private static getPatchedHeadlines(mods?: ModBundle): Record<string, string[]> {
    const bundle = mods ?? getModBundle();
    const patches = getPatchesForEntity(bundle, 'mediaHeadlineTemplates');
    return applyPatchesToRecord(this.headlines as any, patches) as any;
  }

  private static getPatchedContentTemplates(mods?: ModBundle): Record<string, string[]> {
    const bundle = mods ?? getModBundle();
    const patches = getPatchesForEntity(bundle, 'mediaContentTemplates');
    return applyPatchesToRecord(this.contentTemplates as any, patches) as any;
  }

  static getBaseHeadlineTemplates(): Record<string, string[]> {
    return this.headlines as any;
  }

  static getBaseContentTemplates(): Record<string, string[]> {
    return this.contentTemplates as any;
  }

  static generateMediaItem(
    event: MediaEvent,
    entities: {
      studios?: Studio[];
      talent?: TalentPerson[];
      projects?: Project[];
    },
    mods?: ModBundle
  ): MediaItem {
    const source = MediaSourceGenerator.getSourceForEvent(event.type, false, mods);
    const sentiment = this.determineSentiment(event, source);
    const type = this.mapEventToMediaType(event.type);

    return {
      id: `media_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      source,
      type,
      headline: this.generateHeadline(event, entities, source, mods),
      content: this.generateContent(event, entities, source, sentiment, mods),
      publishDate: {
        week: event.week,
        year: event.year
      },
      targets: event.entities,
      sentiment,
      impact: this.calculateImpact(source, sentiment, event.priority),
      tags: this.generateTags(event, entities),
      relatedEvents: [event.id]
    };
  }

  private static mapEventToMediaType(eventType: string): MediaItem['type'] {
    switch (eventType) {
      case 'scandal': return 'rumor';
      case 'interview': return 'interview';
      case 'leak': return 'leak';
      case 'rumor': return 'rumor';
      default: return 'news';
    }
  }

  private static determineSentiment(event: MediaEvent, source: MediaSource): 'positive' | 'neutral' | 'negative' {
    let baseSentiment = 0;

    const project = event.eventData?.project as Project | undefined;
    const earnings = typeof event.eventData?.earnings === 'number' ? event.eventData.earnings : undefined;

    const criticsScore = typeof project?.metrics?.criticsScore === 'number' ? project.metrics.criticsScore : undefined;
    const audienceScore = typeof project?.metrics?.audienceScore === 'number' ? project.metrics.audienceScore : undefined;

    const budgetTotal = project?.budget?.total ?? project?.script?.budget;
    const ratio = budgetTotal && earnings ? earnings / budgetTotal : undefined;

    // Event type influences sentiment
    switch (event.type) {
      case 'award_win':
        baseSentiment = 80;
        break;
      case 'box_office': {
        // Hits and bombs matter; opening-vs-budget is a coarse but useful signal.
        if (typeof ratio === 'number') {
          if (ratio >= 0.35) baseSentiment = 75;
          else if (ratio >= 0.18) baseSentiment = 40;
          else if (ratio >= 0.10) baseSentiment = 10;
          else baseSentiment = -35;
        } else {
          baseSentiment = 40;
        }
        break;
      }
      case 'award_nomination':
        baseSentiment = 50;
        break;
      case 'release': {
        const avg = (criticsScore ?? 65) * 0.6 + (audienceScore ?? 65) * 0.4;
        if (avg >= 75) baseSentiment = 55;
        else if (avg >= 60) baseSentiment = 25;
        else baseSentiment = -5;
        break;
      }
      case 'casting_announcement':
      case 'production_start':
      case 'production_wrap':
        baseSentiment = 35;
        break;
      case 'scandal':
      case 'leak':
        baseSentiment = -60;
        break;
      case 'rumor':
        baseSentiment = -20;
        break;
      default:
        baseSentiment = 0;
    }

    // Apply source bias
    baseSentiment += source.bias;

    // Add random variance
    baseSentiment += (Math.random() - 0.5) * 40;

    if (baseSentiment > 20) return 'positive';
    if (baseSentiment < -20) return 'negative';
    return 'neutral';
  }

  private static generateHeadline(
    event: MediaEvent,
    entities: any,
    source: MediaSource,
    mods?: ModBundle
  ): string {
    const headlines = this.getPatchedHeadlines(mods);
    const byType = headlines[event.type];
    const fallback = headlines.casting_announcement || this.headlines.casting_announcement;
    const templates = Array.isArray(byType) && byType.length ? byType : fallback;
    const template = templates[Math.floor(Math.random() * templates.length)];
    
    return this.replaceVariables(template, event, entities);
  }

  private static generateContent(
    event: MediaEvent,
    entities: any,
    source: MediaSource,
    sentiment: 'positive' | 'neutral' | 'negative',
    mods?: ModBundle
  ): string {
    const templatesByType = this.getPatchedContentTemplates(mods);
    const byType = templatesByType[event.type];
    const fallback = templatesByType.casting_announcement || this.contentTemplates.casting_announcement;
    const templates = Array.isArray(byType) && byType.length ? byType : fallback;
    const template = templates[Math.floor(Math.random() * templates.length)];
    
    let content = this.replaceVariables(template, event, entities);
    
    // Add sentiment-based conclusion
    if (sentiment === 'positive') {
      content += " Industry insiders are optimistic about the project's potential.";
    } else if (sentiment === 'negative') {
      content += " Some industry observers have expressed concerns about the announcement.";
    }
    
    return content;
  }

  private static replaceVariables(template: string, event: MediaEvent, entities: any): string {
    let result = template;

    const actor = entities.talent?.[0] ?? (event.eventData?.talent as TalentPerson | undefined);
    const studio = entities.studios?.[0];
    const project = entities.projects?.[0] ?? (event.eventData?.project as Project | undefined);

    const awardName = event.eventData?.award || event.eventData?.awardName;
    const scandalType = event.eventData?.scandalType || event.eventData?.title;
    const earnings = typeof event.eventData?.earnings === 'number' ? event.eventData.earnings : undefined;

    const budgetTotal = project?.budget?.total ?? project?.script?.budget;
    const budgetText = budgetTotal ? `${(budgetTotal / 1000000).toFixed(1)}M` : 'a sizeable budget';

    const criticsScoreNum = typeof project?.metrics?.criticsScore === 'number' ? Math.round(project.metrics.criticsScore) : 70;
    const audienceScoreNum = typeof project?.metrics?.audienceScore === 'number' ? Math.round(project.metrics.audienceScore) : 72;

    const criticsVerdict = (() => {
      if (criticsScoreNum >= 85) return 'rave reviews';
      if (criticsScoreNum >= 70) return 'strong reviews';
      if (criticsScoreNum >= 55) return 'mixed reviews';
      return 'poor reviews';
    })();

    const audienceVerdict = (() => {
      if (audienceScoreNum >= 85) return 'glowing enthusiasm';
      if (audienceScoreNum >= 70) return 'strong enthusiasm';
      if (audienceScoreNum >= 55) return 'mixed reactions';
      return 'muted interest';
    })();

    const receptionHook = (() => {
      if (criticsScoreNum >= 80 && audienceScoreNum >= 80) return 'rave reviews and strong buzz';
      if (criticsScoreNum >= 80 && audienceScoreNum < 65) return 'rave reviews but divided audiences';
      if (criticsScoreNum < 65 && audienceScoreNum >= 80) return 'mixed reviews but strong audience buzz';
      if (criticsScoreNum < 60 && audienceScoreNum < 60) return 'rough reviews and a lukewarm response';
      return `${criticsVerdict} and ${audienceVerdict}`;
    })();

    const receptionSummary = (() => {
      if (!project?.metrics?.criticsScore && !project?.metrics?.audienceScore) {
        return 'Early reviews and audience reaction are still coming into focus.';
      }

      return `Critics have landed on ${criticsVerdict} (${criticsScoreNum}/100), while audiences are showing ${audienceVerdict} (${audienceScoreNum}/100).`;
    })();

    const boxOfficeOutcome = (() => {
      const amountM = typeof earnings === 'number' ? earnings / 1_000_000 : undefined;

      if (typeof amountM !== 'number') return 'a notable debut';

      const ratio = budgetTotal ? earnings! / budgetTotal : undefined;

      if (typeof ratio === 'number') {
        if (ratio >= 0.40) return 'a breakout hit';
        if (ratio >= 0.22) return 'a strong opening';
        if (ratio >= 0.12) return 'a modest start';
        if (ratio >= 0.08) return 'a soft opening';
        return 'a box office bomb';
      }

      if (amountM >= 80) return 'a breakout hit';
      if (amountM >= 35) return 'a strong opening';
      if (amountM >= 18) return 'a modest start';
      if (amountM >= 10) return 'a soft opening';
      return 'a box office bomb';
    })();

    const replacements: Record<string, string> = {
      ActorName: actor?.name ?? 'a leading star',
      CareerStage: actor?.careerStage ?? 'established',
      PreviousWork: 'previous acclaimed performances',
      Qualities: 'depth and authenticity',

      StudioName: studio?.name ?? project?.studioName ?? 'the studio',

      FilmTitle: project?.title ?? 'the upcoming project',
      Genre: project?.script?.genre ?? 'drama',
      Budget: budgetText,

      Role: 'leading',
      Amount: earnings ? (earnings / 1000000).toFixed(1) : (Math.random() * 50 + 10).toFixed(1),
      Location: 'Los Angeles',
      TimeFrame: 'later this year',
      Description: 'an engaging story',
      AwardName: awardName || 'Best Actor',
      ScandalType: scandalType || 'controversial statements',

      CriticsScore: `${criticsScoreNum}`,
      AudienceScore: `${audienceScoreNum}`,
      CriticsVerdict: criticsVerdict,
      AudienceVerdict: audienceVerdict,
      ReceptionHook: receptionHook,
      ReceptionSummary: receptionSummary,
      BoxOfficeOutcome: boxOfficeOutcome,
    };

    const tokenPattern = (key: string) => {
      const spaced = key.replace(/([a-z])([A-Z])/g, '$1 $2');
      const tokens = spaced.split(/\s+/).filter(Boolean);
      const inner = tokens
        .map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        .join('[ _-]*');
      return new RegExp(`\\{\\s*${inner}\\s*\\}`, 'gi');
    };

    for (const [key, value] of Object.entries(replacements)) {
      const rx = tokenPattern(key);
      result = result.replace(rx, () => value);
    }

    // Ensure we never leak raw {Placeholders} into the UI (including modded variants).
    result = result.replace(/\{[^}]*\}/g, '');

    // Normalize punctuation/whitespace after placeholder cleanup.
    result = result.replace(/\s{2,}/g, ' ');
    result = result.replace(/\s+([,.;:!?])/g, '$1');
    result = result.trim();

    return result;
  }

  private static calculateImpact(
    source: MediaSource,
    sentiment: 'positive' | 'neutral' | 'negative',
    priority: string
  ) {
    const baseReach = source.reach;
    const credibility = source.credibility;
    
    const priorityMultiplier = {
      'low': 0.5,
      'medium': 1.0,
      'high': 1.5,
      'breaking': 2.0
    }[priority] || 1.0;
    
    const intensityBase = sentiment === 'neutral' ? 30 : 60;
    
    return {
      reach: Math.round(baseReach * priorityMultiplier),
      credibility: credibility,
      virality: Math.round((baseReach + credibility) / 2 * priorityMultiplier),
      intensity: Math.round(intensityBase * priorityMultiplier)
    };
  }

  private static generateTags(event: MediaEvent, entities: any): string[] {
    const tags: string[] = [event.type, this.mapEventToMediaType(event.type)];

    const project = entities.projects?.[0] as Project | undefined;
    const genre = project?.script?.genre;
    if (genre) tags.push(genre);

    if (event.type === 'box_office') {
      const earnings = typeof event.eventData?.earnings === 'number' ? event.eventData.earnings : undefined;
      const budgetTotal = project?.budget?.total ?? project?.script?.budget;
      const ratio = budgetTotal && earnings ? earnings / budgetTotal : undefined;

      if (typeof ratio === 'number') {
        if (ratio >= 0.22) tags.push('hit');
        else if (ratio < 0.08) tags.push('bomb');
        else tags.push('mid');
      }
    }

    if (event.type === 'release' && project?.metrics) {
      const criticsScore = typeof project.metrics.criticsScore === 'number' ? project.metrics.criticsScore : undefined;
      const audienceScore = typeof project.metrics.audienceScore === 'number' ? project.metrics.audienceScore : undefined;

      if (typeof criticsScore === 'number') {
        if (criticsScore >= 80) tags.push('critics-rave');
        else if (criticsScore < 55) tags.push('critics-panned');
      }

      if (typeof audienceScore === 'number') {
        if (audienceScore >= 80) tags.push('audience-loved');
        else if (audienceScore < 55) tags.push('audience-rejected');
      }
    }

    return Array.from(new Set(tags));
  }
}
