import React, { useState, useEffect } from 'react';
import { GameState, TalentPerson, Studio } from '@/types/game';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { User, Building, Star, Award, Calendar, Heart } from 'lucide-react';

interface TalentBiographyProps {
  gameState: GameState;
}

export interface TalentBiography {
  talentId: string;
  earlyLife: string;
  careerBeginnings: string;
  breakthrough: string;
  personalLife: string;
  methodology: string; // Acting/directing approach
  influences: string[];
  controversies?: string[];
  philanthropy?: string[];
  trivia: string[];
  signature: string; // What they're known for
  catchphrase?: string;
  personalTraits: string[];
  relationships: {
    type: 'mentor' | 'rival' | 'collaborator' | 'romantic' | 'family';
    talentId: string;
    description: string;
  }[];
}

export interface StudioLore {
  studioId: string;
  founded: number;
  founder: string;
  headquarters: string;
  corporatePhilosophy: string;
  signature: string; // What they're known for
  majorMilestones: {
    year: number;
    event: string;
    impact: string;
  }[];
  executiveHistory: {
    name: string;
    role: string;
    tenure: [number, number]; // start year, end year (0 = current)
    legacy: string;
  }[];
  controversies?: {
    year: number;
    incident: string;
    resolution: string;
  }[];
  culturalImpact: string[];
  rivalries: {
    studioId: string;
    studioName: string;
    nature: string;
    since: number;
  }[];
  subsidiaries: string[];
  distributionReach: string[];
}

const generateTalentBiography = (talent: TalentPerson): TalentBiography => {
  const isActor = talent.type === 'actor';
  const isDirector = talent.type === 'director';
  
  const earlyLifeTemplates = [
    `Born in a small town, ${talent.name} discovered their passion for ${isActor ? 'performing' : 'storytelling'} at an early age.`,
    `Growing up in an artistic family, ${talent.name} was exposed to ${isActor ? 'theater and film' : 'cinema and literature'} from childhood.`,
    `${talent.name} had humble beginnings, working various jobs before pursuing their dream in entertainment.`,
    `From a military family, ${talent.name} brought discipline and structure to their ${isActor ? 'acting' : 'directing'} approach.`,
    `${talent.name} grew up fascinated by classic films, studying the masters of ${isActor ? 'performance' : 'cinema'}.`
  ];

  const careerBeginningsTemplates = [
    `Started with small roles in independent films and television commercials.`,
    `Began their career in theater, honing their craft on stage before transitioning to film.`,
    `Got their break through a talent agent who spotted them in a local production.`,
    `Worked as an assistant to established ${isDirector ? 'directors' : 'actors'} before stepping into the spotlight.`,
    `Self-taught through film school and countless auditions in their early twenties.`
  ];

  const breakthroughTemplates = [
    `Their breakthrough came with a critically acclaimed performance that showcased their range and depth.`,
    `A chance meeting with a renowned producer led to their first major studio role.`,
    `Their unique ${isActor ? 'acting style' : 'directorial vision'} caught the attention of industry veterans.`,
    `A viral audition tape led to their career-defining opportunity.`,
    `Their persistence paid off when they landed a role that perfectly matched their ${isActor ? 'acting abilities' : 'creative vision'}.`
  ];

  const personalLifeTemplates = [
    `Known for maintaining privacy, ${talent.name} prefers to let their work speak for itself.`,
    `An advocate for various charitable causes, particularly those supporting young artists.`,
    `Enjoys ${['reading', 'traveling', 'painting', 'music', 'sports'][Math.floor(Math.random() * 5)]} in their spare time.`,
    `Family-oriented, often speaks about the importance of work-life balance.`,
    `Known for their sense of humor and down-to-earth personality despite their success.`
  ];

  const methodologyTemplates = isActor ? [
    'Practices method acting, fully immersing themselves in character psychology.',
    'Believes in extensive character research and preparation before filming.',
    'Known for improvisational skills and natural, spontaneous performances.',
    'Focuses on emotional truth and authentic character portrayal.',
    'Combines classical training with modern acting techniques.'
  ] : [
    'Favors collaborative filmmaking with emphasis on actor preparation.',
    'Known for meticulous pre-production planning and storyboarding.',
    'Believes in practical effects combined with cutting-edge technology.',
    'Emphasizes character development and narrative depth in all projects.',
    'Known for creating immersive, atmospheric filmmaking experiences.'
  ];

  const influencesTemplates = isActor ? [
    ['Evelyn Hartwell', 'Marcus Sterling', 'Noah Blackwood'],
    ['Camilla Ashford', 'Dominic Grayson', 'Isabella Montrose'],
    ['Rosalind Fairfax', 'Julian Lancaster', 'Genevieve Sinclair'],
    ['Theodore Carrington', 'Sophia Underwood', 'Vincent Wellington']
  ] : [
    ['Adrian Hawthorne', 'Beatrice Kensington', 'Harrison Beaumont'],
    ['Delphine Yorke', 'Gabriel Ingram', 'Penelope Rothwell'],
    ['Felix Thornton', 'Aurora Prescott', 'Oliver Morrison'],
    ['Xavier Vanderbilt', 'Helena Everett', 'Quinn Oakley']
  ];

  const triviaTemplates = [
    `Turned down several major roles early in their career that later became iconic.`,
    `Has a photographic memory for dialogue and rarely needs more than one take.`,
    `Speaks multiple languages fluently and often does their own translations.`,
    `Started as a ${isActor ? 'stunt double' : 'script supervisor'} before their current role.`,
    `Has a collection of vintage film equipment that they use for personal projects.`,
    `Known for extensive charity work that they prefer to keep private.`,
    `Has never watched their own films due to personal superstition.`
  ];

  const signatureTemplates = isActor ? [
    'Intense, psychologically complex character portrayals',
    'Versatile performances across multiple genres',
    'Natural charisma and screen presence',
    'Emotional depth and vulnerability in dramatic roles',
    'Perfect comic timing and improvisational skills'
  ] : [
    'Visually stunning cinematography and composition',
    'Complex, morally ambiguous storytelling',
    'Innovative use of sound and music in narrative',
    'Character-driven stories with ensemble casts',
    'Blending of practical and digital effects'
  ];

  const personalTraitsTemplates = [
    ['perfectionist', 'collaborative', 'intuitive'],
    ['dedicated', 'passionate', 'methodical'],
    ['innovative', 'empathetic', 'resilient'],
    ['detail-oriented', 'charismatic', 'authentic'],
    ['versatile', 'professional', 'inspiring']
  ];

  const reputation = talent.reputation || 50;
  const experienceLevel = reputation > 80 ? 'veteran' : reputation > 60 ? 'established' : 'emerging';

  return {
    talentId: talent.id,
    earlyLife: earlyLifeTemplates[Math.floor(Math.random() * earlyLifeTemplates.length)],
    careerBeginnings: careerBeginningsTemplates[Math.floor(Math.random() * careerBeginningsTemplates.length)],
    breakthrough: breakthroughTemplates[Math.floor(Math.random() * breakthroughTemplates.length)],
    personalLife: personalLifeTemplates[Math.floor(Math.random() * personalLifeTemplates.length)],
    methodology: methodologyTemplates[Math.floor(Math.random() * methodologyTemplates.length)],
    influences: influencesTemplates[Math.floor(Math.random() * influencesTemplates.length)],
    trivia: [
      triviaTemplates[Math.floor(Math.random() * triviaTemplates.length)],
      triviaTemplates[Math.floor(Math.random() * triviaTemplates.length)]
    ],
    signature: signatureTemplates[Math.floor(Math.random() * signatureTemplates.length)],
    personalTraits: personalTraitsTemplates[Math.floor(Math.random() * personalTraitsTemplates.length)],
    relationships: [] // Would be populated based on game history
  };
};

const generateStudioLore = (studio: Studio): StudioLore => {
  const foundedYear = 1920 + Math.floor(Math.random() * 80);
  
  const founderNames = [
    'Marcus Goldberg', 'Vincent Sterling', 'Eleanor Hartwell', 'David Rothschild',
    'Catherine Monroe', 'Alexander Kane', 'Isabella Cross', 'Theodore Blackwood'
  ];

  const headquarters = [
    'Los Angeles, California', 'New York City, New York', 'Burbank, California',
    'Century City, California', 'Hollywood, California', 'Santa Monica, California'
  ];

  const philosophies = [
    'Creating timeless stories that resonate across generations',
    'Pushing the boundaries of cinematic innovation and artistry', 
    'Championing diverse voices and bold storytelling',
    'Building lasting relationships with talent and audiences',
    'Combining commercial success with artistic integrity',
    'Fostering creative collaboration in all productions'
  ];

  const signatures = [
    'Epic blockbusters with groundbreaking visual effects',
    'Character-driven dramas with A-list ensemble casts',
    'Genre-defining films that shape popular culture',
    'International co-productions and cross-cultural stories',
    'Prestige pictures that dominate awards season',
    'Family-friendly entertainment with broad appeal'
  ];

  const milestones = [
    { year: foundedYear + 5, event: 'First major box office success', impact: 'Established studio credibility' },
    { year: foundedYear + 15, event: 'Expansion into television production', impact: 'Diversified revenue streams' },
    { year: foundedYear + 25, event: 'Launch of international distribution', impact: 'Global market penetration' },
    { year: foundedYear + 35, event: 'Crown Award for Best Picture', impact: 'Industry prestige recognition' },
    { year: foundedYear + 45, event: 'Digital streaming platform launch', impact: 'Technology adaptation leadership' }
  ];

  const executives = [
    {
      name: founderNames[Math.floor(Math.random() * founderNames.length)],
      role: 'Founder & CEO',
      tenure: [foundedYear, foundedYear + 30] as [number, number],
      legacy: 'Established the studio\'s creative vision and business foundation'
    },
    {
      name: founderNames[Math.floor(Math.random() * founderNames.length)],
      role: 'President of Production',
      tenure: [foundedYear + 20, foundedYear + 45] as [number, number],
      legacy: 'Oversaw the studio\'s golden age of filmmaking'
    },
    {
      name: founderNames[Math.floor(Math.random() * founderNames.length)],
      role: 'Chief Creative Officer',
      tenure: [foundedYear + 40, 0] as [number, number],
      legacy: 'Leading the studio\'s digital transformation and modern content strategy'
    }
  ];

  const culturalImpacts = [
    'Pioneered new filmmaking techniques that became industry standard',
    'Launched the careers of numerous Crown Award winners',
    'Created film franchises that defined popular culture',
    'Championed diversity and inclusion in Hollywood',
    'Established scholarship programs for emerging filmmakers'
  ];

  return {
    studioId: studio.id,
    founded: foundedYear,
    founder: founderNames[Math.floor(Math.random() * founderNames.length)],
    headquarters: headquarters[Math.floor(Math.random() * headquarters.length)],
    corporatePhilosophy: philosophies[Math.floor(Math.random() * philosophies.length)],
    signature: signatures[Math.floor(Math.random() * signatures.length)],
    majorMilestones: milestones.slice(0, 3 + Math.floor(Math.random() * 3)),
    executiveHistory: executives,
    culturalImpact: culturalImpacts.slice(0, 2 + Math.floor(Math.random() * 3)),
    rivalries: [], // Would be populated based on game competition
    subsidiaries: ['Distribution Division', 'Television Productions', 'International Holdings'],
    distributionReach: ['North America', 'Europe', 'Asia-Pacific', 'Latin America']
  };
};

export const TalentBiographySystem: React.FC<TalentBiographyProps> = ({ gameState }) => {
  const [talentBiographies, setTalentBiographies] = useState<Map<string, TalentBiography>>(new Map());
  const [studioLore, setStudioLore] = useState<Map<string, StudioLore>>(new Map());
  const [selectedTalent, setSelectedTalent] = useState<TalentPerson | null>(null);
  const [selectedStudio, setSelectedStudio] = useState<Studio | null>(null);

  // Generate biographies for top talent
  useEffect(() => {
    const topTalent = gameState.talent
      .filter(t => (t.reputation || 0) > 60)
      .sort((a, b) => (b.reputation || 0) - (a.reputation || 0))
      .slice(0, 50);

    setTalentBiographies((prev) => {
      const next = new Map(prev);
      topTalent.forEach(talent => {
        if (!next.has(talent.id)) {
          next.set(talent.id, generateTalentBiography(talent));
        }
      });
      return next;
    });

    // Generate studio lore
    setStudioLore((prev) => {
      const next = new Map(prev);
      if (!next.has(gameState.studio.id)) {
        next.set(gameState.studio.id, generateStudioLore(gameState.studio));
      }
      return next;
    });
  }, [gameState.talent, gameState.studio]);

  const getMostPopularActors = () => gameState.talent
    .filter(t => t.type === 'actor')
    .sort((a, b) => (b.reputation || 0) - (a.reputation || 0))
    .slice(0, 10);

  const getMostPopularDirectors = () => gameState.talent
    .filter(t => t.type === 'director')
    .sort((a, b) => (b.reputation || 0) - (a.reputation || 0))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Studio Lore */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            {gameState.studio.name} - Studio Legacy
          </CardTitle>
        </CardHeader>
        <CardContent>
          {studioLore.has(gameState.studio.id) && (
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Corporate Philosophy</h4>
                <p className="text-muted-foreground">{studioLore.get(gameState.studio.id)?.corporatePhilosophy}</p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Known For</h4>
                <p className="text-muted-foreground">{studioLore.get(gameState.studio.id)?.signature}</p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Major Milestones</h4>
                <div className="space-y-2">
                  {studioLore.get(gameState.studio.id)?.majorMilestones.slice(0, 3).map((milestone, index) => (
                    <div key={index} className="p-2 border rounded">
                      <p className="font-medium">{milestone.year}: {milestone.event}</p>
                      <p className="text-sm text-muted-foreground">{milestone.impact}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top Actors */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            Most Popular Actors
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {getMostPopularActors().map((actor, index) => (
              <div 
                key={actor.id}
                className="p-3 border rounded cursor-pointer hover:bg-muted/50"
                onClick={() => setSelectedTalent(actor)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-muted-foreground">#{index + 1}</span>
                    <span className="font-medium">{actor.name}</span>
                  </div>
                  <Badge variant="outline">{actor.reputation || 0}/100</Badge>
                </div>
                {talentBiographies.has(actor.id) && (
                  <p className="text-sm text-muted-foreground">
                    Known for: {(actor.archetype || talentBiographies.get(actor.id)?.signature)}
                  </p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top Directors */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Most Popular Directors
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {getMostPopularDirectors().map((director, index) => (
              <div 
                key={director.id}
                className="flex items-center justify-between p-3 border rounded cursor-pointer hover:bg-muted/50"
                onClick={() => setSelectedTalent(director)}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-muted-foreground">#{index + 1}</span>
                  <div>
                    <p className="font-medium">{director.name}</p>
                    {talentBiographies.has(director.id) && (
                      <p className="text-sm text-muted-foreground">
                        {(director.archetype || talentBiographies.get(director.id)?.signature)}
                      </p>
                    )}
                  </div>
                </div>
                <Badge variant="outline">{director.reputation || 0}/100</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Talent Biography Detail */}
      {selectedTalent && talentBiographies.has(selectedTalent.id) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {selectedTalent.name} - Biography
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Player-facing industry profile (uses seeded lore when available) */}
              <div>
                <h4 className="font-semibold mb-2">Industry Profile</h4>
                <div className="space-y-2">
                  {selectedTalent.archetype && (
                    <p className="text-muted-foreground">{selectedTalent.archetype}</p>
                  )}

                  {(selectedTalent.narratives || []).length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {(selectedTalent.narratives || []).slice(0, 6).map((n, i) => (
                        <Badge key={i} variant="outline">{n}</Badge>
                      ))}
                    </div>
                  )}

                  {(selectedTalent.movementTags || []).length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {(selectedTalent.movementTags || []).slice(0, 6).map((t, i) => (
                        <Badge key={i} variant="secondary">{t}</Badge>
                      ))}
                    </div>
                  )}

                  {selectedTalent.biography && (
                    <p className="text-sm text-muted-foreground">{selectedTalent.biography}</p>
                  )}

                  <div className="text-sm text-muted-foreground">
                    Career start: {selectedTalent.careerStartYear || (gameState.currentYear - (selectedTalent.experience || 0))} •
                    Stage: {selectedTalent.careerStage || 'established'} •
                    Reputation: {Math.round(selectedTalent.reputation || 0)}/100
                    {selectedTalent.type === 'actor' && typeof selectedTalent.fame === 'number' ? ` • Fame: ${Math.round(selectedTalent.fame)}/100` : ''}
                  </div>
                </div>
              </div>

              {(selectedTalent.awards || []).length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-semibold mb-2">Awards</h4>
                    <div className="space-y-2">
                      {(selectedTalent.awards || [])
                        .slice()
                        .sort((a, b) => (b.year || 0) - (a.year || 0))
                        .slice(0, 6)
                        .map((a) => (
                          <div key={a.id} className="p-2 border rounded">
                            <p className="font-medium">
                              {a.year} {a.ceremony} — {a.category}
                            </p>
                            <p className="text-sm text-muted-foreground">{a.projectTitle || a.projectId}</p>
                          </div>
                        ))}
                    </div>
                  </div>
                </>
              )}

              {(selectedTalent.filmography || []).length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-semibold mb-2">Career Highlights</h4>
                    <div className="space-y-2">
                      {(selectedTalent.filmography || [])
                        .slice()
                        .sort((a, b) => (b.year || 0) - (a.year || 0))
                        .slice(0, 6)
                        .map((f) => (
                          <div key={f.projectId} className="p-2 border rounded">
                            <p className="font-medium">
                              {f.year ? `${f.year} — ` : ''}{f.title}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {f.role}
                              {typeof f.boxOffice === 'number' ? ` • ${Math.round(f.boxOffice / 1_000_000)}M` : ''}
                            </p>
                          </div>
                        ))}
                    </div>
                  </div>
                </>
              )}

              {selectedTalent.relationships && Object.keys(selectedTalent.relationships).length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-semibold mb-2">Relationships</h4>
                    <div className="space-y-2">
                      {Object.entries(selectedTalent.relationships)
                        .slice(0, 8)
                        .map(([otherId, type]) => {
                          const other = gameState.talent.find(t => t.id === otherId);
                          const note = selectedTalent.relationshipNotes?.[otherId];
                          return (
                            <div key={otherId} className="p-2 border rounded">
                              <p className="font-medium">{other?.name || otherId} — {type}</p>
                              {note && <p className="text-sm text-muted-foreground">{note}</p>}
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </>
              )}

              <Separator />

              {/* Flavor biography (procedural fallback) */}
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Early Life
                </h4>
                <p className="text-muted-foreground">{talentBiographies.get(selectedTalent.id)?.earlyLife}</p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Career Beginnings</h4>
                <p className="text-muted-foreground">{talentBiographies.get(selectedTalent.id)?.careerBeginnings}</p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Breakthrough</h4>
                <p className="text-muted-foreground">{talentBiographies.get(selectedTalent.id)?.breakthrough}</p>
              </div>

              <Separator />

              <div>
                <h4 className="font-semibold mb-2">Methodology</h4>
                <p className="text-muted-foreground">{talentBiographies.get(selectedTalent.id)?.methodology}</p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Influences</h4>
                <div className="flex flex-wrap gap-2">
                  {talentBiographies.get(selectedTalent.id)?.influences.map((influence, index) => (
                    <Badge key={index} variant="outline">{influence}</Badge>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Personal Traits</h4>
                <div className="flex flex-wrap gap-2">
                  {talentBiographies.get(selectedTalent.id)?.personalTraits.map((trait, index) => (
                    <Badge key={index} variant="secondary">{trait}</Badge>
                  ))}
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Heart className="h-4 w-4" />
                  Personal Life
                </h4>
                <p className="text-muted-foreground">{talentBiographies.get(selectedTalent.id)?.personalLife}</p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Trivia</h4>
                <ul className="space-y-1">
                  {talentBiographies.get(selectedTalent.id)?.trivia.map((fact, index) => (
                    <li key={index} className="text-sm text-muted-foreground">• {fact}</li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};