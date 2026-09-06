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

export interface ManagedWindowState {
  id: CattipuWindowId;
  open: boolean;
  mode: CattipuWindowMode;
  position: WindowPosition;
  zIndex: number;
}

export interface WindowManagerState {
  windows: Record<CattipuWindowId, ManagedWindowState>;
  activeWindowId: CattipuWindowId | null;
  nextZIndex: number;
}

export type WindowManagerAction =
  | { type: 'launch'; id: CattipuWindowId }
  | { type: 'focus'; id: CattipuWindowId }
  | { type: 'move'; id: CattipuWindowId; position: WindowPosition }
  | { type: 'minimize'; id: CattipuWindowId }
  | { type: 'maximize'; id: CattipuWindowId }
  | { type: 'close'; id: CattipuWindowId }
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

      const nextMode: CattipuWindowMode =
        target.mode === 'maximized' ? 'normal' : 'maximized';

      return raiseWindow(state, action.id, { mode: nextMode });
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

      windows[id] = {
        id,
        open: windowState.open,
        mode: windowState.mode,
        position: {
          x: windowState.position.x,
          y: windowState.position.y,
        },
        zIndex: windowState.zIndex,
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
