import { Request, Response } from 'express';
import { EngineProcessAdapter } from '../engine/process_adapter.js';
import { MySqlService } from '../services/mysql.service.js';

export async function healthCheck(req: Request, res: Response): Promise<void> {
  const adapter = EngineProcessAdapter.getInstance();
  const mysqlService = MySqlService.getInstance();

  let engineStatus = 'offline';
  let engineVersion = 'unknown';

  try {
    const pong = await adapter.ping();
    if (pong && pong.status === 'pong') {
      engineStatus = 'running';
      engineVersion = pong.version || '1.1.0';
    }
  } catch (err) {
    engineStatus = 'error: ' + (err as Error).message;
  }

  const mysqlHealth = await mysqlService.getHealth();

  res.json({
    status: 'ok',
    service: 'DBIndex Simulator & SQL Laboratory API',
    uptimeSeconds: process.uptime(),
    timestamp: new Date().toISOString(),
    engine: {
      status: engineStatus,
      version: engineVersion
    },
    mysql: {
      status: mysqlHealth.connected ? 'connected' : 'disconnected',
      version: mysqlHealth.version,
      host: mysqlHealth.host
    },
    api: {
      status: 'online'
    }
  });
}
