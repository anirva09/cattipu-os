import type {
  ButtonHTMLAttributes,
  CSSProperties,
  HTMLAttributes,
} from 'react';

import {
  cattipuCssVariables,
  cattipuTokens,
} from '../../design-system/tokens';

import { ShellIcon } from '../PixelIcon/ShellIcon';

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

/**
 * Icon authority migration — these three were hand-drawn stroke glyphs
 * (a circle-and-stem magnifier, an outlined bell, a vector analogue clock)
 * that never came from PixelForge. They now render the frozen Sheet 01
 * marks CAT-SHELL-009 Search, CAT-SHELL-010 Notifications and CAT-SYS-002
 * Clock.
 *
 * The 16px HANDCRAFTED master is used, not the 32 shrunk to fit: this slot
 * is 24px, and 32 -> 24 is a 0.75x scale that drops the 1px highlight row
 * and breaks the 2px outline. The mark keeps its own size and the slot
 * centres it, so the top bar's spacing, height and separators are
 * unchanged.
 *
 * The wrapper keeps each original class name, so the sizing, hover and
 * disabled rules in TopBar.css still apply to the same element.
 */
function SearchIcon() {
  return (
    <ShellIcon name="search" size={16} className="cattipu-top-bar__search-glyph" />
  );
}

function BellIcon() {
  return (
    <ShellIcon name="bell" size={16} className="cattipu-top-bar__bell-glyph" />
  );
}

function AnalogClockIcon() {
  return (
    <ShellIcon name="clock" size={16} className="cattipu-top-bar__clock-glyph" />
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
