'use client';

import type {
  CSSProperties,
  PointerEvent,
  ReactNode,
} from 'react';
import {
  useEffect,
  useRef,
  useState,
} from 'react';

import { cattipuCssVariables } from '../../design-system/tokens';
import {
  keepOnScreen,
  snapRegionForPointer,
  unsnapPosition,
  type SnapRegion,
} from '../../lib/os/workspace';

import {
  CATTIPU_DEFAULT_WINDOW_SIZE,
  windowRect,
  type CattipuWindowId,
  type ManagedWindowState,
  type WindowPosition,
} from './windowManager.reducer';

import './WindowManager.css';

export const CATTIPU_WINDOW_INTERACTION_MS = 140;

export interface WindowBounds {
  width: number;
  height: number;
}

export interface ManagedWindowProps {
  id: CattipuWindowId;
  windowState: ManagedWindowState;
  active: boolean;
  bounds: WindowBounds;
  width?: number;
  height?: number;
  onFocus: () => void;
  onMove: (position: WindowPosition) => void;
  /** Milestone 18. Reported continuously while a drag is near an edge so
   *  the desktop can paint the preview, and null the moment it is not. */
  onSnapPreview?: (region: SnapRegion | null) => void;
  /** Release inside a snap region. */
  onSnap?: (region: SnapRegion) => void;
  /** Dragging a snapped window pulls it back out to its stored size. */
  onUnsnap?: (position: WindowPosition) => void;
  children: ReactNode;
}

type ManagedWindowStyle = CSSProperties &
  Record<`--cattipu-${string}`, string>;

interface DragSession {
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startPosition: WindowPosition;
  /** Set when the drag began on a snapped window: the first movement
   *  past the threshold pulls it out of the snap. */
  releasedFromSnap: boolean;
  region: SnapRegion | null;
}

/** How far a snapped window must be dragged before it un-snaps. Without
 *  a threshold, clicking the title bar of a snapped window to focus it
 *  would jitter it loose. */
const UNSNAP_THRESHOLD = 8;

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

export function clampWindowPosition(
  position: WindowPosition,
  bounds: WindowBounds,
  width: number,
  height: number,
): WindowPosition {
  const maxX = Math.max(0, bounds.width - width);
  const maxY = Math.max(0, bounds.height - height);

  return {
    x: clamp(position.x, 0, maxX),
    y: clamp(position.y, 0, maxY),
  };
}

export function ManagedWindow({
  id,
  windowState,
  active,
  bounds,
  width,
  height,
  onFocus,
  onMove,
  onSnapPreview,
  onSnap,
  onUnsnap,
  children,
}: ManagedWindowProps) {
  const [dragPosition, setDragPosition] = useState<WindowPosition | null>(null);
  const dragRef = useRef<DragSession | null>(null);
  const pendingPositionRef = useRef<WindowPosition>(windowState.position);
  const animationFrameRef = useRef<number | null>(null);
  const elementRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    pendingPositionRef.current = windowState.position;
  }, [windowState.position]);

  useEffect(() => {
    return () => {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const visible = windowState.open && windowState.mode !== 'minimized';

  /**
   * Milestone 18 — keyboard focus follows the active window.
   *
   * Only when focus is not already inside this window. A person typing
   * in Explorer's search box has focus in the active window already, and
   * pulling it out to the container on every re-render would eat their
   * keystrokes. The container carries tabIndex={-1} so it can hold focus
   * without entering the tab order.
   */
  useEffect(() => {
    const node = elementRef.current;
    if (!node || !active || !visible) return;
    if (node.contains(document.activeElement)) return;
    node.focus({ preventScroll: true });
  }, [active, visible]);

  // The window's own size: what the manager stored, else the size the
  // caller asked for, else the reference. One resolution path, so tile
  // and snap cannot disagree with the renderer about how big a window is.
  const ownSize = windowState.size ?? {
    width: width ?? CATTIPU_DEFAULT_WINDOW_SIZE.width,
    height: height ?? CATTIPU_DEFAULT_WINDOW_SIZE.height,
  };

  const rect = windowRect(
    dragPosition ? { ...windowState, position: dragPosition } : windowState,
    bounds,
  );

  // While dragging a snapped window loose, it is already un-snapped as
  // far as the eye is concerned: it wears its restored size and follows
  // the pointer.
  const dragging = dragRef.current;
  const previewRect =
    dragging?.releasedFromSnap && dragPosition
      ? { ...dragPosition, ...ownSize }
      : rect;

  const managedStyle: ManagedWindowStyle = {
    ...cattipuCssVariables,
    '--cattipu-managed-window-x': `${previewRect.x}px`,
    '--cattipu-managed-window-y': `${previewRect.y}px`,
    '--cattipu-managed-window-width': `${previewRect.width}px`,
    '--cattipu-managed-window-height': `${previewRect.height}px`,
    '--cattipu-managed-window-z': `${windowState.zIndex}`,
    '--cattipu-window-interaction-ms': `${CATTIPU_WINDOW_INTERACTION_MS}ms`,
  };

  const scheduleDragPosition = (next: WindowPosition) => {
    pendingPositionRef.current = next;

    if (animationFrameRef.current !== null) {
      return;
    }

    animationFrameRef.current = window.requestAnimationFrame(() => {
      animationFrameRef.current = null;
      setDragPosition(pendingPositionRef.current);
    });
  };

  /** Pointer position in WORKSPACE coordinates — what the snap regions
   *  are expressed in. */
  const pointerInWorkspace = (event: PointerEvent<HTMLDivElement>) => {
    const parent = elementRef.current?.parentElement;
    if (!parent) return { x: event.clientX, y: event.clientY };
    const box = parent.getBoundingClientRect();
    return { x: event.clientX - box.left, y: event.clientY - box.top };
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    // Any visible part of the window raises it, not just the title bar.
    onFocus();

    if (windowState.mode === 'maximized' || event.button !== 0) {
      return;
    }

    const target = event.target as HTMLElement;
    const titleBar = target.closest('.cattipu-window__titlebar');
    const control = target.closest('.cattipu-window__control');

    if (!titleBar || control) {
      return;
    }

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);

    const startPosition = windowState.snap
      ? { x: rect.x, y: rect.y }
      : clampWindowPosition(
          windowState.position,
          bounds,
          rect.width,
          rect.height,
        );

    pendingPositionRef.current = startPosition;
    setDragPosition(startPosition);
    dragRef.current = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startPosition,
      releasedFromSnap: false,
      region: null,
    };
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    const dx = event.clientX - drag.startClientX;
    const dy = event.clientY - drag.startClientY;
    const pointer = pointerInWorkspace(event);

    // A snapped window comes loose once the drag is unmistakably a drag.
    if (
      windowState.snap &&
      !drag.releasedFromSnap &&
      (Math.abs(dx) > UNSNAP_THRESHOLD || Math.abs(dy) > UNSNAP_THRESHOLD)
    ) {
      drag.releasedFromSnap = true;
      const loose = unsnapPosition(
        pointer.x,
        pointer.y,
        rect,
        ownSize,
        bounds,
      );
      drag.startPosition = loose;
      drag.startClientX = event.clientX;
      drag.startClientY = event.clientY;
      pendingPositionRef.current = loose;
      setDragPosition(loose);
      return;
    }

    const size = drag.releasedFromSnap || !windowState.snap ? ownSize : rect;
    const nextPosition = keepOnScreen(
      {
        x: drag.startPosition.x + event.clientX - drag.startClientX,
        y: drag.startPosition.y + event.clientY - drag.startClientY,
        width: size.width,
        height: size.height,
      },
      bounds,
    );

    const region = snapRegionForPointer(pointer.x, pointer.y, bounds);
    if (region !== drag.region) {
      drag.region = region;
      onSnapPreview?.(region);
    }

    scheduleDragPosition(nextPosition);
  };

  const finishDrag = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    const finalPosition = pendingPositionRef.current;
    const region = drag.region;
    const releasedFromSnap = drag.releasedFromSnap;
    dragRef.current = null;
    setDragPosition(null);
    onSnapPreview?.(null);

    // Order matters: releasing inside a region is a snap, whatever the
    // window was doing before. Otherwise a window pulled off a snap has
    // to be told it is loose before its new position means anything.
    if (region) {
      onSnap?.(region);
      return;
    }
    if (releasedFromSnap) {
      onUnsnap?.(finalPosition);
      return;
    }
    onMove(finalPosition);
  };

  // Focus anywhere inside the window raises it, whatever was focused —
  // which is why this is a capture handler and why it ignores the event.
  // It took the event only to satisfy the handler signature; React accepts
  // a zero-argument function, so the parameter was doing nothing but
  // tripping no-unused-vars.
  const handleFocusCapture = () => {
    onFocus();
  };

  return (
    <div
      ref={elementRef}
      className="cattipu-managed-window"
      data-window-id={id}
      data-active={active ? 'true' : 'false'}
      data-mode={windowState.mode}
      data-snap={windowState.snap ?? undefined}
      data-dragging={dragPosition ? 'true' : 'false'}
      data-visible={visible ? 'true' : 'false'}
      aria-hidden={visible ? undefined : true}
      tabIndex={-1}
      style={managedStyle}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishDrag}
      onPointerCancel={finishDrag}
      onFocusCapture={handleFocusCapture}
    >
      {children}
    </div>
  );
}
