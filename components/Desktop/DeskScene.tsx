/**
 * A small pixel workstation vignette for the Welcome card — drafting mat,
 * keyboard, mug, pencil, plant. v1.0 desktop refinement: reinforces the
 * "builder" identity in the corner of the card instead of sitting there
 * as pure decoration. Hard edges only, no gradients — same rule as the
 * rest of the shell.
 */
export function DeskScene({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 96 76"
      className={className}
      role="img"
      aria-label="A drafting mat with a keyboard, mug, pencil, and small plant"
    >
      {/* drafting mat */}
      <rect x="4" y="30" width="88" height="42" rx="2" fill="var(--color-navy)" />
      <rect x="4" y="30" width="88" height="42" rx="2" fill="none" stroke="#08265c" strokeWidth="2" />
      {[16, 28, 40, 52, 64, 76].map((x) => (
        <line key={x} x1={x} y1="32" x2={x} y2="70" stroke="#ffffff" strokeOpacity="0.14" strokeWidth="1" />
      ))}
      {[40, 50, 60].map((y) => (
        <line key={y} x1="6" y1={y} x2="90" y2={y} stroke="#ffffff" strokeOpacity="0.14" strokeWidth="1" />
      ))}

      {/* keyboard */}
      <rect x="14" y="48" width="40" height="16" rx="1.5" fill="var(--color-surface-solid)" stroke="#0b1428" strokeOpacity="0.35" strokeWidth="1.5" />
      {[0, 1].map((row) =>
        [0, 1, 2, 3, 4, 5, 6].map((col) => (
          <rect
            key={`${row}-${col}`}
            x={17 + col * 5}
            y={51 + row * 5}
            width="3.2"
            height="3.2"
            rx="0.5"
            fill="var(--color-ink-faint)"
          />
        ))
      )}

      {/* mug */}
      <rect x="60" y="42" width="14" height="14" rx="1.5" fill="var(--color-red)" />
      <path d="M74 45 h4 a3 3 0 0 1 0 8 h-4" fill="none" stroke="var(--color-red)" strokeWidth="2.5" />
      <rect x="62" y="44" width="10" height="2" fill="#ffffff" fillOpacity="0.35" />

      {/* pencil */}
      <g transform="rotate(-32 82 40)">
        <rect x="78" y="16" width="4.5" height="28" fill="var(--color-gold)" />
        <path d="M78 16 L82.5 16 L80.25 8 Z" fill="var(--color-ink)" />
        <rect x="78" y="42" width="4.5" height="4" fill="#e8b7a0" />
      </g>

      {/* plant */}
      <rect x="8" y="46" width="12" height="10" rx="1" fill="var(--color-gold)" />
      <path d="M14 46 C10 40 9 34 14 28 C19 34 18 40 14 46 Z" fill="var(--color-green)" />
      <path d="M14 46 C11 38 12 32 8 26 C15 30 16 38 14 46 Z" fill="var(--color-green)" fillOpacity="0.75" />
    </svg>
  );
}
