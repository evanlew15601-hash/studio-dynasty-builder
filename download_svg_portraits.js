import fs from 'fs';
import https from 'https';

const fileContent = fs.readFileSync('src/data/WorldBible.ts', 'utf8');

const characters = [];
const pattern1 = /slug:\s*'([^']+)',\s*portraitFile:\s*'[^']+',\s*tier:\s*'[^']+',\s*name:\s*'([^']+)',\s*type:\s*'([^']+)',\s*gender:\s*'([^']+)',\s*(?:nationality:\s*'([^']+)',\s*)?(?:race:\s*'([^']+)',\s*)?birthYear:\s*(\d+)/g;
let match;
while ((match = pattern1.exec(fileContent)) !== null) {
  characters.push({
    slug: match[1],
    name: match[2],
    gender: match[4]
  });
}

const pattern2 = /\['([^']+)', '([^']+)', '([^']+)', '([^']+)', '([^']+)'\]/g;
while ((match = pattern2.exec(fileContent)) !== null) {
  characters.push({
    slug: match[1],
    name: match[2],
    gender: match[3]
  });
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
  console.log(`Found ${characters.length} characters to fetch SVG avatars for...`);
  
  if (!fs.existsSync('./public/portraits')) {
    fs.mkdirSync('./public/portraits', { recursive: true });
  }

  // Promise pool
  const workers = [];
  
  for (const char of characters) {
    const filename = `./public/portraits/${char.slug}.svg`;
    if (fs.existsSync(filename)) continue;
    
    const seed = encodeURIComponent(char.slug);
    const url = `https://api.dicebear.com/7.x/micah/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffdfbf,ffd5dc`;
    
    workers.push(downloadImage(url, filename).then(() => {
        console.log(`✓ Downloaded SVG for ${char.slug}`);
    }).catch(err => {
        console.error(`✗ Error on ${char.slug}: ${err.message}`);
    }));
  }
  
  await Promise.all(workers);
  console.log('Done downloading SVGs.');
}

main();
