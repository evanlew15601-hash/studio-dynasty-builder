const fs = require('fs');
const file = 'src/game/systems/platformOriginalsReleaseCadenceSystem.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /const premiereDate = active\.season\.premiereDate;/g,
  `const premiereDate = active.season.premiereDate ?? fromAbs(active.premiereAbs);`
);

content = content.replace(
  /const finaleDate = active\.season\.finaleDate;/g,
  `const finaleDate = nextAired >= active.total ? (active.season.finaleDate ?? fromAbs(finaleAbs)) : active.season.finaleDate;`
);

fs.writeFileSync(file, content);
