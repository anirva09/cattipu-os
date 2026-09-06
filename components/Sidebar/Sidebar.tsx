import type {
  CSSProperties,
  HTMLAttributes,
  ReactNode,
} from 'react';

import {
  cattipuCssVariables,
  cattipuTokens,
} from '../../design-system/tokens';

import { SidebarButton } from '../SidebarButton/SidebarButton';

import '../../design-system/bevel.css';
import './Sidebar.css';

export const CATTIPU_SIDEBAR_ITEMS = [
  { id: 'home', label: 'Home' },
  { id: 'projects', label: 'Projects' },
  { id: 'architect', label: 'Architect' },
  { id: 'canvas', label: 'Canvas' },
  { id: 'forge', label: 'Forge' },
  { id: 'memory', label: 'Memory' },
  { id: 'launch', label: 'Launch' },
  { id: 'explorer', label: 'Explorer' },
  { id: 'settings', label: 'Settings' },
] as const;

export type CattipuSidebarItemId =
  (typeof CATTIPU_SIDEBAR_ITEMS)[number]['id'];

export type CattipuSidebarIcons = Record<CattipuSidebarItemId, ReactNode>;

export const CATTIPU_SIDEBAR_REFERENCE = {
  width: 98,
  brandWidth: 80,
  brandHeight: 72,
  navGap: cattipuTokens.spacing[4],
  sectionGap: cattipuTokens.spacing[8],
  nodeWidth: 80,
  nodeHeight: 76,
  nodeDisplayWidth: 40,
  nodeDisplayHeight: 32,
  nodeLabelSize: cattipuTokens.type.body,
  nodeLabelLineHeight: 18,
} as const;

type SidebarStyle = CSSProperties &
  Record<`--cattipu-${string}`, string>;

export interface SidebarProps
  extends Omit<HTMLAttributes<HTMLElement>, 'children'> {
  brandMark: ReactNode;
  icons: CattipuSidebarIcons;
  activeItem?: CattipuSidebarItemId;
  onNavigate?: (item: CattipuSidebarItemId) => void;
  nodeLabel?: string;
}

function NodeMonitorGlyph() {
  return (
    <svg
      className="cattipu-sidebar__node-monitor-glyph"
      viewBox="0 0 24 20"
      aria-hidden="true"
    >
      <rect x="2" y="2" width="20" height="13" />
      <path d="M12 15v3M8 18h8" />
      <rect className="cattipu-sidebar__node-cursor" x="6" y="6" width="2" height="2" />
    </svg>
  );
}

export function Sidebar({
  brandMark,
  icons,
  activeItem,
  onNavigate,
  nodeLabel = 'NODE',
  className,
  style,
  ...asideProps
}: SidebarProps) {
  const sidebarStyle: SidebarStyle = {
    ...cattipuCssVariables,
    '--cattipu-sidebar-width': `${CATTIPU_SIDEBAR_REFERENCE.width}px`,
    '--cattipu-sidebar-brand-width': `${CATTIPU_SIDEBAR_REFERENCE.brandWidth}px`,
    '--cattipu-sidebar-brand-height': `${CATTIPU_SIDEBAR_REFERENCE.brandHeight}px`,
    '--cattipu-sidebar-nav-gap': `${CATTIPU_SIDEBAR_REFERENCE.navGap}px`,
    '--cattipu-sidebar-section-gap': `${CATTIPU_SIDEBAR_REFERENCE.sectionGap}px`,
    '--cattipu-sidebar-node-width': `${CATTIPU_SIDEBAR_REFERENCE.nodeWidth}px`,
    '--cattipu-sidebar-node-height': `${CATTIPU_SIDEBAR_REFERENCE.nodeHeight}px`,
    '--cattipu-sidebar-node-display-width': `${CATTIPU_SIDEBAR_REFERENCE.nodeDisplayWidth}px`,
    '--cattipu-sidebar-node-display-height': `${CATTIPU_SIDEBAR_REFERENCE.nodeDisplayHeight}px`,
    '--cattipu-sidebar-node-label-size': `${CATTIPU_SIDEBAR_REFERENCE.nodeLabelSize}px`,
    '--cattipu-sidebar-node-label-line-height': `${CATTIPU_SIDEBAR_REFERENCE.nodeLabelLineHeight}px`,
    ...style,
  };

  const rootClassName = [
    'cattipu-sidebar',
    'cattipu-edge--outer',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <aside
      {...asideProps}
      className={rootClassName}
      style={sidebarStyle}
    >
      <div className="cattipu-sidebar__raised cattipu-bevel--raised">
        <div className="cattipu-sidebar__bevel-gap">
          <div className="cattipu-sidebar__well cattipu-bevel--inset">
            <div className="cattipu-sidebar__chassis">
              <div className="cattipu-sidebar__brand" aria-label="CATTIPU OS">
                {brandMark}
              </div>

              <nav className="cattipu-sidebar__navigation" aria-label="Primary">
                {CATTIPU_SIDEBAR_ITEMS.map(({ id, label }) => (
                  <SidebarButton
                    key={id}
                    icon={icons[id]}
                    label={label}
                    selected={activeItem === id}
                    onClick={() => onNavigate?.(id)}
                    data-sidebar-item={id}
                  />
                ))}
              </nav>

              <div className="cattipu-sidebar__node-slot">
                <div className="cattipu-sidebar__node cattipu-bevel--raised">
                  <div className="cattipu-sidebar__node-display cattipu-bevel--inset">
                    <NodeMonitorGlyph />
                  </div>
                  <span className="cattipu-sidebar__node-label">{nodeLabel}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
