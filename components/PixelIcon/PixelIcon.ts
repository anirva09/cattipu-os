import {
  createElement,
  type ComponentType,
  type CSSProperties,
  type HTMLAttributes,
  type SVGProps,
} from 'react';

import IconEntity from '../../public/assets/pixelforge/toolbox/entity-32.svg';
import IconService from '../../public/assets/pixelforge/toolbox/service-32.svg';
import IconFlow from '../../public/assets/pixelforge/toolbox/flow-32.svg';
import IconScreen from '../../public/assets/pixelforge/toolbox/screen-32.svg';
import IconApi from '../../public/assets/pixelforge/toolbox/api-32.svg';
import IconJob from '../../public/assets/pixelforge/toolbox/job-32.svg';
import IconScript from '../../public/assets/pixelforge/toolbox/script-32.svg';
import IconConfig from '../../public/assets/pixelforge/toolbox/config-32.svg';

export type PixelIconComponent = ComponentType<SVGProps<SVGSVGElement>>;

export const PIXEL_ICON_REGISTRY = {
  entity: IconEntity,
  service: IconService,
  flow: IconFlow,
  screen: IconScreen,
  api: IconApi,
  job: IconJob,
  script: IconScript,
  config: IconConfig,
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
