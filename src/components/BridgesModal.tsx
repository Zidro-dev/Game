import React, { useState } from 'react';
import { MAX_BRIDGES } from '../game/rules';
import { BridgeDTO } from '../lib/cityActions';

interface BridgesModalProps {
  bridges: BridgeDTO[];
  actionBusy: boolean;
  onClose: () => void;
  onRequestBridge: (username: string) => Promise<boolean>;
  onAcceptBridge: (bridgeId: number) => Promise<boolean>;
  onVisitCity: (cityId: number) => void;
}

const SUGGESTED_MAYORS = [
  'samarkand_mayor',
  'bukhara_arch',
  'khiva_prime',
  'fergana_eco',
];

export const BridgesModal: React.FC<BridgesModalProps> = ({
  bridges,
  actionBusy,
  onClose,
  onRequestBridge,
  onAcceptBridge,
  onVisitCity,
}) => {
  const [targetUsername, setTargetUsername] = useState('');
  const [localValidationMsg, setLocalValidationMsg] = useState<string | null>(
    null
  );

  const activeBridges = bridges.filter((b) => b.status === 'ACTIVE');
  const pendingBridges = bridges.filter((b) => b.status === 'PENDING');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = targetUsername.trim().replace(/^@/, '');
    if (!cleaned) {
      setLocalValidationMsg('Please enter a valid mayor username.');
      return;
    }
    setLocalValidationMsg(null);
    const ok = await onRequestBridge(cleaned);
    if (ok) {
      setTargetUsername('');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Inter-City Suspension Bridges and Alliances"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75"
    >
      <div className="w-full max-w-2xl rounded-2xl bg-[#101E2B] border border-slate-700 p-6 shadow-2xl flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-xl font-bold text-slate-100">
              Suspension Bridges & Diplomatic Alliances
            </h2>
            <p className="text-xs text-slate-400">
              Connect up to {MAX_BRIDGES} neighboring cities · Each active bridge
              grants +5% Tourism Revenue Bonus (Current: +
              {activeBridges.length * 5}%)
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

        {/* Send Bridge Charter Form */}
        <form
          onSubmit={handleSubmit}
          className="p-4 rounded-xl bg-[#0B151F] border border-slate-800 flex flex-col gap-3"
        >
          <label
            htmlFor="bridge-username-input"
            className="text-xs font-semibold uppercase tracking-wider text-slate-300"
          >
            Send Bridge Alliance Charter by Mayor Username
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              id="bridge-username-input"
              type="text"
              value={targetUsername}
              onChange={(e) => {
                setTargetUsername(e.target.value);
                if (localValidationMsg) setLocalValidationMsg(null);
              }}
              placeholder="e.g. khiva_prime or fergana_eco"
              className="flex-1 px-3.5 py-2 rounded-lg bg-[#112130] border border-slate-700 text-sm font-mono text-slate-100 focus:outline-none focus:border-amber-400"
            />
            <button
              type="submit"
              disabled={actionBusy || bridges.length >= MAX_BRIDGES}
              className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-semibold text-xs transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              Establish Bridge
            </button>
          </div>

          {localValidationMsg && (
            <p className="text-xs text-rose-400 font-medium">
              {localValidationMsg}
            </p>
          )}

          {/* Quick-select regional mayors */}
          <div className="flex items-center gap-2 flex-wrap text-xs text-slate-400 pt-1">
            <span>Regional Mayors:</span>
            {SUGGESTED_MAYORS.map((handle) => {
              const alreadyLinked = bridges.some(
                (b) => b.partnerUsername.toLowerCase() === handle
              );
              return (
                <button
                  key={handle}
                  type="button"
                  disabled={alreadyLinked}
                  onClick={() => setTargetUsername(handle)}
                  className={`px-2 py-1 rounded font-mono text-[11px] transition-colors cursor-pointer ${
                    alreadyLinked
                      ? 'bg-slate-900 text-slate-600 cursor-not-allowed'
                      : 'bg-slate-800 hover:bg-slate-700 text-amber-300'
                  }`}
                >
                  @{handle} {alreadyLinked ? '(Linked)' : ''}
                </button>
              );
            })}
          </div>
        </form>

        {/* Pending Bridge Requests */}
        {pendingBridges.length > 0 && (
          <div className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-300">
              Pending Bridge Charters ({pendingBridges.length})
            </h3>
            {pendingBridges.map((br) => (
              <div
                key={br.id}
                className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-500/40 flex items-center justify-between gap-3"
              >
                <div>
                  <div className="text-sm font-bold text-slate-100">
                    {br.partnerCityName} ·{' '}
                    <span className="font-mono text-amber-300">
                      @{br.partnerUsername}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 font-mono">
                    {br.partnerPopulation.toLocaleString()} pop · +$
                    {Math.round(br.partnerIncomePerSec)}/s
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={actionBusy}
                    onClick={() => onAcceptBridge(br.id)}
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs cursor-pointer whitespace-nowrap"
                  >
                    Accept Bridge (+5%)
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Active Bridges List */}
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            Active Connected Bridges ({activeBridges.length} / {MAX_BRIDGES})
          </h3>
          {activeBridges.length === 0 ? (
            <div className="p-6 text-center rounded-xl bg-[#0B151F] border border-slate-800 text-xs text-slate-400">
              No active bridges yet. Send or accept a charter above to earn +5%
              Tourism Revenue per bridge!
            </div>
          ) : (
            activeBridges.map((br) => (
              <div
                key={br.id}
                className="p-3.5 rounded-xl bg-[#142535] border border-slate-700 flex items-center justify-between gap-3"
              >
                <div>
                  <div className="text-sm font-bold text-slate-100">
                    {br.partnerCityName} ·{' '}
                    <span className="font-mono text-sky-300">
                      @{br.partnerUsername}
                    </span>
                  </div>
                  <div className="text-xs text-slate-300 font-mono">
                    +5% Tourism Bonus Active · {br.partnerPopulation.toLocaleString()}{' '}
                    pop · +${Math.round(br.partnerIncomePerSec)}/s
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onVisitCity(br.partnerCityId);
                    onClose();
                  }}
                  className="px-3.5 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  Visit City (Read-Only)
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
