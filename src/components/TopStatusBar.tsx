import React from 'react';
import { CityEconomyMetrics, MAX_BRIDGES } from '../game/rules';
import { CityDTO, CityUserDTO } from '../lib/cityActions';

interface TopStatusBarProps {
  user: CityUserDTO | null;
  city: CityDTO | null;
  liveBalance: number;
  economy: CityEconomyMetrics;
  isReadOnlyVisit: boolean;
  visitedOwner?: string;
  muted: boolean;
  onToggleMute: () => void;
  onOpenBridges: () => void;
  onOpenLeaderboards: () => void;
  onOpenBlueprints: () => void;
  onSyncSave: () => void;
  onOpenPause: () => void;
  pendingBridgesCount: number;
}

export const TopStatusBar: React.FC<TopStatusBarProps> = ({
  user,
  city,
  liveBalance,
  economy,
  isReadOnlyVisit,
  visitedOwner,
  muted,
  onToggleMute,
  onOpenBridges,
  onOpenLeaderboards,
  onOpenBlueprints,
  onSyncSave,
  onOpenPause,
  pendingBridgesCount,
}) => {
  const workerPct = Math.round(economy.workerCapacityRatio * 100);
  const ecologyStatus =
    economy.happiness >= 85
      ? 'THRIVING'
      : economy.happiness >= 65
        ? 'STABLE'
        : 'LOW ECOLOGY';

  return (
    <div className="w-full bg-[#0F1B26] border-b border-slate-800 px-4 py-2 flex flex-wrap xl:flex-nowrap items-center justify-between gap-3 z-20">
      {/* Left Cluster: City Identity & Primary Treasury Readouts */}
      <div className="flex items-center gap-3.5 flex-wrap xl:flex-nowrap">
        <div className="flex items-center gap-2.5 pr-3 border-r border-slate-800">
          <svg
            viewBox="0 0 24 24"
            className="w-7 h-7 shrink-0"
            aria-hidden="true"
          >
            <polygon
              points="12,2 22,7 22,17 12,22 2,17 2,7"
              fill="#162938"
              stroke="#F59E0B"
              strokeWidth="1.8"
            />
            <rect x="7" y="10" width="3" height="8" fill="#38BDF8" />
            <rect x="11" y="6" width="3.5" height="12" fill="#F59E0B" />
            <rect x="15.5" y="12" width="2.5" height="6" fill="#10B981" />
          </svg>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-widest text-amber-400">
              {isReadOnlyVisit
                ? `VISITING @${visitedOwner}`
                : `@${user?.username || 'mayor'}`}
            </div>
            <div className="text-sm font-bold text-slate-100 whitespace-nowrap">
              {city?.name || 'Aurelia Polis'} · {city?.gridSize ?? 5}×
              {city?.gridSize ?? 5}
            </div>
          </div>
        </div>

        {/* Treasury Balance (Hero 2.5:1 scale vs Kicker) */}
        <div className="flex items-center gap-2.5">
          <svg viewBox="0 0 24 24" className="w-6 h-6 shrink-0" aria-hidden="true">
            <circle
              cx="12"
              cy="12"
              r="10"
              fill="#1E293B"
              stroke="#F59E0B"
              strokeWidth="2"
            />
            <path
              d="M12 6v12M15 9.5c0-1.4-1.3-2.5-3-2.5s-3 1.1-3 2.5 1.3 2 3 2.5 3 1.1 3 2.5-1.3 2.5-3 2.5-3-1.1-3-2.5"
              stroke="#FBBF24"
              strokeWidth="2"
              strokeLinecap="round"
              fill="none"
            />
          </svg>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              TREASURY
            </div>
            <div
              data-testid="hud-balance"
              className="text-xl font-bold font-mono tabular-nums text-amber-400 leading-tight"
            >
              ${Math.round(liveBalance).toLocaleString()}
            </div>
          </div>
        </div>

        {/* Net Income Rate */}
        <div className="flex items-center gap-2">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              INCOME RATE
            </div>
            <div
              data-testid="hud-income-rate"
              className="text-lg font-bold font-mono tabular-nums text-emerald-400 leading-tight"
            >
              +${Math.round(economy.netIncomePerSec).toLocaleString()}/s
            </div>
          </div>
        </div>

        {/* Population & Worker Capacity */}
        <div className="flex items-center gap-2.5 pl-3 border-l border-slate-800">
          <svg viewBox="0 0 24 24" className="w-6 h-6 shrink-0" aria-hidden="true">
            <rect
              x="2"
              y="3"
              width="20"
              height="18"
              rx="4"
              fill="#172A3A"
              stroke="#38BDF8"
              strokeWidth="1.8"
            />
            <circle cx="9" cy="10" r="2.5" fill="#38BDF8" />
            <path
              d="M5 17c0-2.2 1.8-4 4-4s4 1.8 4 4"
              fill="#38BDF8"
            />
            <circle cx="15.5" cy="10.5" r="2" fill="#93C5FD" />
            <path
              d="M13 17c0-1.8 1.4-3.2 3.2-3.2 1.4 0 2.6.9 3 2.2"
              fill="#93C5FD"
            />
          </svg>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              POPULATION · WORKFORCE
            </div>
            <div
              data-testid="hud-population"
              className="text-base font-bold font-mono tabular-nums text-sky-300 leading-tight"
            >
              {economy.effectivePopulation.toLocaleString()} pop · {workerPct}%
              staffed ({economy.workersRequired} req)
            </div>
          </div>
        </div>

        {/* Ecology & Happiness */}
        <div className="flex items-center gap-2.5 pl-3 border-l border-slate-800">
          <svg viewBox="0 0 24 24" className="w-6 h-6 shrink-0" aria-hidden="true">
            <polygon
              points="12,3 20,17 4,17"
              fill="#064E3B"
              stroke="#10B981"
              strokeWidth="1.8"
            />
            <rect x="10.5" y="17" width="3" height="4" fill="#A7F3D0" />
          </svg>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              ECOLOGY · {ecologyStatus}
            </div>
            <div
              data-testid="hud-happiness"
              className={`text-base font-bold font-mono tabular-nums leading-tight ${
                economy.happiness >= 75
                  ? 'text-emerald-400'
                  : economy.happiness >= 55
                    ? 'text-amber-300'
                    : 'text-rose-400'
              }`}
            >
              {economy.happiness}% Happiness
            </div>
          </div>
        </div>

        {/* Tourism Bridge Bonus */}
        <div className="hidden xl:flex items-center gap-2 pl-3 border-l border-slate-800">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              BRIDGES ({economy.activeBridges}/{MAX_BRIDGES})
            </div>
            <div
              data-testid="hud-tourism-bonus"
              className="text-base font-bold font-mono tabular-nums text-amber-300 leading-tight"
            >
              +{economy.tourismBonusPercent}% Tourism
            </div>
          </div>
        </div>
      </div>

      {/* Right Utility & Modal Triggers */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          tabIndex={-1}
          onClick={(e) => {
            e.currentTarget.blur();
            onOpenBridges();
          }}
          className="px-3 py-1.5 rounded-lg bg-[#162836] hover:bg-[#1E3648] border border-slate-700 text-xs font-semibold text-slate-100 transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          Bridges ({economy.activeBridges}/{MAX_BRIDGES}
          {pendingBridgesCount > 0 ? ` · ${pendingBridgesCount} New` : ''})
        </button>

        <button
          type="button"
          tabIndex={-1}
          onClick={(e) => {
            e.currentTarget.blur();
            onOpenLeaderboards();
          }}
          className="px-3 py-1.5 rounded-lg bg-[#162836] hover:bg-[#1E3648] border border-slate-700 text-xs font-semibold text-slate-100 transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          Leaderboards
        </button>

        <button
          type="button"
          tabIndex={-1}
          onClick={(e) => {
            e.currentTarget.blur();
            onOpenBlueprints();
          }}
          className="px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-xs font-semibold text-amber-300 transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          Step 1–4 Code
        </button>

        {!isReadOnlyVisit && (
          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onSyncSave();
            }}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-200 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            Sync DB
          </button>
        )}

        <button
          type="button"
          tabIndex={-1}
          aria-label={muted ? 'Unmute Audio' : 'Mute Audio'}
          onClick={(e) => {
            e.currentTarget.blur();
            onToggleMute();
          }}
          className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center justify-center text-slate-200 cursor-pointer shrink-0"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
            {muted ? (
              <path d="M11 5L6 9H2v6h4l5 4V5zM23 9l-6 6M17 9l6 6" />
            ) : (
              <path d="M11 5L6 9H2v6h4l5 4V5zM19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
            )}
          </svg>
        </button>

        <button
          type="button"
          tabIndex={-1}
          aria-label="Pause Game"
          onClick={(e) => {
            e.currentTarget.blur();
            onOpenPause();
          }}
          className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center justify-center text-slate-200 cursor-pointer shrink-0"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
            <rect x="6" y="5" width="4" height="14" rx="1" />
            <rect x="14" y="5" width="4" height="14" rx="1" />
          </svg>
        </button>
      </div>
    </div>
  );
};
