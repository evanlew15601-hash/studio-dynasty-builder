import type { Project, ScriptCharacter, TalentPerson } from '@/types/game';
import { stablePick } from '@/utils/stablePick';

// Ensure AI films have credited talent so awards/filmographies have real people to reference
export function attachBasicCastForAI(project: Project, talentPool: TalentPerson[]): Project {
  try {
    if (!project.script) return project;

    const existingCharacters = project.script.characters || [];
    const existingCast = project.cast || [];
    const existingCrew = project.crew || [];

    const hasDirector =
      existingCrew.some(c => c.role.toLowerCase().includes('director') && !!c.talentId) ||
      existingCast.some(c => c.role.toLowerCase().includes('director') && !!c.talentId) ||
      existingCharacters.some(c => c.requiredType === 'director' && !!c.assignedTalentId);

    const hasLead =
      existingCast.some(c => c.role.toLowerCase().includes('lead') && !!c.talentId) ||
      existingCharacters.some(c => c.requiredType !== 'director' && c.importance === 'lead' && !!c.assignedTalentId);

    const hasSupporting =
      existingCast.some(c => c.role.toLowerCase().includes('supporting') && !!c.talentId) ||
      existingCharacters.some(c => c.requiredType !== 'director' && c.importance === 'supporting' && !!c.assignedTalentId);

    // If the project already has credited character assignments, don't overwrite them.
    // (If it only has a cast list, we still ensure script characters exist for filmography.)
    if (existingCharacters.some(c => !!c.assignedTalentId) && hasDirector && hasLead && hasSupporting) {
      return project;
    }

    const directors = talentPool.filter(t => t.type === 'director');
    const actors = talentPool.filter(t => t.type === 'actor');

    const getTalentById = (id?: string) => talentPool.find(t => t.id === id);

    const existingDirectorId =
      existingCrew.find(c => c.role.toLowerCase().includes('director'))?.talentId ||
      existingCast.find(c => c.role.toLowerCase().includes('director'))?.talentId ||
      existingCharacters.find(c => c.requiredType === 'director')?.assignedTalentId;

    const existingLeadId =
      existingCast.find(c => c.role.toLowerCase().includes('lead') && !c.role.toLowerCase().includes('supporting'))?.talentId ||
      existingCharacters.find(c => c.requiredType !== 'director' && c.importance === 'lead')?.assignedTalentId;

    const existingSupportingIds = existingCast
      .filter(c => c.role.toLowerCase().includes('supporting') && !!c.talentId)
      .map(c => c.talentId);

    const pickedDirector = getTalentById(existingDirectorId) ?? stablePick(directors, `${project.id}|director`);
    const pickedLead = getTalentById(existingLeadId) ?? stablePick(actors, `${project.id}|lead`);

    const usedIds = new Set<string>([pickedDirector?.id, pickedLead?.id].filter(Boolean) as string[]);

    const existingSupportingTalent = existingSupportingIds
      .map(id => getTalentById(id))
      .filter(Boolean) as TalentPerson[];

    const pickedSupporting1 =
      existingSupportingTalent[0] ??
      stablePick(actors.filter(a => !usedIds.has(a.id)), `${project.id}|supporting1`);

    if (pickedSupporting1) usedIds.add(pickedSupporting1.id);

    const pickedSupporting2 =
      existingSupportingTalent[1] ??
      stablePick(actors.filter(a => !usedIds.has(a.id)), `${project.id}|supporting2`);

    const mkTerms = () => ({ duration: new Date(0), exclusivity: false, merchandising: false, sequelOptions: 0 });

    // Build/patch script characters (used by filmography + fallbacks)
    let characters: ScriptCharacter[] = existingCharacters.map(c => {
      if (c.requiredType === 'director' && !c.assignedTalentId && pickedDirector) {
        return { ...c, assignedTalentId: pickedDirector.id };
      }

      if (c.requiredType !== 'director' && c.importance === 'lead' && !c.assignedTalentId && pickedLead) {
        return { ...c, requiredGender: c.requiredGender || pickedLead.gender || 'Male', assignedTalentId: pickedLead.id };
      }

      return c;
    });

    // Fill unassigned supporting slots (if any exist)
    const supportingPicks = [pickedSupporting1, pickedSupporting2].filter(Boolean) as TalentPerson[];
    if (supportingPicks.length > 0) {
      let si = 0;
      characters = characters.map(c => {
        if (
          si < supportingPicks.length &&
          c.requiredType !== 'director' &&
          c.importance === 'supporting' &&
          !c.assignedTalentId
        ) {
          const t = supportingPicks[si];
          si += 1;
          return { ...c, requiredGender: c.requiredGender || t.gender || 'Male', assignedTalentId: t.id };
        }
        return c;
      });
    }

    const hasDirectorChar = characters.some(c => c.requiredType === 'director');
    const hasLeadChar = characters.some(c => c.requiredType !== 'director' && c.importance === 'lead');
    const supportingChars = characters.filter(c => c.requiredType !== 'director' && c.importance === 'supporting');

    if (!hasDirectorChar) {
      characters = [
        ...characters,
        {
          id: `${project.id}-dir`,
          name: 'Director',
          description: 'Director',
          requiredType: 'director',
          importance: 'lead',
          traits: ['mandatory'],
          assignedTalentId: pickedDirector?.id,
        } as any,
      ];
    }

    if (!hasLeadChar) {
      characters = [
        ...characters,
        {
          id: `${project.id}-lead`,
          name: 'Protagonist',
          description: 'Lead role',
          requiredType: 'actor',
          requiredGender: pickedLead?.gender || 'Male',
          importance: 'lead',
          traits: ['mandatory'],
          assignedTalentId: pickedLead?.id,
        } as any,
      ];
    }

    // Add 1–2 supporting roles so supporting categories can credit someone other than the lead.
    if (supportingChars.length === 0) {
      if (pickedSupporting1) {
        characters = [
          ...characters,
          {
            id: `${project.id}-supporting-1`,
            name: 'Supporting',
            description: 'Supporting role',
            requiredType: 'actor',
            requiredGender: pickedSupporting1.gender || 'Male',
            importance: 'supporting',
            traits: [],
            assignedTalentId: pickedSupporting1.id,
          } as any,
        ];
      }

      if (pickedSupporting2) {
        characters = [
          ...characters,
          {
            id: `${project.id}-supporting-2`,
            name: 'Supporting (2)',
            description: 'Supporting role',
            requiredType: 'actor',
            requiredGender: pickedSupporting2.gender || 'Male',
            importance: 'supporting',
            traits: [],
            assignedTalentId: pickedSupporting2.id,
          } as any,
        ];
      }
    }

    // Build/patch cast + crew lists (used by awards engine)
    const cast = [...existingCast];
    const crew = [...existingCrew];

    if (pickedDirector && !crew.some(c => c.talentId === pickedDirector.id)) {
      crew.push({
        talentId: pickedDirector.id,
        role: 'Director',
        salary: Math.round((pickedDirector.marketValue || 5_000_000) * 0.1),
        points: 0,
        contractTerms: mkTerms(),
      } as any);
    }

    if (pickedLead && !cast.some(c => c.talentId === pickedLead.id)) {
      cast.push({
        talentId: pickedLead.id,
        role: 'Lead Actor',
        salary: Math.round((pickedLead.marketValue || 5_000_000) * 0.1),
        points: 0,
        contractTerms: mkTerms(),
      } as any);
    }

    if (pickedSupporting1 && !cast.some(c => c.talentId === pickedSupporting1.id)) {
      cast.push({
        talentId: pickedSupporting1.id,
        role: 'Supporting Actor',
        salary: Math.round((pickedSupporting1.marketValue || 3_000_000) * 0.05),
        points: 0,
        contractTerms: mkTerms(),
      } as any);
    }

    if (pickedSupporting2 && !cast.some(c => c.talentId === pickedSupporting2.id)) {
      cast.push({
        talentId: pickedSupporting2.id,
        role: 'Supporting Actor (2)',
        salary: Math.round((pickedSupporting2.marketValue || 3_000_000) * 0.05),
        points: 0,
        contractTerms: mkTerms(),
      } as any);
    }

    // Star power: derive from top-2 cast fame to make fame actually matter in outcomes.
    const castFame = cast
      .map(c => talentPool.find(t => t.id === c.talentId))
      .filter(Boolean)
      .map(t => (t!.fame ?? Math.min(100, Math.round(t!.reputation || 50))));

    const topTwo = [...castFame].sort((a, b) => b - a).slice(0, 2);
    const starPowerBonus =
      topTwo.length > 0
        ? Math.min(0.5, (topTwo.reduce((a, b) => a + b, 0) / topTwo.length) / 200)
        : project.starPowerBonus;

    return {
      ...project,
      script: { ...project.script, characters },
      cast,
      crew,
      starPowerBonus,
    };
  } catch (e) {
    console.warn('attachBasicCastForAI failed', e);
    return project;
  }
}
