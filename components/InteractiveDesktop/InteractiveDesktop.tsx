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
} from '../WindowManager/windowManager.reducer';
import { useWindowManager } from '../WindowManager/useWindowManager';

import '../../design-system/bevel.css';
import './InteractiveDesktop.css';

export const CATTIPU_INTERACTIVE_DESKTOP_REFERENCE = {
  width: 1600,
  height: 900,
  sidebarWidth: 98,
  topBarHeight: 48,
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

export interface InteractiveDesktopProps {
  brandMark: ReactNode;
  sidebarIcons: CattipuSidebarIcons;
  dateTimeText: string;
  workspaceTitle?: string;
  creatorName?: string;
  className?: string;
  style?: CSSProperties;
}

type InteractiveDesktopStyle = CSSProperties &
  Record<`--cattipu-${string}`, string>;

function isLaunchableSidebarItem(
  item: CattipuSidebarItemId,
): item is CattipuWindowId {
  return (CATTIPU_WINDOW_IDS as readonly string[]).includes(item);
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
  className,
  style,
}: InteractiveDesktopProps) {
  const {
    state,
    launchWindow,
    focusWindow,
    moveWindow,
    minimizeWindow,
    maximizeWindow,
    closeWindow,
  } = useWindowManager();

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
        <ManagedWindow
          id="projects"
          windowState={state.windows.projects}
          active={state.activeWindowId === 'projects'}
          bounds={windowBounds}
          onFocus={() => focusWindow('projects')}
          onMove={(position) => moveWindow('projects', position)}
        >
          <ProjectsWindow
            onMinimize={() => minimizeWindow('projects')}
            onMaximize={() => maximizeWindow('projects')}
            onClose={() => closeWindow('projects')}
          />
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
            >
              <Window
                title={definition.title}
                tone={definition.tone}
                onMinimize={() => minimizeWindow(definition.id)}
                onMaximize={() => maximizeWindow(definition.id)}
                onClose={() => closeWindow(definition.id)}
              >
                <WorkspaceShellBody status={definition.status} />
              </Window>
            </ManagedWindow>
          );
        })}
      </div>

      <RightWidgetStack
        className="cattipu-interactive-desktop__right-widgets"
        creatorName={creatorName}
        onViewAll={() => launchWindow('projects')}
      />

      <BottomStatusBar className="cattipu-interactive-desktop__bottom-status" />
    </main>
  );
}
