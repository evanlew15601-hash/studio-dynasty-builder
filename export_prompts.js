import fs from 'fs';

const fileContent = fs.readFileSync('src/data/WorldBible.ts', 'utf8');
const characters = [];

// Match Marquee & Notable
const pattern1 = /slug:\s*'([^']+)',\s*portraitFile:\s*'[^']+',\s*tier:\s*'[^']+',\s*name:\s*'([^']+)',\s*type:\s*'([^']+)',\s*gender:\s*'([^']+)',\s*(?:nationality:\s*'([^']+)',\s*)?(?:race:\s*'([^']+)',\s*)?birthYear:\s*(\d+)/g;
let match;
while ((match = pattern1.exec(fileContent)) !== null) {
  characters.push({
    slug: match[1],
    name: match[2],
    type: match[3],
    gender: match[4],
    nationality: match[5] || 'Unknown',
    race: match[6] || 'Unknown',
    age: 2026 - parseInt(match[7], 10)
  });
}

// Match the Pad arrays (padActors / padDirectors)
const pattern2 = /\['([^']+)', '([^']+)', '([^']+)', '([^']+)', '([^']+)'\]/g;
while ((match = pattern2.exec(fileContent)) !== null) {
  characters.push({
    slug: match[1],
    name: match[2],
    type: 'actor', // Approximate for the pad arrays, but good enough for the prompt generator
    gender: match[3],
    nationality: match[4],
    race: match[5],
    age: 40 // Default age for padded characters
  });
}

const csvLines = ["Slug,Prompt"];

for (const char of characters) {
  const prompt = `Daz Studio 3D render of a ${char.age}-year-old ${char.nationality} ${char.race} ${char.gender.toLowerCase()} film ${char.type}, plain flat grey background, head and shoulders portrait, front-facing, neutral expression. Detailed skin texture, professional studio lighting. Total Extreme Wrestling character portrait style, generic character creator style.`;
  csvLines.push(`${char.slug},"${prompt}"`);
}

fs.writeFileSync('portrait_prompts.csv', csvLines.join('\n'));
console.log(`Exported ${characters.length} character prompts to portrait_prompts.csv!`);
