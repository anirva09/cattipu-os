'use client';

import type {
  CSSProperties,
  FocusEvent,
  PointerEvent,
  ReactNode,
} from 'react';
import {
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  cattipuCssVariables,
  cattipuTokens,
} from '../../design-system/tokens';

import type {
  CattipuWindowId,
  ManagedWindowState,
  WindowPosition,
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
  children: ReactNode;
}

type ManagedWindowStyle = CSSProperties &
  Record<`--cattipu-${string}`, string>;

interface DragSession {
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startPosition: WindowPosition;
}

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
  width = cattipuTokens.geometry.windowReferenceWidth,
  height = cattipuTokens.geometry.windowReferenceHeight,
  onFocus,
  onMove,
  children,
}: ManagedWindowProps) {
  const [dragPosition, setDragPosition] = useState<WindowPosition | null>(null);
  const dragRef = useRef<DragSession | null>(null);
  const pendingPositionRef = useRef<WindowPosition>(windowState.position);
  const animationFrameRef = useRef<number | null>(null);

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
  const maximized = windowState.open && windowState.mode === 'maximized';
  const normalPosition = clampWindowPosition(
    dragPosition ?? windowState.position,
    bounds,
    width,
    height,
  );
  const effectivePosition = maximized
    ? { x: 0, y: 0 }
    : normalPosition;

  const managedWidth = maximized ? bounds.width : width;
  const managedHeight = maximized ? bounds.height : height;

  const managedStyle: ManagedWindowStyle = {
    ...cattipuCssVariables,
    '--cattipu-managed-window-x': `${effectivePosition.x}px`,
    '--cattipu-managed-window-y': `${effectivePosition.y}px`,
    '--cattipu-managed-window-width': `${managedWidth}px`,
    '--cattipu-managed-window-height': `${managedHeight}px`,
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

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    onFocus();

    if (maximized || event.button !== 0) {
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

    const startPosition = clampWindowPosition(
      windowState.position,
      bounds,
      width,
      height,
    );

    pendingPositionRef.current = startPosition;
    setDragPosition(startPosition);
    dragRef.current = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startPosition,
    };
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    const nextPosition = clampWindowPosition(
      {
        x: drag.startPosition.x + event.clientX - drag.startClientX,
        y: drag.startPosition.y + event.clientY - drag.startClientY,
      },
      bounds,
      width,
      height,
    );

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
    dragRef.current = null;
    setDragPosition(null);
    onMove(finalPosition);
  };

  const handleFocusCapture = (_event: FocusEvent<HTMLDivElement>) => {
    onFocus();
  };

  return (
    <div
      className="cattipu-managed-window"
      data-window-id={id}
      data-active={active ? 'true' : 'false'}
      data-mode={windowState.mode}
      data-dragging={dragPosition ? 'true' : 'false'}
      data-visible={visible ? 'true' : 'false'}
      aria-hidden={visible ? undefined : true}
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
