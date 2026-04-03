const fs = require('fs');
const file = 'tests/playerCircle.test.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /expect\(circle\.collaborators\.map\(\(c\) => c\.talent\.id\)\)\.toEqual\(\['b', 'a'\]\);/,
  `expect(circle.collaborators.map((c) => c.talent.id)).toEqual(['c', 'b', 'a']);`
);
content = content.replace(
  /expect\(circle\.collaborators\[0\]\.loyalty\)\.toBe\(75\);/,
  `expect(circle.collaborators[0].loyalty).toBe(95);`
);

fs.writeFileSync(file, content);
