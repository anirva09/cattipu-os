import type {
  ButtonHTMLAttributes,
  CSSProperties,
  HTMLAttributes,
} from 'react';

import {
  cattipuCssVariables,
  cattipuTokens,
} from '../../design-system/tokens';

import '../../design-system/bevel.css';
import './TopBar.css';

export const CATTIPU_TOP_BAR_REFERENCE = {
  height: 48,
  horizontalPadding: cattipuTokens.spacing[24],
  clusterGap: cattipuTokens.spacing[16],
  inlineGap: cattipuTokens.spacing[8],
  controlSize: 32,
  iconSize: 24,
  clockSize: 28,
  separatorHeight: 32,
  brandSize: cattipuTokens.type.desktopTitle,
  dateSize: cattipuTokens.type.widgetHeader,
} as const;

type TopBarStyle = CSSProperties &
  Record<`--cattipu-${string}`, string>;

export interface TopBarProps
  extends Omit<HTMLAttributes<HTMLElement>, 'children'> {
  workspaceTitle?: string;
  dateTimeText: string;
  activeWorkspace?: boolean;
  hasNotification?: boolean;
  onSearch?: ButtonHTMLAttributes<HTMLButtonElement>['onClick'];
  onNotifications?: ButtonHTMLAttributes<HTMLButtonElement>['onClick'];
}

function SearchIcon() {
  return (
    <svg
      className="cattipu-top-bar__search-glyph"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle cx="9" cy="9" r="6" />
      <path d="M13.5 13.5 20 20" />
      <path className="cattipu-top-bar__icon-highlight" d="M5.5 7.5A4 4 0 0 1 9 5.5" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg
      className="cattipu-top-bar__bell-glyph"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path d="M6 16.5h12l-1.5-2.25V10a4.5 4.5 0 0 0-9 0v4.25L6 16.5Z" />
      <path d="M10 18.5h4a2 2 0 0 1-4 0Z" />
      <rect x="11" y="3" width="2" height="2" />
    </svg>
  );
}

function AnalogClockIcon() {
  return (
    <svg
      className="cattipu-top-bar__clock-glyph"
      viewBox="0 0 28 28"
      aria-hidden="true"
    >
      <circle className="cattipu-top-bar__clock-face" cx="14" cy="14" r="11" />
      <path className="cattipu-top-bar__clock-ticks" d="M14 4v2M14 22v2M4 14h2M22 14h2" />
      <path className="cattipu-top-bar__clock-hand" d="M14 8v6l4 3" />
      <path className="cattipu-top-bar__clock-second" d="M14 14 10 18" />
    </svg>
  );
}

export function TopBar({
  workspaceTitle,
  dateTimeText,
  activeWorkspace = false,
  hasNotification = false,
  onSearch,
  onNotifications,
  className,
  style,
  ...headerProps
}: TopBarProps) {
  const topBarStyle: TopBarStyle = {
    ...cattipuCssVariables,
    '--cattipu-top-bar-height': `${CATTIPU_TOP_BAR_REFERENCE.height}px`,
    '--cattipu-top-bar-padding-x': `${CATTIPU_TOP_BAR_REFERENCE.horizontalPadding}px`,
    '--cattipu-top-bar-cluster-gap': `${CATTIPU_TOP_BAR_REFERENCE.clusterGap}px`,
    '--cattipu-top-bar-inline-gap': `${CATTIPU_TOP_BAR_REFERENCE.inlineGap}px`,
    '--cattipu-top-bar-control-size': `${CATTIPU_TOP_BAR_REFERENCE.controlSize}px`,
    '--cattipu-top-bar-icon-size': `${CATTIPU_TOP_BAR_REFERENCE.iconSize}px`,
    '--cattipu-top-bar-clock-size': `${CATTIPU_TOP_BAR_REFERENCE.clockSize}px`,
    '--cattipu-top-bar-separator-height': `${CATTIPU_TOP_BAR_REFERENCE.separatorHeight}px`,
    '--cattipu-top-bar-brand-size': `${CATTIPU_TOP_BAR_REFERENCE.brandSize}px`,
    '--cattipu-top-bar-date-size': `${CATTIPU_TOP_BAR_REFERENCE.dateSize}px`,
    '--cattipu-top-bar-navy': cattipuTokens.colors.navy,
    '--cattipu-top-bar-active': cattipuTokens.colors.bevelTop,
    '--cattipu-top-bar-inactive': cattipuTokens.colors.bevelLeft,
    '--cattipu-top-bar-notification': cattipuTokens.colors.welcome,
    '--cattipu-top-bar-clock-hand': cattipuTokens.colors.navy,
    '--cattipu-top-bar-clock-second': cattipuTokens.colors.projects,
    ...style,
  };

  const rootClassName = [
    'cattipu-top-bar',
    'cattipu-edge--bottom',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <header
      {...headerProps}
      className={rootClassName}
      style={topBarStyle}
      data-workspace-active={activeWorkspace ? 'true' : 'false'}
      data-notification={hasNotification ? 'true' : 'false'}
    >
      <div className="cattipu-top-bar__branding">
        <span className="cattipu-top-bar__brand">CATTIPU OS</span>

        {workspaceTitle ? (
          <>
            <span className="cattipu-top-bar__separator" aria-hidden="true" />
            <span className="cattipu-top-bar__workspace">
              {workspaceTitle}
            </span>
          </>
        ) : null}
      </div>

      <div className="cattipu-top-bar__right-cluster">
        <button
          type="button"
          className="cattipu-top-bar__icon-button cattipu-focus--mechanical"
          onClick={onSearch}
          aria-label="Search"
        >
          <SearchIcon />
        </button>

        <button
          type="button"
          className="cattipu-top-bar__icon-button cattipu-top-bar__notification-button cattipu-focus--mechanical"
          onClick={onNotifications}
          aria-label={hasNotification ? 'Notifications available' : 'Notifications'}
        >
          <BellIcon />
        </button>

        <span className="cattipu-top-bar__time-cluster">
          <AnalogClockIcon />
          <span className="cattipu-top-bar__date-time">{dateTimeText}</span>
        </span>
      </div>
    </header>
  );
}
