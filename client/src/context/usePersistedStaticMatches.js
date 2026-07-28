import { useState, useCallback, useEffect } from 'react';
import {
  STATIC_MATCHES_STORAGE_KEY,
  getInitialStaticMatches,
  saveStaticMatchesToStorage,
  parseStaticMatchesStorageEvent,
} from './matchHelpers.js';
import { STATIC_MATCHES } from '../services/domain.js';

export function usePersistedStaticMatches(initialFallback = STATIC_MATCHES) {
  const [staticState, setStaticStateInternal] = useState(() => getInitialStaticMatches(initialFallback));

  const setStaticState = useCallback((update) => {
    setStaticStateInternal((prev) => {
      const next = typeof update === 'function' ? update(prev) : update;
      saveStaticMatchesToStorage(next);
      return next;
    });
  }, []);

  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === STATIC_MATCHES_STORAGE_KEY) {
        setStaticStateInternal(parseStaticMatchesStorageEvent(e.newValue, initialFallback));
      }
    };

    const handleResetEvent = () => {
      setStaticStateInternal(initialFallback);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('ebuhay_reset_static_matches', handleResetEvent);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('ebuhay_reset_static_matches', handleResetEvent);
    };
  }, [initialFallback]);

  return [staticState, setStaticState];
}
