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
  labelSize: cattipuTokens.type.status,
} as const;

type BottomStatusBarStyle = CSSProperties &
  Record<`--cattipu-${string}`, string>;

/**
 * Every segment is a label its caller has already made truthful, and every
 * meter is optional. The bar used to default to invented telemetry (PROJECT
 * SAVED, MEMORY INDEXED at 64%, BUILD QUEUE: 0, LOG: 0, C: 412MB FREE at
 * 66%). Its defaults are now states that claim nothing: UNKNOWN where a
 * source exists but has not reported, and N/A or — where no source exists.
 */
export interface BottomStatusBarProps
  extends Omit<HTMLAttributes<HTMLElement>, 'children'> {
  projectState?: string;
  memoryLabel?: string;
  /** `null` when there is nothing to measure — no meter is drawn and the
   *  label takes the whole segment. An empty gauge beside a system that
   *  does not exist would still claim there is something to fill. */
  memoryPercent?: number | null;
  buildLabel?: string;
  logLabel?: string;
  storageLabel?: string;
  /** Same contract as `memoryPercent`. */
  storagePercent?: number | null;
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, value));
}

/** A segment whose meter is drawn only when there is a reading. */
function MeteredSegment({
  label,
  percent,
}: {
  label: string;
  percent: number | null;
}) {
  if (percent === null) {
    return (
      <div className="cattipu-bottom-status-bar__segment cattipu-bevel--raised">
        <strong>{label}</strong>
      </div>
    );
  }
  return (
    <div className="cattipu-bottom-status-bar__segment cattipu-bottom-status-bar__segment--meter cattipu-bevel--raised">
      <strong>{label}</strong>
      <StatusMeter
        value={percent}
        label={`${label} ${clampPercent(percent)} percent`}
      />
    </div>
  );
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
  projectState = 'PROJECT: UNKNOWN',
  memoryLabel = 'MEMORY: UNKNOWN',
  memoryPercent = null,
  buildLabel = 'BUILD: UNKNOWN',
  logLabel = 'LOG: —',
  storageLabel = 'STORAGE: N/A',
  storagePercent = null,
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

            <MeteredSegment label={memoryLabel} percent={memoryPercent} />

            <div className="cattipu-bottom-status-bar__segment cattipu-bevel--raised">
              <strong>{buildLabel}</strong>
            </div>

            <div className="cattipu-bottom-status-bar__segment cattipu-bevel--raised">
              <strong>{logLabel}</strong>
            </div>

            <MeteredSegment label={storageLabel} percent={storagePercent} />
          </div>
        </div>
      </div>
    </footer>
  );
}
