import type { Gender, Race, TalentPerson } from '@/types/game';
import { stablePick } from '@/utils/stablePick';

export const GENDER_OPTIONS: Gender[] = ['Male', 'Female'];

export const RACE_OPTIONS: Race[] = [
  'White',
  'Black',
  'Asian',
  'Latino',
  'Middle Eastern',
  'Indigenous',
  'Mixed',
  'Other',
];

// Intentionally small, game-friendly set.
export const NATIONALITY_OPTIONS: string[] = [
  'American',
  'British',
  'Canadian',
  'Australian',
  'Irish',
  'French',
  'German',
  'Italian',
  'Spanish',
  'Brazilian',
  'Mexican',
  'Argentinian',
  'Nigerian',
  'South African',
  'Egyptian',
  'Indian',
  'Pakistani',
  'Chinese',
  'Japanese',
  'Korean',
  'Filipino',
  'Thai',
  'Vietnamese',
  'Russian',
  'Polish',
  'Swedish',
  'Norwegian',
  'Danish',
  'Turkish',
  'Israeli',
];

export function ensureTalentDemographics(talent: TalentPerson[]): TalentPerson[] {
  return talent.map((t) => {
    const gender = t.gender ?? stablePick(GENDER_OPTIONS, `${t.id}|gender`);
    const race = t.race ?? stablePick(RACE_OPTIONS, `${t.id}|race`);
    const nationality = t.nationality ?? stablePick(NATIONALITY_OPTIONS, `${t.id}|nationality`);

    // stablePick can return undefined for empty arrays (should never happen).
    return {
      ...t,
      gender: gender ?? t.gender,
      race: race ?? t.race,
      nationality: nationality ?? t.nationality,
    };
  });
}
