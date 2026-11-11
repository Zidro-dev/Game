import { useEffect, useMemo, useState } from 'react';
import { TitleScreen } from './components/TitleScreen';
import { TopStatusBar } from './components/TopStatusBar';
import { CityGrid } from './components/CityGrid';
import { InspectorDock } from './components/InspectorDock';
import { BridgesModal } from './components/BridgesModal';
import { LeaderboardModal } from './components/LeaderboardModal';
import { BlueprintsModal } from './components/BlueprintsModal';
import { useCityEngine } from './hooks/useCityEngine';

type GameShellState = 'title' | 'playing' | 'paused';

export default function App() {
  const initialAutoStart = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return params.get('autostart') === '1';
  }, []);

  const [shellState, setShellState] = useState<GameShellState>(
    initialAutoStart ? 'playing' : 'title'
  );
  const [authToken, setAuthToken] = useState<string | null>(
    initialAutoStart ? 'commander-session:mayor_tashkent' : null
  );

  const [selectedTile, setSelectedTile] = useState<{
    x: number;
    y: number;
  } | null>({ x: 0, y: 0 });
  const [activeModal, setActiveModal] = useState<
    'BRIDGES' | 'LEADERBOARDS' | 'BLUEPRINTS' | null
  >(null);

  const engine = useCityEngine(authToken, shellState === 'playing');

  // Mirror shell state to document.body.dataset.state as required by game HUD craft
  useEffect(() => {
    document.body.dataset.state = shellState;
  }, [shellState]);

  // Global keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (shellState === 'title') {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setAuthToken('commander-session:mayor_tashkent');
          setShellState('playing');
        }
        return;
      }

      if (e.key === 'Escape' || e.key.toLowerCase() === 'p') {
        e.preventDefault();
        if (activeModal) {
          setActiveModal(null);
        } else {
          setShellState((s) => (s === 'playing' ? 'paused' : 'playing'));
        }
      } else if (e.key.toLowerCase() === 'b' && shellState === 'playing') {
        e.preventDefault();
        setActiveModal((m) => (m === 'BRIDGES' ? null : 'BRIDGES'));
      } else if (e.key.toLowerCase() === 'l' && shellState === 'playing') {
        e.preventDefault();
        setActiveModal((m) => (m === 'LEADERBOARDS' ? null : 'LEADERBOARDS'));
      } else if (e.key.toLowerCase() === 'c' && shellState === 'playing') {
        e.preventDefault();
        setActiveModal((m) => (m === 'BLUEPRINTS' ? null : 'BLUEPRINTS'));
      } else if (e.key.toLowerCase() === 'm') {
        e.preventDefault();
        engine.toggleMute();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [shellState, activeModal, engine]);

  if (shellState === 'title') {
    return (
      <TitleScreen
        onStartGame={(token) => {
          setAuthToken(token);
          setShellState('playing');
        }}
      />
    );
  }

  const displayedCity = engine.visitedCity?.city ?? engine.city;
  const displayedBuildings =
    engine.visitedCity?.buildings ?? engine.buildings;
  const displayedBridges = engine.visitedCity?.bridges ?? engine.bridges;
  const displayedEconomy = engine.visitedEconomy ?? engine.myEconomy;
  const isReadOnlyVisit = Boolean(engine.visitedCity);

  const selectedBuilding =
    selectedTile
      ? displayedBuildings.find(
          (b) => b.gridX === selectedTile.x && b.gridY === selectedTile.y
        ) ?? null
      : null;

  const pendingBridgesCount = engine.bridges.filter(
    (b) => b.status === 'PENDING' && b.direction === 'INCOMING'
  ).length;

  return (
    <div className="w-screen h-screen overflow-hidden flex flex-col bg-[#0B1218] text-slate-100 select-none">
      {/* Top Status Bar HUD */}
      <TopStatusBar
        user={engine.user}
        city={displayedCity}
        liveBalance={
          isReadOnlyVisit
            ? (engine.visitedCity?.city.balance ?? 0)
            : engine.liveBalance
        }
        economy={displayedEconomy}
        isReadOnlyVisit={isReadOnlyVisit}
        visitedOwner={engine.visitedCity?.ownerUsername}
        muted={engine.muted}
        onToggleMute={engine.toggleMute}
        onOpenBridges={() => setActiveModal('BRIDGES')}
        onOpenLeaderboards={() => {
          engine.refreshLeaderboards();
          setActiveModal('LEADERBOARDS');
        }}
        onOpenBlueprints={() => setActiveModal('BLUEPRINTS')}
        onSyncSave={engine.syncTreasuryNow}
        onOpenPause={() => setShellState('paused')}
        pendingBridgesCount={pendingBridgesCount}
      />

      {/* Non-blocking Error or Toast Feedback Banner */}
      {(engine.errorBanner || engine.toastMessage) && (
        <div className="w-full px-4 py-1.5 bg-[#132535] border-b border-slate-700 flex items-center justify-between text-xs">
          {engine.errorBanner ? (
            <span className="text-rose-400 font-medium">
              {engine.errorBanner}
            </span>
          ) : (
            <span className="text-emerald-300 font-medium">
              {engine.toastMessage}
            </span>
          )}
          {engine.errorBanner && (
            <button
              type="button"
              onClick={engine.clearError}
              className="text-slate-400 hover:text-slate-200 underline cursor-pointer"
            >
              Dismiss
            </button>
          )}
        </div>
      )}

      {/* Offline Treasury Earnings Report Banner (Non-blocking 24-Hour Bank Limit Mechanic) */}
      {engine.offlineReport && !isReadOnlyVisit && (
        <div
          data-testid="offline-earnings-banner"
          className="w-full px-4 py-2 bg-amber-500/15 border-b border-amber-500/40 flex flex-wrap items-center justify-between gap-3 text-xs"
        >
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-bold uppercase tracking-wider text-amber-300">
              Offline Treasury Report:
            </span>
            <span className="text-slate-200 font-mono">
              Away for {Math.max(1, Math.round(engine.offlineReport.effectiveSeconds / 60))}m · Collected{' '}
              <strong className="text-amber-300">
                +${Math.round(engine.offlineReport.earnedAmount).toLocaleString()}
              </strong>
              {engine.offlineReport.wasCappedAt24h
                ? ' (24h Bank Limit Reached)'
                : ' (Max 24h Vault Cap)'}
            </span>
          </div>
          <button
            type="button"
            onClick={engine.dismissOfflineReport}
            className="px-3 py-1 rounded-md bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            Acknowledge Report
          </button>
        </div>
      )}

      {/* Main Split Workspace: City Grid + Unified Inspector Dock */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        <CityGrid
          gridSize={displayedCity?.gridSize ?? 5}
          buildings={displayedBuildings}
          bridges={displayedBridges}
          selectedTile={selectedTile}
          onSelectTile={(x, y) => setSelectedTile({ x, y })}
          isReadOnlyVisit={isReadOnlyVisit}
          visitedCityName={engine.visitedCity?.city.name}
          visitedOwner={engine.visitedCity?.ownerUsername}
          onReturnToMyCity={engine.returnToMyCity}
        />

        <InspectorDock
          selectedTile={selectedTile}
          selectedBuilding={selectedBuilding}
          gridSize={displayedCity?.gridSize ?? 5}
          liveBalance={engine.liveBalance}
          economy={displayedEconomy}
          actionBusy={engine.actionBusy}
          isReadOnlyVisit={isReadOnlyVisit}
          onConstruct={engine.handleConstruct}
          onUpgrade={engine.handleUpgrade}
          onDemolish={engine.handleDemolish}
          onExpandGrid={engine.handleExpandGrid}
        />
      </main>

      {/* Bridges & Alliances Modal */}
      {activeModal === 'BRIDGES' && (
        <BridgesModal
          bridges={engine.bridges}
          actionBusy={engine.actionBusy}
          onClose={() => setActiveModal(null)}
          onRequestBridge={engine.handleRequestBridge}
          onAcceptBridge={engine.handleAcceptBridge}
          onVisitCity={engine.handleVisitCity}
        />
      )}

      {/* Leaderboards Modal */}
      {activeModal === 'LEADERBOARDS' && (
        <LeaderboardModal
          billionaires={engine.leaderboards.billionaires}
          megapolises={engine.leaderboards.megapolises}
          currentCityId={engine.city?.id}
          onVisitCity={engine.handleVisitCity}
          onClose={() => setActiveModal(null)}
        />
      )}

      {/* Step 1-4 Architecture Blueprints Modal */}
      {activeModal === 'BLUEPRINTS' && (
        <BlueprintsModal onClose={() => setActiveModal(null)} />
      )}

      {/* Pause Modal */}
      {shellState === 'paused' && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Game Paused"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
        >
          <div className="w-full max-w-md rounded-2xl bg-[#101E2B] border border-slate-700 p-6 shadow-2xl flex flex-col gap-5">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                SIMULATION PAUSED
              </div>
              <h2 className="text-2xl font-bold text-slate-100 mt-0.5">
                {engine.city?.name || 'Aurelia Polis'}
              </h2>
            </div>

            <div className="grid grid-cols-3 gap-2.5 font-mono tabular-nums">
              <div className="p-3 rounded-xl bg-[#0B151F] border border-slate-800">
                <div className="text-[10px] text-slate-400">TREASURY</div>
                <div className="text-sm font-bold text-amber-400 mt-0.5">
                  ${Math.round(engine.liveBalance).toLocaleString()}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-[#0B151F] border border-slate-800">
                <div className="text-[10px] text-slate-400">POPULATION</div>
                <div className="text-sm font-bold text-sky-300 mt-0.5">
                  {engine.myEconomy.effectivePopulation.toLocaleString()}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-[#0B151F] border border-slate-800">
                <div className="text-[10px] text-slate-400">INCOME</div>
                <div className="text-sm font-bold text-emerald-400 mt-0.5">
                  +${Math.round(engine.myEconomy.netIncomePerSec)}/s
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => setShellState('playing')}
                className="w-full py-2.5 px-4 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs cursor-pointer"
              >
                Resume Simulation
              </button>
              <button
                type="button"
                onClick={() => {
                  engine.syncTreasuryNow();
                  setShellState('playing');
                }}
                className="w-full py-2.5 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 font-medium text-xs cursor-pointer"
              >
                Sync Balance to Cloud SQL & Resume
              </button>
              <button
                type="button"
                onClick={() => {
                  engine.syncTreasuryNow();
                  setShellState('title');
                }}
                className="w-full py-2.5 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 font-medium text-xs cursor-pointer"
              >
                Return to Title Screen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
