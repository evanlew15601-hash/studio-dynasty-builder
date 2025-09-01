import { MediaItem, MediaEvent, MediaSource, TalentPerson, Project, Studio } from '@/types/game';
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
    box_office: [
      "{FilmTitle} Dominates Box Office with ${Amount}M Opening",
      "{FilmTitle} Exceeds Expectations with {Amount}M Weekend",
      "Box Office Report: {FilmTitle} Takes Top Spot",
      "{FilmTitle} Breaks Records with {Amount}M Opening",
      "Audiences Flock to {FilmTitle}: {Amount}M Opening Weekend"
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
    box_office: [
      "{FilmTitle} exceeded all expectations this weekend, earning ${Amount}M domestically. The {StudioName} film benefited from strong word-of-mouth and {ActorName}'s star power.",
      "Audiences responded enthusiastically to {FilmTitle}, driving the film to a ${Amount}M opening weekend. {StudioName} executives are calling it a major success for the studio.",
      "With ${Amount}M in ticket sales, {FilmTitle} has proven that {Genre} films still have strong appeal. {ActorName}'s performance is being credited as a major draw."
    ]
  };

  static generateMediaItem(
    event: MediaEvent,
    entities: {
      studios?: Studio[];
      talent?: TalentPerson[];
      projects?: Project[];
    }
  ): MediaItem {
    const source = MediaSourceGenerator.getSourceForEvent(event.type);
    const sentiment = this.determineSentiment(event, source);
    
    return {
      id: `media_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      source,
      type: 'news', // Simplified for now
      headline: this.generateHeadline(event, entities, source),
      content: this.generateContent(event, entities, source, sentiment),
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
    
    // Event type influences sentiment
    switch (event.type) {
      case 'award_win':
      case 'box_office':
        baseSentiment = 70;
        break;
      case 'casting_announcement':
      case 'production_start':
        baseSentiment = 40;
        break;
      case 'scandal':
        baseSentiment = -80;
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
    source: MediaSource
  ): string {
    const templates = this.headlines[event.type as keyof typeof this.headlines] || this.headlines.casting_announcement;
    const template = templates[Math.floor(Math.random() * templates.length)];
    
    return this.replaceVariables(template, event, entities);
  }

  private static generateContent(
    event: MediaEvent,
    entities: any,
    source: MediaSource,
    sentiment: 'positive' | 'neutral' | 'negative'
  ): string {
    const templates = this.contentTemplates[event.type as keyof typeof this.contentTemplates] || this.contentTemplates.casting_announcement;
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
    
    // Replace actor names
    if (entities.talent && entities.talent.length > 0) {
      const actor = entities.talent[0];
      result = result.replace(/\{ActorName\}/g, actor.name);
      result = result.replace(/\{CareerStage\}/g, actor.careerStage || 'established');
      result = result.replace(/\{PreviousWork\}/g, 'previous acclaimed performances');
      result = result.replace(/\{Qualities\}/g, 'depth and authenticity');
    }
    
    // Replace studio names
    if (entities.studios && entities.studios.length > 0) {
      const studio = entities.studios[0];
      result = result.replace(/\{StudioName\}/g, studio.name);
    }
    
    // Replace project/film titles
    if (entities.projects && entities.projects.length > 0) {
      const project = entities.projects[0];
      result = result.replace(/\{FilmTitle\}/g, project.title || 'Untitled Project');
      result = result.replace(/\{Genre\}/g, project.script?.genre || 'drama');
      result = result.replace(/\{Budget\}/g, `$${(project.budget?.total || 1000000) / 1000000}M`);
    }
    
    // Replace generic variables
    result = result.replace(/\{Role\}/g, 'leading');
    result = result.replace(/\{Amount\}/g, (Math.random() * 50 + 10).toFixed(1));
    result = result.replace(/\{Location\}/g, 'Los Angeles');
    result = result.replace(/\{TimeFrame\}/g, 'later this year');
    result = result.replace(/\{Description\}/g, 'an engaging story');
    result = result.replace(/\{AwardName\}/g, 'Best Actor');
    result = result.replace(/\{ScandalType\}/g, 'controversial statements');
    
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
    const validTags: string[] = [
      'scandal', 'rumor', 'award_win', 'box_office', 'casting_announcement', 
      'interview', 'production_start', 'production_wrap', 'release', 
      'award_nomination', 'exclusive', 'leak'
    ];
    
    const tags = [event.type];
    
    // Only add tags that are in the valid list
    if (entities.projects && entities.projects.length > 0) {
      const genre = entities.projects[0].script?.genre;
      if (genre && validTags.includes(genre)) {
        tags.push(genre);
      }
    }
    
    return tags;
  }
}