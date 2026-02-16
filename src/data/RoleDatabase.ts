import { Franchise, GameState, Project, PublicDomainIP, ScriptCharacter } from '@/types/game';

// Curated role sets keyed by franchise parody source (acts as stable property identity)
const FRANCHISE_ROLE_SETS: Record<string, ScriptCharacter[]> = {
  'Star Wars': [
    { id: 'hero', name: 'Hero Pilot', importance: 'lead', description: 'Skilled pilot and reluctant hero', requiredType: 'actor', ageRange: [20, 45] },
    { id: 'mentor', name: 'Wise Mentor', importance: 'supporting', description: 'Seasoned guide with deep knowledge', requiredType: 'actor', ageRange: [45, 80] },
    { id: 'rogue', name: 'Rogue Smuggler', importance: 'supporting', description: 'Charming scoundrel with a heart', requiredType: 'actor', ageRange: [25, 55] },
    { id: 'villain', name: 'Masked Villain', importance: 'supporting', description: 'Enforcer of the dark power', requiredType: 'actor', ageRange: [25, 65] },
    { id: 'cameo-senator', name: 'Galactic Senator (Cameo)', importance: 'minor', description: 'Brief political cameo for worldbuilding', requiredType: 'actor', ageRange: [30, 80] },
    { id: 'director', name: 'Director', importance: 'crew', description: 'Film director', requiredType: 'director' }
  ],
  'Blade Runner': [
    { id: 'detective', name: 'Replicant Hunter', importance: 'lead', description: 'Stoic detective on a moral quest', requiredType: 'actor', ageRange: [28, 55] },
    { id: 'replicant', name: 'Runaway Replicant', importance: 'supporting', description: 'Synthetic being seeking meaning', requiredType: 'actor', ageRange: [20, 50] },
    { id: 'tycoon', name: 'Tech Tycoon', importance: 'minor', description: 'Corporate mastermind cameo', requiredType: 'actor', ageRange: [40, 75] },
    { id: 'cameo-anchor', name: 'City News Anchor (Cameo)', importance: 'minor', description: 'Atmospheric news hit', requiredType: 'actor', ageRange: [25, 65] },
    { id: 'director', name: 'Director', importance: 'crew', description: 'Film director', requiredType: 'director' }
  ],
  'Alien': [
    { id: 'warrant', name: 'Warrant Officer', importance: 'lead', description: 'Capable survivor', requiredType: 'actor', ageRange: [25, 50] },
    { id: 'captain', name: 'Ship Captain', importance: 'supporting', description: 'Ship leader with tough calls', requiredType: 'actor', ageRange: [35, 65] },
    { id: 'android', name: 'Synthetic Crew Member', importance: 'supporting', description: 'Mysterious corporate asset', requiredType: 'actor', ageRange: [25, 50] },
    { id: 'cameo-tech', name: 'Maintenance Tech (Cameo)', importance: 'minor', description: 'Short scene for flavor', requiredType: 'actor', ageRange: [20, 65] },
    { id: 'director', name: 'Director', importance: 'crew', description: 'Film director', requiredType: 'director' }
  ],
  'Lord of the Rings': [
    { id: 'protagonist', name: 'Chosen Hero', importance: 'lead', description: 'Bearer of a heavy burden', requiredType: 'actor', ageRange: [18, 45] },
    { id: 'wizard', name: 'Wandering Wizard', importance: 'supporting', description: 'Magical guide and strategist', requiredType: 'actor', ageRange: [40, 85] },
    { id: 'warrior', name: 'Exiled Warrior', importance: 'supporting', description: 'Rightful heir with courage', requiredType: 'actor', ageRange: [25, 55] },
    { id: 'dark-lord', name: 'Dark Lord', importance: 'supporting', description: 'Ancient evil hovering over the realm', requiredType: 'actor', ageRange: [30, 80] },
    { id: 'cameo-innkeep', name: 'Innkeeper (Cameo)', importance: 'minor', description: 'Brief tavern cameo', requiredType: 'actor', ageRange: [25, 75] },
    { id: 'director', name: 'Director', importance: 'crew', description: 'Film director', requiredType: 'director' }
  ],
  'Harry Potter': [
    { id: 'young-wizard', name: 'Young Wizard', importance: 'lead', requiredType: 'actor', ageRange: [11, 18] },
    { id: 'best-friend', name: 'Best Friend', importance: 'supporting', requiredType: 'actor', ageRange: [11, 18] },
    { id: 'mentor', name: 'Wise Mentor', importance: 'supporting', requiredType: 'actor', ageRange: [45, 80] },
    { id: 'dark-wizard', name: 'Dark Wizard', importance: 'supporting', requiredType: 'actor', ageRange: [30, 60] },
    { id: 'cameo-prefect', name: 'School Prefect (Cameo)', importance: 'minor', requiredType: 'actor', ageRange: [14, 20] },
    { id: 'director', name: 'Director', importance: 'crew', requiredType: 'director' }
  ],
  'Fast & Furious': [
    { id: 'driver-lead', name: 'Lead Driver', importance: 'lead', requiredType: 'actor', ageRange: [22, 50] },
    { id: 'driver-two', name: 'Second Driver', importance: 'supporting', requiredType: 'actor', ageRange: [20, 50] },
    { id: 'tech', name: 'Tech Specialist', importance: 'supporting', requiredType: 'actor', ageRange: [20, 45] },
    { id: 'villain-boss', name: 'Rival Boss', importance: 'supporting', requiredType: 'actor', ageRange: [28, 65] },
    { id: 'cameo-mechanic', name: 'Garage Mechanic (Cameo)', importance: 'minor', requiredType: 'actor', ageRange: [18, 70] },
    { id: 'director', name: 'Director', importance: 'crew', requiredType: 'director' }
  ],
  'Mission: Impossible': [
    { id: 'team-lead', name: 'Team Leader', importance: 'lead', requiredType: 'actor', ageRange: [28, 55] },
    { id: 'tech-op', name: 'Tech Operative', importance: 'supporting', requiredType: 'actor', ageRange: [22, 50] },
    { id: 'handler', name: 'Agency Handler', importance: 'supporting', requiredType: 'actor', ageRange: [30, 60] },
    { id: 'antagonist', name: 'Mastermind Antagonist', importance: 'supporting', requiredType: 'actor', ageRange: [30, 65] },
    { id: 'cameo-anchor', name: 'News Anchor (Cameo)', importance: 'minor', requiredType: 'actor', ageRange: [25, 70] },
    { id: 'director', name: 'Director', importance: 'crew', requiredType: 'director' }
  ],
  'The Godfather': [
    { id: 'don', name: 'The Don', importance: 'lead', requiredType: 'actor', ageRange: [45, 80] },
    { id: 'heir', name: 'Reluctant Heir', importance: 'supporting', requiredType: 'actor', ageRange: [25, 50] },
    { id: 'consigliere', name: 'Consigliere', importance: 'supporting', requiredType: 'actor', ageRange: [35, 70] },
    { id: 'capo', name: 'Caporegime', importance: 'supporting', requiredType: 'actor', ageRange: [30, 65] },
    { id: 'rival', name: 'Rival Boss', importance: 'minor', requiredType: 'actor', ageRange: [35, 75] },
    { id: 'cameo-owner', name: 'Restaurant Owner (Cameo)', importance: 'minor', requiredType: 'actor', ageRange: [30, 70] },
    { id: 'director', name: 'Director', importance: 'crew', requiredType: 'director' }
  ]
};

function ensureDirector(roles: ScriptCharacter[]): ScriptCharacter[] {
  if (!roles.some(r => r.requiredType === 'director')) {
    roles.push({ id: 'director', name: 'Director', importance: 'crew', description: 'Film director', requiredType: 'director' });
  }
  return roles;
}

function addDefaultCameoIfMissing(roles: ScriptCharacter[]): ScriptCharacter[] {
  if (!roles.some(r => r.importance === 'minor')) {
    roles.push({ id: 'cameo-generic', name: 'Cameo Appearance', importance: 'minor', description: 'Short cameo role', requiredType: 'actor', ageRange: [25, 80] });
  }
  return roles;
}

function getRolesForFranchise(franchise: Franchise): ScriptCharacter[] {
  const byParody = franchise.parodySource && FRANCHISE_ROLE_SETS[franchise.parodySource];
  if (byParody) {
    return addDefaultCameoIfMissing(ensureDirector([...byParody]));
  }

  // Genre-based fallback (keeps it consistent but still curated)
  const roles: ScriptCharacter[] = [];
  const genres = (franchise.genre || []).map(g => g.toLowerCase());
  if (genres.includes('action')) {
    roles.push(
      { id: 'hero-lead', name: 'Hero', importance: 'lead', description: 'Main protagonist', requiredType: 'actor', ageRange: [25, 45] },
      { id: 'villain', name: 'Main Villain', importance: 'supporting', description: 'Primary antagonist', requiredType: 'actor', ageRange: [30, 60] },
      { id: 'tech-spec', name: 'Tech Specialist', importance: 'minor', description: 'Gadgets and hacks', requiredType: 'actor', ageRange: [20, 45] }
    );
  }
  if (genres.includes('fantasy')) {
    roles.push(
      { id: 'wizard', name: 'Wizard', importance: 'supporting', description: 'Mystical guide', requiredType: 'actor', ageRange: [40, 80] },
      { id: 'rogue', name: 'Rogue', importance: 'supporting', description: 'Trickster ally', requiredType: 'actor', ageRange: [20, 50] }
    );
  }
  if (genres.includes('horror')) {
    roles.push(
      { id: 'final-girl', name: 'Final Survivor', importance: 'lead', description: 'Resourceful protagonist', requiredType: 'actor', ageRange: [18, 40] },
      { id: 'killer', name: 'Masked Killer', importance: 'supporting', description: 'Unstoppable horror', requiredType: 'actor', ageRange: [20, 60] }
    );
  }
  ensureDirector(roles);
  addDefaultCameoIfMissing(roles);
  return roles;
}

function getRolesForPublicDomain(ip: PublicDomainIP): ScriptCharacter[] {
  const roles = [...(ip.suggestedCharacters || [])];
  ensureDirector(roles);
  addDefaultCameoIfMissing(roles);
  return roles;
}

export const RoleDatabase = {
  getRolesForProject(project: Project, gameState: GameState): ScriptCharacter[] {
    const sourceType = project.script?.sourceType;
    if ((sourceType === 'franchise' || sourceType === 'adaptation') && project.script.franchiseId) {
      const franchise = gameState.franchises.find(f => f.id === project.script.franchiseId);
      return franchise ? getRolesForFranchise(franchise) : [];
    }
    if ((sourceType === 'public-domain' || sourceType === 'adaptation') && project.script.publicDomainId) {
      const ip = gameState.publicDomainIPs.find(p => p.id === project.script.publicDomainId);
      return ip ? getRolesForPublicDomain(ip) : [];
    }
    return [];
  },

  getRolesForSource(sourceType: 'franchise' | 'public-domain', id: string, gameState: GameState): ScriptCharacter[] {
    if (sourceType === 'franchise') {
      const franchise = gameState.franchises.find(f => f.id === id);
      return franchise ? getRolesForFranchise(franchise) : [];
    } else {
      const ip = gameState.publicDomainIPs.find(p => p.id === id);
      return ip ? getRolesForPublicDomain(ip) : [];
    }
  }
};
