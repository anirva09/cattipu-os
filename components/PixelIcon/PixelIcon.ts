import {
  createElement,
  type ComponentType,
  type CSSProperties,
  type HTMLAttributes,
  type SVGProps,
} from 'react';

import IconEntity from '../../public/pixelforge/toolbox/entity-32.svg';
import IconService from '../../public/pixelforge/toolbox/service-32.svg';
import IconFlow from '../../public/pixelforge/toolbox/flow-32.svg';
import IconScreen from '../../public/pixelforge/toolbox/screen-32.svg';
import IconApi from '../../public/pixelforge/toolbox/api-32.svg';
import IconJob from '../../public/pixelforge/toolbox/job-32.svg';
import IconScript from '../../public/pixelforge/toolbox/script-32.svg';
import IconConfig from '../../public/pixelforge/toolbox/config-32.svg';

import { SHELL_ICONS_32 } from './shellIcons';

export type PixelIconComponent = ComponentType<SVGProps<SVGSVGElement>>;

/**
 * Every PixelForge mark the shell can resolve, in one registry.
 *
 * The eight Toolbox marks are the package's own approved exports and are
 * unchanged. The Shell marks come from Specimen Sheet 01 FINAL FROZEN v1.0
 * (see ./shellIcons.ts) and were added when the icon authority migration
 * replaced the temporary hand-drawn shell glyphs. There is no third source:
 * a name that misses here has no frozen asset behind it, and the correct
 * response is to manufacture one on the sheet, not to draw a substitute.
 *
 * These entries are the 32px masters. Surfaces smaller than 24px must go
 * through getShellIcon(name, 16) for the separately handcrafted small
 * drawing — the sheet forbids downscaling the 32.
 */
export const PIXEL_ICON_REGISTRY = {
  entity: IconEntity,
  service: IconService,
  flow: IconFlow,
  screen: IconScreen,
  api: IconApi,
  job: IconJob,
  script: IconScript,
  config: IconConfig,
  ...SHELL_ICONS_32,
} as const satisfies Readonly<Record<string, PixelIconComponent>>;

export type PixelIconName = keyof typeof PIXEL_ICON_REGISTRY;

export interface PixelIconProps
  extends Omit<HTMLAttributes<HTMLElement>, 'children'> {
  name: PixelIconName | (string & {});
  size?: number;
  title?: string;
}

export function getPixelIcon(name: string): PixelIconComponent | undefined {
  return PIXEL_ICON_REGISTRY[name as PixelIconName];
}

export function PixelIcon({
  name,
  size = 24,
  title,
  className,
  style,
  ...htmlProps
}: PixelIconProps) {
  const Icon = getPixelIcon(name);

  if (!Icon) {
    if (process.env.NODE_ENV !== 'production') {
      return createElement(
        'span',
        {
          ...htmlProps,
          className,
          style,
          role: 'img',
          'aria-label': `Missing PixelForge icon: ${name}`,
          'data-pixel-icon-missing': name,
        },
        `Missing PixelForge icon: ${name}`,
      );
    }

    return null;
  }

  const iconStyle: CSSProperties = {
    display: 'block',
    flex: '0 0 auto',
    ...style,
  };

  // SVGProps has no index signature, so a `data-*` attribute is a type
  // error even though React forwards it fine. Split out and widened at
  // the one call site rather than loosening the component's props.
  const dataAttrs = { 'data-pixel-icon': name } as SVGProps<SVGSVGElement>;

  return createElement(Icon, {
    className,
    width: size,
    height: size,
    style: iconStyle,
    role: title ? 'img' : undefined,
    'aria-label': title,
    'aria-hidden': title ? undefined : true,
    focusable: 'false',
    ...dataAttrs,
  });
}
