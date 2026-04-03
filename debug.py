import re

with open('src/game/sim/tvEpisodeSystem.ts', 'r') as f:
    content = f.read()

content = content.replace("static autoReleaseEpisodesIfDue(project: Project, currentWeek: number, currentYear: number): Project {", "static autoReleaseEpisodesIfDue(project: Project, currentWeek: number, currentYear: number): Project {\n    console.log('autoReleaseEpisodesIfDue', project.id, project.status, project.releaseWeek, project.releaseYear, currentWeek, currentYear);")

with open('src/game/sim/tvEpisodeSystem.ts', 'w') as f:
    f.write(content)
