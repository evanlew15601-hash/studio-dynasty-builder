const fs = require('fs');
const code = fs.readFileSync('src/game/systems/platformOriginalsReleaseCadenceSystem.ts', 'utf8');

const updated = code.replace(
/      let expectedAired = 0;\s*if \(releaseFormat === 'binge'\) \{\s*expectedAired = active.total;\s*\} else \{\s*expectedAired = Math.min\(active.total, \(weeksSincePremiere \+ 1\) \* batchSize\);\s*\}\s*expectedAired = clampInt\(expectedAired, 0, active.total\);\s*const prevAired = clampInt\(active.season.episodesAired \?\? 0, 0, active.total\);\s*const nextAired = Math.max\(prevAired, expectedAired\);\s*let episodesOut = active.season.episodes;\s*const needsAirDates =[\s\S]*?const finaleDate = nextAired >= active.total \? \(active.season.finaleDate \?\? fromAbs\(finaleAbs\)\) : active.season.finaleDate;/g,
`      const dropsTotal = releaseFormat === 'binge' ? 1 : Math.ceil(active.total / batchSize);
      const finaleAbs = active.premiereAbs + (dropsTotal - 1);
      
      const nextAired = active.season.episodesAired ?? 0;
      const episodesOut = active.season.episodes;
      const premiereDate = active.season.premiereDate;
      const finaleDate = active.season.finaleDate;`
);

fs.writeFileSync('src/game/systems/platformOriginalsReleaseCadenceSystem.ts', updated);
