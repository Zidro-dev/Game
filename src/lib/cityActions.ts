import { BuildingSubType } from '../game/rules';

export interface CityUserDTO {
  id: number;
  uid: string;
  username: string;
  email: string;
}

export interface CityDTO {
  id: number;
  userId: number;
  name: string;
  balance: number;
  population: number;
  happiness: number;
  gridSize: number;
  incomePerSec: number;
  lastSyncAt: string;
}

export interface BuildingDTO {
  id: number;
  cityId: number;
  type: 'RESIDENTIAL' | 'BUSINESS' | 'PARK' | string;
  subType: BuildingSubType | string;
  level: number;
  gridX: number;
  gridY: number;
}

export interface BridgeDTO {
  id: number;
  status: 'PENDING' | 'ACTIVE' | string;
  direction: 'OUTGOING' | 'INCOMING';
  partnerCityId: number;
  partnerCityName: string;
  partnerUsername: string;
  partnerPopulation: number;
  partnerIncomePerSec: number;
}

export interface OfflineReportDTO {
  elapsedSeconds: number;
  effectiveSeconds: number;
  earnedAmount: number;
  wasCappedAt24h: boolean;
}

export interface FullCityResponse {
  user: CityUserDTO;
  city: CityDTO;
  buildings: BuildingDTO[];
  bridges: BridgeDTO[];
  offlineReport?: OfflineReportDTO;
}

export interface LeaderboardEntryDTO {
  cityId: number;
  cityName: string;
  username: string;
  incomePerSec: number;
  population: number;
  happiness: number;
  balance: number;
  gridSize: number;
}

async function apiFetch<T>(
  path: string,
  token: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options?.headers || {}),
    },
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data as T;
}

export const cityActions = {
  fetchMyCity: (token: string) => apiFetch<FullCityResponse>('/api/city', token),

  constructBuilding: (
    token: string,
    payload: {
      subType: BuildingSubType;
      gridX: number;
      gridY: number;
      clientBalance: number;
    }
  ) =>
    apiFetch<{
      city: CityDTO;
      buildings: BuildingDTO[];
      createdBuilding: BuildingDTO;
    }>('/api/city/build', token, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  upgradeBuilding: (
    token: string,
    payload: { buildingId: number; clientBalance: number }
  ) =>
    apiFetch<{
      city: CityDTO;
      buildings: BuildingDTO[];
      upgradedBuilding: BuildingDTO;
    }>('/api/city/upgrade', token, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  demolishBuilding: (
    token: string,
    payload: { buildingId: number; clientBalance: number }
  ) =>
    apiFetch<{ city: CityDTO; buildings: BuildingDTO[] }>(
      '/api/city/demolish',
      token,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    ),

  expandGrid: (token: string, clientBalance: number) =>
    apiFetch<{ city: CityDTO }>('/api/city/expand', token, {
      method: 'POST',
      body: JSON.stringify({ clientBalance }),
    }),

  syncBalance: (token: string, balance: number) =>
    apiFetch<{ city: CityDTO }>('/api/city/sync', token, {
      method: 'POST',
      body: JSON.stringify({ balance }),
    }),

  requestBridge: (token: string, targetUsername: string) =>
    apiFetch<{ city: CityDTO; bridges: BridgeDTO[] }>(
      '/api/bridges/request',
      token,
      {
        method: 'POST',
        body: JSON.stringify({ targetUsername }),
      }
    ),

  acceptBridge: (token: string, bridgeId: number) =>
    apiFetch<{ city: CityDTO; bridges: BridgeDTO[] }>(
      '/api/bridges/accept',
      token,
      {
        method: 'POST',
        body: JSON.stringify({ bridgeId }),
      }
    ),

  visitReadOnlyCity: (token: string, cityId: number) =>
    apiFetch<{
      ownerUsername: string;
      city: CityDTO;
      buildings: BuildingDTO[];
      bridges: BridgeDTO[];
    }>(`/api/city/visit/${cityId}`, token),

  fetchLeaderboards: (token: string) =>
    apiFetch<{
      billionaires: LeaderboardEntryDTO[];
      megapolises: LeaderboardEntryDTO[];
    }>('/api/leaderboards', token),
};
