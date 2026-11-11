import React, { useState } from 'react';
import {
  BUILDING_CATALOG,
  BuildingCategory,
  BuildingSubType,
  CityEconomyMetrics,
  getBlueprint,
  getBuildingStatsAtLevel,
  getBuildingUpgradeCost,
  getGridExpansionCost,
} from '../game/rules';
import { BuildingDTO } from '../lib/cityActions';

interface InspectorDockProps {
  selectedTile: { x: number; y: number } | null;
  selectedBuilding: BuildingDTO | null;
  gridSize: number;
  liveBalance: number;
  economy: CityEconomyMetrics;
  actionBusy: boolean;
  isReadOnlyVisit: boolean;
  onConstruct: (subType: BuildingSubType, x: number, y: number) => void;
  onUpgrade: (buildingId: number) => void;
  onDemolish: (buildingId: number) => void;
  onExpandGrid: () => void;
}

export const InspectorDock: React.FC<InspectorDockProps> = ({
  selectedTile,
  selectedBuilding,
  gridSize,
  liveBalance,
  economy,
  actionBusy,
  isReadOnlyVisit,
  onConstruct,
  onUpgrade,
  onDemolish,
  onExpandGrid,
}) => {
  const [filterCategory, setFilterCategory] = useState<'ALL' | BuildingCategory>(
    'ALL'
  );

  const expansionCost = getGridExpansionCost(gridSize);
  const canExpand = gridSize < 9 && liveBalance >= expansionCost && !isReadOnlyVisit;

  const catalogList = Object.values(BUILDING_CATALOG).filter(
    (b) => filterCategory === 'ALL' || b.category === filterCategory
  );

  return (
    <aside className="w-full lg:w-[390px] xl:w-[420px] bg-[#0F1B26] border-t lg:border-t-0 lg:border-l border-slate-800 flex flex-col justify-between p-4 overflow-y-auto shrink-0">
      <div className="flex flex-col gap-4">
        {/* Workforce & Ecology Diagnostic Strip */}
        <div className="p-3.5 rounded-xl bg-[#142433] border border-slate-700/70 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-200">
              Workforce Staffing Efficiency
            </span>
            <span className="font-mono font-bold text-sky-300">
              {Math.round(economy.workerCapacityRatio * 100)}% (
              {economy.effectivePopulation} / {economy.workersRequired} workers)
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden">
            <div
              className="h-full bg-sky-400 transition-transform duration-200 origin-left"
              style={{
                transform: `scaleX(${Math.min(1, economy.workerCapacityRatio)})`,
              }}
            />
          </div>
          {economy.workerCapacityRatio < 1 && (
            <p className="text-[11px] text-amber-300 leading-snug">
              Businesses are understaffed! Build Residential towers to reach 100%
              revenue capacity.
            </p>
          )}
          {economy.happiness < 70 && (
            <p className="text-[11px] text-emerald-300 leading-snug">
              Urban pollution is slowing population growth! Build Ecology Parks
              to restore happiness.
            </p>
          )}
        </div>

        {/* Tile Inspector Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <div>
            <h2 className="text-base font-bold text-slate-100">
              {selectedBuilding
                ? `${getBlueprint(selectedBuilding.subType).name} (Lv.${selectedBuilding.level})`
                : selectedTile
                  ? `Plot (${selectedTile.x + 1}, ${selectedTile.y + 1}) · Ready to Build`
                  : 'Select a City Grid Plot'}
            </h2>
            <p className="text-xs text-slate-400">
              {isReadOnlyVisit
                ? 'Read-Only Inspection — Return to your city to build'
                : selectedBuilding
                  ? getBlueprint(selectedBuilding.subType).tagline
                  : 'Choose a structure below to construct on this plot'}
            </p>
          </div>
        </div>

        {/* Occupied Tile: Upgrade & Demolish Panel */}
        {selectedBuilding ? (
          (() => {
            const bp = getBlueprint(selectedBuilding.subType);
            const currentStats = getBuildingStatsAtLevel(
              selectedBuilding.subType,
              selectedBuilding.level
            );
            const nextStats = getBuildingStatsAtLevel(
              selectedBuilding.subType,
              selectedBuilding.level + 1
            );
            const upgCost = getBuildingUpgradeCost(
              selectedBuilding.subType,
              selectedBuilding.level
            );
            const canAffordUpg = liveBalance >= upgCost && !isReadOnlyVisit;

            return (
              <div className="p-4 rounded-xl bg-[#142535] border border-slate-700 flex flex-col gap-3.5">
                <div className="text-xs text-slate-300 flex flex-col gap-1.5 font-mono">
                  <div className="flex justify-between">
                    <span>Category:</span>
                    <span className="text-slate-100 font-semibold">
                      {bp.category}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Population Output:</span>
                    <span className="text-sky-300">
                      +{currentStats.population} → +{nextStats.population}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Revenue Output:</span>
                    <span className="text-amber-300">
                      +${currentStats.incomePerSec}/s → +${nextStats.incomePerSec}/s
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Workforce Required:</span>
                    <span className="text-slate-200">
                      {currentStats.workersNeeded} → {nextStats.workersNeeded}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Ecology Impact:</span>
                    <span
                      className={
                        currentStats.ecologyDelta >= 0
                          ? 'text-emerald-400'
                          : 'text-rose-400'
                      }
                    >
                      {currentStats.ecologyDelta >= 0 ? '+' : ''}
                      {currentStats.ecologyDelta} →{' '}
                      {nextStats.ecologyDelta >= 0 ? '+' : ''}
                      {nextStats.ecologyDelta}
                    </span>
                  </div>
                </div>

                {!isReadOnlyVisit && (
                  <div className="flex flex-col gap-2 pt-2">
                    <button
                      type="button"
                      disabled={!canAffordUpg || actionBusy}
                      onClick={() => onUpgrade(selectedBuilding.id)}
                      className={`w-full py-2.5 px-4 rounded-lg font-semibold text-xs transition-colors cursor-pointer whitespace-nowrap ${
                        canAffordUpg
                          ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      Upgrade to Level {selectedBuilding.level + 1} ($
                      {upgCost.toLocaleString()})
                    </button>

                    <button
                      type="button"
                      disabled={actionBusy}
                      onClick={() => onDemolish(selectedBuilding.id)}
                      className="w-full py-2 px-4 rounded-lg bg-rose-950/60 hover:bg-rose-900/70 border border-rose-700/50 text-rose-200 font-medium text-xs transition-colors cursor-pointer whitespace-nowrap"
                    >
                      Demolish Structure (Refund $
                      {Math.round(bp.baseCost * 0.5).toLocaleString()})
                    </button>
                  </div>
                )}
              </div>
            );
          })()
        ) : (
          /* Empty Plot: Construction Catalog */
          <div className="flex flex-col gap-3">
            {/* Interactive Category Filter Control */}
            <div className="flex items-center gap-1 p-1 bg-[#0A131C] rounded-lg border border-slate-800">
              {(
                [
                  { id: 'ALL', label: 'All' },
                  { id: 'RESIDENTIAL', label: 'Residential' },
                  { id: 'BUSINESS', label: 'Business' },
                  { id: 'PARK', label: 'Ecology' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilterCategory(tab.id)}
                  className={`flex-1 py-1.5 px-2 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                    filterCategory === tab.id
                      ? 'bg-slate-800 text-amber-300 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Buildable Cards */}
            <div className="flex flex-col gap-2.5">
              {catalogList.map((bp) => {
                const canAfford =
                  liveBalance >= bp.baseCost &&
                  !isReadOnlyVisit &&
                  selectedTile !== null;
                return (
                  <div
                    key={bp.subType}
                    className="p-3 rounded-xl bg-[#132332] border border-slate-700/80 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-100 truncate">
                        {bp.name}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">
                        {bp.tagline}
                      </div>
                      <div className="text-[11px] font-mono text-slate-300 mt-1">
                        {bp.basePopulation > 0 && `+${bp.basePopulation} Pop · `}
                        {bp.baseIncomePerSec > 0 &&
                          `+$${bp.baseIncomePerSec}/s · `}
                        {bp.baseWorkersNeeded > 0 &&
                          `${bp.baseWorkersNeeded} Workers · `}
                        {bp.ecologyDelta > 0
                          ? `+${bp.ecologyDelta} Ecology`
                          : `${bp.ecologyDelta} Ecology`}
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={!canAfford || actionBusy}
                      onClick={() => {
                        if (selectedTile) {
                          onConstruct(
                            bp.subType,
                            selectedTile.x,
                            selectedTile.y
                          );
                        }
                      }}
                      className={`py-2 px-3.5 rounded-lg font-mono font-semibold text-xs transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                        canAfford
                          ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      Build ${bp.baseCost.toLocaleString()}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Territory Grid Expansion Footer */}
      <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-semibold text-slate-200">
            Territory Expansion ({gridSize}×{gridSize} →{' '}
            {gridSize < 9 ? `${gridSize + 1}×${gridSize + 1}` : 'MAX'})
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            {gridSize < 9
              ? `Unlocks ${(gridSize + 1) * (gridSize + 1) - gridSize * gridSize} new city plots`
              : 'Maximum Megapolis Charter reached'}
          </div>
        </div>
        <button
          type="button"
          disabled={!canExpand || actionBusy}
          onClick={onExpandGrid}
          className={`py-2 px-3.5 rounded-lg font-mono font-semibold text-xs transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
            canExpand
              ? 'bg-sky-500 hover:bg-sky-400 text-slate-950'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
          }`}
        >
          {gridSize < 9
            ? `Expand $${expansionCost.toLocaleString()}`
            : 'Max 9×9'}
        </button>
      </div>
    </aside>
  );
};
