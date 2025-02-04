import init, { client } from '@snapshot-labs/snapshot-metrics';
import db from './mysql';
import type { Express } from 'express';

export default function initMetrics(app: Express) {
  init(app, {
    whitelistedPath: [/^\/$/, /^\/api\/test$/]
  });
}

new client.Gauge({
  name: 'events_per_type_count',
  help: 'Number of events per type',
  labelNames: ['type'],
  async collect() {
    const result = await db.queryAsync(
      `SELECT count(*) as count, event FROM events GROUP BY event`
    );
    result.forEach(async function callback(this: any, data) {
      this.set({ type: data.event }, data.count);
    }, this);
  }
});

new client.Gauge({
  name: 'subscribers_per_type_count',
  help: 'Number of subscribers per type',
  labelNames: ['type'],
  async collect() {
    this.set(
      { type: 'http' },
      (await db.queryAsync(`SELECT count(*) as count FROM subscribers`))[0].count as any
    );
    this.set(
      { type: 'discord' },
      (await db.queryAsync(`SELECT count(*) as count FROM subscriptions`))[0].count as any
    );
  }
});

export const timeOutgoingRequest = new client.Histogram({
  name: 'http_webhook_duration_seconds',
  help: 'Duration in seconds of outgoing webhook requests',
  labelNames: ['method', 'status'],
  buckets: [0.5, 1, 2, 5, 10, 15]
});
