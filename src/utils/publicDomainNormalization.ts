import type { GameState, PublicDomainIP, Project, Script } from '@/types/game';

function uniqStrings(values: unknown): string[] {
  if (!Array.isArray(values)) return [];

  const out: string[] = [];
  const seen = new Set<string>();

  for (const v of values) {
    if (typeof v !== 'string') continue;
    if (seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }

  return out;
}

function normalizeName(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function mergePublicDomain(existing: PublicDomainIP, incoming: PublicDomainIP): PublicDomainIP {
  const name = existing.name?.trim() ? existing.name : incoming.name;

  return {
    ...existing,
    ...incoming,
    // Keep the canonical identity
    id: existing.id,
    name,
    cost: 0,
    coreElements: uniqStrings([...(existing.coreElements || []), ...(incoming.coreElements || [])]),
    genreFlexibility: uniqStrings([...(existing.genreFlexibility || []), ...(incoming.genreFlexibility || [])]) as any,
    notableAdaptations: uniqStrings([...(existing.notableAdaptations || []), ...(incoming.notableAdaptations || [])]),
    requiredElements: uniqStrings([...(existing.requiredElements || []), ...(incoming.requiredElements || [])]),
    suggestedCharacters: existing.suggestedCharacters?.length ? existing.suggestedCharacters : incoming.suggestedCharacters,
    description: existing.description?.trim() ? existing.description : incoming.description,
    reputationScore: Math.max(existing.reputationScore ?? 0, incoming.reputationScore ?? 0),
    adaptationFatigue: Math.max(existing.adaptationFatigue ?? 0, incoming.adaptationFatigue ?? 0),
    culturalRelevance: Math.max(existing.culturalRelevance ?? 0, incoming.culturalRelevance ?? 0),
    dateEnteredDomain: existing.dateEnteredDomain || incoming.dateEnteredDomain,
    lastAdaptationDate: existing.lastAdaptationDate || incoming.lastAdaptationDate,
    domainType: existing.domainType || incoming.domainType,
  };
}

export function normalizePublicDomainIPs(publicDomainIPs: PublicDomainIP[] | null | undefined): PublicDomainIP[] {
  const input = Array.isArray(publicDomainIPs) ? publicDomainIPs : [];

  const order: string[] = [];
  const byId = new Map<string, PublicDomainIP>();

  for (const ip of input) {
    if (!ip || typeof ip.id !== 'string' || !ip.id.trim()) continue;

    const id = ip.id;
    const existing = byId.get(id);

    if (!existing) {
      order.push(id);
      byId.set(id, { ...ip, cost: 0 });
      continue;
    }

    byId.set(id, mergePublicDomain(existing, ip));
  }

  return order.map((id) => byId.get(id)!).filter(Boolean);
}

export function normalizePublicDomainState(state: GameState): GameState {
  const base = normalizePublicDomainIPs(state.publicDomainIPs);

  let mergedByName = false;

  const canonicalById = new Map<string, string>();
  const keyOrder: string[] = [];
  const byKey = new Map<string, PublicDomainIP>();

  for (const ip of base) {
    const nameKey = normalizeName(ip.name);
    const key = nameKey ? `name::${nameKey}` : `id::${ip.id}`;

    const existing = byKey.get(key);

    if (!existing) {
      keyOrder.push(key);
      byKey.set(key, ip);
      canonicalById.set(ip.id, ip.id);
      continue;
    }

    mergedByName = true;
    canonicalById.set(ip.id, existing.id);
    byKey.set(key, mergePublicDomain(existing, ip));
  }

  const mapId = (id: string | null | undefined): string | null | undefined => {
    if (!id) return id;
    return canonicalById.get(id) ?? id;
  };

  const nextPublicDomain = keyOrder.map((k) => byKey.get(k)!).filter(Boolean);

  let projectsTouched = false;
  const inputProjects = (state.projects || []) as Project[];
  let nextProjects: Project[] = inputProjects.map((p) => {
    const scriptPdId = mapId((p as any)?.script?.publicDomainId);
    const projectPdId = mapId((p as any)?.publicDomainId);

    let changed = false;
    let nextScript = (p as any).script as Script | undefined;

    if (nextScript && scriptPdId !== nextScript.publicDomainId) {
      nextScript = { ...nextScript, publicDomainId: scriptPdId as any };
      changed = true;
    }

    if (projectPdId !== (p as any).publicDomainId) {
      changed = true;
    }

    if (!changed) return p;

    projectsTouched = true;

    return {
      ...(p as any),
      publicDomainId: projectPdId as any,
      script: nextScript ?? (p as any).script,
    } as Project;
  });

  if (!projectsTouched) nextProjects = inputProjects;

  let scriptsTouched = false;
  const inputScripts = (state.scripts || []) as Script[];
  let nextScripts: Script[] = inputScripts.map((s) => {
    const nextPdId = mapId((s as any).publicDomainId);
    if (nextPdId === (s as any).publicDomainId) return s;
    scriptsTouched = true;
    return { ...(s as any), publicDomainId: nextPdId } as Script;
  });

  if (!scriptsTouched) nextScripts = inputScripts;

  const inputPublicDomain = (state.publicDomainIPs || []) as PublicDomainIP[];
  const dedupeChanged =
    base.length !== inputPublicDomain.length || base.some((p, i) => inputPublicDomain[i]?.id !== p.id);

  const publicDomainTouched = dedupeChanged || mergedByName;

  if (!publicDomainTouched && !projectsTouched && !scriptsTouched) return state;

  return {
    ...state,
    publicDomainIPs: nextPublicDomain,
    projects: nextProjects,
    scripts: nextScripts,
  };
}
