import re

with open('src/utils/talentFilmographyManager.ts', 'r') as f:
    content = f.read()

pattern = r'''      const newFame = Math\.max\(0, Math\.min\(100, \(talent\.fame \|\| 0\) \+ fameBoost\)\);

      logDebug\(
        `\[Filmography\] \$\{talent\.name\} in "\$\{project\.title\}" as \$\{role\}\. Fame: \$\{talent\.fame \|\| 0\} -> \$\{newFame\}`
      \);

      return \{
        \.\.\.talent,
        filmography: updatedFilmography,
        fame: newFame,
        lastWorkWeek: workAbsWeek,
        recentProjects: nextRecentProjects,
      \};'''

replacement = '''      const newFame = Math.max(0, Math.min(100, (talent.fame || 0) + fameBoost));

      let newLoyalty = talent.studioLoyalty ? { ...talent.studioLoyalty } : {};
      const studioId = project.studioId || gameState.studio?.id;
      if (studioId) {
        const currentLoyalty = newLoyalty[studioId] || 50;
        let loyaltyBoost = 3;
        if (multiplier > 3) loyaltyBoost += 4;
        else if (multiplier < 0.5) loyaltyBoost -= 2;
        newLoyalty[studioId] = Math.max(0, Math.min(100, currentLoyalty + loyaltyBoost));
      }

      logDebug(
        `[Filmography] ${talent.name} in "${project.title}" as ${role}. Fame: ${talent.fame || 0} -> ${newFame}`
      );

      return {
        ...talent,
        filmography: updatedFilmography,
        fame: newFame,
        studioLoyalty: newLoyalty,
        lastWorkWeek: workAbsWeek,
        recentProjects: nextRecentProjects,
      };'''

content = re.sub(pattern, replacement, content)

with open('src/utils/talentFilmographyManager.ts', 'w') as f:
    f.write(content)
