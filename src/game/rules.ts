export type BuildingCategory = 'RESIDENTIAL' | 'BUSINESS' | 'PARK';

export type BuildingSubType =
  | 'TOWNHOUSE'
  | 'SKY_RESIDENCE'
  | 'CAFE'
  | 'TECH_HUB'
  | 'CENTRAL_BANK'
  | 'ECO_PARK'
  | 'BOTANICAL_DOME';

export interface BuildingBlueprint {
  subType: BuildingSubType;
  category: BuildingCategory;
  name: string;
  tagline: string;
  baseCost: number;
  basePopulation: number;
  baseIncomePerSec: number;
  baseWorkersNeeded: number;
  ecologyDelta: number; // positive for parks, negative for dense urban/commercial
}

export interface CityBuildingInput {
  id: number;
  type: BuildingCategory | string;
  subType: BuildingSubType | string;
  level: number;
  gridX: number;
  gridY: number;
}

export interface CityEconomyMetrics {
  rawPopulation: number;
  effectivePopulation: number;
  workersRequired: number;
  workerCapacityRatio: number; // 0.0 to 1.0
  happiness: number; // 25 to 100
  happinessPopulationMultiplier: number;
  baseBusinessIncome: number;
  activeBridges: number;
  tourismBonusPercent: number; // e.g., 15 for 3 bridges (+15%)
  netIncomePerSec: number;
  ecologyNet: number;
}

export interface OfflineProgressResult {
  elapsedSeconds: number;
  effectiveSeconds: number;
  earnedAmount: number;
  wasCappedAt24h: boolean;
}

export const MAX_BRIDGES = 9;
export const TOURISM_BONUS_PER_BRIDGE = 0.05; // +5% per active bridge
export const MAX_OFFLINE_SECONDS = 24 * 60 * 60; // 24 hours bank limit
export const BASE_CITY_POPULATION = 50;
export const BASE_CITY_INCOME = 10;

export const BUILDING_CATALOG: Record<BuildingSubType, BuildingBlueprint> = {
  TOWNHOUSE: {
    subType: 'TOWNHOUSE',
    category: 'RESIDENTIAL',
    name: 'Cedar Townhouse',
    tagline: 'Mid-density timber apartments for skilled citizens',
    baseCost: 400,
    basePopulation: 45,
    baseIncomePerSec: 0,
    baseWorkersNeeded: 0,
    ecologyDelta: -3,
  },
  SKY_RESIDENCE: {
    subType: 'SKY_RESIDENCE',
    category: 'RESIDENTIAL',
    name: 'Aurelia Sky Tower',
    tagline: 'High-capacity vertical housing arcology',
    baseCost: 1400,
    basePopulation: 165,
    baseIncomePerSec: 0,
    baseWorkersNeeded: 0,
    ecologyDelta: -8,
  },
  CAFE: {
    subType: 'CAFE',
    category: 'BUSINESS',
    name: 'Artisan Roastery',
    tagline: 'Local commerce hub with steady daily cashflow',
    baseCost: 550,
    basePopulation: 0,
    baseIncomePerSec: 26,
    baseWorkersNeeded: 35,
    ecologyDelta: -4,
  },
  TECH_HUB: {
    subType: 'TECH_HUB',
    category: 'BUSINESS',
    name: 'Quantum Campus',
    tagline: 'High-yield R&D offices requiring specialized workforce',
    baseCost: 1800,
    basePopulation: 0,
    baseIncomePerSec: 92,
    baseWorkersNeeded: 110,
    ecologyDelta: -10,
  },
  CENTRAL_BANK: {
    subType: 'CENTRAL_BANK',
    category: 'BUSINESS',
    name: 'Sovereign Exchange',
    tagline: 'Metropolitan financial tower driving massive revenue',
    baseCost: 5200,
    basePopulation: 0,
    baseIncomePerSec: 280,
    baseWorkersNeeded: 260,
    ecologyDelta: -16,
  },
  ECO_PARK: {
    subType: 'ECO_PARK',
    category: 'PARK',
    name: 'Emerald Grove Park',
    tagline: 'Restores urban air quality and citizen happiness',
    baseCost: 350,
    basePopulation: 12,
    baseIncomePerSec: 4,
    baseWorkersNeeded: 0,
    ecologyDelta: 18,
  },
  BOTANICAL_DOME: {
    subType: 'BOTANICAL_DOME',
    category: 'PARK',
    name: 'Biosphere Conservatory',
    tagline: 'Geodesic rainforest dome boosting citywide ecology',
    baseCost: 1250,
    basePopulation: 35,
    baseIncomePerSec: 14,
    baseWorkersNeeded: 0,
    ecologyDelta: 44,
  },
};

export function getBlueprint(subType: string): BuildingBlueprint {
  return (
    BUILDING_CATALOG[subType as BuildingSubType] ?? BUILDING_CATALOG.TOWNHOUSE
  );
}

export function getBuildingUpgradeCost(subType: string, currentLevel: number): number {
  const bp = getBlueprint(subType);
  const safeLevel = Math.max(1, currentLevel);
  return Math.round(bp.baseCost * Math.pow(1.45, safeLevel));
}

export function getGridExpansionCost(currentGridSize: number): number {
  const stepsAboveBase = Math.max(0, currentGridSize - 5);
  return Math.round(3000 * Math.pow(2.15, stepsAboveBase));
}

export function getBuildingStatsAtLevel(subType: string, level: number) {
  const bp = getBlueprint(subType);
  const safeLevel = Math.max(1, level);
  const outputScale = 1 + (safeLevel - 1) * 0.45;
  const workerScale = 1 + (safeLevel - 1) * 0.35;
  const ecologyScale = bp.ecologyDelta >= 0
    ? 1 + (safeLevel - 1) * 0.4
    : 1 + (safeLevel - 1) * 0.25;

  return {
    population: Math.round(bp.basePopulation * outputScale),
    incomePerSec: Number((bp.baseIncomePerSec * outputScale).toFixed(1)),
    workersNeeded: Math.round(bp.baseWorkersNeeded * workerScale),
    ecologyDelta: Math.round(bp.ecologyDelta * ecologyScale),
  };
}

export function calculateCityEconomy(
  buildingsList: CityBuildingInput[],
  activeBridgesCount: number
): CityEconomyMetrics {
  let rawPopulation = BASE_CITY_POPULATION;
  let workersRequired = 0;
  let baseBusinessIncome = BASE_CITY_INCOME;
  let ecologyNet = 0;

  for (const b of buildingsList) {
    const stats = getBuildingStatsAtLevel(b.subType, b.level);
    rawPopulation += stats.population;
    workersRequired += stats.workersNeeded;
    baseBusinessIncome += stats.incomePerSec;
    ecologyNet += stats.ecologyDelta;
  }

  // Base city happiness is 88, modified by net ecology
  const happiness = Math.max(25, Math.min(100, Math.round(88 + ecologyNet)));

  // Ecology/Happiness affects population growth/retention
  let happinessPopulationMultiplier = 1.0;
  if (happiness < 70) {
    happinessPopulationMultiplier = Number((0.5 + (happiness / 140)).toFixed(2));
  } else if (happiness >= 90) {
    happinessPopulationMultiplier = 1.1;
  }

  const effectivePopulation = Math.max(
    BASE_CITY_POPULATION,
    Math.round(rawPopulation * happinessPopulationMultiplier)
  );

  // Worker Mechanic: Businesses require population to run at 100% capacity
  const workerCapacityRatio =
    workersRequired <= 0
      ? 1.0
      : Math.min(1.0, Number((effectivePopulation / workersRequired).toFixed(3)));

  // Bridges Tourism Bonus: max 9 bridges, +5% per active bridge
  const clampedBridges = Math.max(0, Math.min(MAX_BRIDGES, activeBridgesCount));
  const tourismBonusPercent = Math.round(
    clampedBridges * TOURISM_BONUS_PER_BRIDGE * 100
  );
  const tourismMultiplier = 1 + clampedBridges * TOURISM_BONUS_PER_BRIDGE;

  const netIncomePerSec = Number(
    (baseBusinessIncome * workerCapacityRatio * tourismMultiplier).toFixed(2)
  );

  return {
    rawPopulation,
    effectivePopulation,
    workersRequired,
    workerCapacityRatio,
    happiness,
    happinessPopulationMultiplier,
    baseBusinessIncome: Number(baseBusinessIncome.toFixed(2)),
    activeBridges: clampedBridges,
    tourismBonusPercent,
    netIncomePerSec,
    ecologyNet,
  };
}

export function calculateOfflineProgress(
  lastSyncTimestampMs: number,
  currentTimestampMs: number,
  incomePerSec: number
): OfflineProgressResult {
  const rawElapsedSeconds = Math.max(
    0,
    Math.floor((currentTimestampMs - lastSyncTimestampMs) / 1000)
  );
  const wasCappedAt24h = rawElapsedSeconds > MAX_OFFLINE_SECONDS;
  const effectiveSeconds = Math.min(rawElapsedSeconds, MAX_OFFLINE_SECONDS);
  const earnedAmount = Number(
    (effectiveSeconds * Math.max(0, incomePerSec)).toFixed(2)
  );

  return {
    elapsedSeconds: rawElapsedSeconds,
    effectiveSeconds,
    earnedAmount,
    wasCappedAt24h,
  };
}
