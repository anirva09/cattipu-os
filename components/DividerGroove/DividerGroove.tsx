import type { CSSProperties, HTMLAttributes } from 'react';

import {
  cattipuCssVariables,
  cattipuTokens,
} from '../../design-system/tokens';

import '../../design-system/bevel.css';
import './DividerGroove.css';

export type DividerGrooveOrientation = 'vertical' | 'horizontal';

export const CATTIPU_DIVIDER_GROOVE_REFERENCE = {
  thickness: cattipuTokens.spacing[16],
  gripMark: 2,
  gripGap: 2,
  gripCount: 5,
} as const;

type DividerGrooveStyle = CSSProperties &
  Record<`--cattipu-${string}`, string>;

export interface DividerGrooveProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  orientation: DividerGrooveOrientation;
}

export function DividerGroove({
  orientation,
  className,
  style,
  ...divProps
}: DividerGrooveProps) {
  const grooveStyle: DividerGrooveStyle = {
    ...cattipuCssVariables,
    '--cattipu-divider-thickness': `${CATTIPU_DIVIDER_GROOVE_REFERENCE.thickness}px`,
    '--cattipu-divider-mark': `${CATTIPU_DIVIDER_GROOVE_REFERENCE.gripMark}px`,
    '--cattipu-divider-mark-gap': `${CATTIPU_DIVIDER_GROOVE_REFERENCE.gripGap}px`,
    ...style,
  };

  return (
    <div
      {...divProps}
      className={[
        'cattipu-divider-groove',
        `cattipu-divider-groove--${orientation}`,
        'cattipu-bevel--inset',
        className,
      ].filter(Boolean).join(' ')}
      style={grooveStyle}
      aria-hidden="true"
    >
      <span className="cattipu-divider-groove__grip">
        {Array.from(
          { length: CATTIPU_DIVIDER_GROOVE_REFERENCE.gripCount },
          (_, index) => (
            <span
              className="cattipu-divider-groove__mark"
              key={index}
            />
          ),
        )}
      </span>
    </div>
  );
}
