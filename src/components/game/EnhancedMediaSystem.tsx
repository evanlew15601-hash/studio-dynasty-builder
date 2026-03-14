import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { GameState, Project, TalentPerson } from '@/types/game';
import { Eye, MessageSquare, Newspaper, TrendingUp, Zap } from 'lucide-react';

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
  gameState: GameState;
  onReputationImpact?: (entityId: string, impact: number, reason: string) => void;
}

export const EnhancedMediaSystem: React.FC<EnhancedMediaSystemProps> = ({
  gameState,
  onReputationImpact,
}) => {
  const [recentStories, setRecentStories] = useState<MediaStory[]>([]);
  const [selectedOutlet, setSelectedOutlet] = useState<string>('all');
  const [storyFilter, setStoryFilter] = useState<string>('all');

  const MEDIA_OUTLETS: MediaOutlet[] = useMemo(
    () => [
      {
        id: 'studio-reporter',
        name: 'The Studio Reporter',
        type: 'trade',
        bias: 'neutral',
        reach: 85,
        credibility: 90,
        specialty: ['industry', 'business', 'casting'],
      },
      {
        id: 'showbiz-ledger',
        name: 'Showbiz Ledger',
        type: 'trade',
        bias: 'neutral',
        reach: 80,
        credibility: 88,
        specialty: ['industry', 'reviews', 'boxoffice'],
      },
      {
        id: 'screen-weekly',
        name: 'Screen Weekly',
        type: 'mainstream',
        bias: 'positive',
        reach: 75,
        credibility: 75,
        specialty: ['celebrity', 'reviews', 'interviews'],
      },
      {
        id: 'buzzwire',
        name: 'BuzzWire',
        type: 'tabloid',
        bias: 'sensational',
        reach: 90,
        credibility: 45,
        specialty: ['scandal', 'celebrity', 'gossip'],
      },
      {
        id: 'deadline-daily',
        name: 'Deadline Daily',
        type: 'trade',
        bias: 'neutral',
        reach: 70,
        credibility: 85,
        specialty: ['business', 'deals', 'production'],
      },
      {
        id: 'trendpop',
        name: 'TrendPop Entertainment',
        type: 'online',
        bias: 'positive',
        reach: 85,
        credibility: 60,
        specialty: ['viral', 'social', 'lists'],
      },
      {
        id: 'industry-rundown',
        name: 'The Industry Rundown',
        type: 'trade',
        bias: 'neutral',
        reach: 65,
        credibility: 80,
        specialty: ['breaking', 'analysis', 'insider'],
      },
    ],
    []
  );

  useEffect(() => {
    generateWeeklyMedia();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState.currentWeek, gameState.currentYear]);

  const getRandomOutletByType = (types: MediaOutlet['type'][]): MediaOutlet => {
    const valid = MEDIA_OUTLETS.filter((outlet) => types.includes(outlet.type));
    return valid[Math.floor(Math.random() * valid.length)] ?? MEDIA_OUTLETS[0];
  };

  const makeId = () => `story-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  const generateWeeklyMedia = () => {
    const newStories: MediaStory[] = [];

    for (const project of gameState.projects) {
      if (project.currentPhase === 'production' && Math.random() < 0.25) {
        newStories.push(createProductionStory(project));
      }

      if (project.currentPhase === 'release' && Math.random() < 0.45) {
        newStories.push(createBoxOfficeStory(project));
      }

      if (project.cast?.length && Math.random() < 0.2) {
        newStories.push(createCastingStory(project));
      }
    }

    if (gameState.talent.length && Math.random() < 0.25) {
      newStories.push(createTalentStory());
    }

    setRecentStories((prev) => [...newStories, ...prev].slice(0, 50));

    // Optional lightweight reputation impact hook
    if (onReputationImpact) {
      for (const story of newStories) {
        if (!story.targets.studios?.length) continue;
        const impact = story.sentiment === 'positive' ? 1 : story.sentiment === 'negative' ? -1 : 0;
        if (impact !== 0) {
          for (const studioId of story.targets.studios) {
            onReputationImpact(studioId, impact, `Media coverage: ${story.outlet.name}`);
          }
        }
      }
    }
  };

  const createProductionStory = (project: Project): MediaStory => {
    const outlet = getRandomOutletByType(['trade', 'mainstream']);
    const headlines = [
      `"${project.title}" Moves Deeper into Production`,
      `Exclusive: Behind the Scenes of "${project.title}"`,
      `${gameState.studio.name} Pushes Forward on "${project.title}"`,
      `"${project.title}" Hits a Major Milestone`,
    ];

    return {
      id: makeId(),
      outlet,
      headline: headlines[Math.floor(Math.random() * headlines.length)] ?? headlines[0],
      content: `${gameState.studio.name} continues work on "${project.title}" as the ${project.script.genre} production progresses. Insiders describe the mood on set as focused and efficient.`,
      sentiment: Math.random() < 0.75 ? 'positive' : 'neutral',
      targets: {
        studios: [gameState.studio.id],
        projects: [project.id],
      },
      virality: Math.floor(Math.random() * 30) + 20,
      week: gameState.currentWeek,
      year: gameState.currentYear,
      storyType: 'production',
    };
  };

  const createBoxOfficeStory = (project: Project): MediaStory => {
    const outlet = getRandomOutletByType(['trade', 'mainstream']);
    const boxOffice = project.metrics?.boxOfficeTotal ?? 0;
    const budget = project.budget.total;

    const performance =
      boxOffice > budget * 2.0 ? 'hit' : boxOffice > budget * 0.8 ? 'modest' : 'disappointing';

    const headlineByPerformance: Record<string, string[]> = {
      hit: [
        `Box Office: "${project.title}" Breaks Out Big`,
        `"${project.title}" Overdelivers in Theaters`,
        `${gameState.studio.name}'s "${project.title}" Becomes a Crowd Favorite`,
      ],
      modest: [
        `"${project.title}" Posts a Solid Opening`,
        `Steady Start for "${project.title}"`,
      ],
      disappointing: [
        `"${project.title}" Stumbles at the Box Office`,
        `Soft Weekend for "${project.title}"`,
      ],
    };

    const sentiment = performance === 'hit' ? 'positive' : performance === 'modest' ? 'neutral' : 'negative';

    return {
      id: makeId(),
      outlet,
      headline:
        headlineByPerformance[performance]?.[Math.floor(Math.random() * (headlineByPerformance[performance]?.length ?? 1))] ??
        `"${project.title}" at the Box Office`,
      content: `"${project.title}" has grossed $${(boxOffice / 1_000_000).toFixed(1)}M so far against a $${(budget / 1_000_000).toFixed(0)}M budget. Analysts call the run ${performance} for ${gameState.studio.name}.`,
      sentiment,
      targets: {
        studios: [gameState.studio.id],
        projects: [project.id],
      },
      virality: performance === 'hit' ? 70 : performance === 'disappointing' ? 60 : 35,
      week: gameState.currentWeek,
      year: gameState.currentYear,
      storyType: 'boxoffice',
    };
  };

  const createCastingStory = (project: Project): MediaStory => {
    const outlet = getRandomOutletByType(['trade', 'mainstream', 'online']);
    const castMember = project.cast[Math.floor(Math.random() * project.cast.length)];
    const talent = gameState.talent.find((t) => t.id === castMember.talentId);

    if (!talent) {
      return {
        id: makeId(),
        outlet,
        headline: `Casting Update: "${project.title}"`,
        content: `New casting details have emerged for "${project.title}", the upcoming ${project.script.genre} project from ${gameState.studio.name}.`,
        sentiment: 'neutral',
        targets: { studios: [gameState.studio.id], projects: [project.id] },
        virality: 25,
        week: gameState.currentWeek,
        year: gameState.currentYear,
        storyType: 'casting',
      };
    }

    const headlines = [
      `${talent.name} Joins "${project.title}"`,
      `Exclusive: ${talent.name} Set for "${project.title}"`,
      `${gameState.studio.name} Lands ${talent.name} for "${project.title}"`,
    ];

    return {
      id: makeId(),
      outlet,
      headline: headlines[Math.floor(Math.random() * headlines.length)] ?? headlines[0],
      content: `${talent.name} has signed on for "${project.title}", adding momentum to the ${project.script.genre} slate at ${gameState.studio.name}.`,
      sentiment: 'positive',
      targets: {
        studios: [gameState.studio.id],
        projects: [project.id],
        talent: [talent.id],
      },
      virality: Math.floor(talent.reputation / 2) + Math.floor(Math.random() * 20),
      week: gameState.currentWeek,
      year: gameState.currentYear,
      storyType: 'casting',
    };
  };

  const createTalentStory = (): MediaStory => {
    const talent = gameState.talent[Math.floor(Math.random() * gameState.talent.length)] as TalentPerson;
    const outlet = getRandomOutletByType(['tabloid', 'mainstream', 'online']);

    const isTabloid = outlet.type === 'tabloid';
    const storyType = isTabloid ? (Math.random() < 0.6 ? 'rumor' : 'scandal') : 'interview';

    const headlines: Record<string, string[]> = {
      interview: [`Exclusive Interview: ${talent.name}`, `${talent.name} Talks Craft and Career`],
      scandal: [`Controversy Swirls Around ${talent.name}`, `${talent.name} Draws Backlash`],
      rumor: [`Rumors Follow ${talent.name}`, `Inside Chatter: What’s Next for ${talent.name}?`],
    };

    const sentiment = storyType === 'scandal' ? 'negative' : storyType === 'rumor' ? 'neutral' : 'positive';

    return {
      id: makeId(),
      outlet,
      headline: headlines[storyType][Math.floor(Math.random() * headlines[storyType].length)] ?? `${talent.name} in the Spotlight`,
      content:
        storyType === 'interview'
          ? `${talent.name} sat down for a wide-ranging interview about upcoming projects, creative risks, and the current state of the industry.`
          : storyType === 'rumor'
            ? `Sources close to ${talent.name} hint at upcoming announcements, though representatives declined to comment.`
            : `Recent reports involving ${talent.name} are generating intense discussion across industry circles and social media.`,
      sentiment,
      targets: { talent: [talent.id] },
      virality: Math.floor(talent.reputation / 3) + Math.floor(Math.random() * 30),
      week: gameState.currentWeek,
      year: gameState.currentYear,
      storyType,
    };
  };

  const getFilteredStories = () => {
    let filtered = recentStories;

    if (selectedOutlet !== 'all') {
      filtered = filtered.filter((story) => story.outlet.id === selectedOutlet);
    }

    if (storyFilter !== 'all') {
      filtered = filtered.filter((story) => story.storyType === (storyFilter as any));
    }

    return filtered;
  };

  const getSentimentIcon = (sentiment: MediaStory['sentiment']) => {
    switch (sentiment) {
      case 'positive':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'negative':
        return <Zap className="h-4 w-4 text-red-500" />;
      default:
        return <MessageSquare className="h-4 w-4 text-blue-500" />;
    }
  };

  const stories = getFilteredStories();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Media Coverage</h2>
          <p className="text-muted-foreground">Industry news and public perception</p>
        </div>
        <Button onClick={generateWeeklyMedia} variant="outline">
          <Newspaper className="h-4 w-4 mr-2" />
          Refresh Stories
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 items-center flex-wrap">
            <div>
              <label className="text-sm font-medium">Outlet:</label>
              <select
                value={selectedOutlet}
                onChange={(e) => setSelectedOutlet(e.target.value)}
                className="ml-2 px-3 py-1 border rounded text-sm"
              >
                <option value="all">All Outlets</option>
                {MEDIA_OUTLETS.map((outlet) => (
                  <option key={outlet.id} value={outlet.id}>
                    {outlet.name}
                  </option>
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

      <div className="space-y-4">
        {stories.map((story) => (
          <Card key={story.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <Badge variant="outline">{story.outlet.name}</Badge>
                    <Badge variant="secondary">{story.storyType}</Badge>
                    {getSentimentIcon(story.sentiment)}
                  </div>
                  <CardTitle className="text-lg">{story.headline}</CardTitle>
                </div>

                <div className="text-right text-sm text-muted-foreground">
                  <div>
                    Week {story.week}, {story.year}
                  </div>
                  <div className="flex items-center gap-1 mt-1 justify-end">
                    <Eye className="h-3 w-3" />
                    <span>{story.virality}</span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">{story.content}</p>
              <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                <div>Reach: {story.outlet.reach}/100</div>
                <div>Credibility: {story.outlet.credibility}/100</div>
                <div>Virality: {story.virality}/100</div>
              </div>
            </CardContent>
          </Card>
        ))}

        {stories.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <Newspaper className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Stories Found</h3>
              <p className="text-muted-foreground">No media coverage matches your current filters</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
