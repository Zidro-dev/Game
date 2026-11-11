import { and, desc, eq, or } from 'drizzle-orm';
import { db } from './index.ts';
import { bridges, buildings, cities, users } from './schema.ts';
import {
  BUILDING_CATALOG,
  BuildingSubType,
  calculateCityEconomy,
  calculateOfflineProgress,
  getBlueprint,
  getBuildingUpgradeCost,
  getGridExpansionCost,
  MAX_BRIDGES,
} from '../game/rules.ts';

export interface FullCityPayload {
  user: typeof users.$inferSelect;
  city: typeof cities.$inferSelect;
  buildings: (typeof buildings.$inferSelect)[];
  bridges: {
    id: number;
    status: string;
    direction: 'OUTGOING' | 'INCOMING';
    partnerCityId: number;
    partnerCityName: string;
    partnerUsername: string;
    partnerPopulation: number;
    partnerIncomePerSec: number;
  }[];
  offlineReport?: {
    elapsedSeconds: number;
    effectiveSeconds: number;
    earnedAmount: number;
    wasCappedAt24h: boolean;
  };
}

const NEIGHBOR_SEEDS = [
  {
    uid: 'seed_samarkand',
    username: 'samarkand_mayor',
    email: 'mayor@samarkand.city',
    cityName: 'Samarkand Meridian',
    balance: 48500,
    gridSize: 6,
    layout: [
      { type: 'RESIDENTIAL', subType: 'SKY_RESIDENCE', level: 3, gridX: 1, gridY: 1 },
      { type: 'RESIDENTIAL', subType: 'TOWNHOUSE', level: 2, gridX: 2, gridY: 1 },
      { type: 'BUSINESS', subType: 'CENTRAL_BANK', level: 2, gridX: 2, gridY: 2 },
      { type: 'BUSINESS', subType: 'TECH_HUB', level: 3, gridX: 3, gridY: 2 },
      { type: 'PARK', subType: 'BOTANICAL_DOME', level: 2, gridX: 1, gridY: 2 },
      { type: 'PARK', subType: 'ECO_PARK', level: 2, gridX: 3, gridY: 1 },
    ],
  },
  {
    uid: 'seed_bukhara',
    username: 'bukhara_arch',
    email: 'arch@bukhara.city',
    cityName: 'Bukhara Solar Citadel',
    balance: 31200,
    gridSize: 6,
    layout: [
      { type: 'RESIDENTIAL', subType: 'SKY_RESIDENCE', level: 2, gridX: 0, gridY: 0 },
      { type: 'RESIDENTIAL', subType: 'SKY_RESIDENCE', level: 2, gridX: 1, gridY: 0 },
      { type: 'BUSINESS', subType: 'TECH_HUB', level: 2, gridX: 2, gridY: 2 },
      { type: 'BUSINESS', subType: 'CAFE', level: 3, gridX: 1, gridY: 2 },
      { type: 'PARK', subType: 'BOTANICAL_DOME', level: 1, gridX: 2, gridY: 1 },
    ],
  },
  {
    uid: 'seed_khiva',
    username: 'khiva_prime',
    email: 'prime@khiva.city',
    cityName: 'Khiva Emerald Oasis',
    balance: 19400,
    gridSize: 5,
    layout: [
      { type: 'RESIDENTIAL', subType: 'TOWNHOUSE', level: 3, gridX: 1, gridY: 1 },
      { type: 'RESIDENTIAL', subType: 'SKY_RESIDENCE', level: 1, gridX: 2, gridY: 1 },
      { type: 'BUSINESS', subType: 'TECH_HUB', level: 1, gridX: 2, gridY: 2 },
      { type: 'PARK', subType: 'ECO_PARK', level: 3, gridX: 1, gridY: 2 },
    ],
  },
  {
    uid: 'seed_fergana',
    username: 'fergana_eco',
    email: 'eco@fergana.city',
    cityName: 'Fergana Green Valley',
    balance: 64900,
    gridSize: 7,
    layout: [
      { type: 'RESIDENTIAL', subType: 'SKY_RESIDENCE', level: 4, gridX: 2, gridY: 1 },
      { type: 'RESIDENTIAL', subType: 'SKY_RESIDENCE', level: 3, gridX: 3, gridY: 1 },
      { type: 'BUSINESS', subType: 'CENTRAL_BANK', level: 3, gridX: 2, gridY: 2 },
      { type: 'BUSINESS', subType: 'CENTRAL_BANK', level: 2, gridX: 3, gridY: 2 },
      { type: 'PARK', subType: 'BOTANICAL_DOME', level: 3, gridX: 2, gridY: 3 },
      { type: 'PARK', subType: 'BOTANICAL_DOME', level: 2, gridX: 3, gridY: 3 },
    ],
  },
];

async function ensureNeighborSeedsExist(playerCityId: number) {
  try {
    for (const seed of NEIGHBOR_SEEDS) {
      const upsertedUsers = await db
        .insert(users)
        .values({
          uid: seed.uid,
          username: seed.username,
          email: seed.email,
        })
        .onConflictDoUpdate({
          target: users.uid,
          set: { email: seed.email },
        })
        .returning();

      const seedUser = upsertedUsers[0];
      const existingCities = await db
        .select()
        .from(cities)
        .where(eq(cities.userId, seedUser.id));

      if (existingCities.length === 0) {
        const econ = calculateCityEconomy(
          seed.layout.map((b, idx) => ({ id: idx + 1, ...b })),
          2
        );
        const insertedCities = await db
          .insert(cities)
          .values({
            userId: seedUser.id,
            name: seed.cityName,
            balance: seed.balance,
            population: econ.effectivePopulation,
            happiness: econ.happiness,
            gridSize: seed.gridSize,
            incomePerSec: econ.netIncomePerSec,
          })
          .returning();

        const createdSeedCity = insertedCities[0];
        for (const item of seed.layout) {
          await db.insert(buildings).values({
            cityId: createdSeedCity.id,
            type: item.type,
            subType: item.subType,
            level: item.level,
            gridX: item.gridX,
            gridY: item.gridY,
          });
        }

        // Create 1 active bridge from Samarkand and 1 pending bridge from Bukhara to the new player
        if (seed.username === 'samarkand_mayor') {
          await db.insert(bridges).values({
            fromCityId: createdSeedCity.id,
            toCityId: playerCityId,
            status: 'ACTIVE',
          });
        } else if (seed.username === 'bukhara_arch') {
          await db.insert(bridges).values({
            fromCityId: createdSeedCity.id,
            toCityId: playerCityId,
            status: 'PENDING',
          });
        }
      }
    }
  } catch (error) {
    console.error('Seed neighbor initialization error:', error);
    throw new Error('Failed to initialize neighbor cities.', { cause: error });
  }
}

export async function getOrCreateUserAndCity(
  uid: string,
  email: string,
  preferredUsername?: string
): Promise<FullCityPayload> {
  try {
    const cleanHandle = (
      preferredUsername ||
      email.split('@')[0] ||
      `mayor_${uid.slice(0, 6)}`
    )
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_');

    const existingByUid = await db
      .select()
      .from(users)
      .where(eq(users.uid, uid));

    let userRecord: typeof users.$inferSelect;
    if (existingByUid.length > 0) {
      userRecord = existingByUid[0];
    } else {
      const existingByUsername = await db
        .select()
        .from(users)
        .where(eq(users.username, cleanHandle));
      const uniqueUsername =
        existingByUsername.length > 0
          ? `${cleanHandle}_${Math.floor(100 + Math.random() * 899)}`
          : cleanHandle;

      const inserted = await db
        .insert(users)
        .values({
          uid,
          username: uniqueUsername,
          email: email || `${uniqueUsername}@aurelia.city`,
        })
        .onConflictDoUpdate({
          target: users.uid,
          set: { email: email || `${uniqueUsername}@aurelia.city` },
        })
        .returning();
      userRecord = inserted[0];
    }

    const existingCities = await db
      .select()
      .from(cities)
      .where(eq(cities.userId, userRecord.id));

    let cityRecord: typeof cities.$inferSelect;
    let isNewCity = false;

    if (existingCities.length === 0) {
      isNewCity = true;
      const defaultName = `${userRecord.username.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())} Polis`;
      const createdCities = await db
        .insert(cities)
        .values({
          userId: userRecord.id,
          name: defaultName,
          balance: 2800,
          population: 107,
          happiness: 100,
          gridSize: 5,
          incomePerSec: 38.5,
          lastSyncAt: new Date(Date.now() - 45 * 60 * 1000), // 45 mins offline earnings on first boot
        })
        .returning();
      cityRecord = createdCities[0];

      // Starter buildings on the 5x5 grid
      await db.insert(buildings).values([
        {
          cityId: cityRecord.id,
          type: 'RESIDENTIAL',
          subType: 'TOWNHOUSE',
          level: 1,
          gridX: 1,
          gridY: 2,
        },
        {
          cityId: cityRecord.id,
          type: 'BUSINESS',
          subType: 'CAFE',
          level: 1,
          gridX: 2,
          gridY: 2,
        },
        {
          cityId: cityRecord.id,
          type: 'PARK',
          subType: 'ECO_PARK',
          level: 1,
          gridX: 2,
          gridY: 1,
        },
      ]);
    } else {
      cityRecord = existingCities[0];
    }

    await ensureNeighborSeedsExist(cityRecord.id);

    // Compute offline progress if > 5 seconds elapsed
    const nowMs = Date.now();
    const lastSyncMs = new Date(cityRecord.lastSyncAt).getTime();
    const cityBuildings = await db
      .select()
      .from(buildings)
      .where(eq(buildings.cityId, cityRecord.id));

    const bridgeDetails = await getCityBridgesDetailed(cityRecord.id);
    const activeBridgeCount = bridgeDetails.filter(
      (b) => b.status === 'ACTIVE'
    ).length;

    const econ = calculateCityEconomy(cityBuildings, activeBridgeCount);
    const offlineReport = calculateOfflineProgress(
      lastSyncMs,
      nowMs,
      econ.netIncomePerSec
    );

    if (offlineReport.earnedAmount > 0 || isNewCity) {
      const newBalance = Number(
        (cityRecord.balance + offlineReport.earnedAmount).toFixed(2)
      );
      const updated = await db
        .update(cities)
        .set({
          balance: newBalance,
          population: econ.effectivePopulation,
          happiness: econ.happiness,
          incomePerSec: econ.netIncomePerSec,
          lastSyncAt: new Date(nowMs),
        })
        .where(eq(cities.id, cityRecord.id))
        .returning();
      cityRecord = updated[0];
    }

    return {
      user: userRecord,
      city: cityRecord,
      buildings: cityBuildings,
      bridges: bridgeDetails,
      offlineReport:
        offlineReport.effectiveSeconds >= 10 ? offlineReport : undefined,
    };
  } catch (error) {
    console.error('Database query failed in getOrCreateUserAndCity:', error);
    throw new Error('Failed to load or initialize city profile.', {
      cause: error,
    });
  }
}

export async function getCityBridgesDetailed(cityId: number) {
  try {
    const rawBridges = await db
      .select()
      .from(bridges)
      .where(or(eq(bridges.fromCityId, cityId), eq(bridges.toCityId, cityId)));

    const allCities = await db.select().from(cities);
    const allUsers = await db.select().from(users);

    const cityMap = new Map(allCities.map((c) => [c.id, c]));
    const userMap = new Map(allUsers.map((u) => [u.id, u]));

    return rawBridges
      .map((br) => {
        const isOutgoing = br.fromCityId === cityId;
        const partnerId = isOutgoing ? br.toCityId : br.fromCityId;
        const partnerCity = cityMap.get(partnerId);
        if (!partnerCity) return null;
        const partnerUser = userMap.get(partnerCity.userId);
        return {
          id: br.id,
          status: br.status,
          direction: (isOutgoing ? 'OUTGOING' : 'INCOMING') as
            | 'OUTGOING'
            | 'INCOMING',
          partnerCityId: partnerCity.id,
          partnerCityName: partnerCity.name,
          partnerUsername: partnerUser?.username ?? 'unknown_mayor',
          partnerPopulation: partnerCity.population,
          partnerIncomePerSec: partnerCity.incomePerSec,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  } catch (error) {
    console.error('Database query failed in getCityBridgesDetailed:', error);
    throw new Error('Failed to fetch bridge connections.', { cause: error });
  }
}

export async function buildStructureInCity(
  uid: string,
  subType: BuildingSubType,
  gridX: number,
  gridY: number,
  clientBalance?: number
) {
  try {
    const profile = await getOrCreateUserAndCity(uid, '');
    const { city, buildings: existingBuildings, bridges: cityBridges } = profile;

    if (gridX < 0 || gridY < 0 || gridX >= city.gridSize || gridY >= city.gridSize) {
      throw new Error('Coordinates are outside the current city grid boundaries.');
    }

    const occupied = existingBuildings.find(
      (b) => b.gridX === gridX && b.gridY === gridY
    );
    if (occupied) {
      throw new Error('Selected grid tile is already occupied by a building.');
    }

    const blueprint = getBlueprint(subType);
    const currentBal =
      typeof clientBalance === 'number' && clientBalance >= city.balance
        ? clientBalance
        : city.balance;

    if (currentBal < blueprint.baseCost) {
      throw new Error(
        `Insufficient treasury balance. Need $${blueprint.baseCost.toLocaleString()}.`
      );
    }

    const insertedBuilding = await db
      .insert(buildings)
      .values({
        cityId: city.id,
        type: blueprint.category,
        subType: blueprint.subType,
        level: 1,
        gridX,
        gridY,
      })
      .returning();

    const updatedBuildings = [...existingBuildings, insertedBuilding[0]];
    const activeBridges = cityBridges.filter((b) => b.status === 'ACTIVE').length;
    const econ = calculateCityEconomy(updatedBuildings, activeBridges);

    const newBalance = Number((currentBal - blueprint.baseCost).toFixed(2));
    const updatedCity = await db
      .update(cities)
      .set({
        balance: newBalance,
        population: econ.effectivePopulation,
        happiness: econ.happiness,
        incomePerSec: econ.netIncomePerSec,
        lastSyncAt: new Date(),
      })
      .where(eq(cities.id, city.id))
      .returning();

    return {
      city: updatedCity[0],
      buildings: updatedBuildings,
      createdBuilding: insertedBuilding[0],
    };
  } catch (error: any) {
    console.error('Database query failed in buildStructureInCity:', error);
    throw new Error(error.message || 'Failed to construct building.', {
      cause: error,
    });
  }
}

export async function upgradeBuildingInCity(
  uid: string,
  buildingId: number,
  clientBalance?: number
) {
  try {
    const profile = await getOrCreateUserAndCity(uid, '');
    const { city, buildings: existingBuildings, bridges: cityBridges } = profile;

    const target = existingBuildings.find((b) => b.id === buildingId);
    if (!target) {
      throw new Error('Building not found in your city.');
    }

    const cost = getBuildingUpgradeCost(target.subType, target.level);
    const currentBal =
      typeof clientBalance === 'number' && clientBalance >= city.balance
        ? clientBalance
        : city.balance;

    if (currentBal < cost) {
      throw new Error(
        `Insufficient balance for upgrade. Need $${cost.toLocaleString()}.`
      );
    }

    const upgraded = await db
      .update(buildings)
      .set({ level: target.level + 1 })
      .where(and(eq(buildings.id, buildingId), eq(buildings.cityId, city.id)))
      .returning();

    const updatedBuildings = existingBuildings.map((b) =>
      b.id === buildingId ? upgraded[0] : b
    );
    const activeBridges = cityBridges.filter((b) => b.status === 'ACTIVE').length;
    const econ = calculateCityEconomy(updatedBuildings, activeBridges);

    const newBalance = Number((currentBal - cost).toFixed(2));
    const updatedCity = await db
      .update(cities)
      .set({
        balance: newBalance,
        population: econ.effectivePopulation,
        happiness: econ.happiness,
        incomePerSec: econ.netIncomePerSec,
        lastSyncAt: new Date(),
      })
      .where(eq(cities.id, city.id))
      .returning();

    return {
      city: updatedCity[0],
      buildings: updatedBuildings,
      upgradedBuilding: upgraded[0],
    };
  } catch (error: any) {
    console.error('Database query failed in upgradeBuildingInCity:', error);
    throw new Error(error.message || 'Failed to upgrade building.', {
      cause: error,
    });
  }
}

export async function demolishBuildingInCity(
  uid: string,
  buildingId: number,
  clientBalance?: number
) {
  try {
    const profile = await getOrCreateUserAndCity(uid, '');
    const { city, buildings: existingBuildings, bridges: cityBridges } = profile;

    const target = existingBuildings.find((b) => b.id === buildingId);
    if (!target) {
      throw new Error('Building not found in your city.');
    }

    const blueprint = getBlueprint(target.subType);
    const refund = Math.round(blueprint.baseCost * 0.5);

    await db
      .delete(buildings)
      .where(and(eq(buildings.id, buildingId), eq(buildings.cityId, city.id)));

    const updatedBuildings = existingBuildings.filter((b) => b.id !== buildingId);
    const activeBridges = cityBridges.filter((b) => b.status === 'ACTIVE').length;
    const econ = calculateCityEconomy(updatedBuildings, activeBridges);

    const currentBal =
      typeof clientBalance === 'number' && clientBalance >= city.balance
        ? clientBalance
        : city.balance;

    const updatedCity = await db
      .update(cities)
      .set({
        balance: Number((currentBal + refund).toFixed(2)),
        population: econ.effectivePopulation,
        happiness: econ.happiness,
        incomePerSec: econ.netIncomePerSec,
        lastSyncAt: new Date(),
      })
      .where(eq(cities.id, city.id))
      .returning();

    return {
      city: updatedCity[0],
      buildings: updatedBuildings,
    };
  } catch (error: any) {
    console.error('Database query failed in demolishBuildingInCity:', error);
    throw new Error(error.message || 'Failed to demolish building.', {
      cause: error,
    });
  }
}

export async function expandCityGrid(uid: string, clientBalance?: number) {
  try {
    const profile = await getOrCreateUserAndCity(uid, '');
    const { city } = profile;

    if (city.gridSize >= 9) {
      throw new Error('Maximum Megapolis grid size (9x9) already reached.');
    }

    const cost = getGridExpansionCost(city.gridSize);
    const currentBal =
      typeof clientBalance === 'number' && clientBalance >= city.balance
        ? clientBalance
        : city.balance;

    if (currentBal < cost) {
      throw new Error(
        `Insufficient balance to expand grid. Need $${cost.toLocaleString()}.`
      );
    }

    const updatedCity = await db
      .update(cities)
      .set({
        gridSize: city.gridSize + 1,
        balance: Number((currentBal - cost).toFixed(2)),
        lastSyncAt: new Date(),
      })
      .where(eq(cities.id, city.id))
      .returning();

    return updatedCity[0];
  } catch (error: any) {
    console.error('Database query failed in expandCityGrid:', error);
    throw new Error(error.message || 'Failed to expand city grid.', {
      cause: error,
    });
  }
}

export async function syncCityBalance(uid: string, clientBalance: number) {
  try {
    const profile = await getOrCreateUserAndCity(uid, '');
    const { city, buildings: existingBuildings, bridges: cityBridges } = profile;

    const activeBridges = cityBridges.filter((b) => b.status === 'ACTIVE').length;
    const econ = calculateCityEconomy(existingBuildings, activeBridges);

    const safeBalance = Math.max(city.balance, Number(clientBalance.toFixed(2)));
    const updatedCity = await db
      .update(cities)
      .set({
        balance: safeBalance,
        population: econ.effectivePopulation,
        happiness: econ.happiness,
        incomePerSec: econ.netIncomePerSec,
        lastSyncAt: new Date(),
      })
      .where(eq(cities.id, city.id))
      .returning();

    return updatedCity[0];
  } catch (error: any) {
    console.error('Database query failed in syncCityBalance:', error);
    throw new Error('Failed to sync city treasury.', { cause: error });
  }
}

export async function requestBridgeAlliance(uid: string, targetUsername: string) {
  try {
    const profile = await getOrCreateUserAndCity(uid, '');
    const { city, bridges: existingBridges } = profile;

    const cleanTarget = targetUsername.trim().replace(/^@/, '').toLowerCase();
    if (!cleanTarget) {
      throw new Error('Please enter a valid mayor username.');
    }

    if (cleanTarget === profile.user.username.toLowerCase()) {
      throw new Error('You cannot build a bridge to your own city.');
    }

    const activeOrPendingCount = existingBridges.length;
    if (activeOrPendingCount >= MAX_BRIDGES) {
      throw new Error(
        `Maximum of ${MAX_BRIDGES} bridge connections per city reached.`
      );
    }

    const targetUsers = await db
      .select()
      .from(users)
      .where(eq(users.username, cleanTarget));
    if (targetUsers.length === 0) {
      throw new Error(`Mayor "@${cleanTarget}" was not found.`);
    }

    const targetCities = await db
      .select()
      .from(cities)
      .where(eq(cities.userId, targetUsers[0].id));
    if (targetCities.length === 0) {
      throw new Error(`Mayor "@${cleanTarget}" has not founded a city yet.`);
    }

    const partnerCity = targetCities[0];
    const alreadyConnected = existingBridges.some(
      (b) => b.partnerCityId === partnerCity.id
    );
    if (alreadyConnected) {
      throw new Error(
        `A bridge connection or request with ${partnerCity.name} already exists.`
      );
    }

    // Seed neighbor cities auto-accept alliance requests so gameplay is immediately rewarding
    const isSeedCity = targetUsers[0].uid.startsWith('seed_');
    await db.insert(bridges).values({
      fromCityId: city.id,
      toCityId: partnerCity.id,
      status: isSeedCity ? 'ACTIVE' : 'PENDING',
    });

    const updatedBridges = await getCityBridgesDetailed(city.id);
    const cityBuildings = await db
      .select()
      .from(buildings)
      .where(eq(buildings.cityId, city.id));
    const activeCount = updatedBridges.filter((b) => b.status === 'ACTIVE').length;
    const econ = calculateCityEconomy(cityBuildings, activeCount);

    const updatedCity = await db
      .update(cities)
      .set({
        incomePerSec: econ.netIncomePerSec,
        lastSyncAt: new Date(),
      })
      .where(eq(cities.id, city.id))
      .returning();

    return {
      city: updatedCity[0],
      bridges: updatedBridges,
    };
  } catch (error: any) {
    console.error('Database query failed in requestBridgeAlliance:', error);
    throw new Error(error.message || 'Failed to request bridge alliance.', {
      cause: error,
    });
  }
}

export async function acceptBridgeAlliance(uid: string, bridgeId: number) {
  try {
    const profile = await getOrCreateUserAndCity(uid, '');
    const { city, buildings: cityBuildings } = profile;

    await db
      .update(bridges)
      .set({ status: 'ACTIVE' })
      .where(eq(bridges.id, bridgeId));

    const updatedBridges = await getCityBridgesDetailed(city.id);
    const activeCount = updatedBridges.filter((b) => b.status === 'ACTIVE').length;
    const econ = calculateCityEconomy(cityBuildings, activeCount);

    const updatedCity = await db
      .update(cities)
      .set({
        incomePerSec: econ.netIncomePerSec,
        lastSyncAt: new Date(),
      })
      .where(eq(cities.id, city.id))
      .returning();

    return {
      city: updatedCity[0],
      bridges: updatedBridges,
    };
  } catch (error: any) {
    console.error('Database query failed in acceptBridgeAlliance:', error);
    throw new Error(error.message || 'Failed to accept bridge alliance.', {
      cause: error,
    });
  }
}

export async function getReadOnlyCityById(targetCityId: number) {
  try {
    const foundCities = await db
      .select()
      .from(cities)
      .where(eq(cities.id, targetCityId));
    if (foundCities.length === 0) {
      throw new Error('Target city not found.');
    }
    const targetCity = foundCities[0];
    const ownerList = await db
      .select()
      .from(users)
      .where(eq(users.id, targetCity.userId));
    const targetBuildings = await db
      .select()
      .from(buildings)
      .where(eq(buildings.cityId, targetCity.id));
    const targetBridges = await getCityBridgesDetailed(targetCity.id);

    return {
      ownerUsername: ownerList[0]?.username ?? 'mayor',
      city: targetCity,
      buildings: targetBuildings,
      bridges: targetBridges,
    };
  } catch (error: any) {
    console.error('Database query failed in getReadOnlyCityById:', error);
    throw new Error(error.message || 'Failed to load visited city.', {
      cause: error,
    });
  }
}

export async function getLeaderboards() {
  try {
    const allCities = await db.select().from(cities);
    const allUsers = await db.select().from(users);
    const userMap = new Map(allUsers.map((u) => [u.id, u.username]));

    const enriched = allCities.map((c) => ({
      cityId: c.id,
      cityName: c.name,
      username: userMap.get(c.userId) ?? 'mayor',
      incomePerSec: c.incomePerSec,
      population: c.population,
      happiness: c.happiness,
      balance: c.balance,
      gridSize: c.gridSize,
    }));

    const billionaires = [...enriched]
      .sort((a, b) => b.incomePerSec - a.incomePerSec)
      .slice(0, 15);
    const megapolises = [...enriched]
      .sort((a, b) => b.population - a.population)
      .slice(0, 15);

    return { billionaires, megapolises };
  } catch (error: any) {
    console.error('Database query failed in getLeaderboards:', error);
    throw new Error('Failed to load leaderboards.', { cause: error });
  }
}
