import {
  useState,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
} from 'react';

import {
  cattipuCssVariables,
  cattipuTokens,
} from '../../design-system/tokens';

import '../../design-system/bevel.css';
import './RightWidgetStack.css';

import { PixelIcon } from '../PixelIcon/PixelIcon';
import { ContextMenu, type ContextMenuItem } from '../ContextMenu';
import { MENU_COMMANDS } from '../ContextMenu/menuCommands';
import { DESKTOP_WIDGETS, type DesktopWidgetId } from '../../lib/os/widgets';



export const CATTIPU_RIGHT_WIDGET_STACK_REFERENCE = {
  width: 232,
  gap: cattipuTokens.spacing[8],
  headerHeight: 28,
  controlSize: 22,
  controlGap: cattipuTokens.spacing[4],
  bodyPadding: cattipuTokens.spacing[8],
  welcomeHeight: 88,
  recentHeight: 138,
  architectHeight: 132,
  systemHeight: 194,
  toolboxHeight: 176,
  viewAllWidth: 72,
  viewAllHeight: 28,
  /** Between the scrolling list and the VIEW ALL strip beneath it. */
  recentListGap: cattipuTokens.spacing[4],
  toolboxIconSize: 38,
  toolboxColumnWidth: 47,
} as const;

export type CattipuToolboxTool =
  | 'entity'
  | 'service'
  | 'flow'
  | 'screen'
  | 'api'
  | 'job'
  | 'script'
  | 'config';

export interface SystemStatusRow {
  label: string;
  value: string;
}

type RightWidgetStackStyle = CSSProperties &
  Record<`--cattipu-${string}`, string>;

export interface RightWidgetStackProps
  extends Omit<HTMLAttributes<HTMLElement>, 'children'> {
  creatorName?: string;
  recentProjects?: readonly string[];
  statuses?: readonly SystemStatusRow[];
  onViewAll?: ButtonHTMLAttributes<HTMLButtonElement>['onClick'];
  onToolSelect?: (tool: CattipuToolboxTool) => void;
  /**
   * MVP-09. Widgets the person closed; they are not drawn, and the ADD
   * WIDGET key at the foot of the column brings them back. Owned by
   * useSettingsStore; this component only draws what it is given.
   */
  hiddenWidgets?: readonly DesktopWidgetId[];
  /** MVP-09. Widgets folded down to their header plate. */
  collapsedWidgets?: readonly DesktopWidgetId[];
  /**
   * MVP-09. What the header keys do. Without these the keys are drawn
   * disabled: a key that presses in and does nothing would be a promise
   * the shell cannot keep.
   */
  onWidgetHidden?: (id: DesktopWidgetId, hidden: boolean) => void;
  onWidgetCollapsed?: (id: DesktopWidgetId, collapsed: boolean) => void;
  onShowAllWidgets?: () => void;
}

type WidgetTone = 'welcome' | 'status' | 'architect' | 'projects';

interface WidgetShellProps {
  title: string;
  tone: WidgetTone;
  height: number;
  label: string;
  collapsed: boolean;
  onCollapse?: (collapsed: boolean) => void;
  onClose?: () => void;
  children: ReactNode;
  className?: string;
}

const DEFAULT_RECENT_PROJECTS = [
  'Banking Platform',
  'AI SaaS Starter',
  'CATTIPU Website',
] as const;

const DEFAULT_STATUSES: readonly SystemStatusRow[] = [
  { label: 'DESKTOP:', value: 'READY' },
  { label: 'ARCHITECT:', value: 'READY' },
  { label: 'BUILD:', value: 'IDLE' },
  { label: 'PROJECT:', value: 'SAVED' },
  { label: 'MEMORY INDEXED:', value: 'OK' },
  { label: 'SOUND:', value: 'ON' },
  { label: 'CURSOR:', value: 'ON' },
];

const TOOLBOX_TOOLS: readonly {
  id: CattipuToolboxTool;
  label: string;
}[] = [
  { id: 'entity', label: 'Entity' },
  { id: 'service', label: 'Service' },
  { id: 'flow', label: 'Flow' },
  { id: 'screen', label: 'Screen' },
  { id: 'api', label: 'API' },
  { id: 'job', label: 'Job' },
  { id: 'script', label: 'Script' },
  { id: 'config', label: 'Config' },
];

/** Each widget's header tone and frozen height, keyed by its registry id. */
const WIDGET_TONE: Record<DesktopWidgetId, WidgetTone> = {
  welcome: 'welcome',
  recent: 'status',
  architect: 'architect',
  system: 'projects',
  toolbox: 'architect',
};

const WIDGET_HEIGHT: Record<DesktopWidgetId, number> = {
  welcome: CATTIPU_RIGHT_WIDGET_STACK_REFERENCE.welcomeHeight,
  recent: CATTIPU_RIGHT_WIDGET_STACK_REFERENCE.recentHeight,
  architect: CATTIPU_RIGHT_WIDGET_STACK_REFERENCE.architectHeight,
  system: CATTIPU_RIGHT_WIDGET_STACK_REFERENCE.systemHeight,
  toolbox: CATTIPU_RIGHT_WIDGET_STACK_REFERENCE.toolboxHeight,
};

function WindowControlGlyph({
  kind,
}: {
  kind: 'minimize' | 'maximize' | 'close';
}) {
  return (
    <span
      className={`cattipu-right-widget-stack__control-glyph cattipu-right-widget-stack__control-glyph--${kind}`}
      aria-hidden="true"
    />
  );
}

const CONTROL = 'cattipu-right-widget-stack__control cattipu-bevel--raised cattipu-bevel--pressable cattipu-focus--mechanical';

/**
 * One widget: a toned header plate and an inset body. MVP-09 made the
 * header keys real, in the window grammar: [_] folds the widget to its
 * plate, [□] unfolds it again, [X] closes it. There is no maximize: a
 * widget has nowhere larger to go, so the key it used to draw did nothing
 * and is gone.
 */
function WidgetShell({
  title,
  tone,
  height,
  label,
  collapsed,
  onCollapse,
  onClose,
  children,
  className,
}: WidgetShellProps) {
  return (
    <section
      className={[
        'cattipu-right-widget-stack__widget',
        className,
        'cattipu-edge--outer',
      ].filter(Boolean).join(' ')}
      style={{
        '--cattipu-widget-height': `${height}px`,
      } as CSSProperties}
      aria-label={label}
      data-widget={label}
      data-collapsed={collapsed ? 'true' : undefined}
    >
      <header
        className="cattipu-right-widget-stack__header"
        data-tone={tone}
      >
        <span className="cattipu-right-widget-stack__header-title">
          {title}
        </span>

        <span className="cattipu-right-widget-stack__controls">
          <button
            type="button"
            className={CONTROL}
            data-control={collapsed ? 'restore' : 'minimize'}
            aria-label={`${collapsed ? 'Restore' : 'Minimize'} ${label}`}
            aria-expanded={!collapsed}
            title={collapsed ? 'Restore' : 'Minimize'}
            disabled={!onCollapse}
            onClick={onCollapse ? () => onCollapse(!collapsed) : undefined}
          >
            <WindowControlGlyph kind={collapsed ? 'maximize' : 'minimize'} />
          </button>
          <button
            type="button"
            className={CONTROL}
            data-control="close"
            aria-label={`Close ${label}`}
            title="Close"
            disabled={!onClose}
            onClick={onClose}
          >
            <WindowControlGlyph kind="close" />
          </button>
        </span>
      </header>

      {!collapsed && (
        <div className="cattipu-right-widget-stack__body cattipu-bevel--inset">
          {children}
        </div>
      )}
    </section>
  );
}

function ArchitectPreviewDiagram() {
  return (
    <svg
      className="cattipu-right-widget-stack__architect-diagram"
      viewBox="0 0 184 82"
      aria-label="Architect preview"
      role="img"
    >
      <g className="cattipu-right-widget-stack__architect-lines">
        <path d="M92 13V32M92 50V69M42 41H82M102 41H142" />
        <path d="M92 32 82 41 92 50 102 41Z" />
        <path d="M42 41H58V20H76M42 41H58V62H76" />
        <path d="M142 41H126V20H108M142 41H126V62H108" />
      </g>

      <g className="cattipu-right-widget-stack__architect-node">
        <rect x="76" y="4" width="32" height="20" />
        <rect x="26" y="31" width="32" height="20" />
        <rect x="126" y="31" width="32" height="20" />
        <rect x="76" y="58" width="32" height="20" />
      </g>

      <g className="cattipu-right-widget-stack__architect-label">
        <text x="92" y="17">UI</text>
        <text x="42" y="44">API</text>
        <text x="142" y="44">DB</text>
        <text x="92" y="71">Auth</text>
      </g>

      <rect
        className="cattipu-right-widget-stack__architect-core"
        x="84"
        y="33"
        width="16"
        height="16"
        transform="rotate(45 92 41)"
      />
      <circle
        className="cattipu-right-widget-stack__architect-core-dot"
        cx="92"
        cy="41"
        r="3"
      />
    </svg>
  );
}


export function RightWidgetStack({
  creatorName = 'Creator',
  recentProjects = DEFAULT_RECENT_PROJECTS,
  statuses = DEFAULT_STATUSES,
  onViewAll,
  onToolSelect,
  hiddenWidgets = [],
  collapsedWidgets = [],
  onWidgetHidden,
  onWidgetCollapsed,
  onShowAllWidgets,
  className,
  style,
  ...asideProps
}: RightWidgetStackProps) {
  const [addMenu, setAddMenu] = useState<{ x: number; y: number } | null>(null);
  const stackStyle: RightWidgetStackStyle = {
    ...cattipuCssVariables,
    '--cattipu-right-stack-width': `${CATTIPU_RIGHT_WIDGET_STACK_REFERENCE.width}px`,
    '--cattipu-right-stack-gap': `${CATTIPU_RIGHT_WIDGET_STACK_REFERENCE.gap}px`,
    '--cattipu-widget-header-height': `${CATTIPU_RIGHT_WIDGET_STACK_REFERENCE.headerHeight}px`,
    '--cattipu-widget-control-size': `${CATTIPU_RIGHT_WIDGET_STACK_REFERENCE.controlSize}px`,
    '--cattipu-widget-control-gap': `${CATTIPU_RIGHT_WIDGET_STACK_REFERENCE.controlGap}px`,
    '--cattipu-widget-body-padding': `${CATTIPU_RIGHT_WIDGET_STACK_REFERENCE.bodyPadding}px`,
    '--cattipu-widget-view-all-width': `${CATTIPU_RIGHT_WIDGET_STACK_REFERENCE.viewAllWidth}px`,
    '--cattipu-widget-view-all-height': `${CATTIPU_RIGHT_WIDGET_STACK_REFERENCE.viewAllHeight}px`,
    '--cattipu-widget-recent-list-gap': `${CATTIPU_RIGHT_WIDGET_STACK_REFERENCE.recentListGap}px`,
    '--cattipu-toolbox-icon-size': `${CATTIPU_RIGHT_WIDGET_STACK_REFERENCE.toolboxIconSize}px`,
    '--cattipu-toolbox-column-width': `${CATTIPU_RIGHT_WIDGET_STACK_REFERENCE.toolboxColumnWidth}px`,
    '--cattipu-widget-gold': cattipuTokens.colors.welcome,
    '--cattipu-widget-green': cattipuTokens.colors.status,
    '--cattipu-widget-purple': cattipuTokens.colors.architect,
    '--cattipu-widget-red': cattipuTokens.colors.projects,
    ...style,
  };

  // What each widget holds. The chrome around it is WidgetShell's.
  const content: Record<DesktopWidgetId, ReactNode> = {
    welcome: (
      <div className="cattipu-right-widget-stack__welcome-copy">
        <strong>Welcome back, {creatorName}.</strong>
        <strong>What will we build today?</strong>
      </div>
    ),
    recent: (
      <div className="cattipu-right-widget-stack__recent">
        <ul className="cattipu-right-widget-stack__recent-list">
          {/* Every project it is given. The panel keeps its fixed height
              and the list scrolls inside it, so a long history never
              pushes the widgets below it down the desktop. */}
          {recentProjects.map((project) => (
            <li key={project}>{project}</li>
          ))}
        </ul>

        <button
          type="button"
          className="cattipu-right-widget-stack__view-all cattipu-bevel--raised cattipu-bevel--pressable cattipu-focus--mechanical"
          onClick={onViewAll}
        >
          VIEW ALL
        </button>
      </div>
    ),
    architect: (
      <div className="cattipu-right-widget-stack__architect">
        <ArchitectPreviewDiagram />
      </div>
    ),
    system: (
      <dl className="cattipu-right-widget-stack__status">
        {statuses.slice(0, 7).map(({ label, value }) => (
          <div
            className="cattipu-right-widget-stack__status-row"
            key={label}
          >
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    ),
    toolbox: (
      <div className="cattipu-right-widget-stack__toolbox">
        {/* A tool is only pressable when something will receive it. No
         * tool has a canonical destination yet (BOUNDARY_AUDIT.md §2.9),
         * so the live shell passes no handler, and a plate that pressed
         * in and did nothing would be a promise the OS cannot keep. They
         * stay on the shelf, disabled and engraved, the way the context
         * menu shows Paste: the machine has the concept; it is planned. */}
        {TOOLBOX_TOOLS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            className="cattipu-right-widget-stack__tool cattipu-focus--mechanical"
            disabled={!onToolSelect}
            data-availability={onToolSelect ? 'available' : 'planned'}
            title={onToolSelect ? label : `${label} — planned`}
            onClick={onToolSelect ? () => onToolSelect(id) : undefined}
          >
            <span
              className={[
                'cattipu-right-widget-stack__tool-icon cattipu-bevel--raised',
                onToolSelect && 'cattipu-bevel--pressable',
              ].filter(Boolean).join(' ')}
            >
              <PixelIcon name={id} size={32} />
            </span>
            <span className="cattipu-right-widget-stack__tool-label">
              {label}
            </span>
          </button>
        ))}
      </div>
    ),
  };

  return (
    <aside
      {...asideProps}
      className={[
        'cattipu-right-widget-stack',
        className,
      ].filter(Boolean).join(' ')}
      style={stackStyle}
      aria-label="Desktop widgets"
    >
      {DESKTOP_WIDGETS.filter(({ id }) => !hiddenWidgets.includes(id)).map(({ id, title, label }) => (
        <WidgetShell
          key={id}
          title={title}
          tone={WIDGET_TONE[id]}
          height={WIDGET_HEIGHT[id]}
          label={label}
          collapsed={collapsedWidgets.includes(id)}
          onCollapse={onWidgetCollapsed ? (collapsed) => onWidgetCollapsed(id, collapsed) : undefined}
          onClose={onWidgetHidden ? () => onWidgetHidden(id, true) : undefined}
        >
          {content[id]}
        </WidgetShell>
      ))}

      {/* MVP-09. Closed widgets come back from here (and from the desktop
          menu's Widgets list), through the shell's one menu component. */}
      {hiddenWidgets.length > 0 && onWidgetHidden && (
        <button
          type="button"
          className="cattipu-right-widget-stack__add cattipu-bevel--raised cattipu-bevel--pressable cattipu-focus--mechanical"
          aria-haspopup="menu"
          aria-expanded={addMenu !== null}
          onClick={(event) => {
            const box = event.currentTarget.getBoundingClientRect();
            setAddMenu({ x: box.left, y: box.bottom });
          }}
        >
          ADD WIDGET
        </button>
      )}

      {addMenu && onWidgetHidden && (
        <ContextMenu
          x={addMenu.x}
          y={addMenu.y}
          title="Widgets"
          items={[
            ...hiddenWidgets.map((id): ContextMenuItem => ({
              id: `show-${id}`,
              label: DESKTOP_WIDGETS.find((w) => w.id === id)?.label ?? id,
              onSelect: () => onWidgetHidden(id, false),
            })),
            ...(onShowAllWidgets
              ? [
                  { kind: 'separator', id: 'widgets-sep' } as const,
                  { id: 'show-all', ...MENU_COMMANDS.showAllWidgets, onSelect: onShowAllWidgets },
                ]
              : []),
          ]}
          onClose={() => setAddMenu(null)}
        />
      )}
    </aside>
  );
}
