import type {
  ButtonHTMLAttributes,
  CSSProperties,
  HTMLAttributes,
  ReactNode,
} from 'react';

import {
  cattipuCssVariables,
  cattipuTokens,
} from '../../design-system/tokens';

import '../../design-system/bevel.css';
import './RightWidgetStack.css';

import { PixelIcon } from '../PixelIcon/PixelIcon';



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
}

type WidgetTone = 'welcome' | 'status' | 'architect' | 'projects';

interface WidgetShellProps {
  title: string;
  tone: WidgetTone;
  height: number;
  controls?: readonly ('minimize' | 'maximize' | 'close')[];
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

function WidgetShell({
  title,
  tone,
  height,
  controls = ['minimize', 'close'],
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
    >
      <header
        className="cattipu-right-widget-stack__header"
        data-tone={tone}
      >
        <span className="cattipu-right-widget-stack__header-title">
          {title}
        </span>

        <span className="cattipu-right-widget-stack__controls" aria-hidden="true">
          {controls.map((control) => (
            <span
              key={control}
              className="cattipu-right-widget-stack__control cattipu-bevel--raised"
            >
              <WindowControlGlyph kind={control} />
            </span>
          ))}
        </span>
      </header>

      <div className="cattipu-right-widget-stack__body cattipu-bevel--inset">
        {children}
      </div>
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
  className,
  style,
  ...asideProps
}: RightWidgetStackProps) {
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
    '--cattipu-toolbox-icon-size': `${CATTIPU_RIGHT_WIDGET_STACK_REFERENCE.toolboxIconSize}px`,
    '--cattipu-toolbox-column-width': `${CATTIPU_RIGHT_WIDGET_STACK_REFERENCE.toolboxColumnWidth}px`,
    '--cattipu-widget-gold': cattipuTokens.colors.welcome,
    '--cattipu-widget-green': cattipuTokens.colors.status,
    '--cattipu-widget-purple': cattipuTokens.colors.architect,
    '--cattipu-widget-red': cattipuTokens.colors.projects,
    ...style,
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
      <WidgetShell
        title="WELCOME"
        tone="welcome"
        height={CATTIPU_RIGHT_WIDGET_STACK_REFERENCE.welcomeHeight}
        controls={['minimize', 'maximize', 'close']}
      >
        <div className="cattipu-right-widget-stack__welcome-copy">
          <strong>Welcome back, {creatorName}.</strong>
          <strong>What will we build today?</strong>
        </div>
      </WidgetShell>

      <WidgetShell
        title="RECENT PROJECTS"
        tone="status"
        height={CATTIPU_RIGHT_WIDGET_STACK_REFERENCE.recentHeight}
      >
        <div className="cattipu-right-widget-stack__recent">
          <ul className="cattipu-right-widget-stack__recent-list">
            {recentProjects.slice(0, 3).map((project) => (
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
      </WidgetShell>

      <WidgetShell
        title="ARCHITECT PREVIEW"
        tone="architect"
        height={CATTIPU_RIGHT_WIDGET_STACK_REFERENCE.architectHeight}
      >
        <div className="cattipu-right-widget-stack__architect">
          <ArchitectPreviewDiagram />
        </div>
      </WidgetShell>

      <WidgetShell
        title="SYSTEM STATUS"
        tone="projects"
        height={CATTIPU_RIGHT_WIDGET_STACK_REFERENCE.systemHeight}
      >
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
      </WidgetShell>

      <WidgetShell
        title="TOOLBOX"
        tone="architect"
        height={CATTIPU_RIGHT_WIDGET_STACK_REFERENCE.toolboxHeight}
        controls={['minimize', 'maximize', 'close']}
      >
        <div className="cattipu-right-widget-stack__toolbox">
          {TOOLBOX_TOOLS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              className="cattipu-right-widget-stack__tool cattipu-focus--mechanical"
              onClick={() => onToolSelect?.(id)}
            >
              <span className="cattipu-right-widget-stack__tool-icon cattipu-bevel--raised cattipu-bevel--pressable">
                <PixelIcon name={id} size={32} />
              </span>
              <span className="cattipu-right-widget-stack__tool-label">
                {label}
              </span>
            </button>
          ))}
        </div>
      </WidgetShell>
    </aside>
  );
}
