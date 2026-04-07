export const BUILDING_TYPES = ['house', 'school', 'park', 'shop'] as const;
export type BuildingType = (typeof BUILDING_TYPES)[number];

export const COIN_COST_PER_TAP = 10;
export const PROGRESS_PER_TAP = 10;
export const MAX_PROGRESS = 100;
export const MAX_LEVEL = 5;

export function isBuildingType(value: string): value is BuildingType {
  return (BUILDING_TYPES as readonly string[]).includes(value);
}
