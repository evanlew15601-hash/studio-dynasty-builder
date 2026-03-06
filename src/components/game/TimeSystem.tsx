// Time Management System - Handles all time-based calculations
// Re-exported from the core simulation layer so the tick engine can depend on it without importing from components.

export type { TimeState } from '@/game/core/time';
export { TimeSystem } from '@/game/core/time';