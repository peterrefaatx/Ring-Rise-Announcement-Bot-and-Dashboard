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

export function useRealtimeDashboard(initialSnapshot: DashboardSnapshot) {
  const [snapshot, setSnapshot] = useState<DashboardSnapshot>(initialSnapshot);
  const [connectionState, setConnectionState] = useState<ConnectionState>("reconnecting");
  const lastSeqRef = useRef<number>(initialSnapshot.latestEventSeq);
  const seenSeqsRef = useRef<Set<number>>(new Set());
  const syncInFlightRef = useRef<boolean>(false);
  const syncQueuedRef = useRef<boolean>(false);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    try {
      sessionStorage.setItem(
        `rr_dash_${snapshot.businessDateEst}`,
        JSON.stringify(snapshot)
      );
    } catch {
      // ignore quota/private mode errors
    }
  }, [snapshot]);

  const fetchAuthoritativeSnapshot = useCallback(async () => {
    if (syncInFlightRef.current) {
      syncQueuedRef.current = true;
      return;
    }
    syncInFlightRef.current = true;
    try {
      const res = await fetch("/api/dashboard/state", { cache: "no-store" });
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      if (!res.ok) return;
      const next = (await res.json()) as DashboardSnapshot;
      lastSeqRef.current = Math.max(lastSeqRef.current, next.latestEventSeq);
      setSnapshot(next);
    } catch {
      // Transient fetch failure will be reconciled on next event or reconnect
    } finally {
      syncInFlightRef.current = false;
      if (syncQueuedRef.current) {
        syncQueuedRef.current = false;
        void fetchAuthoritativeSnapshot();
      }
    }
  }, []);

  const scheduleSync = useCallback(
    (delayMs = 40) => {
      if (syncTimerRef.current) {
        clearTimeout(syncTimerRef.current);
      }
      syncTimerRef.current = setTimeout(() => {
        syncTimerRef.current = null;
        void fetchAuthoritativeSnapshot();
      }, delayMs);
    },
    [fetchAuthoritativeSnapshot]
  );

  useEffect(() => {
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
            data.businessDateEst !== snapshot.businessDateEst ||
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
        scheduleSync(20);
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
  }, [scheduleSync, snapshot.businessDateEst]);

  // Local fixed-EST midnight rollover timer so open browsers always reset at 00:00:00 EST
  useEffect(() => {
    const ms = msUntilNextEstMidnight() + 500;
    const timer = setTimeout(() => {
      void fetchAuthoritativeSnapshot();
    }, ms);
    return () => clearTimeout(timer);
  }, [snapshot.businessDateEst, fetchAuthoritativeSnapshot]);

  return {
    snapshot,
    connectionState,
    refreshNow: fetchAuthoritativeSnapshot,
  };
}
