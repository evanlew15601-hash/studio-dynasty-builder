import { execSync } from 'child_process';
import fs from 'fs';

const csv = fs.readFileSync('portrait_prompts.csv', 'utf8').split('\n');
const slugs = csv.slice(1).map(row => row.split(',')[0]).filter(Boolean);
console.log(slugs.length);
