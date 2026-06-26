import { useCallback, useEffect, useRef, useState } from "react";
import { fetchEvents, getLatestLedger, readState } from "../stellar";
import type { CampaignState, DonationActivity } from "../types";

const STATE_POLL_MS = 5000;
const EVENT_POLL_MS = 4000;

export function useCampaign() {
  const [state, setState] = useState<CampaignState | null>(null);
  const [activities, setActivities] = useState<DonationActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newActivityId, setNewActivityId] = useState<string | null>(null);

  const seen = useRef<Set<string>>(new Set());
  const cursor = useRef<string | undefined>(undefined);
  const startLedger = useRef<number | undefined>(undefined);

  const refreshState = useCallback(async () => {
    try {
      const s = await readState();
      setState(s);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Durum okunamadı");
    } finally {
      setLoading(false);
    }
  }, []);

  const pollEvents = useCallback(async () => {
    try {
      const { activities: incoming, cursor: nextCursor } = await fetchEvents({
        cursor: cursor.current,
        startLedger: startLedger.current,
      });
      cursor.current = nextCursor;
      startLedger.current = undefined; // bundan sonra cursor ile devam

      const fresh = incoming.filter((a) => !seen.current.has(a.id));
      if (fresh.length > 0) {
        fresh.forEach((a) => seen.current.add(a.id));
        setActivities((prev) =>
          [...fresh.reverse(), ...prev].slice(0, 50)
        );
        setNewActivityId(fresh[0].id);
        // yeni bağış geldi → state'i hemen tazele
        refreshState();
      }
    } catch {
      // geçici RPC hatası — sessizce yut, sonraki tur dener
    }
  }, [refreshState]);

  // İlk yükleme: state + event başlangıç ledger'ı
  useEffect(() => {
    let active = true;
    (async () => {
      await refreshState();
      try {
        const latest = await getLatestLedger();
        if (active) startLedger.current = Math.max(latest - 8000, 1);
      } catch {
        /* yoksay */
      }
      if (active) pollEvents();
    })();
    return () => {
      active = false;
    };
  }, [refreshState, pollEvents]);

  // Periyodik polling
  useEffect(() => {
    const s = setInterval(refreshState, STATE_POLL_MS);
    const e = setInterval(pollEvents, EVENT_POLL_MS);
    return () => {
      clearInterval(s);
      clearInterval(e);
    };
  }, [refreshState, pollEvents]);

  return { state, activities, loading, error, newActivityId, refreshState };
}
