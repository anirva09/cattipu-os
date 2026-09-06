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
    family: "'Px437 IBM VGA8', 'VT323', 'Perfect DOS VGA', monospace",
    desktopTitle: 26,
    windowTitle: 18,
    widgetHeader: 15,
    body: 13,
    status: 11,
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
} as const;
