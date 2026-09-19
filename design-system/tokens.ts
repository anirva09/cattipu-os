export const cattipuTokens = {
  colors: {
    navy: '#002A73',
    cream: '#E9DFC4',
    darkCream: '#D8C8A2',
    projects: '#A40000',
    status: '#0E7A3C',
    architect: '#5B1B63',
    welcome: '#C6971F',
    outerFrame: '#4A4538',
    bevelTop: '#FFFFFF',
    bevelLeft: '#F7F0D8',
    bevelBottom: '#8C826B',
    bevelRight: '#6F6652',
  },
  geometry: {
    border: 2,
    bevelGap: 2,
    radius: 0,
    maxRadius: 2,
    windowReferenceWidth: 920,
    windowReferenceHeight: 612,
    titleBarHeight: 38,
    titleControlSize: 28,
  },
  spacing: {
    4: 4,
    8: 8,
    12: 12,
    16: 16,
    24: 24,
  },
  type: {
    /** Display face: desktop title, window titles, widget headers. */
    family: "'Px437 IBM VGA8', 'VT323', 'Perfect DOS VGA', monospace",
    /**
     * Standard GUI face: body, menus, sidebar labels, buttons, inputs. A
     * proportional bitmap sans (Ark Pixel 12px, OFL 1.1) drawn 1:1 at the 13px
     * role through its @font-face size-adjust. Titles stay on the display face;
     * that title/body split is part of the CATTIPU identity.
     */
    uiFamily: "'Ark Pixel 12px Proportional', 'Px437 IBM VGA8', monospace",
    /** Compact/status face: the same family's 10px design at the 11px role. */
    compactFamily: "'Ark Pixel 10px Proportional', 'Ark Pixel 12px Proportional', monospace",
    desktopTitle: 26,
    windowTitle: 18,
    widgetHeader: 15,
    body: 13,
    status: 11,
    /**
     * Role line heights (px). Whole pixels only: the shell's face is a
     * bitmap design, and a fractional line box puts every baseline on a
     * half pixel. Menus, sidebar labels, buttons and body copy all use the
     * body role (13/16).
     */
    lineHeight: {
      desktopTitle: 28,
      windowTitle: 20,
      widgetHeader: 16,
      body: 16,
      status: 12,
    },
    /**
     * Every shipped face (IBM VGA 8x16, VT323, Press Start 2P) has a 400
     * face only. Hierarchy comes from size, case, colour and the title
     * plates, never from a requested weight the browser cannot draw.
     */
    weight: 400,
  },
} as const;

export const cattipuWindowTones = {
  system: cattipuTokens.colors.navy,
  projects: cattipuTokens.colors.projects,
  status: cattipuTokens.colors.status,
  architect: cattipuTokens.colors.architect,
  welcome: cattipuTokens.colors.welcome,
} as const;

export type CattipuWindowTone = keyof typeof cattipuWindowTones;

export const cattipuCssVariables = {
  '--cattipu-navy': cattipuTokens.colors.navy,
  '--cattipu-cream': cattipuTokens.colors.cream,
  '--cattipu-dark-cream': cattipuTokens.colors.darkCream,
  '--cattipu-outer-frame': cattipuTokens.colors.outerFrame,
  '--cattipu-bevel-top': cattipuTokens.colors.bevelTop,
  '--cattipu-bevel-left': cattipuTokens.colors.bevelLeft,
  '--cattipu-bevel-bottom': cattipuTokens.colors.bevelBottom,
  '--cattipu-bevel-right': cattipuTokens.colors.bevelRight,
  '--cattipu-border-size': `${cattipuTokens.geometry.border}px`,
  '--cattipu-bevel-gap': `${cattipuTokens.geometry.bevelGap}px`,
  '--cattipu-radius': `${cattipuTokens.geometry.radius}px`,
  '--cattipu-font-family': cattipuTokens.type.family,
  '--cattipu-font-ui': cattipuTokens.type.uiFamily,
  '--cattipu-font-compact': cattipuTokens.type.compactFamily,
  '--cattipu-type-weight': String(cattipuTokens.type.weight),
  '--cattipu-type-desktop-title-size': `${cattipuTokens.type.desktopTitle}px`,
  '--cattipu-type-desktop-title-line': `${cattipuTokens.type.lineHeight.desktopTitle}px`,
  '--cattipu-type-window-title-size': `${cattipuTokens.type.windowTitle}px`,
  '--cattipu-type-window-title-line': `${cattipuTokens.type.lineHeight.windowTitle}px`,
  '--cattipu-type-widget-header-size': `${cattipuTokens.type.widgetHeader}px`,
  '--cattipu-type-widget-header-line': `${cattipuTokens.type.lineHeight.widgetHeader}px`,
  '--cattipu-type-body-size': `${cattipuTokens.type.body}px`,
  '--cattipu-type-body-line': `${cattipuTokens.type.lineHeight.body}px`,
  '--cattipu-type-status-size': `${cattipuTokens.type.status}px`,
  '--cattipu-type-status-line': `${cattipuTokens.type.lineHeight.status}px`,
} as const;
