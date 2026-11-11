import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BuildingSubType,
  calculateCityEconomy,
  CityEconomyMetrics,
} from '../game/rules';
import {
  BridgeDTO,
  BuildingDTO,
   cityActions,
  CityDTO,
  CityUserDTO,
  LeaderboardEntryDTO,
  OfflineReportDTO,
} from '../lib/cityActions';

export interface VisitedCityState {
  ownerUsername: string;
  city: CityDTO;
  buildings: BuildingDTO[];
  bridges: BridgeDTO[];
}

export function playSynthSound(
  type: 'build' | 'upgrade' | 'bridge' | 'expand' | 'error',
  muted: boolean
) {
  if (muted || typeof window === 'undefined') return;
  try {
    const AudioCtx =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    if (type === 'build') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(520, now + 0.12);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      osc.start(now);
      osc.stop(now + 0.14);
    } else if (type === 'upgrade') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(660, now + 0.16);
      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc.start(now);
      osc.stop(now + 0.18);
    } else if (type === 'bridge') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(392, now);
      osc.frequency.exponentialRampToValueAtTime(784, now + 0.22);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
      osc.start(now);
      osc.stop(now + 0.24);
    } else if (type === 'expand') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(261.6, now);
      osc.frequency.exponentialRampToValueAtTime(523.2, now + 0.25);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);
      osc.start(now);
      osc.stop(now + 0.26);
    } else {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.linearRampToValueAtTime(130, now + 0.12);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      osc.start(now);
      osc.stop(now + 0.14);
    }
  } catch {
    // Ignore audio context restrictions
  }
}

export function useCityEngine(authToken: string | null, isPlaying: boolean) {
  const [user, setUser] = useState<CityUserDTO | null>(null);
  const [city, setCity] = useState<CityDTO | null>(null);
  const [buildings, setBuildings] = useState<BuildingDTO[]>([]);
  const [bridges, setBridges] = useState<BridgeDTO[]>([]);
  const [liveBalance, setLiveBalance] = useState<number>(2800);
  const [offlineReport, setOfflineReport] = useState<OfflineReportDTO | null>(
    null
  );
  const [visitedCity, setVisitedCity] = useState<VisitedCityState | null>(null);
  const [leaderboards, setLeaderboards] = useState<{
    billionaires: LeaderboardEntryDTO[];
    megapolises: LeaderboardEntryDTO[];
  }>({ billionaires: [], megapolises: [] });

  const [loading, setLoading] = useState<boolean>(false);
  const [actionBusy, setActionBusy] = useState<boolean>(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [muted, setMuted] = useState<boolean>(false);

  const liveBalanceRef = useRef<number>(liveBalance);
  liveBalanceRef.current = liveBalance;

  const activeBridgesCount = useMemo(
    () => bridges.filter((b) => b.status === 'ACTIVE').length,
    [bridges]
  );

  // Compute live economy for either player's own city or the visited read-only city
  const myEconomy: CityEconomyMetrics = useMemo(
    () => calculateCityEconomy(buildings, activeBridgesCount),
    [buildings, activeBridgesCount]
  );

  const visitedEconomy: CityEconomyMetrics | null = useMemo(() => {
    if (!visitedCity) return null;
    const visitedActiveBridges = visitedCity.bridges.filter(
      (b) => b.status === 'ACTIVE'
    ).length;
    return calculateCityEconomy(visitedCity.buildings, visitedActiveBridges);
  }, [visitedCity]);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3200);
  }, []);

  // Initial load from database (calculates offline progress on server + returns report)
  const loadCityData = useCallback(async () => {
    if (!authToken) return;
    setLoading(true);
    setErrorBanner(null);
    try {
      const [cityPayload, rankings] = await Promise.all([
        cityActions.fetchMyCity(authToken),
        cityActions.fetchLeaderboards(authToken),
      ]);
      setUser(cityPayload.user);
      setCity(cityPayload.city);
      setBuildings(cityPayload.buildings);
      setBridges(cityPayload.bridges);
      setLiveBalance(cityPayload.city.balance);
      if (cityPayload.offlineReport && cityPayload.offlineReport.earnedAmount > 0) {
        setOfflineReport(cityPayload.offlineReport);
      }
      setLeaderboards(rankings);
    } catch (err: any) {
      setErrorBanner(err.message || 'Failed to load city data.');
    } finally {
      setLoading(false);
    }
  }, [authToken]);

  useEffect(() => {
    if (authToken) {
      loadCityData();
    }
  }, [authToken, loadCityData]);

  // 1-second online ticking loop (does NOT spam database; updates React state smoothly)
  useEffect(() => {
    if (!authToken || !city || !isPlaying) return;
    const interval = setInterval(() => {
      setLiveBalance((prev) =>
        Number((prev + myEconomy.netIncomePerSec).toFixed(2))
      );
    }, 1000);
    return () => clearInterval(interval);
  }, [authToken, city, isPlaying, myEconomy.netIncomePerSec]);

  // Sync balance on tab hide or manual save
  const syncTreasuryNow = useCallback(async () => {
    if (!authToken || !city) return;
    try {
      const res = await cityActions.syncBalance(
        authToken,
        liveBalanceRef.current
      );
      setCity(res.city);
      showToast('City treasury synchronized to Cloud SQL.');
    } catch (err: any) {
      setErrorBanner(err.message || 'Failed to sync treasury.');
    }
  }, [authToken, city, showToast]);

  useEffect(() => {
    if (!authToken) return;
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && city) {
        cityActions
          .syncBalance(authToken, liveBalanceRef.current)
          .catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () =>
      document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [authToken, city]);

  const handleConstruct = useCallback(
    async (subType: BuildingSubType, gridX: number, gridY: number) => {
      if (!authToken || visitedCity) return false;
      setActionBusy(true);
      setErrorBanner(null);
      try {
        const res = await cityActions.constructBuilding(authToken, {
          subType,
          gridX,
          gridY,
          clientBalance: liveBalanceRef.current,
        });
        setCity(res.city);
        setBuildings(res.buildings);
        setLiveBalance(res.city.balance);
        playSynthSound('build', muted);
        showToast(`Constructed ${subType.replace('_', ' ')} at (${gridX + 1}, ${gridY + 1}).`);
        const rankings = await cityActions.fetchLeaderboards(authToken);
        setLeaderboards(rankings);
        return true;
      } catch (err: any) {
        playSynthSound('error', muted);
        setErrorBanner(err.message || 'Construction failed.');
        return false;
      } finally {
        setActionBusy(false);
      }
    },
    [authToken, visitedCity, muted, showToast]
  );

  const handleUpgrade = useCallback(
    async (buildingId: number) => {
      if (!authToken || visitedCity) return false;
      setActionBusy(true);
      setErrorBanner(null);
      try {
        const res = await cityActions.upgradeBuilding(authToken, {
          buildingId,
          clientBalance: liveBalanceRef.current,
        });
        setCity(res.city);
        setBuildings(res.buildings);
        setLiveBalance(res.city.balance);
        playSynthSound('upgrade', muted);
        showToast(
          `Upgraded structure to Level ${res.upgradedBuilding.level}!`
        );
        const rankings = await cityActions.fetchLeaderboards(authToken);
        setLeaderboards(rankings);
        return true;
      } catch (err: any) {
        playSynthSound('error', muted);
        setErrorBanner(err.message || 'Upgrade failed.');
        return false;
      } finally {
        setActionBusy(false);
      }
    },
    [authToken, visitedCity, muted, showToast]
  );

  const handleDemolish = useCallback(
    async (buildingId: number) => {
      if (!authToken || visitedCity) return false;
      setActionBusy(true);
      setErrorBanner(null);
      try {
        const res = await cityActions.demolishBuilding(authToken, {
          buildingId,
          clientBalance: liveBalanceRef.current,
        });
        setCity(res.city);
        setBuildings(res.buildings);
        setLiveBalance(res.city.balance);
        showToast('Structure cleared (50% materials refunded).');
        return true;
      } catch (err: any) {
        playSynthSound('error', muted);
        setErrorBanner(err.message || 'Demolish failed.');
        return false;
      } finally {
        setActionBusy(false);
      }
    },
    [authToken, visitedCity, muted, showToast]
  );

  const handleExpandGrid = useCallback(async () => {
    if (!authToken || visitedCity) return false;
    setActionBusy(true);
    setErrorBanner(null);
    try {
      const res = await cityActions.expandGrid(
        authToken,
        liveBalanceRef.current
      );
      setCity(res.city);
      setLiveBalance(res.city.balance);
      playSynthSound('expand', muted);
      showToast(
        `City territory expanded to ${res.city.gridSize}×${res.city.gridSize}!`
      );
      return true;
    } catch (err: any) {
      playSynthSound('error', muted);
      setErrorBanner(err.message || 'Grid expansion failed.');
      return false;
    } finally {
      setActionBusy(false);
    }
  }, [authToken, visitedCity, muted, showToast]);

  const handleRequestBridge = useCallback(
    async (targetUsername: string) => {
      if (!authToken) return false;
      setActionBusy(true);
      setErrorBanner(null);
      try {
        const res = await cityActions.requestBridge(authToken, targetUsername);
        setCity(res.city);
        setBridges(res.bridges);
        playSynthSound('bridge', muted);
        showToast(`Bridge connection established with @${targetUsername.replace(/^@/, '')}!`);
        const rankings = await cityActions.fetchLeaderboards(authToken);
        setLeaderboards(rankings);
        return true;
      } catch (err: any) {
        playSynthSound('error', muted);
        setErrorBanner(err.message || 'Bridge request failed.');
        return false;
      } finally {
        setActionBusy(false);
      }
    },
    [authToken, muted, showToast]
  );

  const handleAcceptBridge = useCallback(
    async (bridgeId: number) => {
      if (!authToken) return false;
      setActionBusy(true);
      setErrorBanner(null);
      try {
        const res = await cityActions.acceptBridge(authToken, bridgeId);
        setCity(res.city);
        setBridges(res.bridges);
        playSynthSound('bridge', muted);
        showToast('Bridge charter ratified! +5% Tourism Bonus activated.');
        return true;
      } catch (err: any) {
        playSynthSound('error', muted);
        setErrorBanner(err.message || 'Failed to accept bridge.');
        return false;
      } finally {
        setActionBusy(false);
      }
    },
    [authToken, muted, showToast]
  );

  const handleVisitCity = useCallback(
    async (targetCityId: number) => {
      if (!authToken) return;
      setActionBusy(true);
      setErrorBanner(null);
      try {
        const data = await cityActions.visitReadOnlyCity(
          authToken,
          targetCityId
        );
        setVisitedCity(data);
        showToast(`Visiting ${data.city.name} in Read-Only mode.`);
      } catch (err: any) {
        setErrorBanner(err.message || 'Could not visit city.');
      } finally {
        setActionBusy(false);
      }
    },
    [authToken, showToast]
  );

  const returnToMyCity = useCallback(() => {
    setVisitedCity(null);
  }, []);

  return {
    user,
    city,
    buildings,
    bridges,
    liveBalance,
    myEconomy,
    visitedCity,
    visitedEconomy,
    offlineReport,
    dismissOfflineReport: () => setOfflineReport(null),
    leaderboards,
    loading,
    actionBusy,
    errorBanner,
    clearError: () => setErrorBanner(null),
    toastMessage,
    muted,
    toggleMute: () => setMuted((m) => !m),
    handleConstruct,
    handleUpgrade,
    handleDemolish,
    handleExpandGrid,
    handleRequestBridge,
    handleAcceptBridge,
    handleVisitCity,
    returnToMyCity,
    syncTreasuryNow,
    refreshLeaderboards: async () => {
      if (!authToken) return;
      const r = await cityActions.fetchLeaderboards(authToken);
      setLeaderboards(r);
    },
  };
}
