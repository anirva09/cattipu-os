# CATTIPU Window Manager v1.0

Behavior-only sprint. Existing visual components remain the source of truth.

## Included
- `components/WindowManager/ManagedWindow.tsx`
- `components/WindowManager/WindowManager.css`
- `components/WindowManager/windowManager.reducer.ts`
- `components/WindowManager/useWindowManager.ts`
- `components/WindowManager/index.ts`
- `components/InteractiveDesktop/InteractiveDesktop.tsx`
- `components/InteractiveDesktop/InteractiveDesktop.css` (copied unchanged from the locked desktop for integration completeness)
- `components/InteractiveDesktop/index.ts`

## Window behavior

### Drag
`ManagedWindow` listens on the managed wrapper but begins a drag only when the
pointer originates inside `.cattipu-window__titlebar`. Existing window-control
buttons are explicitly excluded. Pointer capture keeps dragging stable when the
cursor leaves the title bar.

During active dragging there is no easing or spring. Position updates are
coalesced with `requestAnimationFrame` and written as `translate3d(x, y, 0)`.

### Focus and stacking
Every pointer down or keyboard focus inside a managed window dispatches `focus`.
The reducer assigns the next monotonic z-index and records the active window.
Multiple windows stay open simultaneously.

### Window controls
Pass the existing Window callbacks directly to the manager:
- `onMinimize`
- `onMaximize`
- `onClose`

Minimize/restore and open/close use the same 140ms linear mechanical visibility
transition. No scale transform is used. Maximize uses the measured workspace
bounds, never the whole browser viewport.

### Sidebar launch system
The existing Sidebar `onNavigate` is filtered to:
- `projects`
- `architect`
- `explorer`
- `memory`
- `settings`

Launching a closed window opens and focuses it. Launching a minimized window
restores and focuses it. Launching an already visible window brings it to front.

### Session state
Storage key:

`cattipu-os:window-manager:v1`

`sessionStorage` persists:
- `open`
- `mode` (normal / minimized / maximized)
- `position`
- `zIndex`
- active window
- next z-index counter

State is validated before hydration. If sessionStorage is unavailable, the same
manager continues in memory.

## Next.js integration

```tsx
'use client';

import { InteractiveDesktop } from '@/components/InteractiveDesktop';

export default function DesktopPage() {
  return (
    <InteractiveDesktop
      brandMark={<CattipuLogo />}
      sidebarIcons={sidebarIcons}
      workspaceTitle="Banking Platform"
      dateTimeText="Sat, 29 Aug 12:39 pm"
    />
  );
}
```

The behavior layer expects the existing locked components at their current
paths: `Window`, `ProjectsWindow`, `Sidebar`, `TopBar`, `RightWidgetStack`, and
`BottomStatusBar`. No locked visual component needs to be edited.
