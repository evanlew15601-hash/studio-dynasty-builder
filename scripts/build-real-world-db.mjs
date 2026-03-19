import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const INPUT_PATH = path.join(ROOT, 'mods', 'real-world-db.catalog.json');
const OUTPUT_PATH = path.join(ROOT, 'mods', 'real-world-db.bundle.json');

async function main() {
  const raw = JSON.parse(await fs.readFile(INPUT_PATH, 'utf8'));

  const modId = raw.modId ?? 'real-world-db';
  const modName = raw.modName ?? 'Real World Database';
  const modVersion = raw.modVersion ?? '1.0.0';
  const modAuthor = raw.modAuthor;

  const patches = [];

  function addCatalogPatch(entityType, payload) {
    if (!payload) return;
    if (!Array.isArray(payload)) throw new Error(`Expected ${entityType} to be an array`);

    patches.push({
      id: `${entityType}:${modId}`,
      modId,
      entityType,
      op: 'insert',
      payload,
    });
  }

  addCatalogPatch('providerDealCatalog', raw.providers);
  addCatalogPatch('studioProfileCatalog', raw.studios);
  addCatalogPatch('franchiseCatalog', raw.franchises);
  addCatalogPatch('publicDomainCatalog', raw.publicDomainIPs);
  addCatalogPatch('talentPool', raw.talent);

  const bundle = {
    version: 1,
    mods: [
      {
        id: modId,
        name: modName,
        version: modVersion,
        author: modAuthor,
        enabled: true,
        priority: 0,
      },
    ],
    patches,
  };

  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await fs.writeFile(OUTPUT_PATH, JSON.stringify(bundle, null, 2) + '\n', 'utf8');

  console.log(`Wrote ${OUTPUT_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
