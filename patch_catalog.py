import re

with open('src/game/systems/platformCatalogSystem.ts', 'r') as f:
    content = f.read()

pattern = r'''    const isExclusive = exclusiveFlag !== false && contractExclusive !== false;

    return \{
      arrivalAbs,
      quality: project\.script\?\.quality \?\? 60,
      kindFactor: isExclusive \? 1\.0 : 0\.6,
    \};'''

replacement = '''    const isExclusive = exclusiveFlag !== false && contractExclusive !== false;

    let kindFactor = isExclusive ? 1.0 : 0.6;
    
    // Feature films have higher burst momentum and higher catalog moat value 
    // to compensate for not having a weekly cadence.
    if (project.type === 'feature' || project.type === 'documentary') {
      const budgetM = (project.budget?.total || 0) / 1_000_000;
      // Bonus scales with budget (e.g., a $50M film is a bigger deal than a $5M indie)
      const blockbusterBonus = Math.min(1.0, Math.max(0, budgetM / 50));
      kindFactor += 0.5 + blockbusterBonus;
    }

    return {
      arrivalAbs,
      quality: project.script?.quality ?? 60,
      kindFactor,
    };'''

content = re.sub(pattern, replacement, content)

with open('src/game/systems/platformCatalogSystem.ts', 'w') as f:
    f.write(content)
