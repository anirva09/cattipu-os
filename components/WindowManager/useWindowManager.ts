'use client';

import { useCallback, useEffect, useReducer, useRef, useState } from 'react';

import {
  createInitialWindowManagerState,
  parseWindowManagerState,
  serializeWindowManagerState,
  windowManagerReducer,
  type CattipuWindowId,
  type WindowArrangement,
  type WindowPosition,
  type WindowSize,
} from './windowManager.reducer';
import type { SnapRegion, WorkspaceBox } from '../../lib/os/workspace';
import { useUiSound } from '../../hooks/useUiSound';

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

  // Milestone 20 (Native Feel Polish) — the frozen sound vocabulary maps
  // window-open/window-close to the "mechanical click" (DESIGN_CONSTITUTION
  // §9), and Settings > Sound already describes it as covering "window
  // open/close." That wiring existed only on the orphaned, unmounted
  // `useWindowStore` — the live path (this hook) called no sound at all.
  // `useUiSound` is the same settings-gated (soundEnabled/soundVolume)
  // trigger every other live consumer (BootScreen, BuildPlayback) already
  // uses, so this keeps one canonical sound owner rather than reviving the
  // dead store's separate `chime()` helper.
  const playUiSound = useUiSound();

  // Milestone 20R1 (correction) — `launchWindow`/`closeWindow` are also
  // the single call site used to refocus an already-open window or
  // restore one from minimized (the reducer's `launch` case handles all
  // three transitions identically). The M20 pass played "window-open" on
  // every call, so clicking an already-open dock icon — or restoring a
  // minimized window — replayed the open chime as if the window had just
  // appeared. A window's `open` flag is true in BOTH the normal and
  // minimized modes (only `close` sets it false), so reading it from
  // BEFORE the dispatch is exactly the "was this window actually closed"
  // check the sound needs, with no change to the reducer: the reducer
  // stays a pure function of state and action, and this ref only mirrors
  // its output for a hook-level side effect. A plain closure over `state`
  // would go stale (these callbacks are memoized once), so a ref keeps
  // the read current without adding `state` to either callback's deps.
  const stateRef = useRef(state);
  stateRef.current = state;

  const launchWindow = useCallback((id: CattipuWindowId) => {
    const wasOpen = stateRef.current.windows[id].open;
    if (!wasOpen) {
      playUiSound('window-open');
    }
    dispatch({ type: 'launch', id });
  }, [playUiSound]);

  const focusWindow = useCallback((id: CattipuWindowId) => {
    dispatch({ type: 'focus', id });
  }, []);

  const moveWindow = useCallback(
    (id: CattipuWindowId, position: WindowPosition) => {
      dispatch({ type: 'move', id, position });
    },
    [],
  );

  const resizeWindow = useCallback(
    (id: CattipuWindowId, size: WindowSize) => {
      dispatch({ type: 'resize', id, size });
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
    const wasOpen = stateRef.current.windows[id].open;
    if (wasOpen) {
      playUiSound('window-close');
    }
    dispatch({ type: 'close', id });
  }, [playUiSound]);

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
    resizeWindow,
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
