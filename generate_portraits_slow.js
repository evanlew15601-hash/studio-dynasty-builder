import fs from 'fs';
import https from 'https';

const fileContent = fs.readFileSync('src/data/WorldBible.ts', 'utf8');

const characters = [];
const pattern = /slug:\s*'([^']+)',\s*portraitFile:\s*'[^']+',\s*tier:\s*'[^']+',\s*name:\s*'([^']+)',\s*type:\s*'([^']+)',\s*gender:\s*'([^']+)',\s*(?:nationality:\s*'([^']+)',\s*)?(?:race:\s*'([^']+)',\s*)?birthYear:\s*(\d+)/g;

let match;
while ((match = pattern.exec(fileContent)) !== null) {
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

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(httpsGet(res.headers.location));
      }
      resolve(res);
    }).on('error', reject);
  });
}

async function downloadImage(url, dest) {
  return new Promise(async (resolve, reject) => {
    try {
      const res = await httpsGet(url);
      if (res.statusCode !== 200) {
        reject(new Error(`Failed to download image: ${res.statusCode}`));
        return;
      }
      const file = fs.createWriteStream(dest);
      res.pipe(file);
      file.on('finish', () => {
        file.close(resolve);
      });
    } catch (e) {
      reject(e);
    }
  });
}

async function main() {
  console.log(`Found ${characters.length} core characters to generate.`);
  
  if (!fs.existsSync('./public/portraits')) {
    fs.mkdirSync('./public/portraits', { recursive: true });
  }

  for (const char of characters) {
    const filename = `./public/portraits/${char.slug}.webp`;
    if (fs.existsSync(filename)) {
      continue;
    }
    
    console.log(`Generating ${char.slug}...`);
    
    const prompt = `Daz Studio 3D render of a ${char.age}-year-old ${char.nationality} ${char.race} ${char.gender.toLowerCase()} film ${char.type}, plain flat grey background, head and shoulders portrait, front-facing, neutral expression. Detailed skin texture, professional studio lighting. Total Extreme Wrestling character portrait style, generic character creator style.`;
    const encodedPrompt = encodeURIComponent(prompt);
    
    const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=256&height=256&nologo=true&seed=42`;
    
    let success = false;
    let retries = 10;
    
    while (!success && retries > 0) {
      try {
        await downloadImage(url, filename);
        console.log(`✓ Saved ${filename}`);
        success = true;
        // Wait 8 seconds between successful generation requests to respect rate limits
        await delay(8000); 
      } catch (err) {
        retries--;
        console.error(`✗ Error on ${char.slug} (${retries} retries left):`, err.message);
        // Exponential backoff if we hit a 429 Too Many Requests
        await delay(15000); 
      }
    }
  }
  console.log('Batch generation complete!');
}

main();
