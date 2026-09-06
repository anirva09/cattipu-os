export {
  CATTIPU_WINDOW_INTERACTION_MS,
  ManagedWindow,
  clampWindowPosition,
  type ManagedWindowProps,
  type WindowBounds,
} from './ManagedWindow';

export {
  CATTIPU_WINDOW_IDS,
  createInitialWindowManagerState,
  parseWindowManagerState,
  serializeWindowManagerState,
  windowManagerReducer,
  type CattipuWindowId,
  type CattipuWindowMode,
  type ManagedWindowState,
  type WindowManagerAction,
  type WindowManagerState,
  type WindowPosition,
} from './windowManager.reducer';

export {
  CATTIPU_WINDOW_SESSION_KEY,
  useWindowManager,
} from './useWindowManager';
