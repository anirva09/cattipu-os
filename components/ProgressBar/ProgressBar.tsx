import type { CSSProperties, HTMLAttributes } from 'react';

import {
  cattipuCssVariables,
  cattipuTokens,
} from '../../design-system/tokens';

import '../../design-system/bevel.css';
import './ProgressBar.css';

export const CATTIPU_PROGRESS_BAR_REFERENCE = {
  width: 144,
  height: 24,
} as const;

type ProgressBarStyle = CSSProperties &
  Record<`--cattipu-${string}`, string>;

export interface ProgressBarProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  value: number;
  label?: string;
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, value));
}

export function ProgressBar({
  value,
  label,
  className,
  style,
  ...divProps
}: ProgressBarProps) {
  const safeValue = clampPercent(value);

  const progressStyle: ProgressBarStyle = {
    ...cattipuCssVariables,
    '--cattipu-progress-width': `${CATTIPU_PROGRESS_BAR_REFERENCE.width}px`,
    '--cattipu-progress-height': `${CATTIPU_PROGRESS_BAR_REFERENCE.height}px`,
    '--cattipu-progress-fill': `${safeValue}%`,
    '--cattipu-progress-navy': cattipuTokens.colors.navy,
    ...style,
  };

  return (
    <div
      {...divProps}
      className={[
        'cattipu-progress',
        'cattipu-bevel--inset',
        className,
      ].filter(Boolean).join(' ')}
      style={progressStyle}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={safeValue}
      aria-label={label ?? `Progress ${safeValue}%`}
    >
      <span className="cattipu-progress__fill" aria-hidden="true" />
    </div>
  );
}
