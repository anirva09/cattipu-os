/**
 * The frozen Shell icon registry — PixelForge Specimen Sheet 01,
 * FINAL FROZEN v1.0, plus the family's `launch` mark.
 *
 * These are the manufactured SVGs exactly as emitted by tools/icons.py and
 * signed off on the sheet. Nothing here is drawn by hand and nothing is
 * reinterpreted: the files under public/assets/pixelforge/shell/ are the
 * production masters, byte-for-byte, and this module only names them.
 *
 * Two sizes because the 16 is a separately handcrafted drawing, never a
 * downscale of the 32 — that is a rule of the sheet, so a surface that
 * wants a small mark must ask for the small mark rather than shrink the
 * large one. Fractional scaling of these files is what the rule exists to
 * prevent: they are integer pixel grids with a 2px outline and a 1px
 * highlight, and at 0.75x the highlight row disappears.
 *
 *   32px master     sidebar rail (40px slot, mark centred at native size)
 *   16px handcrafted top bar (24px slot, mark centred at native size)
 *
 * `launch` is the one mark here that is not on Sheet 01. It belongs to the
 * same frozen family and is manufactured by the same passes; the rail has a
 * Launch item and the sheet simply does not cover it. It is a frozen asset,
 * not a placeholder.
 */
import type { ComponentType, SVGProps } from 'react';

import Home32 from '../../public/assets/pixelforge/shell/32/home.svg';
import Projects32 from '../../public/assets/pixelforge/shell/32/projects.svg';
import Architect32 from '../../public/assets/pixelforge/shell/32/architect.svg';
import Canvas32 from '../../public/assets/pixelforge/shell/32/canvas.svg';
import Forge32 from '../../public/assets/pixelforge/shell/32/forge.svg';
import Memory32 from '../../public/assets/pixelforge/shell/32/memory.svg';
import Launch32 from '../../public/assets/pixelforge/shell/32/launch.svg';
import Explorer32 from '../../public/assets/pixelforge/shell/32/explorer.svg';
import Settings32 from '../../public/assets/pixelforge/shell/32/settings.svg';
import Search32 from '../../public/assets/pixelforge/shell/32/search.svg';
import Bell32 from '../../public/assets/pixelforge/shell/32/bell.svg';
import Clock32 from '../../public/assets/pixelforge/shell/32/clock.svg';
import Network32 from '../../public/assets/pixelforge/shell/32/network.svg';
import Volume32 from '../../public/assets/pixelforge/shell/32/volume.svg';
import Terminal32 from '../../public/assets/pixelforge/shell/32/terminal.svg';
import Calendar32 from '../../public/assets/pixelforge/shell/32/calendar.svg';
import NewProject32 from '../../public/assets/pixelforge/shell/32/newproject.svg';
import Recent32 from '../../public/assets/pixelforge/shell/32/recent.svg';
import Save32 from '../../public/assets/pixelforge/shell/32/save.svg';
import OpenFile32 from '../../public/assets/pixelforge/shell/32/openfile.svg';
import Favorite32 from '../../public/assets/pixelforge/shell/32/favorite.svg';
// Milestone 16 - the desktop needs a folder mark. Same frozen family,
// same manufacturing passes; it is simply not one of Sheet 01's twenty,
// like `launch`. Copied from the family, not drawn.
import Folder32 from '../../public/assets/pixelforge/shell/32/folder.svg';

import Home16 from '../../public/assets/pixelforge/shell/16/home.svg';
import Projects16 from '../../public/assets/pixelforge/shell/16/projects.svg';
import Architect16 from '../../public/assets/pixelforge/shell/16/architect.svg';
import Canvas16 from '../../public/assets/pixelforge/shell/16/canvas.svg';
import Forge16 from '../../public/assets/pixelforge/shell/16/forge.svg';
import Memory16 from '../../public/assets/pixelforge/shell/16/memory.svg';
import Launch16 from '../../public/assets/pixelforge/shell/16/launch.svg';
import Explorer16 from '../../public/assets/pixelforge/shell/16/explorer.svg';
import Settings16 from '../../public/assets/pixelforge/shell/16/settings.svg';
import Search16 from '../../public/assets/pixelforge/shell/16/search.svg';
import Bell16 from '../../public/assets/pixelforge/shell/16/bell.svg';
import Clock16 from '../../public/assets/pixelforge/shell/16/clock.svg';
import Network16 from '../../public/assets/pixelforge/shell/16/network.svg';
import Volume16 from '../../public/assets/pixelforge/shell/16/volume.svg';
import Terminal16 from '../../public/assets/pixelforge/shell/16/terminal.svg';
import Calendar16 from '../../public/assets/pixelforge/shell/16/calendar.svg';
import NewProject16 from '../../public/assets/pixelforge/shell/16/newproject.svg';
import Recent16 from '../../public/assets/pixelforge/shell/16/recent.svg';
import Save16 from '../../public/assets/pixelforge/shell/16/save.svg';
import OpenFile16 from '../../public/assets/pixelforge/shell/16/openfile.svg';
import Favorite16 from '../../public/assets/pixelforge/shell/16/favorite.svg';
import Folder16 from '../../public/assets/pixelforge/shell/16/folder.svg';

export type ShellIconComponent = ComponentType<SVGProps<SVGSVGElement>>;

/** Permanent identifiers from ICON_REGISTRY v1.0, kept beside the mark so a
 *  bug report can quote CAT-SHELL-004 without the sheet in front of it. */
export const SHELL_ICON_IDS = {
  home: 'CAT-SHELL-001',
  projects: 'CAT-SHELL-002',
  architect: 'CAT-SHELL-003',
  canvas: 'CAT-SHELL-004',
  forge: 'CAT-SHELL-005',
  memory: 'CAT-SHELL-006',
  explorer: 'CAT-SHELL-007',
  settings: 'CAT-SHELL-008',
  search: 'CAT-SHELL-009',
  bell: 'CAT-SHELL-010',
  terminal: 'CAT-SYS-001',
  clock: 'CAT-SYS-002',
  calendar: 'CAT-SYS-003',
  volume: 'CAT-SYS-004',
  network: 'CAT-SYS-005',
  newproject: 'CAT-UTIL-001',
  recent: 'CAT-UTIL-002',
  save: 'CAT-UTIL-003',
  openfile: 'CAT-UTIL-004',
  favorite: 'CAT-UTIL-005',
  launch: 'CAT-FAMILY-launch',
  folder: 'CAT-FAMILY-folder',
} as const;

export const SHELL_ICONS_32 = {
  home: Home32,
  projects: Projects32,
  architect: Architect32,
  canvas: Canvas32,
  forge: Forge32,
  memory: Memory32,
  launch: Launch32,
  explorer: Explorer32,
  settings: Settings32,
  search: Search32,
  bell: Bell32,
  clock: Clock32,
  network: Network32,
  volume: Volume32,
  terminal: Terminal32,
  calendar: Calendar32,
  newproject: NewProject32,
  recent: Recent32,
  save: Save32,
  openfile: OpenFile32,
  favorite: Favorite32,
  folder: Folder32,
} as const satisfies Readonly<Record<string, ShellIconComponent>>;

export const SHELL_ICONS_16 = {
  home: Home16,
  projects: Projects16,
  architect: Architect16,
  canvas: Canvas16,
  forge: Forge16,
  memory: Memory16,
  launch: Launch16,
  explorer: Explorer16,
  settings: Settings16,
  search: Search16,
  bell: Bell16,
  clock: Clock16,
  network: Network16,
  volume: Volume16,
  terminal: Terminal16,
  calendar: Calendar16,
  newproject: NewProject16,
  recent: Recent16,
  save: Save16,
  openfile: OpenFile16,
  favorite: Favorite16,
  folder: Folder16,
} as const satisfies Readonly<Record<string, ShellIconComponent>>;

export type ShellIconName = keyof typeof SHELL_ICONS_32;

export const SHELL_ICON_NAMES = Object.keys(
  SHELL_ICONS_32,
) as readonly ShellIconName[];

export function isShellIconName(name: string): name is ShellIconName {
  return name in SHELL_ICONS_32;
}

/** The mark at the size it was drawn for. 32 for anything 24px or larger,
 *  16 below that — never the other way round, and never scaled between. */
export function getShellIcon(
  name: string,
  size: 16 | 32,
): ShellIconComponent | undefined {
  const registry = size === 16 ? SHELL_ICONS_16 : SHELL_ICONS_32;
  return registry[name as ShellIconName];
}
