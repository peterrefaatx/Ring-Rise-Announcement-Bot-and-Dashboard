import { EventEmitter } from "node:events";
import { Client } from "pg";
import type { ActivityEventType, Prisma } from "@prisma/client";
import { prisma } from "./db";

export const PG_REALTIME_CHANNEL = "ringrise_events";

export interface RealtimeBroadcastEvent {
  id: string;
  seq: number;
  type: ActivityEventType;
  payload: Record<string, unknown>;
  createdAt: string;
}

class RealtimeBroker {
  private emitter = new EventEmitter();
  private pgClient: Client | null = null;
  private started = false;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private recentSeqs = new Set<number>();

  constructor() {
    this.emitter.setMaxListeners(1000);
  }

  public async ensureStarted(): Promise<void> {
    if (this.started) return;
    this.started = true;
    await this.connectPgListener();
  }

  private async connectPgListener(): Promise<void> {
    if (!process.env.DATABASE_URL) return;
    try {
      const client = new Client({ connectionString: process.env.DATABASE_URL });
      client.on("error", (err) => {
        console.error("[RealtimeBroker] PG listener error:", err.message);
        this.scheduleReconnect();
      });
      client.on("end", () => {
        this.scheduleReconnect();
      });
      client.on("notification", (msg) => {
        if (msg.channel !== PG_REALTIME_CHANNEL || !msg.payload) return;
        try {
          const parsed = JSON.parse(msg.payload) as RealtimeBroadcastEvent;
          this.dispatchUnique(parsed);
        } catch (err) {
          console.error("[RealtimeBroker] Invalid notification payload:", err);
        }
      });

      await client.connect();
      await client.query(`LISTEN ${PG_REALTIME_CHANNEL}`);
      this.pgClient = client;
    } catch (err) {
      console.error("[RealtimeBroker] Failed to connect PG listener:", err);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.pgClient) {
      this.pgClient.removeAllListeners();
      this.pgClient.end().catch(() => {});
      this.pgClient = null;
    }
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.connectPgListener();
    }, 3000);
  }

  public dispatchUnique(event: RealtimeBroadcastEvent): void {
    if (this.recentSeqs.has(event.seq)) {
      return;
    }
    this.recentSeqs.add(event.seq);
    if (this.recentSeqs.size > 2000) {
      const oldest = this.recentSeqs.values().next().value;
      if (oldest !== undefined) {
        this.recentSeqs.delete(oldest);
      }
    }
    this.emitter.emit("event", event);
  }

  public subscribe(listener: (event: RealtimeBroadcastEvent) => void): () => void {
    void this.ensureStarted();
    this.emitter.on("event", listener);
    return () => {
      this.emitter.off("event", listener);
    };
  }
}

const globalForBroker = globalThis as unknown as {
  realtimeBroker: RealtimeBroker | undefined;
};

export const realtimeBroker =
  globalForBroker.realtimeBroker ?? new RealtimeBroker();

if (process.env.NODE_ENV !== "production") {
  globalForBroker.realtimeBroker = realtimeBroker;
}

/**
 * Persists an ActivityEvent inside an existing Prisma transaction and schedules a transactional pg_notify.
 */
export async function recordActivityEventTx(
  tx: Prisma.TransactionClient,
  type: ActivityEventType,
  payload: Prisma.InputJsonValue
): Promise<RealtimeBroadcastEvent> {
  const created = await tx.activityEvent.create({
    data: {
      type,
      payload,
    },
  });

  const event: RealtimeBroadcastEvent = {
    id: created.id,
    seq: created.seq,
    type: created.type,
    payload: (created.payload ?? {}) as Record<string, unknown>,
    createdAt: created.createdAt.toISOString(),
  };

  const jsonPayload = JSON.stringify(event);
  // pg_notify inside transaction fires only when transaction commits
  await tx.$executeRaw`SELECT pg_notify(${PG_REALTIME_CHANNEL}, ${jsonPayload})`;

  return event;
}

/**
 * Records and broadcasts an ActivityEvent outside an existing transaction.
 */
export async function emitActivityEvent(
  type: ActivityEventType,
  payload: Prisma.InputJsonValue
): Promise<RealtimeBroadcastEvent> {
  const event = await prisma.$transaction(async (tx) => {
    return recordActivityEventTx(tx, type, payload);
  });
  realtimeBroker.dispatchUnique(event);
  return event;
}

export async function getMissedActivityEvents(sinceSeq: number): Promise<{
  resyncRequired: boolean;
  events: RealtimeBroadcastEvent[];
  latestSeq: number;
}> {
  const latest = await prisma.activityEvent.findFirst({
    orderBy: { seq: "desc" },
    select: { seq: true },
  });
  const latestSeq = latest?.seq ?? 0;

  if (sinceSeq <= 0 || latestSeq <= sinceSeq) {
    return { resyncRequired: false, events: [], latestSeq };
  }

  const rows = await prisma.activityEvent.findMany({
    where: { seq: { gt: sinceSeq } },
    orderBy: { seq: "asc" },
    take: 101,
  });

  if (rows.length > 100) {
    return { resyncRequired: true, events: [], latestSeq };
  }

  return {
    resyncRequired: false,
    latestSeq,
    events: rows.map((row) => ({
      id: row.id,
      seq: row.seq,
      type: row.type,
      payload: (row.payload ?? {}) as Record<string, unknown>,
      createdAt: row.createdAt.toISOString(),
    })),
  };
}
