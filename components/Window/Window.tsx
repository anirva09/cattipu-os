import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';

import {
  cattipuCssVariables,
  cattipuTokens,
  cattipuWindowTones,
  type CattipuWindowTone,
} from '../../design-system/tokens';

import '../../design-system/bevel.css';
import './Window.css';

export const CATTIPU_WINDOW_REFERENCE = {
  width: cattipuTokens.geometry.windowReferenceWidth,
  height: cattipuTokens.geometry.windowReferenceHeight,
  titleBarHeight: cattipuTokens.geometry.titleBarHeight,
} as const;

type CssLength = number | string;

type CattipuWindowStyle = CSSProperties & Record<`--cattipu-${string}`, string>;

export interface WindowProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  title: ReactNode;
  children: ReactNode;
  tone?: CattipuWindowTone;
  width?: CssLength;
  height?: CssLength;
  showControls?: boolean;
  onMinimize?: () => void;
  onMaximize?: () => void;
  onClose?: () => void;
}

function toCssLength(value: CssLength): string {
  return typeof value === 'number' ? `${value}px` : value;
}

export function Window({
  title,
  children,
  tone = 'projects',
  width = CATTIPU_WINDOW_REFERENCE.width,
  height = CATTIPU_WINDOW_REFERENCE.height,
  showControls = true,
  onMinimize,
  onMaximize,
  onClose,
  className,
  style,
  ...sectionProps
}: WindowProps) {
  const windowStyle: CattipuWindowStyle = {
    ...cattipuCssVariables,
    '--cattipu-window-width': toCssLength(width),
    '--cattipu-window-height': toCssLength(height),
    '--cattipu-window-title-color': cattipuWindowTones[tone],
    '--cattipu-window-title-height': `${cattipuTokens.geometry.titleBarHeight}px`,
    '--cattipu-window-control-size': `${cattipuTokens.geometry.titleControlSize}px`,
    '--cattipu-window-title-font-size': `${cattipuTokens.type.windowTitle}px`,
    ...style,
  };

  const rootClassName = ['cattipu-window', 'cattipu-edge--outer', className]
    .filter(Boolean)
    .join(' ');

  return (
    <section
      {...sectionProps}
      className={rootClassName}
      style={windowStyle}
      data-cattipu-window-tone={tone}
    >
      <div className="cattipu-window__raised cattipu-bevel--raised">
        <div className="cattipu-window__bevel-gap">
          <div className="cattipu-window__inset cattipu-bevel--inset">
            <div className="cattipu-window__plane">
              <header className="cattipu-window__titlebar cattipu-edge--bottom">
                <div className="cattipu-window__title">{title}</div>

                {showControls ? (
                  <div className="cattipu-window__controls" aria-label="Window controls">
                    <button
                      type="button"
                      className="cattipu-window__control cattipu-bevel--raised cattipu-bevel--pressable cattipu-focus--mechanical"
                      aria-label="Minimize window"
                      onClick={onMinimize}
                    >
                      <span className="cattipu-window__glyph cattipu-window__glyph--minimize" aria-hidden="true" />
                    </button>

                    <button
                      type="button"
                      className="cattipu-window__control cattipu-bevel--raised cattipu-bevel--pressable cattipu-focus--mechanical"
                      aria-label="Maximize window"
                      onClick={onMaximize}
                    >
                      <span className="cattipu-window__glyph cattipu-window__glyph--maximize" aria-hidden="true" />
                    </button>

                    <button
                      type="button"
                      className="cattipu-window__control cattipu-bevel--raised cattipu-bevel--pressable cattipu-focus--mechanical"
                      aria-label="Close window"
                      onClick={onClose}
                    >
                      <span className="cattipu-window__glyph cattipu-window__glyph--close" aria-hidden="true" />
                    </button>
                  </div>
                ) : null}
              </header>

              <div className="cattipu-window__body">{children}</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
