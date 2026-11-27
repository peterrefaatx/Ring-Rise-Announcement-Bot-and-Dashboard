"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { DashboardSnapshot } from "@/lib/dashboard";
import type { ConnectionState } from "@/components/app-shell";
import { msUntilNextEstMidnight } from "@/lib/timezone";

interface StreamActivityEvent {
  id: string;
  seq: number;
  type: "LEAD_ANNOUNCED" | "CAMPAIGN_CHANGED" | "CALLER_CHANGED" | "SETTINGS_CHANGED";
  payload: Record<string, unknown>;
  createdAt: string;
}

const ACTIVE_POLL_INTERVAL_MS = 8_000;
const QUIET_POLL_INTERVAL_MS = 20_000;
const QUIET_AFTER_MS = 3 * 60_000;

export function useRealtimeDashboard(initialSnapshot: DashboardSnapshot) {
  const [snapshot, setSnapshot] = useState<DashboardSnapshot>(initialSnapshot);
  const realtimeMode = snapshot.realtimeMode ?? initialSnapshot.realtimeMode ?? "sse";
  const [connectionState, setConnectionState] = useState<ConnectionState>(
    realtimeMode === "poll" ? "live" : "reconnecting"
  );
  const lastSeqRef = useRef<number>(initialSnapshot.latestEventSeq);
  const businessDateRef = useRef<string>(initialSnapshot.businessDateEst);
  const lastActivityAtRef = useRef<number>(Date.now());
  const seenSeqsRef = useRef<Set<number>>(new Set());
  const syncInFlightRef = useRef<boolean>(false);
  const syncQueuedRef = useRef<boolean>(false);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    businessDateRef.current = snapshot.businessDateEst;
    try {
      sessionStorage.setItem(
        `rr_dash_${snapshot.businessDateEst}`,
        JSON.stringify(snapshot)
      );
    } catch {
      // ignore quota/private mode errors
    }
  }, [snapshot]);

  const fetchAuthoritativeSnapshot = useCallback(
    async (options?: { conditional?: boolean }) => {
      if (syncInFlightRef.current) {
        syncQueuedRef.current = true;
        return;
      }
      syncInFlightRef.current = true;
      try {
        const useConditional = Boolean(options?.conditional);
        const url = useConditional
          ? `/api/dashboard/state?sinceSeq=${lastSeqRef.current}&date=${encodeURIComponent(
              businessDateRef.current
            )}`
          : "/api/dashboard/state";

        const res = await fetch(url, { cache: "no-store" });
        if (res.status === 401) {
          window.location.href = "/login";
          return;
        }
        if (!res.ok) return;

        const payload = (await res.json()) as
          | DashboardSnapshot
          | { unchanged: true; latestEventSeq: number; businessDateEst: string };

        if ("unchanged" in payload && payload.unchanged) {
          lastSeqRef.current = Math.max(lastSeqRef.current, payload.latestEventSeq);
          if (realtimeMode === "poll") {
            setConnectionState("live");
          }
          return;
        }

        const next = payload as DashboardSnapshot;
        const prevSeq = lastSeqRef.current;
        const prevDate = businessDateRef.current;

        if (next.latestEventSeq > prevSeq || next.businessDateEst !== prevDate) {
          lastActivityAtRef.current = Date.now();
        }

        if (next.realtimeMode === "poll") {
          setConnectionState("live");
          if (next.businessDateEst !== prevDate) {
            toast.info("New EST business day started — daily leaderboard reset.");
          }
          const unseenLeads = next.activityFeed
            .filter((item) => item.seq > prevSeq && !seenSeqsRef.current.has(item.seq))
            .slice(0, 3)
            .reverse();
          for (const item of unseenLeads) {
            seenSeqsRef.current.add(item.seq);
            toast.info(`${item.callerName} announced a lead in ${item.campaignName}`);
          }
          if (seenSeqsRef.current.size > 1000) {
            const first = seenSeqsRef.current.values().next().value;
            if (first !== undefined) seenSeqsRef.current.delete(first);
          }
        }

        lastSeqRef.current = Math.max(prevSeq, next.latestEventSeq);
        setSnapshot(next);
      } catch {
        if (realtimeMode === "poll" && typeof navigator !== "undefined" && !navigator.onLine) {
          setConnectionState("offline");
        }
        // Transient fetch failure will be reconciled on next poll/event or reconnect
      } finally {
        syncInFlightRef.current = false;
        if (syncQueuedRef.current) {
          syncQueuedRef.current = false;
          void fetchAuthoritativeSnapshot();
        }
      }
    },
    [realtimeMode]
  );

  const scheduleSync = useCallback(
    (delayMs = 40, options?: { conditional?: boolean }) => {
      if (syncTimerRef.current) {
        clearTimeout(syncTimerRef.current);
      }
      syncTimerRef.current = setTimeout(() => {
        syncTimerRef.current = null;
        void fetchAuthoritativeSnapshot(options);
      }, delayMs);
    },
    [fetchAuthoritativeSnapshot]
  );

  useEffect(() => {
    if (realtimeMode === "poll") {
      setConnectionState(navigator.onLine ? "live" : "offline");
      let pollTimeout: ReturnType<typeof setTimeout> | null = null;
      let disposed = false;

      const scheduleNextPoll = () => {
        if (disposed) return;
        const isQuiet = Date.now() - lastActivityAtRef.current > QUIET_AFTER_MS;
        const delay = isQuiet ? QUIET_POLL_INTERVAL_MS : ACTIVE_POLL_INTERVAL_MS;
        pollTimeout = setTimeout(async () => {
          if (disposed) return;
          if (document.visibilityState === "visible" && navigator.onLine) {
            await fetchAuthoritativeSnapshot({ conditional: true });
          }
          scheduleNextPoll();
        }, delay);
      };

      scheduleNextPoll();

      const markActiveAndResync = () => {
        lastActivityAtRef.current = Date.now();
        if (navigator.onLine) {
          setConnectionState("live");
          scheduleSync(20, { conditional: true });
        }
      };

      const handleOffline = () => {
        setConnectionState("offline");
      };
      const handleVisibility = () => {
        if (document.visibilityState === "visible") {
          markActiveAndResync();
        }
      };

      window.addEventListener("online", markActiveAndResync);
      window.addEventListener("offline", handleOffline);
      document.addEventListener("visibilitychange", handleVisibility);

      return () => {
        disposed = true;
        if (pollTimeout) clearTimeout(pollTimeout);
        if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
        window.removeEventListener("online", markActiveAndResync);
        window.removeEventListener("offline", handleOffline);
        document.removeEventListener("visibilitychange", handleVisibility);
      };
    }

    let eventSource: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let disposed = false;

    const connect = () => {
      if (disposed) return;
      if (!navigator.onLine) {
        setConnectionState("offline");
        return;
      }

      setConnectionState("reconnecting");
      const url = `/api/realtime/stream?lastEventId=${lastSeqRef.current}`;
      const es = new EventSource(url);
      eventSource = es;

      es.addEventListener("connected", (raw) => {
        setConnectionState("live");
        try {
          const data = JSON.parse((raw as MessageEvent).data) as {
            businessDateEst: string;
            latestSeq: number;
            resyncRequired: boolean;
          };
          if (
            data.resyncRequired ||
            data.businessDateEst !== businessDateRef.current ||
            data.latestSeq > lastSeqRef.current
          ) {
            scheduleSync(20);
          }
        } catch {
          scheduleSync(20);
        }
      });

      es.addEventListener("activity", (raw) => {
        try {
          const evt = JSON.parse((raw as MessageEvent).data) as StreamActivityEvent;
          if (seenSeqsRef.current.has(evt.seq)) {
            return;
          }
          seenSeqsRef.current.add(evt.seq);
          if (seenSeqsRef.current.size > 1000) {
            const first = seenSeqsRef.current.values().next().value;
            if (first !== undefined) seenSeqsRef.current.delete(first);
          }
          lastSeqRef.current = Math.max(lastSeqRef.current, evt.seq);

          if (evt.type === "LEAD_ANNOUNCED") {
            const callerName = String(evt.payload.callerName || "A caller");
            const campaignName = String(evt.payload.campaignName || "a campaign");
            toast.info(`${callerName} announced a lead in ${campaignName}`);
          }

          scheduleSync(35);
        } catch {
          scheduleSync(35);
        }
      });

      es.addEventListener("day_rollover", () => {
        toast.info("New EST business day started — daily leaderboard reset.");
        scheduleSync(10);
      });

      es.onerror = () => {
        es.close();
        eventSource = null;
        if (disposed) return;
        setConnectionState(navigator.onLine ? "reconnecting" : "offline");
        if (!reconnectTimer) {
          reconnectTimer = setTimeout(() => {
            reconnectTimer = null;
            connect();
          }, 2500);
        }
      };
    };

    connect();

    const handleOnline = () => {
      setConnectionState("reconnecting");
      scheduleSync(20);
      if (!eventSource) {
        connect();
      }
    };
    const handleOffline = () => {
      setConnectionState("offline");
    };
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        scheduleSync(20, { conditional: true });
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      disposed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
      if (eventSource) eventSource.close();
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [realtimeMode, fetchAuthoritativeSnapshot, scheduleSync]);

  // Local fixed-EST midnight rollover timer so open browsers always reset at 00:00:00 EST
  useEffect(() => {
    const ms = msUntilNextEstMidnight() + 500;
    const timer = setTimeout(() => {
      void fetchAuthoritativeSnapshot();
    }, ms);
    return () => clearTimeout(timer);
  }, [snapshot.businessDateEst, fetchAuthoritativeSnapshot]);

  const refreshNow = useCallback(async () => {
    await fetchAuthoritativeSnapshot({ conditional: false });
  }, [fetchAuthoritativeSnapshot]);

  return {
    snapshot,
    connectionState,
    refreshNow,
  };
}
