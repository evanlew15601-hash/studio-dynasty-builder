import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { GameState, Project, TalentPerson, MediaItem } from '@/types/game';
import { useGameStore } from '@/game/store';
import { MediaEngine } from './MediaEngine';
import { Newspaper, TrendingUp, MessageSquare, Eye, Users, Zap } from 'lucide-react';

interface MediaOutlet {
  id: string;
  name: string;
  type: 'mainstream' | 'tabloid' | 'trade' | 'online' | 'social';
  bias: 'positive' | 'neutral' | 'negative' | 'sensational';
  reach: number; // 1-100
  credibility: number; // 1-100
  specialty?: string[];
}

interface MediaStory {
  id: string;
  outlet: MediaOutlet;
  headline: string;
  content: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  targets: {
    studios?: string[];
    projects?: string[];
    talent?: string[];
  };
  virality: number;
  week: number;
  year: number;
  storyType: 'casting' | 'production' | 'boxoffice' | 'scandal' | 'interview' | 'review' | 'rumor';
}

interface EnhancedMediaSystemProps {
  gameState?: GameState;
  onReputationImpact?: (entityId: string, impact: number, reason: string) => void;
}

export const EnhancedMediaSystem: React.FC<EnhancedMediaSystemProps> = ({
  gameState: propGameState,
  onReputationImpact: propOnReputationImpact,
}) => {
  const storeGameState = useGameStore((s) => s.game);
  const updateReputation = useGameStore((s) => s.updateReputation);

  const gameState = propGameState ?? storeGameState;
  const onReputationImpact =
    propOnReputationImpact ?? ((entityId: string, impact: number) => {
      if (gameState && entityId === gameState.studio.id) {
        updateReputation(impact);
      }
    });
  const [recentStories, setRecentStories] = useState<MediaStory[]>([]);
  const [selectedOutlet, setSelectedOutlet] = useState<string>('all');
  const [storyFilter, setStoryFilter] = useState<string>('all');

  const studioName = gameState?.studio.name ?? 'Studio';
  const studioId = gameState?.studio.id ?? 'studio';
  const currentWeek = gameState?.currentWeek ?? 0;
  const currentYear = gameState?.currentYear ?? 0;

  const MEDIA_OUTLETS: MediaOutlet[] = [
    {
      id: 'hollywood-reporter',
      name: 'The Hollywood Reporter',
      type: 'trade',
      bias: 'neutral',
      reach: 85,
      credibility: 90,
      specialty: ['industry', 'business', 'casting']
    },
    {
      id: 'variety',
      name: 'Variety',
      type: 'trade',
      bias: 'neutral',
      reach: 80,
      credibility: 88,
      specialty: ['industry', 'reviews', 'boxoffice']
    },
    {
      id: 'entertainment-weekly',
      name: 'Entertainment Weekly',
      type: 'mainstream',
      bias: 'positive',
      reach: 75,
      credibility: 75,
      specialty: ['celebrity', 'reviews', 'interviews']
    },
    {
      id: 'tmz',
      name: 'TMZ',
      type: 'tabloid',
      bias: 'sensational',
      reach: 90,
      credibility: 45,
      specialty: ['scandal', 'celebrity', 'gossip']
    },
    {
      id: 'deadline',
      name: 'Deadline',
      type: 'trade',
      bias: 'neutral',
      reach: 70,
      credibility: 85,
      specialty: ['business', 'deals', 'production']
    },
    {
      id: 'buzzfeed',
      name: 'BuzzFeed Entertainment',
      type: 'online',
      bias: 'positive',
      reach: 85,
      credibility: 60,
      specialty: ['viral', 'social', 'lists']
    },
    {
      id: 'the-wrap',
      name: 'TheWrap',
      type: 'trade',
      bias: 'neutral',
      reach: 65,
      credibility: 80,
      specialty: ['breaking', 'analysis', 'insider']
    }
  ];

  useEffect(() => {
    if (!gameState) return;
    generateWeeklyMedia();
  }, [gameState?.currentWeek, gameState?.currentYear]);

  const generateWeeklyMedia = () => {
    if (!gameState) return;

    const newStories: MediaStory[] = [];
    
    // Generate stories based on current game events
    gameState.projects.forEach(project => {
      // Production updates
      if (project.currentPhase === 'production' && Math.random() < 0.3) {
        newStories.push(createProductionStory(project));
      }
      
      // Release coverage
      if (project.status === 'released' && Math.random() < 0.6) {
        newStories.push(createBoxOfficeStory(project));
      }
      
      // Casting news
      if (project.cast && project.cast.length > 0 && Math.random() < 0.2) {
        newStories.push(createCastingStory(project));
      }
    });

    // Generate AI studio coverage
    const aiProjects: Project[] = gameState.aiStudioProjects || [];
    aiProjects.forEach(project => {
      if (Math.random() < 0.15) { // Less frequent than player studio
        newStories.push(createAIStudioStory(project));
      }
    });

    // Random industry stories
    if (Math.random() < 0.4) {
      newStories.push(createRandomIndustryStory());
    }

    // Random talent stories
    if (Math.random() < 0.3) {
      newStories.push(createTalentStory());
    }

    setRecentStories(prev => [...newStories, ...prev].slice(0, 50)); // Keep last 50 stories
  };

  const createProductionStory = (project: Project): MediaStory => {
    const outlet = getRandomOutletByType(['trade', 'mainstream']);
    const templates = [
      `"${project.title}" Production Enters New Phase`,
      `Exclusive: Behind the Scenes of "${project.title}"`,
      `${studioName} Ramps Up Production on "${project.title}"`,
      `"${project.title}" Filming Progresses Ahead of Schedule`,
      `Inside Look: "${project.title}" Takes Shape`
    ];
    
    return {
      id: `story-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      outlet,
      headline: templates[Math.floor(Math.random() * templates.length)],
      content: generateStoryContent(project, 'production'),
      sentiment: Math.random() > 0.2 ? 'positive' : 'neutral',
      targets: {
        studios: [studioId],
        projects: [project.id]
      },
      virality: Math.floor(Math.random() * 30) + 20,
      week: currentWeek,
      year: currentYear,
      storyType: 'production'
    };
  };

  const createBoxOfficeStory = (project: Project): MediaStory => {
    const outlet = getRandomOutletByType(['trade', 'mainstream']);
    const boxOffice = project.metrics?.boxOfficeTotal || 0;
    const performance = boxOffice > project.budget.total ? 'hit' : 
                       boxOffice > project.budget.total * 0.5 ? 'modest' : 'disappointing';
    
    const templates = {
      hit: [
        `"${project.title}" Dominates Weekend Box Office`,
        `${studioName}'s "${project.title}" Exceeds Expectations`,
        `"${project.title}" Proves to be Major Success for ${studioName}`,
        `Box Office Gold: "${project.title}" Strikes Big`
      ],
      modest: [
        `"${project.title}" Opens to Solid Numbers`,
        `Steady Performance for "${project.title}" in Opening Weekend`,
        `"${project.title}" Finds Its Audience at Box Office`
      ],
      disappointing: [
        `"${project.title}" Struggles at Box Office`,
        `Disappointing Opening for ${studioName}'s "${project.title}"`,
        `"${project.title}" Fails to Connect with Audiences`
      ]
    };
    
    const sentiment = performance === 'hit' ? 'positive' : 
                     performance === 'modest' ? 'neutral' : 'negative';
    
    return {
      id: `story-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      outlet,
      headline: templates[performance][Math.floor(Math.random() * templates[performance].length)],
      content: generateBoxOfficeContent(project, performance),
      sentiment,
      targets: {
        studios: [studioId],
        projects: [project.id]
      },
      virality: performance === 'hit' ? Math.floor(Math.random() * 40) + 40 : 
                performance === 'disappointing' ? Math.floor(Math.random() * 50) + 30 : 
                Math.floor(Math.random() * 25) + 15,
      week: currentWeek,
      year: currentYear,
      storyType: 'boxoffice'
    };
  };

  const createCastingStory = (project: Project): MediaStory => {
    if (!gameState) return createRandomIndustryStory();

    const outlet = getRandomOutletByType(['trade', 'mainstream', 'online']);
    const castMember = project.cast[Math.floor(Math.random() * project.cast.length)];
    const talent = gameState.talent.find(t => t.id === castMember.talentId);
    
    if (!talent) return createRandomIndustryStory(); // Fallback
    
    const templates = [
      `${talent.name} Joins "${project.title}" Cast`,
      `Exclusive: ${talent.name} Set to Star in "${project.title}"`,
      `${studioName} Lands ${talent.name} for "${project.title}"`,
      `Casting Coup: ${talent.name} Signs On for "${project.title}"`
    ];
    
    return {
      id: `story-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      outlet,
      headline: templates[Math.floor(Math.random() * templates.length)],
      content: generateCastingContent(project, talent),
      sentiment: 'positive',
      targets: {
        studios: [studioId],
        projects: [project.id],
        talent: [talent.id]
      },
      virality: Math.floor(talent.reputation / 2) + Math.floor(Math.random() * 20),
      week: currentWeek,
      year: currentYear,
      storyType: 'casting'
    };
  };

  const createAIStudioStory = (project: Project): MediaStory => {
    const outlet = getRandomOutletByType(['trade']);
    const studioName = project.studioName || 'AI Studio';
    const genre = project.script?.genre || (project as any).genre || 'drama';
    const templates = [
      `${studioName} Announces "${project.title}"`,
      `"${project.title}" Production Underway at ${studioName}`,
      `${studioName} Moves Forward with "${project.title}"`
    ];
    
    return {
      id: `story-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      outlet,
      headline: templates[Math.floor(Math.random() * templates.length)],
      content: `${studioName} continues its production slate with "${project.title}", a ${genre} film. The project represents the studio's ongoing commitment to diverse storytelling.`,
      sentiment: 'neutral',
      targets: {
        projects: [project.id]
      },
      virality: Math.floor(Math.random() * 15) + 10,
      week: currentWeek,
      year: currentYear,
      storyType: 'production'
    };
  };

  const createRandomIndustryStory = (): MediaStory => {
    const outlet = getRandomOutletByType(['trade', 'online']);
    const templates = [
      'Industry Analysis: Trends Shaping Hollywood',
      'Box Office Report: Weekly Roundup',
      'Streaming Wars: Latest Developments',
      'Awards Season Buzz Building',
      'Technology in Film: Latest Innovations'
    ];
    
    return {
      id: `story-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      outlet,
      headline: templates[Math.floor(Math.random() * templates.length)],
      content: 'Industry insiders discuss the latest trends and developments affecting the entertainment landscape.',
      sentiment: 'neutral',
      targets: {},
      virality: Math.floor(Math.random() * 20) + 10,
      week: currentWeek,
      year: currentYear,
      storyType: 'interview'
    };
  };

  const createTalentStory = (): MediaStory => {
    if (!gameState || gameState.talent.length === 0) return createRandomIndustryStory();

    const talent = gameState.talent[Math.floor(Math.random() * gameState.talent.length)];
    const outlet = getRandomOutletByType(['tabloid', 'mainstream', 'online']);
    
    const storyTypes = outlet.type === 'tabloid' ? ['scandal', 'rumor'] : ['interview', 'profile'];
    const storyType = storyTypes[Math.floor(Math.random() * storyTypes.length)];
    
    const templates = {
      interview: [
        `Exclusive Interview: ${talent.name} Opens Up`,
        `${talent.name} Discusses Upcoming Projects`,
        `In Conversation with ${talent.name}`
      ],
      scandal: [
        `${talent.name} Sparks Controversy`,
        `Drama Surrounds ${talent.name}`,
        `${talent.name} Under Fire`
      ],
      rumor: [
        `Rumors Swirl Around ${talent.name}`,
        `${talent.name} Spotted at Exclusive Event`,
        `Is ${talent.name} Planning Something Big?`
      ]
    };
    
    const sentiment = storyType === 'scandal' ? 'negative' : 
                     storyType === 'rumor' ? 'neutral' : 'positive';
    
    return {
      id: `story-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      outlet,
      headline: templates[storyType as keyof typeof templates][Math.floor(Math.random() * templates[storyType as keyof typeof templates].length)],
      content: generateTalentContent(talent, storyType),
      sentiment,
      targets: {
        talent: [talent.id]
      },
      virality: Math.floor(talent.reputation / 3) + Math.floor(Math.random() * 30),
      week: currentWeek,
      year: currentYear,
      storyType: storyType as any
    };
  };

  const getRandomOutletByType = (types: string[]): MediaOutlet => {
    const validOutlets = MEDIA_OUTLETS.filter(outlet => types.includes(outlet.type));
    return validOutlets[Math.floor(Math.random() * validOutlets.length)];
  };

  const generateStoryContent = (project: Project, type: string): string => {
    return `${studioName} continues development on "${project.title}", with the ${project.script?.genre} film progressing through ${type}. Industry watchers are keeping close tabs on this ${((project.budget.total || 0) / 1000000).toFixed(0)}M production.`;
  };

  const generateBoxOfficeContent = (project: Project, performance: string): string => {
    const boxOffice = (project.metrics?.boxOfficeTotal || 0) / 1000000;
    const budget = project.budget.total / 1000000;
    
    return `"${project.title}" earned ${boxOffice.toFixed(1)}M against its ${budget.toFixed(0)}M budget. ${performance === 'hit' ? 'The film exceeded all expectations and demonstrates the continued strength of' : performance === 'modest' ? 'While not a breakout hit, the film shows solid appeal for' : 'Despite high hopes, the film struggled to find its audience, raising questions about'} ${studioName}'s strategy.`;
  };

  const generateCastingContent = (project: Project, talent: TalentPerson): string => {
    return `${talent.name} has officially joined the cast of "${project.title}" in what promises to be a significant role. The ${talent.type} brings considerable experience to the ${project.script?.genre} project from ${studioName}.`;
  };

  const generateTalentContent = (talent: TalentPerson, storyType: string): string => {
    const contents = {
      interview: `${talent.name} discusses their craft, upcoming projects, and the state of the industry in this exclusive conversation.`,
      scandal: `Recent events involving ${talent.name} have sparked debate across social media and industry circles.`,
      rumor: `Sources close to ${talent.name} suggest major developments may be announced soon, though representatives have yet to comment.`
    };
    
    return contents[storyType as keyof typeof contents] || contents.interview;
  };

  const getFilteredStories = () => {
    let filtered = recentStories;
    
    if (selectedOutlet !== 'all') {
      filtered = filtered.filter(story => story.outlet.id === selectedOutlet);
    }
    
    if (storyFilter !== 'all') {
      filtered = filtered.filter(story => story.storyType === storyFilter);
    }
    
    return filtered;
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'negative': return <Zap className="h-4 w-4 text-red-500" />;
      default: return <MessageSquare className="h-4 w-4 text-blue-500" />;
    }
  };

  if (!gameState) {
    return <div className="p-6 text-sm text-muted-foreground">Loading media coverage...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Media Coverage
          </h2>
          <p className="text-muted-foreground">Industry news and public perception</p>
        </div>
        <Button onClick={generateWeeklyMedia} variant="outline">
          <Newspaper className="h-4 w-4 mr-2" />
          Refresh Stories
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 items-center">
            <div>
              <label className="text-sm font-medium">Outlet:</label>
              <select 
                value={selectedOutlet}
                onChange={(e) => setSelectedOutlet(e.target.value)}
                className="ml-2 px-3 py-1 border rounded text-sm"
              >
                <option value="all">All Outlets</option>
                {MEDIA_OUTLETS.map(outlet => (
                  <option key={outlet.id} value={outlet.id}>{outlet.name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="text-sm font-medium">Type:</label>
              <select 
                value={storyFilter}
                onChange={(e) => setStoryFilter(e.target.value)}
                className="ml-2 px-3 py-1 border rounded text-sm"
              >
                <option value="all">All Stories</option>
                <option value="casting">Casting</option>
                <option value="production">Production</option>
                <option value="boxoffice">Box Office</option>
                <option value="interview">Interviews</option>
                <option value="scandal">Scandals</option>
                <option value="rumor">Rumors</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stories */}
      <div className="space-y-4">
        {getFilteredStories().map(story => (
          <Card key={story.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline">{story.outlet.name}</Badge>
                    <Badge variant="secondary">{story.storyType}</Badge>
                    {getSentimentIcon(story.sentiment)}
                  </div>
                  <CardTitle className="text-lg">{story.headline}</CardTitle>
                </div>
                <div className="text-right text-sm text-muted-foreground">
                  <div>Week {story.week}, {story.year}</div>
                  <div className="flex items-center gap-1 mt-1">
                    <Eye className="h-3 w-3" />
                    <span>{story.virality}</span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">{story.content}</p>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <div>Reach: {story.outlet.reach}/100</div>
                <div>Credibility: {story.outlet.credibility}/100</div>
                <div>Virality: {story.virality}/100</div>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {getFilteredStories().length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <Newspaper className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Stories Found</h3>
              <p className="text-muted-foreground">
                No media coverage matches your current filters
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};