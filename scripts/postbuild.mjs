import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const distDir = path.resolve(process.cwd(), 'dist');

const indexPath = path.join(distDir, 'index.html');
const notFoundPath = path.join(distDir, '404.html');
const noJekyllPath = path.join(distDir, '.nojekyll');

const indexHtml = await readFile(indexPath, 'utf8');

await writeFile(notFoundPath, indexHtml);
await writeFile(noJekyllPath, '');
