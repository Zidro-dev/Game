import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateCityEconomy,
  calculateOfflineProgress,
  getBuildingUpgradeCost,
  getGridExpansionCost,
  MAX_OFFLINE_SECONDS,
} from './rules';

test('worker mechanic scales down business income when population is below required workers', () => {
  // Base population is 50. Adding a CENTRAL_BANK requires 260 workers.
  const metricsLowPop = calculateCityEconomy(
    [
      {
        id: 1,
        type: 'BUSINESS',
        subType: 'CENTRAL_BANK',
        level: 1,
        gridX: 0,
        gridY: 0,
      },
    ],
    0
  );

  assert.equal(metricsLowPop.workersRequired, 260);
  assert.ok(metricsLowPop.workerCapacityRatio < 0.25);
  assert.ok(metricsLowPop.netIncomePerSec < metricsLowPop.baseBusinessIncome);

  // Now add two Sky Residences (+330 pop) and a Botanical Dome (+44 ecology)
  const metricsFullPop = calculateCityEconomy(
    [
      {
        id: 1,
        type: 'BUSINESS',
        subType: 'CENTRAL_BANK',
        level: 1,
        gridX: 0,
        gridY: 0,
      },
      {
        id: 2,
        type: 'RESIDENTIAL',
        subType: 'SKY_RESIDENCE',
        level: 1,
        gridX: 1,
        gridY: 0,
      },
      {
        id: 3,
        type: 'RESIDENTIAL',
        subType: 'SKY_RESIDENCE',
        level: 1,
        gridX: 2,
        gridY: 0,
      },
      {
        id: 4,
        type: 'PARK',
        subType: 'BOTANICAL_DOME',
        level: 1,
        gridX: 3,
        gridY: 0,
      },
    ],
    0
  );

  assert.equal(metricsFullPop.workerCapacityRatio, 1.0);
  assert.equal(metricsFullPop.netIncomePerSec, metricsFullPop.baseBusinessIncome);
});

test('bridge tourism bonus adds +5% per active bridge and caps at 9 bridges (+45%)', () => {
  const base = calculateCityEconomy([], 0);
  const threeBridges = calculateCityEconomy([], 3);
  const twelveBridges = calculateCityEconomy([], 12);

  assert.equal(threeBridges.tourismBonusPercent, 15);
  assert.equal(
    threeBridges.netIncomePerSec,
    Number((base.baseBusinessIncome * 1.15).toFixed(2))
  );
  // Capped at 9 bridges = +45%
  assert.equal(twelveBridges.activeBridges, 9);
  assert.equal(twelveBridges.tourismBonusPercent, 45);
});

test('offline income calculation enforces 24-hour bank limit', () => {
  const now = 1_700_100_000_000;
  const twoHoursAgo = now - 2 * 3600 * 1000;
  const thirtyHoursAgo = now - 30 * 3600 * 1000;

  const normalOffline = calculateOfflineProgress(twoHoursAgo, now, 50);
  assert.equal(normalOffline.wasCappedAt24h, false);
  assert.equal(normalOffline.effectiveSeconds, 7200);
  assert.equal(normalOffline.earnedAmount, 360000);

  const cappedOffline = calculateOfflineProgress(thirtyHoursAgo, now, 50);
  assert.equal(cappedOffline.wasCappedAt24h, true);
  assert.equal(cappedOffline.effectiveSeconds, MAX_OFFLINE_SECONDS);
  assert.equal(cappedOffline.earnedAmount, MAX_OFFLINE_SECONDS * 50);
});

test('upgrade and grid expansion costs scale monotonically', () => {
  const lv1Cost = getBuildingUpgradeCost('CAFE', 1);
  const lv2Cost = getBuildingUpgradeCost('CAFE', 2);
  assert.ok(lv2Cost > lv1Cost);

  const grid5Cost = getGridExpansionCost(5);
  const grid6Cost = getGridExpansionCost(6);
  assert.ok(grid6Cost > grid5Cost);
});
