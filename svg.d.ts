/**
 * Type side of the SVGR loader configured in next.config.ts — without it
 * TypeScript resolves `import Icon from './x.svg'` to `any` under
 * `allowJs`, and the PixelIcon registry's `satisfies Record<string,
 * ComponentType<SVGProps>>` silently passes on nothing.
 */
declare module "*.svg" {
  import type { FC, SVGProps } from "react";
  const ReactComponent: FC<SVGProps<SVGSVGElement>>;
  export default ReactComponent;
}
