import { useState, useCallback, useEffect } from "react";
import {
  STATIC_MATCHES_STORAGE_KEY,
  getInitialStaticMatches,
  saveStaticMatchesToStorage,
  parseStaticMatchesStorageEvent,
} from "./matchHelpers";
import { STATIC_MATCHES } from "../services/domain";
import type { MatchItem } from "../services/domain";

type StaticMatch = MatchItem;
type StaticMatchUpdate =
  | StaticMatch[]
  | ((previous: StaticMatch[]) => StaticMatch[]);

export function usePersistedStaticMatches(
  initialFallback: StaticMatch[] = STATIC_MATCHES,
): [StaticMatch[], (update: StaticMatchUpdate) => void] {
  const [staticState, setStaticStateInternal] = useState<StaticMatch[]>(() =>
    getInitialStaticMatches(initialFallback),
  );

  const setStaticState = useCallback((update: StaticMatchUpdate) => {
    setStaticStateInternal((prev) => {
      const next = typeof update === "function" ? update(prev) : update;
      saveStaticMatchesToStorage(next);
      return next;
    });
  }, []);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STATIC_MATCHES_STORAGE_KEY) {
        setStaticStateInternal(
          parseStaticMatchesStorageEvent(e.newValue, initialFallback),
        );
      }
    };

    const handleResetEvent = () => {
      setStaticStateInternal(initialFallback);
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("ebuhay_reset_static_matches", handleResetEvent);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener(
        "ebuhay_reset_static_matches",
        handleResetEvent,
      );
    };
  }, [initialFallback]);

  return [staticState, setStaticState];
}
