'use client';

import { useCallback, useEffect, useReducer, useState } from 'react';

import {
  createInitialWindowManagerState,
  parseWindowManagerState,
  serializeWindowManagerState,
  windowManagerReducer,
  type CattipuWindowId,
  type WindowArrangement,
  type WindowPosition,
} from './windowManager.reducer';
import type { SnapRegion, WorkspaceBox } from '../../lib/os/workspace';

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

  // ── Milestone 18 ────────────────────────────────────────────────────
  // All of these go through the SAME reducer and the same state. There
  // is no second store for snapping or arranging; a snapped window is
  // one of these windows with a region set on it.

  const snapWindow = useCallback(
    (id: CattipuWindowId, region: SnapRegion) => {
      dispatch({ type: 'snap', id, region });
    },
    [],
  );

  const unsnapWindow = useCallback(
    (id: CattipuWindowId, position: WindowPosition) => {
      dispatch({ type: 'unsnap', id, position });
    },
    [],
  );

  const restoreWindow = useCallback((id: CattipuWindowId) => {
    dispatch({ type: 'restore', id });
  }, []);

  const restoreAllWindows = useCallback(() => {
    dispatch({ type: 'restoreAll' });
  }, []);

  const arrangeWindows = useCallback(
    (layout: WindowArrangement, bounds: WorkspaceBox) => {
      dispatch({ type: 'arrange', layout, bounds });
    },
    [],
  );

  return {
    state,
    sessionHydrated,
    launchWindow,
    focusWindow,
    moveWindow,
    minimizeWindow,
    maximizeWindow,
    closeWindow,
    snapWindow,
    unsnapWindow,
    restoreWindow,
    restoreAllWindows,
    arrangeWindows,
  };
}
