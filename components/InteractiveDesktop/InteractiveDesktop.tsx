'use client';

import type {
  CSSProperties,
  ReactNode,
} from 'react';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  cattipuCssVariables,
  cattipuTokens,
  type CattipuWindowTone,
} from '../../design-system/tokens';

import { BottomStatusBar } from '../BottomStatusBar/BottomStatusBar';
import { ProjectsWindow } from '../ProjectsWindow/ProjectsWindow';
import { RightWidgetStack } from '../RightWidgetStack/RightWidgetStack';
import {
  Sidebar,
  type CattipuSidebarIcons,
  type CattipuSidebarItemId,
} from '../Sidebar/Sidebar';
import { TopBar } from '../TopBar/TopBar';
import { Window } from '../Window/Window';
import {
  ManagedWindow,
  type WindowBounds,
} from '../WindowManager/ManagedWindow';
import {
  CATTIPU_WINDOW_IDS,
  type CattipuWindowId,
  type WindowArrangement,
} from '../WindowManager/windowManager.reducer';
import {
  snapRect,
  type SnapRegion,
  type WorkspaceBox,
} from '../../lib/os/workspace';
import { useWindowManager } from '../WindowManager/useWindowManager';

import '../../design-system/bevel.css';
import './InteractiveDesktop.css';

export const CATTIPU_INTERACTIVE_DESKTOP_REFERENCE = {
  width: 1600,
  height: 900,
  sidebarWidth: 98,
  // Golden Master fidelity pass - matches CATTIPU_TOP_BAR_REFERENCE.height.
  // The window layer starts below the bar, so this has to move with it.
  topBarHeight: 74,
  bottomStatusHeight: 50,
  rightWidgetWidth: 232,
  rightWidgetGap: cattipuTokens.spacing[8],
  rightWidgetTop: 82,
  windowLayerRightReserve: 248,
  defaultWindowWidth: cattipuTokens.geometry.windowReferenceWidth,
  defaultWindowHeight: cattipuTokens.geometry.windowReferenceHeight,
} as const;

const DEFAULT_WINDOW_LAYER_BOUNDS: WindowBounds = {
  width:
    CATTIPU_INTERACTIVE_DESKTOP_REFERENCE.width -
    CATTIPU_INTERACTIVE_DESKTOP_REFERENCE.sidebarWidth -
    CATTIPU_INTERACTIVE_DESKTOP_REFERENCE.windowLayerRightReserve,
  height:
    CATTIPU_INTERACTIVE_DESKTOP_REFERENCE.height -
    CATTIPU_INTERACTIVE_DESKTOP_REFERENCE.topBarHeight -
    CATTIPU_INTERACTIVE_DESKTOP_REFERENCE.bottomStatusHeight,
};

interface ShellWindowDefinition {
  id: Exclude<CattipuWindowId, 'projects'>;
  title: string;
  tone: CattipuWindowTone;
  status: string;
}

const SHELL_WINDOWS: readonly ShellWindowDefinition[] = [
  {
    id: 'architect',
    title: 'Architect',
    tone: 'architect',
    status: 'ARCHITECT WORKSPACE READY',
  },
  {
    id: 'memory',
    title: 'Memory',
    tone: 'system',
    status: 'MEMORY WORKSPACE READY',
  },
  {
    id: 'explorer',
    title: 'Explorer',
    tone: 'system',
    status: 'EXPLORER WORKSPACE READY',
  },
  {
    id: 'settings',
    title: 'Settings',
    tone: 'system',
    status: 'SETTINGS WORKSPACE READY',
  },
] as const;

export type CattipuShellWindowId = Exclude<CattipuWindowId, 'projects'>;

export interface InteractiveDesktopProps {
  brandMark: ReactNode;
  sidebarIcons: CattipuSidebarIcons;
  dateTimeText: string;
  workspaceTitle?: string;
  creatorName?: string;
  /**
   * Milestone 19 (Part E). Forwarded to the RECENT PROJECTS widget.
   *
   * Undefined leaves RightWidgetStack on its own three hardcoded names,
   * which is what the Golden Master render used and what made the widget
   * blind to every project created afterwards. The shell now passes real
   * ones; the default stays for the package's standalone story.
   */
  recentProjects?: readonly string[];
  className?: string;
  style?: CSSProperties;
  /**
   * Integration hook, added when the v0.9 package was merged into the
   * CATTIPU OS repository. Supplies the body of a shell window; anything
   * not provided keeps the package's original status-line placeholder, so
   * omitting this prop reproduces the signed-off behaviour exactly.
   *
   * Window CHROME is unaffected — title, tone and the three controls are
   * still owned by this component. Only what is drawn inside the frame
   * comes from here.
   */
  windowContent?: Partial<
    Record<
      CattipuShellWindowId,
      | ReactNode
      // Milestone 17: a window body may need the window manager - Explorer
      // opens a project by raising Projects rather than rendering its own
      // copy of one. Widened rather than replaced, so every existing
      // ReactNode value still type-checks and behaves identically.
      | ((controls: { openWindow: (id: CattipuWindowId) => void }) => ReactNode)
    >
  >;
  /**
   * Integration hook, added in Milestone 15 (Living Projects). Replaces
   * the Projects window body with one wired to real state, receiving the
   * same three control callbacks this component would have passed to the
   * built-in ProjectsWindow. Omitted, the built-in one renders exactly as
   * signed off - the package's default behaviour is unchanged.
   *
   * Projects needs this rather than `windowContent` because it is the one
   * window whose CHROME the package owns directly (ProjectsWindow is a
   * Window, not a body inside one), so swapping its body means swapping
   * the whole component.
   */
  renderProjectsWindow?: (controls: {
    onMinimize: () => void;
    onMaximize: () => void;
    onClose: () => void;
  }) => ReactNode;
  /**
   * Integration hook, added in Milestone 16 (Living Desktop). Renders a
   * layer inside the window layer, beneath every managed window — the
   * desktop surface itself, where icons live.
   *
   * It is a slot rather than a feature because desktop objects are a
   * repository concern: they read the project store, they open windows by
   * name, and neither belongs inside a component whose whole value is that
   * it knows nothing about this application. Omitted, the window layer is
   * exactly the engineering-paper background it was signed off as, which
   * is what keeps the Golden Master render reproducible.
   *
   * `openWindow` is handed down because the window manager lives here. A
   * shortcut has to be able to raise Projects, and reaching for a second
   * window manager instance to do it is how two of them get out of step.
   */
  desktopLayer?: (controls: {
    openWindow: (id: CattipuWindowId) => void;
    /**
     * Milestone 18. The desktop's own context menu is where Window ▸
     * Cascade / Tile / Restore All live: the top bar is a frozen
     * component and bolting a menu bar onto it would change the Golden
     * Master, and a right-click on the desktop is where an OS puts
     * workspace commands anyway.
     */
    arrangeWindows: (layout: WindowArrangement) => void;
    restoreAllWindows: () => void;
    /** How many windows an arrangement would actually move. The menu
     *  disables itself rather than offering a no-op. */
    visibleWindowCount: number;
  }) => ReactNode;
}

type InteractiveDesktopStyle = CSSProperties &
  Record<`--cattipu-${string}`, string>;

function isLaunchableSidebarItem(
  item: CattipuSidebarItemId,
): item is CattipuWindowId {
  return (CATTIPU_WINDOW_IDS as readonly string[]).includes(item);
}

/** A window body is either a node or a function that wants the window
 *  manager. Resolving it here keeps every call site unchanged. */
function renderWindowContent(
  content: InteractiveDesktopProps['windowContent'] extends
    | Partial<Record<CattipuShellWindowId, infer V>>
    | undefined
    ? V
    : never,
  openWindow: (id: CattipuWindowId) => void,
): ReactNode {
  return typeof content === 'function' ? content({ openWindow }) : content;
}

function WorkspaceShellBody({ status }: { status: string }) {
  return (
    <div className="cattipu-interactive-desktop__shell-window-body">
      <span className="cattipu-interactive-desktop__shell-window-status">
        {status}
      </span>
    </div>
  );
}

export function InteractiveDesktop({
  brandMark,
  sidebarIcons,
  dateTimeText,
  workspaceTitle = 'Banking Platform',
  creatorName = 'Creator',
  recentProjects,
  className,
  style,
  windowContent,
  renderProjectsWindow,
  desktopLayer,
}: InteractiveDesktopProps) {
  const {
    state,
    launchWindow,
    focusWindow,
    moveWindow,
    minimizeWindow,
    maximizeWindow,
    closeWindow,
    snapWindow,
    unsnapWindow,
    restoreAllWindows,
    arrangeWindows,
  } = useWindowManager();

  // Milestone 18. Which region a drag is currently arming, so the
  // workspace can show where the window will land before it is dropped.
  const [snapPreview, setSnapPreview] = useState<SnapRegion | null>(null);

  const windowLayerRef = useRef<HTMLDivElement | null>(null);
  const [windowBounds, setWindowBounds] = useState<WindowBounds>(
    DEFAULT_WINDOW_LAYER_BOUNDS,
  );

  useEffect(() => {
    const layer = windowLayerRef.current;
    if (!layer) {
      return;
    }

    const measure = () => {
      const rect = layer.getBoundingClientRect();
      setWindowBounds({
        width: Math.max(0, Math.round(rect.width)),
        height: Math.max(0, Math.round(rect.height)),
      });
    };

    measure();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }

    const observer = new ResizeObserver(measure);
    observer.observe(layer);
    return () => observer.disconnect();
  }, []);

  /**
   * Milestone 18 — keyboard access to the workspace commands.
   *
   * Not a convenience. Cascade, Tile and Restore All live in the
   * desktop's context menu, and a tiled workspace has no desktop left to
   * right-click: the arrangement that most needs undoing is the one that
   * hides the way to undo it. The top bar is a frozen component, so a
   * menu bar is not available; a keyboard route adds no chrome and is
   * always reachable.
   *
   * Ctrl+Alt rather than Ctrl alone, because Ctrl+T and Ctrl+R belong to
   * the browser and taking them would be worse than having no shortcut.
   */
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!event.ctrlKey || !event.altKey || event.metaKey) return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      const layer = windowLayerRef.current;
      const box: WorkspaceBox = layer
        ? {
            width: Math.round(layer.getBoundingClientRect().width),
            height: Math.round(layer.getBoundingClientRect().height),
          }
        : windowBounds;

      switch (event.key.toLowerCase()) {
        case 'c':
          event.preventDefault();
          arrangeWindows('cascade', box);
          break;
        case 't':
          event.preventDefault();
          arrangeWindows('tile', box);
          break;
        case 'r':
          event.preventDefault();
          restoreAllWindows();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [arrangeWindows, restoreAllWindows, windowBounds]);

  const activeSidebarItem = useMemo<CattipuSidebarItemId>(() => {
    return state.activeWindowId ?? 'home';
  }, [state.activeWindowId]);

  const desktopStyle: InteractiveDesktopStyle = {
    ...cattipuCssVariables,
    '--cattipu-desktop-reference-width': `${CATTIPU_INTERACTIVE_DESKTOP_REFERENCE.width}px`,
    '--cattipu-desktop-reference-height': `${CATTIPU_INTERACTIVE_DESKTOP_REFERENCE.height}px`,
    '--cattipu-desktop-sidebar-width': `${CATTIPU_INTERACTIVE_DESKTOP_REFERENCE.sidebarWidth}px`,
    '--cattipu-desktop-topbar-height': `${CATTIPU_INTERACTIVE_DESKTOP_REFERENCE.topBarHeight}px`,
    '--cattipu-desktop-bottom-height': `${CATTIPU_INTERACTIVE_DESKTOP_REFERENCE.bottomStatusHeight}px`,
    '--cattipu-desktop-right-widget-width': `${CATTIPU_INTERACTIVE_DESKTOP_REFERENCE.rightWidgetWidth}px`,
    '--cattipu-desktop-right-widget-gap': `${CATTIPU_INTERACTIVE_DESKTOP_REFERENCE.rightWidgetGap}px`,
    '--cattipu-desktop-right-widget-top': `${CATTIPU_INTERACTIVE_DESKTOP_REFERENCE.rightWidgetTop}px`,
    '--cattipu-desktop-window-layer-right': `${CATTIPU_INTERACTIVE_DESKTOP_REFERENCE.windowLayerRightReserve}px`,
    ...style,
  };

  const handleNavigate = (item: CattipuSidebarItemId) => {
    if (isLaunchableSidebarItem(item)) {
      launchWindow(item);
    }
  };

  return (
    <main
      className={[
        'cattipu-interactive-desktop',
        className,
      ].filter(Boolean).join(' ')}
      style={desktopStyle}
    >
      <Sidebar
        className="cattipu-interactive-desktop__sidebar"
        brandMark={brandMark}
        icons={sidebarIcons}
        activeItem={activeSidebarItem}
        onNavigate={handleNavigate}
      />

      <TopBar
        className="cattipu-interactive-desktop__topbar"
        workspaceTitle={workspaceTitle}
        activeWorkspace={Boolean(state.activeWindowId)}
        dateTimeText={dateTimeText}
      />

      <div
        ref={windowLayerRef}
        className="cattipu-interactive-desktop__window-layer"
        aria-label="Desktop workspace"
      >
        {desktopLayer?.({
          openWindow: launchWindow,
          arrangeWindows: (layout) =>
            arrangeWindows(layout, windowBounds as WorkspaceBox),
          restoreAllWindows,
          visibleWindowCount: CATTIPU_WINDOW_IDS.filter(
            (id) =>
              state.windows[id].open && state.windows[id].mode !== 'minimized',
          ).length,
        })}

        {snapPreview && (
          <div
            className="cattipu-interactive-desktop__snap-preview"
            data-testid="snap-preview"
            data-region={snapPreview}
            aria-hidden="true"
            style={{
              left: snapRect(snapPreview, windowBounds).x,
              top: snapRect(snapPreview, windowBounds).y,
              width: snapRect(snapPreview, windowBounds).width,
              height: snapRect(snapPreview, windowBounds).height,
            }}
          />
        )}

        <ManagedWindow
          id="projects"
          windowState={state.windows.projects}
          active={state.activeWindowId === 'projects'}
          bounds={windowBounds}
          onFocus={() => focusWindow('projects')}
          onMove={(position) => moveWindow('projects', position)}
          onSnapPreview={setSnapPreview}
          onSnap={(region) => snapWindow('projects', region)}
          onUnsnap={(position) => unsnapWindow('projects', position)}
        >
          {renderProjectsWindow?.({
            onMinimize: () => minimizeWindow('projects'),
            onMaximize: () => maximizeWindow('projects'),
            onClose: () => closeWindow('projects'),
          }) ?? (
            <ProjectsWindow
              onMinimize={() => minimizeWindow('projects')}
              onMaximize={() => maximizeWindow('projects')}
              onClose={() => closeWindow('projects')}
            />
          )}
        </ManagedWindow>

        {SHELL_WINDOWS.map((definition) => {
          const windowState = state.windows[definition.id];

          return (
            <ManagedWindow
              key={definition.id}
              id={definition.id}
              windowState={windowState}
              active={state.activeWindowId === definition.id}
              bounds={windowBounds}
              onFocus={() => focusWindow(definition.id)}
              onMove={(position) => moveWindow(definition.id, position)}
              onSnapPreview={setSnapPreview}
              onSnap={(region) => snapWindow(definition.id, region)}
              onUnsnap={(position) => unsnapWindow(definition.id, position)}
            >
              <Window
                title={definition.title}
                tone={definition.tone}
                onMinimize={() => minimizeWindow(definition.id)}
                onMaximize={() => maximizeWindow(definition.id)}
                onClose={() => closeWindow(definition.id)}
              >
                {renderWindowContent(
                  windowContent?.[definition.id],
                  launchWindow,
                ) ?? <WorkspaceShellBody status={definition.status} />}
              </Window>
            </ManagedWindow>
          );
        })}
      </div>

      <RightWidgetStack
        className="cattipu-interactive-desktop__right-widgets"
        creatorName={creatorName}
        recentProjects={recentProjects}
        onViewAll={() => launchWindow('projects')}
      />

      <BottomStatusBar className="cattipu-interactive-desktop__bottom-status" />
    </main>
  );
}
