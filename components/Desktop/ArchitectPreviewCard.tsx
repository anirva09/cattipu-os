"use client";

/**
 * Milestone 1 (Home Screen Refinement) — "Architect Preview: keep the
 * existing graph, replace any modern styling with drafting-paper
 * treatment, remove glow." There was no Architect Preview on the Home
 * Screen before this milestone (see docs/HOME_SPEC.md), so "the existing
 * graph" is interpreted as: a static, non-interactive preview using the
 * same node-color language as the real Architect app (see
 * components/Architect/ArchitectureCanvas.tsx's node palette), not a copy
 * of the real canvas — the real Architect component/functionality is
 * intentionally untouched. Clicking opens the actual Architect app.
 */

import { useWindowStore } from "@/store/useWindowStore";

const NODES = [
  { x: 18, y: 14, w: 46, h: 22, color: "var(--color-blue)", label: "API" },
  { x: 84, y: 14, w: 46, h: 22, color: "var(--color-purple)", label: "AUTH" },
  { x: 51, y: 54, w: 46, h: 22, color: "var(--color-navy)", label: "CORE" },
  { x: 51, y: 92, w: 46, h: 22, color: "var(--color-green)", label: "DATA" },
];

const EDGES: [number, number][] = [
  [0, 2],
  [1, 2],
  [2, 3],
];

export function ArchitectPreviewCard() {
  const openApp = useWindowStore((s) => s.openApp);

  return (
    <button
      onClick={() => openApp("architect", "Architect")}
      className="cattipu-raised cattipu-cursor-hand flex w-full flex-col overflow-hidden rounded-md text-left"
    >
      {/* Typography pass — px-3 (12px, off the 8px grid) → px-4 (16px),
          matching the window title bar's own header padding (Milestone
          3) and Recent Projects' header just above this card, which was
          already at 16px — the three navy-strip headers in this column
          used to sit at a different padding than their closest sibling. */}
      <div className="cattipu-raised-navy flex h-7 shrink-0 items-center bg-navy px-4">
        <span className="cattipu-emboss-text-inverted font-pixel-ui text-[0.42rem] tracking-wide text-white">
          ARCHITECT PREVIEW
        </span>
      </div>
      <div className="cattipu-drafting-paper relative h-[132px] w-full">
        <svg viewBox="0 0 150 128" className="h-full w-full" aria-hidden>
          {EDGES.map(([a, b], i) => {
            const na = NODES[a];
            const nb = NODES[b];
            return (
              <line
                key={i}
                x1={na.x + na.w / 2}
                y1={na.y + na.h}
                x2={nb.x + nb.w / 2}
                y2={nb.y}
                stroke="var(--color-navy)"
                strokeWidth={1.5}
                strokeOpacity={0.5}
              />
            );
          })}
          {NODES.map((n, i) => (
            <g key={i}>
              <rect
                x={n.x}
                y={n.y}
                width={n.w}
                height={n.h}
                rx={2}
                fill="var(--color-surface-solid)"
                stroke={n.color}
                strokeWidth={2}
              />
              <text
                x={n.x + n.w / 2}
                y={n.y + n.h / 2 + 3}
                textAnchor="middle"
                fontSize="7"
                fontFamily="var(--font-code)"
                fill="var(--color-ink)"
              >
                {n.label}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </button>
  );
}
