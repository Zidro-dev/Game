import React, { useState } from 'react';

interface BlueprintsModalProps {
  onClose: () => void;
}

const STEP_1_CODE = `// Step 1: PostgreSQL Schema (Drizzle ORM in src/db/schema.ts + Prisma Reference)
// --- Prisma Reference (schema.prisma) ---
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum BuildingType {
  RESIDENTIAL
  BUSINESS
  PARK
}

enum BridgeStatus {
  PENDING
  ACTIVE
}

model User {
  id        Int      @id @default(autoincrement())
  uid       String   @unique
  username  String   @unique
  email     String
  city      City?
  createdAt DateTime @default(now())
}

model City {
  id              Int        @id @default(autoincrement())
  userId          Int        @unique
  user            User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  name            String
  balance         Float      @default(2500)
  population      Int        @default(60)
  happiness       Int        @default(100)
  gridSize        Int        @default(5)
  incomePerSec    Float      @default(25)
  lastSyncAt      DateTime   @default(now())
  buildings       Building[]
  outgoingBridges Bridge[]   @relation("OutgoingBridges")
  incomingBridges Bridge[]   @relation("IncomingBridges")
  createdAt       DateTime   @default(now())
}

model Building {
  id        Int          @id @default(autoincrement())
  cityId    Int
  city      City         @relation(fields: [cityId], references: [id], onDelete: Cascade)
  type      BuildingType
  subType   String
  level     Int          @default(1)
  gridX     Int
  gridY     Int
  createdAt DateTime     @default(now())

  @@unique([cityId, gridX, gridY])
}

model Bridge {
  id         Int          @id @default(autoincrement())
  fromCityId Int
  toCityId   Int
  fromCity   City         @relation("OutgoingBridges", fields: [fromCityId], references: [id], onDelete: Cascade)
  toCity     City         @relation("IncomingBridges", fields: [toCityId], references: [id], onDelete: Cascade)
  status     BridgeStatus @default(PENDING)
  createdAt  DateTime     @default(now())

  @@unique([fromCityId, toCityId])
}`;

const STEP_2_CODE = `// Step 2: Core Game Engine Hook (src/hooks/useCityEngine.ts)
// Calculates 24h capped offline earnings upon mount and runs a 1s online tick
export const MAX_OFFLINE_SECONDS = 24 * 60 * 60; // 86,400s (24 hours)

export function calculateOfflineProgress(
  lastSyncTimestampMs: number,
  currentTimestampMs: number,
  incomePerSec: number
) {
  const rawElapsedSeconds = Math.max(
    0,
    Math.floor((currentTimestampMs - lastSyncTimestampMs) / 1000)
  );
  const wasCappedAt24h = rawElapsedSeconds > MAX_OFFLINE_SECONDS;
  const effectiveSeconds = Math.min(rawElapsedSeconds, MAX_OFFLINE_SECONDS);
  const earnedAmount = Number((effectiveSeconds * incomePerSec).toFixed(2));
  return { elapsedSeconds: rawElapsedSeconds, effectiveSeconds, earnedAmount, wasCappedAt24h };
}

// Inside useCityEngine.ts:
useEffect(() => {
  if (!authToken || !city || !isPlaying) return;
  const interval = setInterval(() => {
    setLiveBalance((prev) => Number((prev + myEconomy.netIncomePerSec).toFixed(2)));
  }, 1000);
  return () => clearInterval(interval);
}, [authToken, city, isPlaying, myEconomy.netIncomePerSec]);`;

const STEP_3_CODE = `// Step 3: Server Actions / API Routes (server.ts & src/db/repository.ts)
// Validates grid boundaries, deducts balance, recalculates Worker Capacity & Tourism Bonus
app.post('/api/city/build', requireAuth, async (req: AuthRequest, res) => {
  const uid = req.user!.uid;
  const { subType, gridX, gridY, clientBalance } = req.body;
  const result = await buildStructureInCity(uid, subType, gridX, gridY, clientBalance);
  res.json(result);
});

app.post('/api/city/upgrade', requireAuth, async (req: AuthRequest, res) => {
  const uid = req.user!.uid;
  const { buildingId, clientBalance } = req.body;
  const result = await upgradeBuildingInCity(uid, Number(buildingId), clientBalance);
  res.json(result);
});

app.post('/api/city/sync', requireAuth, async (req: AuthRequest, res) => {
  const uid = req.user!.uid;
  const { balance } = req.body;
  const updatedCity = await syncCityBalance(uid, Number(balance));
  res.json({ city: updatedCity });
});`;

const STEP_4_CODE = `// Step 4: Modular Tailwind CSS UI Components
// - src/components/TopStatusBar.tsx: Treasury, $/sec rate, Workforce Staffing %, Ecology %, Bridges
// - src/components/CityGrid.tsx: Interactive NxN grid with SVG buildings & Read-Only Visit banner
// - src/components/InspectorDock.tsx: Building construction catalog, Level upgrade & Grid expansion
// - src/components/BridgesModal.tsx: Alliance requests by username (max 9, +5% Tourism bonus each)
// - src/components/LeaderboardModal.tsx: Billionaires ($/sec) & Megapolises (Population) rankings`;

export const BlueprintsModal: React.FC<BlueprintsModalProps> = ({
  onClose,
}) => {
  const [stepTab, setStepTab] = useState<1 | 2 | 3 | 4>(1);
  const [copied, setCopied] = useState(false);

  const currentCode =
    stepTab === 1
      ? STEP_1_CODE
      : stepTab === 2
        ? STEP_2_CODE
        : stepTab === 3
          ? STEP_3_CODE
          : STEP_4_CODE;

  const handleCopy = () => {
    navigator.clipboard?.writeText(currentCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Step 1 to 4 Architecture Blueprints"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75"
    >
      <div className="w-full max-w-3xl rounded-2xl bg-[#101E2B] border border-slate-700 p-6 shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-xl font-bold text-slate-100">
              Developer Architecture Blueprints (Step 1 – Step 4)
            </h2>
            <p className="text-xs text-slate-400">
              Inspect or copy the production TypeScript & SQL schema layers
              powering this live Cloud SQL application
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

        <div className="flex items-center gap-1 p-1 bg-[#0A131C] rounded-lg border border-slate-800">
          {(
            [
              { step: 1, label: 'Step 1: Schema' },
              { step: 2, label: 'Step 2: useCityEngine' },
              { step: 3, label: 'Step 3: Server API' },
              { step: 4, label: 'Step 4: UI Grid & HUD' },
            ] as const
          ).map((item) => (
            <button
              key={item.step}
              type="button"
              onClick={() => setStepTab(item.step)}
              className={`flex-1 py-2 px-3 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                stepTab === item.step
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="relative rounded-xl bg-[#081017] border border-slate-800 p-4 font-mono text-xs text-slate-200 overflow-x-auto">
          <button
            type="button"
            onClick={handleCopy}
            className="absolute top-3 right-3 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] text-amber-300 cursor-pointer"
          >
            {copied ? 'Copied!' : 'Copy Code'}
          </button>
          <pre className="leading-relaxed whitespace-pre-wrap">{currentCode}</pre>
        </div>
      </div>
    </div>
  );
};
