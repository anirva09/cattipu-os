import type {
  CSSProperties,
  HTMLAttributes,
} from 'react';

import {
  cattipuCssVariables,
  cattipuTokens,
} from '../../design-system/tokens';

import '../../design-system/bevel.css';
import './BottomStatusBar.css';

export const CATTIPU_BOTTOM_STATUS_BAR_REFERENCE = {
  height: 50,
  projectWidth: 280,
  memoryWidth: 312,
  queueWidth: 176,
  diskWidth: 280,
  gap: cattipuTokens.spacing[8],
  inlinePadding: cattipuTokens.spacing[8],
  meterWidth: 152,
  meterHeight: 18,
  labelSize: cattipuTokens.type.body,
} as const;

type BottomStatusBarStyle = CSSProperties &
  Record<`--cattipu-${string}`, string>;

export interface BottomStatusBarProps
  extends Omit<HTMLAttributes<HTMLElement>, 'children'> {
  projectState?: string;
  memoryLabel?: string;
  memoryPercent?: number;
  buildQueue?: number;
  logCount?: number;
  diskLabel?: string;
  diskPercent?: number;
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function StatusMeter({
  value,
  label,
}: {
  value: number;
  label: string;
}) {
  const safeValue = clampPercent(value);

  return (
    <span
      className="cattipu-bottom-status-bar__meter cattipu-bevel--inset"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={safeValue}
    >
      <span
        className="cattipu-bottom-status-bar__meter-fill"
        style={{
          '--cattipu-bottom-meter-fill': `${safeValue}%`,
        } as CSSProperties}
      />
    </span>
  );
}

export function BottomStatusBar({
  projectState = 'PROJECT SAVED',
  memoryLabel = 'MEMORY INDEXED',
  memoryPercent = 64,
  buildQueue = 0,
  logCount = 0,
  diskLabel = 'C: 412MB FREE',
  diskPercent = 66,
  className,
  style,
  ...footerProps
}: BottomStatusBarProps) {
  const barStyle: BottomStatusBarStyle = {
    ...cattipuCssVariables,
    '--cattipu-bottom-bar-height': `${CATTIPU_BOTTOM_STATUS_BAR_REFERENCE.height}px`,
    '--cattipu-bottom-project-width': `${CATTIPU_BOTTOM_STATUS_BAR_REFERENCE.projectWidth}px`,
    '--cattipu-bottom-memory-width': `${CATTIPU_BOTTOM_STATUS_BAR_REFERENCE.memoryWidth}px`,
    '--cattipu-bottom-queue-width': `${CATTIPU_BOTTOM_STATUS_BAR_REFERENCE.queueWidth}px`,
    '--cattipu-bottom-disk-width': `${CATTIPU_BOTTOM_STATUS_BAR_REFERENCE.diskWidth}px`,
    '--cattipu-bottom-gap': `${CATTIPU_BOTTOM_STATUS_BAR_REFERENCE.gap}px`,
    '--cattipu-bottom-inline-padding': `${CATTIPU_BOTTOM_STATUS_BAR_REFERENCE.inlinePadding}px`,
    '--cattipu-bottom-meter-width': `${CATTIPU_BOTTOM_STATUS_BAR_REFERENCE.meterWidth}px`,
    '--cattipu-bottom-meter-height': `${CATTIPU_BOTTOM_STATUS_BAR_REFERENCE.meterHeight}px`,
    '--cattipu-bottom-label-size': `${CATTIPU_BOTTOM_STATUS_BAR_REFERENCE.labelSize}px`,
    '--cattipu-bottom-navy': cattipuTokens.colors.navy,
    ...style,
  };

  return (
    <footer
      {...footerProps}
      className={[
        'cattipu-bottom-status-bar',
        'cattipu-edge--outer',
        className,
      ].filter(Boolean).join(' ')}
      style={barStyle}
      aria-label="Desktop status"
    >
      <div className="cattipu-bottom-status-bar__raised cattipu-bevel--raised">
        <div className="cattipu-bottom-status-bar__gap">
          <div className="cattipu-bottom-status-bar__well cattipu-bevel--inset">
            <div className="cattipu-bottom-status-bar__segment cattipu-bevel--raised">
              <strong>{projectState}</strong>
            </div>

            <div className="cattipu-bottom-status-bar__segment cattipu-bottom-status-bar__segment--meter cattipu-bevel--raised">
              <strong>{memoryLabel}</strong>
              <StatusMeter
                value={memoryPercent}
                label={`${memoryLabel} ${clampPercent(memoryPercent)} percent`}
              />
            </div>

            <div className="cattipu-bottom-status-bar__segment cattipu-bevel--raised">
              <strong>BUILD QUEUE: {buildQueue}</strong>
            </div>

            <div className="cattipu-bottom-status-bar__segment cattipu-bevel--raised">
              <strong>LOG: {logCount}</strong>
            </div>

            <div className="cattipu-bottom-status-bar__segment cattipu-bottom-status-bar__segment--meter cattipu-bevel--raised">
              <strong>{diskLabel}</strong>
              <StatusMeter
                value={diskPercent}
                label={`${diskLabel} ${clampPercent(diskPercent)} percent`}
              />
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
