import type {
  ButtonHTMLAttributes,
  CSSProperties,
  ReactNode,
} from 'react';

import {
  cattipuCssVariables,
  cattipuTokens,
} from '../../design-system/tokens';

import '../../design-system/bevel.css';
import './SidebarButton.css';

export const CATTIPU_SIDEBAR_BUTTON_REFERENCE = {
  width: 80,
  height: 86,
  iconSize: 40,
  labelGap: cattipuTokens.spacing[8],
  labelSize: cattipuTokens.type.body,
  labelLineHeight: 18,
} as const;

type SidebarButtonStyle = CSSProperties &
  Record<`--cattipu-${string}`, string>;

export interface SidebarButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  icon: ReactNode;
  label: string;
  selected?: boolean;
}

export function SidebarButton({
  icon,
  label,
  selected = false,
  className,
  style,
  ...buttonProps
}: SidebarButtonProps) {
  const buttonStyle: SidebarButtonStyle = {
    ...cattipuCssVariables,
    '--cattipu-sidebar-button-width': `${CATTIPU_SIDEBAR_BUTTON_REFERENCE.width}px`,
    '--cattipu-sidebar-button-height': `${CATTIPU_SIDEBAR_BUTTON_REFERENCE.height}px`,
    '--cattipu-sidebar-icon-size': `${CATTIPU_SIDEBAR_BUTTON_REFERENCE.iconSize}px`,
    '--cattipu-sidebar-label-gap': `${CATTIPU_SIDEBAR_BUTTON_REFERENCE.labelGap}px`,
    '--cattipu-sidebar-label-size': `${CATTIPU_SIDEBAR_BUTTON_REFERENCE.labelSize}px`,
    '--cattipu-sidebar-label-line-height': `${CATTIPU_SIDEBAR_BUTTON_REFERENCE.labelLineHeight}px`,
    ...style,
  };

  const bevelClassName = selected
    ? 'cattipu-bevel--inset'
    : 'cattipu-bevel--raised cattipu-bevel--pressable';

  const rootClassName = [
    'cattipu-sidebar-button',
    bevelClassName,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      {...buttonProps}
      type={buttonProps.type ?? 'button'}
      className={rootClassName}
      style={buttonStyle}
      data-selected={selected ? 'true' : 'false'}
      aria-current={selected ? 'page' : undefined}
      aria-label={buttonProps['aria-label'] ?? label}
    >
      <span className="cattipu-sidebar-button__icon" aria-hidden="true">
        {icon}
      </span>
      <span className="cattipu-sidebar-button__label">{label}</span>
    </button>
  );
}
