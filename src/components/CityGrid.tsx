import React from 'react';
import { getBlueprint, getBuildingStatsAtLevel } from '../game/rules';
import { BridgeDTO, BuildingDTO } from '../lib/cityActions';

interface CityGridProps {
  gridSize: number;
  buildings: BuildingDTO[];
  bridges: BridgeDTO[];
  selectedTile: { x: number; y: number } | null;
  onSelectTile: (x: number, y: number) => void;
  isReadOnlyVisit: boolean;
  visitedCityName?: string;
  visitedOwner?: string;
  onReturnToMyCity: () => void;
}

const BuildingArtwork: React.FC<{ subType: string; level: number }> = ({
  subType,
}) => {
  switch (subType) {
    case 'TOWNHOUSE':
      return (
        <svg viewBox="0 0 64 64" className="w-12 h-12 drop-shadow" aria-hidden="true">
          <polygon points="10,28 32,12 54,28" fill="#D97706" stroke="#FDE68A" strokeWidth="1.5" />
          <rect x="14" y="28" width="36" height="26" rx="2" fill="#1E3A5F" stroke="#60A5FA" strokeWidth="1.5" />
          <rect x="20" y="33" width="8" height="8" fill="#FDE047" />
          <rect x="36" y="33" width="8" height="8" fill="#FDE047" />
          <rect x="28" y="43" width="8" height="11" fill="#F59E0B" />
        </svg>
      );
    case 'SKY_RESIDENCE':
      return (
        <svg viewBox="0 0 64 64" className="w-12 h-12 drop-shadow" aria-hidden="true">
          <rect x="18" y="8" width="28" height="48" rx="3" fill="#0F2942" stroke="#38BDF8" strokeWidth="1.8" />
          <polygon points="18,8 32,2 46,8" fill="#38BDF8" />
          <rect x="23" y="14" width="6" height="6" fill="#7DD3FC" />
          <rect x="35" y="14" width="6" height="6" fill="#7DD3FC" />
          <rect x="23" y="24" width="6" height="6" fill="#BAE6FD" />
          <rect x="35" y="24" width="6" height="6" fill="#BAE6FD" />
          <rect x="23" y="34" width="6" height="6" fill="#7DD3FC" />
          <rect x="35" y="34" width="6" height="6" fill="#7DD3FC" />
          <rect x="27" y="45" width="10" height="11" fill="#0284C7" />
        </svg>
      );
    case 'CAFE':
      return (
        <svg viewBox="0 0 64 64" className="w-12 h-12 drop-shadow" aria-hidden="true">
          <rect x="12" y="24" width="40" height="30" rx="3" fill="#451A03" stroke="#F59E0B" strokeWidth="1.8" />
          <path d="M10 24 L54 24 L50 15 L14 15 Z" fill="#D97706" stroke="#FDE68A" strokeWidth="1.5" />
          <rect x="18" y="32" width="14" height="12" rx="1" fill="#FEF3C7" />
          <rect x="36" y="34" width="10" height="20" fill="#B45309" />
        </svg>
      );
    case 'TECH_HUB':
      return (
        <svg viewBox="0 0 64 64" className="w-12 h-12 drop-shadow" aria-hidden="true">
          <rect x="14" y="12" width="36" height="44" rx="4" fill="#1E1B4B" stroke="#F59E0B" strokeWidth="1.8" />
          <line x1="14" y1="24" x2="50" y2="24" stroke="#FBBF24" strokeWidth="2" />
          <line x1="14" y1="36" x2="50" y2="36" stroke="#FBBF24" strokeWidth="2" />
          <circle cx="32" cy="18" r="3" fill="#38BDF8" />
          <rect x="26" y="43" width="12" height="13" fill="#F59E0B" />
        </svg>
      );
    case 'CENTRAL_BANK':
      return (
        <svg viewBox="0 0 64 64" className="w-12 h-12 drop-shadow" aria-hidden="true">
          <polygon points="32,4 54,18 10,18" fill="#F59E0B" stroke="#FEF08A" strokeWidth="1.5" />
          <rect x="12" y="18" width="40" height="38" fill="#1C1917" stroke="#FBBF24" strokeWidth="1.8" />
          <rect x="17" y="22" width="5" height="30" fill="#FDE68A" />
          <rect x="29.5" y="22" width="5" height="30" fill="#FDE68A" />
          <rect x="42" y="22" width="5" height="30" fill="#FDE68A" />
        </svg>
      );
    case 'ECO_PARK':
      return (
        <svg viewBox="0 0 64 64" className="w-12 h-12 drop-shadow" aria-hidden="true">
          <rect x="10" y="38" width="44" height="16" rx="4" fill="#064E3B" stroke="#10B981" strokeWidth="1.5" />
          <circle cx="22" cy="28" r="11" fill="#10B981" />
          <circle cx="40" cy="24" r="13" fill="#059669" />
          <circle cx="32" cy="32" r="9" fill="#34D399" />
          <rect x="20" y="36" width="3" height="10" fill="#78350F" />
          <rect x="38" y="35" width="3.5" height="11" fill="#78350F" />
        </svg>
      );
    case 'BOTANICAL_DOME':
    default:
      return (
        <svg viewBox="0 0 64 64" className="w-12 h-12 drop-shadow" aria-hidden="true">
          <path d="M10 48 A22 22 0 0 1 54 48 Z" fill="#065F46" stroke="#34D399" strokeWidth="2" />
          <path d="M20 48 A12 18 0 0 1 44 48" fill="none" stroke="#A7F3D0" strokeWidth="1.4" />
          <line x1="32" y1="26" x2="32" y2="48" stroke="#A7F3D0" strokeWidth="1.4" />
          <rect x="8" y="48" width="48" height="6" rx="2" fill="#047857" />
        </svg>
      );
  }
};

export const CityGrid: React.FC<CityGridProps> = ({
  gridSize,
  buildings,
  bridges,
  selectedTile,
  onSelectTile,
  isReadOnlyVisit,
  visitedCityName,
  visitedOwner,
  onReturnToMyCity,
}) => {
  const buildingMap = new Map<string, BuildingDTO>();
  for (const b of buildings) {
    buildingMap.set(`${b.gridX},${b.gridY}`, b);
  }

  const activeBridges = bridges.filter((b) => b.status === 'ACTIVE');

  const tiles: { x: number; y: number }[] = [];
  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      tiles.push({ x, y });
    }
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-between p-4 sm:p-6 overflow-y-auto bg-[#0B141D] relative">
      {/* Read-Only City Visit Mode Banner */}
      {isReadOnlyVisit && (
        <div
          data-testid="readonly-visit-banner"
          className="w-full max-w-3xl mb-4 px-4 py-3 rounded-xl bg-sky-950/90 border border-sky-500/50 flex items-center justify-between gap-4 shadow-lg"
        >
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-sky-300">
              READ-ONLY ALLIANCE INSPECTION MODE
            </div>
            <div className="text-sm text-slate-100 font-medium">
              Viewing <span className="font-bold">{visitedCityName}</span> (Mayor{' '}
              <span className="font-mono">@{visitedOwner}</span>). Construction
              and upgrades are locked while visiting.
            </div>
          </div>
          <button
            type="button"
            onClick={onReturnToMyCity}
            className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            Return to My City
          </button>
        </div>
      )}

      {/* Active Suspension Bridges Perimeter Strip */}
      <div className="w-full max-w-3xl mb-3 flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-[#101F2C] border border-slate-800/90">
        <div className="text-xs font-medium text-slate-300">
          River Suspension Bridges ({activeBridges.length}/9 Active · +
          {activeBridges.length * 5}% Tourism Revenue)
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {Array.from({ length: 9 }).map((_, idx) => {
            const bridge = activeBridges[idx];
            return (
              <div
                key={idx}
                title={
                  bridge
                    ? `Bridge to ${bridge.partnerCityName} (@${bridge.partnerUsername})`
                    : `Open Bridge Pier #${idx + 1}`
                }
                className={`px-2 py-0.5 rounded text-[11px] font-mono ${
                  bridge
                    ? 'bg-amber-500/20 border border-amber-400/60 text-amber-300 font-semibold'
                    : 'bg-slate-900 border border-slate-800 text-slate-500'
                }`}
              >
                {bridge ? `⇄ ${bridge.partnerUsername.slice(0, 9)}` : `#${idx + 1}`}
              </div>
            );
          })}
        </div>
      </div>

      {/* Main NxN Isometric-Styled Architectural City Grid */}
      <div className="my-auto flex items-center justify-center w-full">
        <div
          data-testid="city-grid-board"
          style={{
            gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
          }}
          className="grid gap-2.5 p-4 rounded-2xl bg-[#112231] border-2 border-slate-700/80 shadow-2xl w-full max-w-[600px]"
        >
          {tiles.map(({ x, y }) => {
            const building = buildingMap.get(`${x},${y}`);
            const isSelected =
              selectedTile?.x === x && selectedTile?.y === y;
            const bp = building ? getBlueprint(building.subType) : null;
            const stats = building
              ? getBuildingStatsAtLevel(building.subType, building.level)
              : null;

            const categoryBorder = !building
              ? 'border-slate-700/70 hover:border-slate-500'
              : building.type === 'RESIDENTIAL'
                ? 'border-sky-500/60 bg-sky-950/30'
                : building.type === 'BUSINESS'
                  ? 'border-amber-500/60 bg-amber-950/25'
                  : 'border-emerald-500/60 bg-emerald-950/30';

            const label = building
              ? `Tile (${x + 1}, ${y + 1}): ${bp?.name} Level ${building.level}`
              : `Empty Plot (${x + 1}, ${y + 1})`;

            return (
              <button
                key={`${x}-${y}`}
                type="button"
                aria-label={label}
                onClick={() => onSelectTile(x, y)}
                className={`relative aspect-square rounded-xl border-2 p-1.5 flex flex-col items-center justify-between transition-transform duration-150 cursor-pointer select-none ${categoryBorder} ${
                  isSelected
                    ? 'ring-2 ring-amber-400 scale-[1.03] bg-[#1A3348]'
                    : 'bg-[#0D1A26] hover:bg-[#15283A]'
                }`}
              >
                {/* Top Row: Coordinates or Building Level */}
                <div className="w-full flex items-center justify-between text-[10px] font-mono">
                  <span className="text-slate-400">
                    {x + 1},{y + 1}
                  </span>
                  {building && (
                    <span className="font-bold text-amber-300">
                      Lv.{building.level}
                    </span>
                  )}
                </div>

                {/* Center Artwork */}
                <div className="my-auto flex items-center justify-center">
                  {building ? (
                    <BuildingArtwork
                      subType={building.subType}
                      level={building.level}
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-lg border border-dashed border-slate-700 flex items-center justify-center text-slate-500 text-xs font-mono">
                      +
                    </div>
                  )}
                </div>

                {/* Bottom Output Summary */}
                <div className="w-full text-center truncate text-[10px] font-medium">
                  {building && stats ? (
                    building.type === 'RESIDENTIAL' ? (
                      <span className="text-sky-300 font-mono">
                        +{stats.population} pop
                      </span>
                    ) : building.type === 'BUSINESS' ? (
                      <span className="text-amber-300 font-mono">
                        +${stats.incomePerSec}/s
                      </span>
                    ) : (
                      <span className="text-emerald-300 font-mono">
                        +{stats.ecologyDelta} eco
                      </span>
                    )
                  ) : (
                    <span className="text-slate-500">Open Lot</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom Legend Bar */}
      <div className="w-full max-w-3xl mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 px-2">
        <div>
          Residential (Sky Blue) = Workforce · Business (Amber) = Revenue ·
          Ecology Park (Emerald) = Happiness
        </div>
        <div className="font-mono">
          Occupied Lots: {buildings.length} / {gridSize * gridSize}
        </div>
      </div>
    </div>
  );
};
