import re

with open('src/components/game/StreamingWarsPlatformApp.tsx', 'r') as f:
    content = f.read()

# Make the Commission logic handle both films and series
# Look for const script: Script = {
# Find logline: `An original ${originalGenre} series commissioned for ${gameState.platformMarket?.player?.name ?? 'your platform'}.`
content = content.replace("logline: `An original ${originalGenre} series commissioned for ${gameState.platformMarket?.player?.name ?? 'your platform'}.`,", "logline: originalLogline || `An original ${originalGenre} ${originalType} commissioned for ${gameState.platformMarket?.player?.name ?? 'your platform'}.`,")

# Update budget for script
content = content.replace("budget: perEpisodeBudget,", "budget: originalType === 'film' ? originalTotalBudget : perEpisodeBudget,")

# Update Contract Name & type
content = content.replace("name: `${gameState.platformMarket?.player?.name ?? 'Your Platform'} Original - ${title}`,", "name: `${gameState.platformMarket?.player?.name ?? 'Your Platform'} Original - ${title}`,")
content = content.replace("type: 'series',", "type: originalType === 'film' ? 'feature' : 'series',")

# Update total budget
content = content.replace("const totalBudget = perEpisodeBudget * episodeCount;", "const totalBudget = originalType === 'film' ? originalTotalBudget : (perEpisodeBudget * episodeCount);")

# Update episodes and seasons
episodes_replace = """    const episodes: EpisodeData[] = originalType === 'film' ? [] : Array.from({ length: episodeCount }).map((_, idx) => {
      const n = idx + 1;
      return {
        episodeNumber: n,
        seasonNumber: 1,
        title: `Episode ${n}`,
        runtime: stableInt(`${idSeedRoot}|runtime:${n}`, 42, 64),
        viewers: 0,
        completionRate: 0,
        averageWatchTime: 0,
        replayViews: 0,
        productionCost: perEpisodeBudget,
        weeklyViews: [],
        cumulativeViews: 0,
        viewerRetention: 0,
      };
    });

    const season1: SeasonData = {
      seasonNumber: 1,
      totalEpisodes: originalType === 'film' ? 1 : episodeCount,
      episodesAired: 0,
      releaseFormat: originalType === 'film' ? 'binge' : releaseFormat,
      averageViewers: 0,
      seasonCompletionRate: 0,
      seasonDropoffRate: 0,
      totalBudget,
      spentBudget: 0,
      productionStatus: 'planning',
      episodes,
    };"""
content = re.sub(r'    const episodes: EpisodeData\[\] = Array\.from\(\{ length: episodeCount \}\)\.map\(\(_, idx\) => \{.*?\};\n    \};\n', episodes_replace + "\n", content, flags=re.DOTALL)

# Update the Project definition
content = content.replace("type: 'series',", "type: originalType === 'film' ? 'feature' : 'series',")
content = content.replace("seasons: [season1],", "seasons: originalType === 'film' ? undefined : [season1],")
content = content.replace("currentSeason: 1,", "currentSeason: originalType === 'film' ? undefined : 1,")
content = content.replace("totalOrderedSeasons: 1,", "totalOrderedSeasons: originalType === 'film' ? undefined : 1,")

with open('src/components/game/StreamingWarsPlatformApp.tsx', 'w') as f:
    f.write(content)
