import re

with open('src/game/systems/platformOriginalsReleaseCadenceSystem.ts', 'r') as f:
    content = f.read()

pattern = r'      const episodesOut = active\.season\.episodes;'
replacement = '''      let episodesOut = active.season.episodes;
      const needsAirDates =
        nextAired > 0 &&
        active.season.episodes
          .slice(0, nextAired)
          .some((ep) => ep && !ep.airDate);

      if (needsAirDates) {
        episodesOut = active.season.episodes.map((ep) => {
          if (!ep) return ep;
          if (ep.airDate) return ep;
          if (ep.episodeNumber > nextAired) return ep;

          const abs = active.premiereAbs + (releaseFormat === 'binge' ? 0 : Math.floor((ep.episodeNumber - 1) / batchSize));
          const { week, year } = fromAbs(abs);
          return {
            ...ep,
            airDate: { week, year },
          };
        });
      }'''

content = re.sub(pattern, replacement, content)

with open('src/game/systems/platformOriginalsReleaseCadenceSystem.ts', 'w') as f:
    f.write(content)
