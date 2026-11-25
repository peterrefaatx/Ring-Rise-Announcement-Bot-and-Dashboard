import { NextRequest } from "next/server";
import { requireApiAuth } from "@/lib/auth";
import {
  getMissedActivityEvents,
  realtimeBroker,
  type RealtimeBroadcastEvent,
} from "@/lib/realtime";
import { getBusinessDateEst } from "@/lib/timezone";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function formatSseMessage(id: number | string | null, event: string, data: unknown): string {
  let msg = "";
  if (id !== null) {
    msg += `id: ${id}\n`;
  }
  msg += `event: ${event}\n`;
  msg += `data: ${JSON.stringify(data)}\n\n`;
  return msg;
}

export async function GET(request: NextRequest) {
  const auth = await requireApiAuth();
  if (!auth.ok) return auth.response;

  const headerLastId = request.headers.get("last-event-id");
  const queryLastId = request.nextUrl.searchParams.get("lastEventId");
  const rawLastId = headerLastId ?? queryLastId;
  const parsedLastSeq = rawLastId !== null ? Number.parseInt(rawLastId, 10) : NaN;
  const sinceSeq =
    Number.isFinite(parsedLastSeq) && parsedLastSeq >= 0 ? parsedLastSeq : null;

  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;
  let heartbeatTimer: NodeJS.Timeout | null = null;
  let closed = false;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let lastDeliveredSeq = sinceSeq ?? 0;
      let currentBusinessDateEst = getBusinessDateEst(new Date());

      const safeEnqueue = (chunk: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          cleanup();
        }
      };

      const deliverEvent = (evt: RealtimeBroadcastEvent) => {
        if (evt.seq <= lastDeliveredSeq) return;
        lastDeliveredSeq = evt.seq;
        safeEnqueue(formatSseMessage(evt.seq, "activity", evt));
      };

      const cleanup = () => {
        if (closed) return;
        closed = true;
        if (heartbeatTimer) {
          clearInterval(heartbeatTimer);
          heartbeatTimer = null;
        }
        if (unsubscribe) {
          unsubscribe();
          unsubscribe = null;
        }
        try {
          controller.close();
        } catch {
          // already closed
        }
      };

      request.signal.addEventListener("abort", cleanup);

      // Subscribe first so no events are missed between catchup query and live stream
      const buffered: RealtimeBroadcastEvent[] = [];
      let catchupComplete = false;

      unsubscribe = realtimeBroker.subscribe((evt) => {
        if (!catchupComplete) {
          buffered.push(evt);
        } else {
          deliverEvent(evt);
        }
      });

      try {
        const missed = await getMissedActivityEvents(sinceSeq);
        safeEnqueue(
          formatSseMessage(null, "connected", {
            businessDateEst: currentBusinessDateEst,
            latestSeq: missed.latestSeq,
            resyncRequired: missed.resyncRequired,
            serverTime: new Date().toISOString(),
          })
        );

        if (sinceSeq === null || missed.resyncRequired) {
          lastDeliveredSeq = missed.latestSeq;
        } else {
          for (const evt of missed.events) {
            deliverEvent(evt);
          }
        }

        catchupComplete = true;
        for (const evt of buffered) {
          deliverEvent(evt);
        }
      } catch (err) {
        console.error("[SSE] Catch-up failed:", err);
        safeEnqueue(
          formatSseMessage(null, "connected", {
            businessDateEst: currentBusinessDateEst,
            latestSeq: lastDeliveredSeq,
            resyncRequired: true,
            serverTime: new Date().toISOString(),
          })
        );
        catchupComplete = true;
      }

      heartbeatTimer = setInterval(() => {
        const nowDate = getBusinessDateEst(new Date());
        if (nowDate !== currentBusinessDateEst) {
          currentBusinessDateEst = nowDate;
          safeEnqueue(
            formatSseMessage(null, "day_rollover", {
              businessDateEst: nowDate,
              serverTime: new Date().toISOString(),
            })
          );
        } else {
          safeEnqueue(
            formatSseMessage(null, "ping", {
              businessDateEst: nowDate,
              serverTime: new Date().toISOString(),
            })
          );
        }
      }, 15000);
    },
    cancel() {
      closed = true;
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      if (unsubscribe) unsubscribe();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
