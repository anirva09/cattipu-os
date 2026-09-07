import { cattipuTokens } from '../../design-system/tokens';
import {
  cascadeLayout,
  keepOnScreen,
  snapRect,
  tileLayout,
  type SnapRegion,
  type WindowRect,
  type WorkspaceBox,
} from '../../lib/os/workspace';

export const CATTIPU_WINDOW_IDS = [
  'projects',
  'architect',
  'memory',
  'explorer',
  'settings',
] as const;

export type CattipuWindowId = (typeof CATTIPU_WINDOW_IDS)[number];
export type CattipuWindowMode = 'normal' | 'minimized' | 'maximized';

export interface WindowPosition {
  x: number;
  y: number;
}

export interface WindowSize {
  width: number;
  height: number;
}

/**
 * Milestone 18 — what a window has to remember to be restored EXACTLY.
 *
 * Taken before the window is raised, so the z-order in it is the one the
 * window had in the stack, not the one maximizing gave it.
 */
export interface WindowRestorePoint {
  position: WindowPosition;
  size: WindowSize;
  zIndex: number;
  /**
   * The state to come back TO, which is not always "free".
   *
   * Maximizing a snapped window and un-maximizing it should put the
   * window back on its half, not send it home — but a snapped window
   * still has to remember where home is, or the snap becomes permanent.
   * One field carries both because restoring to a snapped point leaves
   * behind the same geometry with `snap: null`, so the next restore goes
   * home. Two levels is all this shell can produce, and a general stack
   * for two levels would be machinery with nothing to do.
   */
  snap: SnapRegion | null;
}

export const CATTIPU_DEFAULT_WINDOW_SIZE: WindowSize = {
  width: cattipuTokens.geometry.windowReferenceWidth,
  height: cattipuTokens.geometry.windowReferenceHeight,
};

export interface ManagedWindowState {
  id: CattipuWindowId;
  open: boolean;
  mode: CattipuWindowMode;
  position: WindowPosition;
  zIndex: number;
  /**
   * Milestone 18. `null` means the reference size — the state a window
   * that has never been tiled or unsnapped is in, and what every window
   * shipped as before this milestone.
   */
  size: WindowSize | null;
  /**
   * The snapped REGION, not its rectangle. Storing "left" rather than
   * {0,0,627,776} is what makes a snap survive a viewport change: the
   * half is recomputed from the current workspace every render, so a
   * window snapped at 1920 is still exactly half at 1366.
   */
  snap: SnapRegion | null;
  /** Where to put this window back. Set on the way into maximize or a
   *  snap, consumed by `restore`, null when there is nowhere to go. */
  restore: WindowRestorePoint | null;
}

export interface WindowManagerState {
  windows: Record<CattipuWindowId, ManagedWindowState>;
  activeWindowId: CattipuWindowId | null;
  nextZIndex: number;
}

export type WindowArrangement = 'cascade' | 'tile';

export type WindowManagerAction =
  | { type: 'launch'; id: CattipuWindowId }
  | { type: 'focus'; id: CattipuWindowId }
  | { type: 'move'; id: CattipuWindowId; position: WindowPosition }
  | { type: 'minimize'; id: CattipuWindowId }
  | { type: 'maximize'; id: CattipuWindowId }
  | { type: 'close'; id: CattipuWindowId }
  // ── Milestone 18 ──────────────────────────────────────────────────
  | { type: 'snap'; id: CattipuWindowId; region: SnapRegion }
  /** Pulled off a snap by dragging. Keeps the z-order the drag gave it —
   *  the window was just grabbed, so putting it back down the stack
   *  would be wrong. `restore` is the exact-inverse action. */
  | { type: 'unsnap'; id: CattipuWindowId; position: WindowPosition }
  | { type: 'restore'; id: CattipuWindowId }
  | { type: 'restoreAll' }
  | { type: 'arrange'; layout: WindowArrangement; bounds: WorkspaceBox }
  | { type: 'hydrate'; state: WindowManagerState };

const DEFAULT_POSITIONS: Record<CattipuWindowId, WindowPosition> = {
  projects: { x: 232, y: 105 },
  architect: { x: 176, y: 72 },
  memory: { x: 200, y: 96 },
  explorer: { x: 224, y: 120 },
  settings: { x: 248, y: 144 },
};

function createWindowState(
  id: CattipuWindowId,
  open: boolean,
  zIndex: number,
): ManagedWindowState {
  return {
    id,
    open,
    mode: 'normal',
    position: { ...DEFAULT_POSITIONS[id] },
    zIndex,
    size: null,
    snap: null,
    restore: null,
  };
}

export function createInitialWindowManagerState(): WindowManagerState {
  return {
    windows: {
      projects: createWindowState('projects', true, 10),
      architect: createWindowState('architect', false, 1),
      memory: createWindowState('memory', false, 2),
      explorer: createWindowState('explorer', false, 3),
      settings: createWindowState('settings', false, 4),
    },
    activeWindowId: 'projects',
    nextZIndex: 11,
  };
}

function topmostVisibleWindowId(
  windows: WindowManagerState['windows'],
): CattipuWindowId | null {
  let topmost: ManagedWindowState | null = null;

  for (const id of CATTIPU_WINDOW_IDS) {
    const candidate = windows[id];
    if (!candidate.open || candidate.mode === 'minimized') {
      continue;
    }

    if (!topmost || candidate.zIndex > topmost.zIndex) {
      topmost = candidate;
    }
  }

  return topmost?.id ?? null;
}

function raiseWindow(
  state: WindowManagerState,
  id: CattipuWindowId,
  overrides: Partial<ManagedWindowState> = {},
): WindowManagerState {
  const target = state.windows[id];
  if (!target.open && overrides.open !== true) {
    return state;
  }

  const zIndex = state.nextZIndex;

  return {
    ...state,
    windows: {
      ...state.windows,
      [id]: {
        ...target,
        ...overrides,
        zIndex,
      },
    },
    activeWindowId: id,
    nextZIndex: zIndex + 1,
  };
}


/** The window's current rectangle, given the workspace it is in. This is
 *  the one place geometry is resolved, so the reducer, the renderer and
 *  the tests cannot disagree about where a window is. */
export function windowRect(
  windowState: ManagedWindowState,
  box: WorkspaceBox,
): WindowRect {
  if (windowState.mode === 'maximized') {
    return { x: 0, y: 0, width: box.width, height: box.height };
  }
  if (windowState.snap) {
    return snapRect(windowState.snap, box);
  }
  const size = windowState.size ?? CATTIPU_DEFAULT_WINDOW_SIZE;
  const position = keepOnScreen({ ...windowState.position, ...size }, box);
  return { ...position, ...size };
}

/** The snapshot to come back to. Captured BEFORE raising, so restoring
 *  returns the z-order the window actually had. */
function restorePointFor(
  target: ManagedWindowState,
  snap: SnapRegion | null = null,
): WindowRestorePoint {
  return {
    position: { ...target.position },
    size: target.size ?? { ...CATTIPU_DEFAULT_WINDOW_SIZE },
    zIndex: target.zIndex,
    snap,
  };
}

/** Visible windows, back to front. Both arrangements walk the stack in
 *  this order so the frontmost window ends up last — deepest in a
 *  cascade, and still frontmost after it. */
function visibleBackToFront(
  windows: WindowManagerState['windows'],
): ManagedWindowState[] {
  return CATTIPU_WINDOW_IDS.map((id) => windows[id])
    .filter((w) => w.open && w.mode !== 'minimized')
    .sort((a, b) => a.zIndex - b.zIndex);
}

export function windowManagerReducer(
  state: WindowManagerState,
  action: WindowManagerAction,
): WindowManagerState {
  switch (action.type) {
    case 'hydrate':
      return action.state;

    case 'launch': {
      const target = state.windows[action.id];
      return raiseWindow(state, action.id, {
        open: true,
        mode: target.mode === 'minimized' ? 'normal' : target.mode,
      });
    }

    case 'focus': {
      const target = state.windows[action.id];
      if (!target.open || target.mode === 'minimized') {
        return state;
      }
      if (state.activeWindowId === action.id) {
        return state;
      }
      return raiseWindow(state, action.id);
    }

    case 'move': {
      const target = state.windows[action.id];
      if (!target.open || target.mode !== 'normal') {
        return state;
      }

      return {
        ...state,
        windows: {
          ...state.windows,
          [action.id]: {
            ...target,
            position: {
              x: action.position.x,
              y: action.position.y,
            },
          },
        },
      };
    }

    case 'minimize': {
      const target = state.windows[action.id];
      if (!target.open || target.mode === 'minimized') {
        return state;
      }

      const windows = {
        ...state.windows,
        [action.id]: {
          ...target,
          mode: 'minimized' as const,
        },
      };

      return {
        ...state,
        windows,
        activeWindowId:
          state.activeWindowId === action.id
            ? topmostVisibleWindowId(windows)
            : state.activeWindowId,
      };
    }

    case 'maximize': {
      const target = state.windows[action.id];
      if (!target.open || target.mode === 'minimized') {
        return state;
      }

      // Toggling out of maximize is a restore, not a second maximize
      // with different numbers — same code path, same guarantee.
      if (target.mode === 'maximized') {
        return windowManagerReducer(state, { type: 'restore', id: action.id });
      }

      // Maximizing a snapped window keeps the geometry the snap already
      // recorded and notes the region, so un-maximizing puts the window
      // back on its half instead of sending it home.
      const base = target.restore ?? restorePointFor(target);
      return raiseWindow(state, action.id, {
        mode: 'maximized',
        snap: null,
        restore: { ...base, snap: target.snap },
      });
    }


    // ── Milestone 18 ────────────────────────────────────────────────

    case 'snap': {
      const target = state.windows[action.id];
      if (!target.open || target.mode === 'minimized') {
        return state;
      }
      // Only the FIRST snap records a restore point. Snapping left and
      // then right must still come back to where the window was before
      // any of it, not to the left half.
      const restore = target.restore ?? restorePointFor(target);
      return raiseWindow(state, action.id, {
        mode: 'normal',
        snap: action.region,
        restore,
      });
    }

    case 'unsnap': {
      const target = state.windows[action.id];
      if (!target.open || !target.snap) {
        return state;
      }
      return {
        ...state,
        windows: {
          ...state.windows,
          [action.id]: {
            ...target,
            snap: null,
            size: target.restore?.size ?? target.size,
            position: { ...action.position },
            restore: null,
          },
        },
      };
    }

    case 'restore': {
      const target = state.windows[action.id];
      if (!target.open || !target.restore) {
        return state;
      }
      const { position, size, zIndex, snap } = target.restore;
      // Position, size AND z-order, exactly. Restore is the inverse of
      // whatever put the window into this state, so it cannot leave the
      // window higher up the stack than it started; clicking it
      // afterwards raises it the normal way.
      return {
        ...state,
        windows: {
          ...state.windows,
          [action.id]: {
            ...target,
            mode: 'normal',
            snap,
            position: { ...position },
            size: { ...size },
            zIndex,
            // Restoring onto a snap is only half the way home, so the
            // same geometry stays available for the next restore.
            restore: snap
              ? { position: { ...position }, size: { ...size }, zIndex, snap: null }
              : null,
          },
        },
        activeWindowId: topmostVisibleWindowId({
          ...state.windows,
          [action.id]: { ...target, mode: 'normal', zIndex },
        }),
      };
    }

    case 'restoreAll': {
      // Unwinds every level, so a window that was snapped and then
      // maximized ends up home rather than back on its half — "Restore
      // All" means all the way.
      let next = state;
      for (const id of CATTIPU_WINDOW_IDS) {
        let guard = 0;
        while (next.windows[id].restore && guard < 4) {
          next = windowManagerReducer(next, { type: 'restore', id });
          guard += 1;
        }
      }
      return next;
    }

    case 'arrange': {
      const ordered = visibleBackToFront(state.windows);
      if (ordered.length === 0) {
        return state;
      }

      const rects =
        action.layout === 'tile'
          ? tileLayout(ordered.length, action.bounds)
          : cascadeLayout(
              ordered.length,
              action.bounds,
              CATTIPU_DEFAULT_WINDOW_SIZE,
            );

      const windows = { ...state.windows };
      ordered.forEach((target, index) => {
        const rect = rects[index];
        windows[target.id] = {
          ...target,
          // Arranging takes a window out of maximize and out of a snap:
          // it now has an explicit place, and leaving either flag set
          // would make the next resize move it back out of the layout.
          mode: 'normal',
          snap: null,
          position: { x: rect.x, y: rect.y },
          size: { width: rect.width, height: rect.height },
          // An arrangement is something to come back FROM. Clearing the
          // restore point here was a real defect: after Tile, every
          // window had nothing to restore, so "Restore All" silently did
          // nothing at exactly the moment a person reaches for it. A
          // window that was already snapped or maximized keeps the point
          // it had, so restoring still goes home rather than to the
          // arrangement it was in a moment ago.
          restore: target.restore ?? restorePointFor(target, target.snap),
        };
      });

      // z-order is untouched. An arrangement decides where windows are,
      // not which one you were working in.
      return { ...state, windows };
    }

    case 'close': {
      const target = state.windows[action.id];
      if (!target.open) {
        return state;
      }

      const windows = {
        ...state.windows,
        [action.id]: {
          ...target,
          open: false,
          mode: 'normal' as const,
        },
      };

      return {
        ...state,
        windows,
        activeWindowId:
          state.activeWindowId === action.id
            ? topmostVisibleWindowId(windows)
            : state.activeWindowId,
      };
    }
  }
}

function isWindowId(value: unknown): value is CattipuWindowId {
  return (
    typeof value === 'string' &&
    (CATTIPU_WINDOW_IDS as readonly string[]).includes(value)
  );
}

function isMode(value: unknown): value is CattipuWindowMode {
  return value === 'normal' || value === 'minimized' || value === 'maximized';
}

function isFinitePosition(value: unknown): value is WindowPosition {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const position = value as Partial<WindowPosition>;
  return (
    typeof position.x === 'number' &&
    Number.isFinite(position.x) &&
    typeof position.y === 'number' &&
    Number.isFinite(position.y)
  );
}

function isFiniteSize(value: unknown): value is WindowSize {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const size = value as Partial<WindowSize>;
  return (
    typeof size.width === 'number' &&
    Number.isFinite(size.width) &&
    size.width > 0 &&
    typeof size.height === 'number' &&
    Number.isFinite(size.height) &&
    size.height > 0
  );
}

function isSnapRegion(value: unknown): value is SnapRegion {
  return (
    value === 'left' || value === 'right' || value === 'top' || value === 'bottom'
  );
}

function isRestorePoint(value: unknown): value is WindowRestorePoint {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const point = value as Partial<WindowRestorePoint>;
  return (
    isFinitePosition(point.position) &&
    isFiniteSize(point.size) &&
    typeof point.zIndex === 'number' &&
    Number.isFinite(point.zIndex) &&
    (point.snap === null ||
      point.snap === undefined ||
      isSnapRegion(point.snap))
  );
}

export function serializeWindowManagerState(
  state: WindowManagerState,
): string {
  return JSON.stringify(state);
}

export function parseWindowManagerState(
  serialized: string | null,
): WindowManagerState | null {
  if (!serialized) {
    return null;
  }

  try {
    const parsed = JSON.parse(serialized) as Partial<WindowManagerState>;

    if (
      !parsed.windows ||
      typeof parsed.windows !== 'object' ||
      typeof parsed.nextZIndex !== 'number' ||
      !Number.isFinite(parsed.nextZIndex)
    ) {
      return null;
    }

    if (
      parsed.activeWindowId !== null &&
      parsed.activeWindowId !== undefined &&
      !isWindowId(parsed.activeWindowId)
    ) {
      return null;
    }

    const windows = {} as WindowManagerState['windows'];

    for (const id of CATTIPU_WINDOW_IDS) {
      const candidate = (
        parsed.windows as Partial<Record<CattipuWindowId, unknown>>
      )[id];

      if (!candidate || typeof candidate !== 'object') {
        return null;
      }

      const windowState = candidate as Partial<ManagedWindowState>;
      if (
        windowState.id !== id ||
        typeof windowState.open !== 'boolean' ||
        !isMode(windowState.mode) ||
        !isFinitePosition(windowState.position) ||
        typeof windowState.zIndex !== 'number' ||
        !Number.isFinite(windowState.zIndex)
      ) {
        return null;
      }

      // Milestone 18's three fields are read leniently on purpose. A
      // session saved by M17 has none of them, and rejecting the whole
      // state over a field that did not exist yet would throw away every
      // open window on the first load after an upgrade. Anything absent
      // or malformed falls back to the pre-M18 meaning: reference size,
      // not snapped, nothing to restore.
      windows[id] = {
        id,
        open: windowState.open,
        mode: windowState.mode,
        position: {
          x: windowState.position.x,
          y: windowState.position.y,
        },
        zIndex: windowState.zIndex,
        size: isFiniteSize(windowState.size) ? { ...windowState.size } : null,
        snap: isSnapRegion(windowState.snap) ? windowState.snap : null,
        restore: isRestorePoint(windowState.restore)
          ? {
              position: { ...windowState.restore.position },
              size: { ...windowState.restore.size },
              zIndex: windowState.restore.zIndex,
              snap: windowState.restore.snap ?? null,
            }
          : null,
      };
    }

    const highestRestoredZIndex = Math.max(
      ...CATTIPU_WINDOW_IDS.map((id) => windows[id].zIndex),
    );

    const state: WindowManagerState = {
      windows,
      activeWindowId: parsed.activeWindowId ?? null,
      nextZIndex: Math.max(parsed.nextZIndex, highestRestoredZIndex + 1),
    };

    if (
      state.activeWindowId &&
      (!state.windows[state.activeWindowId].open ||
        state.windows[state.activeWindowId].mode === 'minimized')
    ) {
      state.activeWindowId = topmostVisibleWindowId(state.windows);
    }

    return state;
  } catch {
    return null;
  }
}
