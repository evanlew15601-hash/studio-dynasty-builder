// Top Films of the Week - Box Office Performance Chart
import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Project } from '@/types/game';
import { TrendingIcon, StudioIcon, StarIcon } from '@/components/ui/icons';
import { useGameStore } from '@/game/store';
import { formatMoneyCompact } from '@/utils/money';

interface TopFilmEntry {
  project: Project;
  studioName: string;
  weeklyGross: number;
  totalGross: number;
  trend: 'rising' | 'falling' | 'stable' | 'new';
  receptionTags: string[];
  position: number;
  positionChange: number;
}

export const TopFilmsChart: React.FC = () => {
  const gameState = useGameStore((s) => s.game);

  const allReleases = useMemo(() => {
    if (!gameState) return [] as Project[];
    return gameState.allReleases.filter((item): item is Project => 'script' in item);
  }, [gameState]);

  if (!gameState) {
    return <div className="p-6 text-sm text-muted-foreground">Loading box office charts...</div>;
  }

  const calculateWeeklyGross = (project: Project): number => {
    if (!project.metrics?.inTheaters) return 0;

    const weeklyRevenue = project.metrics.lastWeeklyRevenue || 0;
    return weeklyRevenue;
  };

  const generateReceptionTags = (project: Project): string[] => {
    const tags: string[] = [];
    const metrics = project.metrics;

    if (metrics?.weeksSinceRelease === 0) tags.push('New Release');
    if (metrics?.criticsScore && metrics.criticsScore > 80) tags.push('Critical Darling');
    if (metrics?.audienceScore && metrics.audienceScore > 85) tags.push('Crowd Pleaser');
    if (metrics?.boxOfficeTotal && metrics.boxOfficeTotal > project.budget.total * 3) tags.push('Blockbuster');
    if (metrics?.boxOfficeTotal && metrics.boxOfficeTotal < project.budget.total * 0.5) tags.push('Box Office Bomb');
    if (metrics?.socialMediaMentions && metrics.socialMediaMentions > 1000000) tags.push('Viral Hit');
    if (project.budget.total < 10000000 && metrics?.boxOfficeTotal && metrics.boxOfficeTotal > 50000000) tags.push('Sleeper Success');
    if (metrics?.weeksSinceRelease && metrics.weeksSinceRelease > 8) tags.push('Long Runner');
    if (project.script?.genre === 'horror' && metrics?.boxOfficeTotal && metrics.boxOfficeTotal > 100000000) tags.push('Horror Phenomenon');
    if (project.script?.genre === 'comedy' && metrics?.audienceScore && metrics.audienceScore > 90) tags.push('Comedy Gold');

    return tags.slice(0, 2); // Limit to 2 tags for readability
  };

  const determineStudioName = (project: Project): string => {
    // Check if it's an AI studio project
    if (project.id.startsWith('ai-project-')) {
      // Find the studio from competitor studios
      const studio = gameState.competitorStudios.find(s =>
        project.title.includes(s.name.split(' ')[0]) ||
        s.specialties.includes(project.script.genre)
      );
      return studio?.name || 'Independent Studios';
    }

    // Player's project
    return gameState.studio.name;
  };

  const createTopFilmEntries = (): TopFilmEntry[] => {
    const currentReleases = allReleases.filter(project =>
      project.metrics?.inTheaters &&
      project.status === 'released' &&
      project.metrics?.boxOfficeTotal &&
      project.metrics.boxOfficeTotal > 0 &&
      (project.metrics?.weeksSinceRelease || 0) < 12 // Only films in their first 12 weeks
    );

    const entries: TopFilmEntry[] = currentReleases.map(project => {
      const weeklyGross = calculateWeeklyGross(project);
      const totalGross = project.metrics?.boxOfficeTotal || 0;
      const studioName = determineStudioName(project);
      const receptionTags = generateReceptionTags(project);

      // Determine trend based on weeks in release and performance
      let trend: 'rising' | 'falling' | 'stable' | 'new' = 'stable';
      const weeksInRelease = project.metrics?.weeksSinceRelease || 0;

      if (weeksInRelease === 0) {
        trend = 'new';
      } else if (weeksInRelease <= 2) {
        trend = 'rising';
      } else if (weeksInRelease > 6) {
        trend = 'falling';
      }

      return {
        project,
        studioName,
        weeklyGross,
        totalGross,
        trend,
        receptionTags,
        position: 0, // Will be set after sorting
        positionChange: 0 // Simplified for now
      };
    });

    // Sort by weekly gross and assign positions
    entries.sort((a, b) => b.weeklyGross - a.weeklyGross);
    entries.forEach((entry, index) => {
      entry.position = index + 1;
    });

    return entries.slice(0, 10); // Top 10
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'rising':
        return <TrendingIcon className="text-green-500" size={16} />;
      case 'falling':
        return <TrendingIcon className="text-red-500 rotate-180" size={16} />;
      case 'new':
        return <StarIcon className="text-yellow-500" size={16} />;
      default:
        return <div className="w-4 h-4 bg-gray-400 rounded-full" />;
    }
  };

  const topFilms = createTopFilmEntries();

  return (
    <Card className="card-premium">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center text-xl">
          <StudioIcon className="mr-3 text-primary" size={24} />
          Top Films This Week
          <Badge variant="outline" className="ml-auto">
            Week {gameState.currentWeek}, {gameState.currentYear}
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {topFilms.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <StudioIcon className="mx-auto mb-4" size={48} />
            <p>No films currently in theaters</p>
          </div>
        ) : (
          <div className="space-y-3">
            {topFilms.map((entry) => (
              <div
                key={entry.project.id}
                className={`p-4 rounded-lg border transition-all duration-200 hover:shadow-md ${
                  entry.studioName === gameState.studio.name
                    ? 'bg-primary/5 border-primary/20'
                    : 'bg-card hover:bg-accent/5'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold text-primary">#{entry.position}</span>
                        {getTrendIcon(entry.trend)}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-lg">{entry.project.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {entry.studioName} • {entry.project.script?.genre || 'Unknown'}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div>
                        <p className="text-sm text-muted-foreground">This Week</p>
                        <p className="font-semibold text-lg">{formatMoneyCompact(entry.weeklyGross)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Total Gross</p>
                        <p className="font-semibold text-lg">{formatMoneyCompact(entry.totalGross)}</p>
                      </div>
                    </div>

                    {/* Performance Bar */}
                    <div className="mb-3">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>vs Budget ({formatMoneyCompact(entry.project.budget?.total || 0)})</span>
                        <span>{((entry.totalGross / (entry.project.budget?.total || 1)) * 100).toFixed(0)}%</span>
                      </div>
                      <Progress
                        value={Math.min(100, (entry.totalGross / (entry.project.budget?.total || 1)) * 100)}
                        className="h-2"
                      />
                    </div>

                    {/* Reception Tags */}
                    {entry.receptionTags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {entry.receptionTags.map((tag, tagIndex) => (
                          <Badge
                            key={tagIndex}
                            variant="secondary"
                            className="text-xs"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="text-right ml-4">
                    <div className="text-sm text-muted-foreground">
                      Week {(entry.project.metrics?.weeksSinceRelease || 0) + 1}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {(entry.project.metrics?.theaterCount || 0).toLocaleString()} theaters
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Market Insights */}
        <div className="mt-6 p-4 bg-accent/5 rounded-lg border">
          <h4 className="font-semibold mb-2">Market Insights</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Total Box Office</p>
              <p className="font-semibold">
                {formatMoneyCompact(topFilms.reduce((sum, film) => sum + film.weeklyGross, 0))}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Top Genre</p>
              <p className="font-semibold capitalize">
                {topFilms.length > 0 ? topFilms[0].project.script?.genre || 'Unknown' : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Your Position</p>
              <p className="font-semibold">
                {topFilms.find(f => f.studioName === gameState.studio.name)?.position || 'Not in Top 10'}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};