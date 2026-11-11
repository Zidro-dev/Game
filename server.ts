import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { requireAuth, AuthRequest } from './src/middleware/auth.ts';
import {
  acceptBridgeAlliance,
  buildStructureInCity,
  demolishBuildingInCity,
  expandCityGrid,
  getLeaderboards,
  getOrCreateUserAndCity,
  getReadOnlyCityById,
  requestBridgeAlliance,
  syncCityBalance,
  upgradeBuildingInCity,
} from './src/db/repository.ts';
import { BuildingSubType } from './src/game/rules.ts';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // 1. Load or initialize current player's city & offline earnings
  app.get('/api/city', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const email = req.user!.email || `${uid}@aurelia.city`;
      const preferredUsername = req.user!.name as string | undefined;
      const data = await getOrCreateUserAndCity(uid, email, preferredUsername);
      res.json(data);
    } catch (error: any) {
      console.error('GET /api/city failed:', error);
      res.status(500).json({ error: error.message || 'Failed to load city' });
    }
  });

  // 2. Construct a new building on the city grid
  app.post('/api/city/build', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const { subType, gridX, gridY, clientBalance } = req.body;
      const result = await buildStructureInCity(
        uid,
        subType as BuildingSubType,
        Number(gridX),
        Number(gridY),
        typeof clientBalance === 'number' ? clientBalance : undefined
      );
      res.json(result);
    } catch (error: any) {
      console.error('POST /api/city/build failed:', error);
      res.status(400).json({ error: error.message || 'Failed to build structure' });
    }
  });

  // 3. Upgrade an existing building
  app.post('/api/city/upgrade', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const { buildingId, clientBalance } = req.body;
      const result = await upgradeBuildingInCity(
        uid,
        Number(buildingId),
        typeof clientBalance === 'number' ? clientBalance : undefined
      );
      res.json(result);
    } catch (error: any) {
      console.error('POST /api/city/upgrade failed:', error);
      res.status(400).json({ error: error.message || 'Failed to upgrade building' });
    }
  });

  // 4. Demolish an existing building (50% refund)
  app.post('/api/city/demolish', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const { buildingId, clientBalance } = req.body;
      const result = await demolishBuildingInCity(
        uid,
        Number(buildingId),
        typeof clientBalance === 'number' ? clientBalance : undefined
      );
      res.json(result);
    } catch (error: any) {
      console.error('POST /api/city/demolish failed:', error);
      res.status(400).json({ error: error.message || 'Failed to demolish building' });
    }
  });

  // 5. Expand City Grid (e.g., 5x5 -> 6x6 -> 7x7)
  app.post('/api/city/expand', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const { clientBalance } = req.body;
      const updatedCity = await expandCityGrid(
        uid,
        typeof clientBalance === 'number' ? clientBalance : undefined
      );
      res.json({ city: updatedCity });
    } catch (error: any) {
      console.error('POST /api/city/expand failed:', error);
      res.status(400).json({ error: error.message || 'Failed to expand grid' });
    }
  });

  // 6. Sync online accumulated balance to PostgreSQL (on action / exit / manual save)
  app.post('/api/city/sync', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const { balance } = req.body;
      const updatedCity = await syncCityBalance(uid, Number(balance || 0));
      res.json({ city: updatedCity });
    } catch (error: any) {
      console.error('POST /api/city/sync failed:', error);
      res.status(500).json({ error: error.message || 'Failed to sync balance' });
    }
  });

  // 7. Request a Bridge Alliance by Mayor Username
  app.post('/api/bridges/request', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const { targetUsername } = req.body;
      const result = await requestBridgeAlliance(uid, String(targetUsername || ''));
      res.json(result);
    } catch (error: any) {
      console.error('POST /api/bridges/request failed:', error);
      res.status(400).json({ error: error.message || 'Failed to request bridge' });
    }
  });

  // 8. Accept a Pending Bridge Alliance
  app.post('/api/bridges/accept', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const { bridgeId } = req.body;
      const result = await acceptBridgeAlliance(uid, Number(bridgeId));
      res.json(result);
    } catch (error: any) {
      console.error('POST /api/bridges/accept failed:', error);
      res.status(400).json({ error: error.message || 'Failed to accept bridge' });
    }
  });

  // 9. Visit Connected City in Read-Only Mode
  app.get('/api/city/visit/:cityId', requireAuth, async (req: AuthRequest, res) => {
    try {
      const targetCityId = Number(req.params.cityId);
      const data = await getReadOnlyCityById(targetCityId);
      res.json(data);
    } catch (error: any) {
      console.error('GET /api/city/visit/:cityId failed:', error);
      res.status(404).json({ error: error.message || 'Failed to visit city' });
    }
  });

  // 10. Leaderboards: Billionaires ($/sec) & Megapolises (Population)
  app.get('/api/leaderboards', requireAuth, async (_req: AuthRequest, res) => {
    try {
      const rankings = await getLeaderboards();
      res.json(rankings);
    } catch (error: any) {
      console.error('GET /api/leaderboards failed:', error);
      res.status(500).json({ error: error.message || 'Failed to load leaderboards' });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Aurelia City Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
