import re

with open('src/utils/leagueReleases.ts', 'r') as f:
    content = f.read()

pattern = r'''    releaseWeek: typeof snapshot\.releaseWeek === 'number' \? snapshot\.releaseWeek : undefined,
    releaseYear: typeof snapshot\.releaseYear === 'number' \? snapshot\.releaseYear : undefined,'''
replacement = '''    releaseWeek: typeof snapshot.releaseWeek === 'number' ? snapshot.releaseWeek : undefined,
    releaseYear: typeof snapshot.releaseYear === 'number' ? snapshot.releaseYear : undefined,
    releaseFormat: typeof snapshot.releaseFormat === 'string' ? snapshot.releaseFormat : undefined,
    episodeCount: typeof snapshot.totalEpisodes === 'number' ? snapshot.totalEpisodes : undefined,
    seasons: (snapshot.type === 'series' || snapshot.type === 'limited-series') ? [{
      seasonNumber: 1,
      totalEpisodes: typeof snapshot.totalEpisodes === 'number' ? snapshot.totalEpisodes : 10,
      episodesAired: typeof snapshot.episodesAired === 'number' ? snapshot.episodesAired : (typeof snapshot.totalEpisodes === 'number' ? snapshot.totalEpisodes : 10),
      releaseFormat: typeof snapshot.releaseFormat === 'string' ? snapshot.releaseFormat : 'weekly',
      productionStatus: 'complete',
      airingStatus: (typeof snapshot.episodesAired === 'number' && typeof snapshot.totalEpisodes === 'number' && snapshot.episodesAired < snapshot.totalEpisodes) ? 'airing' : 'complete',
      episodes: Array.from({ length: typeof snapshot.totalEpisodes === 'number' ? snapshot.totalEpisodes : 10 }).map((_, i) => ({
        episodeNumber: i + 1,
        seasonNumber: 1,
        title: `Episode ${i + 1}`,
        runtime: typeof snapshot.runtimeMins === 'number' ? snapshot.runtimeMins : 50,
        viewers: 0,
        completionRate: 0,
        averageWatchTime: 0,
        replayViews: 0,
        productionCost: 0,
        weeklyViews: [],
        cumulativeViews: 0,
        viewerRetention: 0,
      })),
    }] : undefined,'''

content = re.sub(pattern, replacement, content)

with open('src/utils/leagueReleases.ts', 'w') as f:
    f.write(content)
