'use client';

import { useCallback, useEffect, useReducer, useState } from 'react';

import {
  createInitialWindowManagerState,
  parseWindowManagerState,
  serializeWindowManagerState,
  windowManagerReducer,
  type CattipuWindowId,
  type WindowPosition,
} from './windowManager.reducer';

export const CATTIPU_WINDOW_SESSION_KEY =
  'cattipu-os:window-manager:v1';

export function useWindowManager() {
  const [state, dispatch] = useReducer(
    windowManagerReducer,
    undefined,
    createInitialWindowManagerState,
  );
  const [sessionHydrated, setSessionHydrated] = useState(false);

  useEffect(() => {
    try {
      const restored = parseWindowManagerState(
        window.sessionStorage.getItem(CATTIPU_WINDOW_SESSION_KEY),
      );

      if (restored) {
        dispatch({ type: 'hydrate', state: restored });
      }
    } catch {
      // Session storage may be unavailable in privacy-restricted contexts.
      // The desktop remains functional with in-memory state.
    } finally {
      setSessionHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!sessionHydrated) {
      return;
    }

    try {
      window.sessionStorage.setItem(
        CATTIPU_WINDOW_SESSION_KEY,
        serializeWindowManagerState(state),
      );
    } catch {
      // Persistence is best-effort; window management must remain usable.
    }
  }, [sessionHydrated, state]);

  const launchWindow = useCallback((id: CattipuWindowId) => {
    dispatch({ type: 'launch', id });
  }, []);

  const focusWindow = useCallback((id: CattipuWindowId) => {
    dispatch({ type: 'focus', id });
  }, []);

  const moveWindow = useCallback(
    (id: CattipuWindowId, position: WindowPosition) => {
      dispatch({ type: 'move', id, position });
    },
    [],
  );

  const minimizeWindow = useCallback((id: CattipuWindowId) => {
    dispatch({ type: 'minimize', id });
  }, []);

  const maximizeWindow = useCallback((id: CattipuWindowId) => {
    dispatch({ type: 'maximize', id });
  }, []);

  const closeWindow = useCallback((id: CattipuWindowId) => {
    dispatch({ type: 'close', id });
  }, []);

  return {
    state,
    sessionHydrated,
    launchWindow,
    focusWindow,
    moveWindow,
    minimizeWindow,
    maximizeWindow,
    closeWindow,
  };
}
