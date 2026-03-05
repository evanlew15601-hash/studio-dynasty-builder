/**
 * System registry — ordered list of tick systems.
 * Manages registration, dependency resolution, and execution order.
 */

import type { TickSystem } from './types';

export class SystemRegistry {
  private systems: TickSystem[] = [];

  /** Register a tick system. Order of registration = default execution order. */
  register(system: TickSystem): void {
    if (this.systems.some((s) => s.id === system.id)) {
      console.warn(`SystemRegistry: duplicate system id "${system.id}" — skipping.`);
      return;
    }
    this.systems.push(system);
  }

  /** Register multiple systems at once. */
  registerAll(systems: TickSystem[]): void {
    for (const s of systems) this.register(s);
  }

  /** Get all systems in execution order (respects dependsOn). */
  getOrdered(): readonly TickSystem[] {
    return topologicalSort(this.systems);
  }

  /** Get a system by id. */
  get(id: string): TickSystem | undefined {
    return this.systems.find((s) => s.id === id);
  }

  /** List all registered system ids (in current order). */
  ids(): string[] {
    return this.systems.map((s) => s.id);
  }

  /** Clear all registered systems (useful for testing). */
  clear(): void {
    this.systems = [];
  }
}

/**
 * Simple topological sort respecting dependsOn.
 * Falls back to registration order if no deps specified.
 */
function topologicalSort(systems: TickSystem[]): TickSystem[] {
  const byId = new Map(systems.map((s) => [s.id, s]));
  const visited = new Set<string>();
  const result: TickSystem[] = [];

  function visit(id: string) {
    if (visited.has(id)) return;
    visited.add(id);
    const sys = byId.get(id);
    if (!sys) return;
    for (const dep of sys.dependsOn || []) {
      visit(dep);
    }
    result.push(sys);
  }

  for (const sys of systems) {
    visit(sys.id);
  }

  return result;
}

// ---------------------------------------------------------------------------
// Default registry instance (singleton)
// ---------------------------------------------------------------------------

let defaultRegistry: SystemRegistry | null = null;

export function getDefaultRegistry(): SystemRegistry {
  if (!defaultRegistry) {
    defaultRegistry = new SystemRegistry();
  }
  return defaultRegistry;
}

export function resetDefaultRegistry(): void {
  defaultRegistry = null;
}
