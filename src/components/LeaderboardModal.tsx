import React, { useState } from 'react';
import { LeaderboardEntryDTO } from '../lib/cityActions';

interface LeaderboardModalProps {
  billionaires: LeaderboardEntryDTO[];
  megapolises: LeaderboardEntryDTO[];
  currentCityId?: number;
  onVisitCity: (cityId: number) => void;
  onClose: () => void;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  billionaires,
  megapolises,
  currentCityId,
  onVisitCity,
  onClose,
}) => {
  const [tab, setTab] = useState<'BILLIONAIRES' | 'MEGAPOLISES'>(
    'BILLIONAIRES'
  );

  const list = tab === 'BILLIONAIRES' ? billionaires : megapolises;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Global City Rankings"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75"
    >
      <div className="w-full max-w-2xl rounded-2xl bg-[#101E2B] border border-slate-700 p-6 shadow-2xl flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-xl font-bold text-slate-100">
              Global Sovereign Rankings
            </h2>
            <p className="text-xs text-slate-400">
              Compare metropolitan economic output and population scale across
              all cities
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 cursor-pointer"
          >
            Close
          </button>
        </div>

        {/* Segmented Control: Billionaires vs Megapolises */}
        <div className="flex items-center gap-1 p-1 bg-[#0A131C] rounded-lg border border-slate-800">
          <button
            type="button"
            onClick={() => setTab('BILLIONAIRES')}
            className={`flex-1 py-2 px-4 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              tab === 'BILLIONAIRES'
                ? 'bg-amber-500 text-slate-950'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Billionaires (Sorted by $/sec Income)
          </button>
          <button
            type="button"
            onClick={() => setTab('MEGAPOLISES')}
            className={`flex-1 py-2 px-4 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              tab === 'MEGAPOLISES'
                ? 'bg-sky-500 text-slate-950'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Megapolises (Sorted by Total Population)
          </button>
        </div>

        {/* Ranking Table */}
        <div className="flex flex-col gap-2">
          {list.map((entry, idx) => {
            const isMe = entry.cityId === currentCityId;
            return (
              <div
                key={entry.cityId}
                className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
                  isMe
                    ? 'bg-amber-500/15 border-amber-500/50'
                    : 'bg-[#132332] border-slate-700/80'
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center font-mono text-xs font-bold text-amber-300 shrink-0">
                    #{idx + 1}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-slate-100 truncate">
                      {entry.cityName}{' '}
                      {isMe && (
                        <span className="text-xs font-normal text-amber-300">
                          · Your City
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 font-mono">
                      @{entry.username} · {entry.gridSize}×{entry.gridSize} Grid ·{' '}
                      {entry.happiness}% Ecology
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right font-mono tabular-nums">
                    <div className="text-sm font-bold text-emerald-400">
                      +${Math.round(entry.incomePerSec).toLocaleString()}/s
                    </div>
                    <div className="text-xs text-sky-300">
                      {entry.population.toLocaleString()} pop
                    </div>
                  </div>

                  {!isMe && (
                    <button
                      type="button"
                      onClick={() => {
                        onVisitCity(entry.cityId);
                        onClose();
                      }}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-medium text-slate-200 cursor-pointer whitespace-nowrap"
                    >
                      Inspect
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
