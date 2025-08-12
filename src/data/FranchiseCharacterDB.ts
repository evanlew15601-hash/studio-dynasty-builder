// Franchise Character Database
// Global immutable definitions keyed by franchise ID when available, with fallback keys by parodySource/title

export interface FranchiseCharacterDef {
  character_id: string;
  name: string;
  role_template_id: string;
  traits?: string[];
  is_mandatory?: boolean;
  description?: string;
  importance: 'lead' | 'supporting' | 'minor' | 'crew';
  requiredType?: 'actor' | 'director';
  ageRange?: [number, number];
}

// Note: Franchise IDs are generated at runtime. This DB can be populated dynamically or
// keyed by known properties (parodySource) as a fallback. Importer will try franchise.id,
// then franchise.parodySource, then curated RoleDatabase.
export const FRANCHISE_CHARACTER_DB: Record<string, FranchiseCharacterDef[]> = {
  // Parody-source keyed examples
  'Star Wars': [
    { character_id: 'char_hero_pilot', name: 'Hero Pilot', role_template_id: 'lead_hero', traits: ['brave','skilled'], is_mandatory: true, description: 'Skilled pilot and reluctant hero', importance: 'lead', requiredType: 'actor', ageRange: [20,45] },
    { character_id: 'char_wise_mentor', name: 'Wise Mentor', role_template_id: 'mentor_mystic', traits: ['wise'], description: 'Seasoned guide with deep knowledge', importance: 'supporting', requiredType: 'actor', ageRange: [45,80] },
    { character_id: 'char_director', name: 'Director', role_template_id: 'director', importance: 'crew', requiredType: 'director', is_mandatory: true },
  ],
  'Blade Runner': [
    { character_id: 'char_detective', name: 'Replicant Hunter', role_template_id: 'lead_detective', traits: ['stoic'], is_mandatory: true, description: 'Stoic detective on a moral quest', importance: 'lead', requiredType: 'actor', ageRange: [28,55] },
    { character_id: 'char_director', name: 'Director', role_template_id: 'director', importance: 'crew', requiredType: 'director', is_mandatory: true },
  ],
};
