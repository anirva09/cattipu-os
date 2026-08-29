"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { useArchitectStore } from "@/store/useArchitectStore";
import { CattipuSpinner } from "../System/CattipuSpinner";
import { Textarea } from "@/components/UI/Textarea";

const EXAMPLE_PROMPT =
  "Build a banking platform with authentication, payments, and fraud detection.";

export function PromptBar() {
  const prompt = useArchitectStore((s) => s.prompt);
  const status = useArchitectStore((s) => s.status);
  const setPrompt = useArchitectStore((s) => s.setPrompt);
  const generate = useArchitectStore((s) => s.generate);
  const [draft, setDraft] = useState("");

  const busy = status === "generating" || status === "playing";

  const submit = () => {
    const value = draft.trim();
    if (!value || busy) return;
    setPrompt(value);
    void generate(value);
  };

  const useExample = () => {
    if (busy) return;
    setDraft(EXAMPLE_PROMPT);
  };

  return (
    <div className="shrink-0 border-b-2 border-border-strong bg-bg-dim px-6 py-4">
      {/* Milestone 9 (Architect Input State Polish) — "Prompt label
          hierarchy." Was a single flat heading line; added a small
          uppercase eyebrow above it (the same small-label voice used
          for section headers elsewhere: font-pixel-ui, tracking-wide,
          ink-faint) so the module name and the actual instruction read
          as two distinct levels instead of one undifferentiated line. */}
      <p className="cattipu-emboss-text font-pixel-ui text-[0.38rem] tracking-[0.15em] text-ink-faint">
        ARCHITECT · PROMPT
      </p>
      <div className="cattipu-emboss-text mt-1 flex items-center gap-2 font-pixel-ui text-[0.55rem] tracking-wide text-navy">
        <Sparkles className="h-3.5 w-3.5 text-navy" strokeWidth={2.5} />
        What are we building?
      </div>

      {/* Milestone 9 — "Alignment between prompt field and Generate
          control." Measured live: the textarea (rows=2, its own
          padding/border) renders at 64px while the button's old fixed
          `sm:h-[3.5rem]` (56px) + `sm:items-start` left its bottom edge
          8px short of the field's — a real, visible misalignment, not
          a hypothetical one. Fixed by stretching the row
          (`sm:items-stretch`) and letting the button's height follow
          the field's actual rendered height instead of a second,
          independently-guessed magic number. */}
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-stretch">
        {/* Milestone 3 (Window Chrome Retrofit) — "Most Important" item.
            Was a plain rounded-[5px] textarea over .cattipu-recessed
            ("looks like a modern textarea"); now the shared workstation
            field primitive: square corners, same inset bevel, plus an
            embossed outer highlight line, pixel-style (font-code)
            placeholder. Functionality/value wiring unchanged.
            Milestone 9 adds cattipu-architect-field for a focus
            treatment scoped to this field only — see globals.css. */}
        <Textarea
          value={busy ? prompt : draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
          disabled={busy}
          rows={2}
          placeholder="Describe the software you want CATTIPU to architect…"
          className="cattipu-architect-field min-h-[3.5rem] flex-1 bg-surface-solid"
        />
        {/* Generate — was `.cattipu-btn` with `rounded-[5px]`, reading as
            a modern CTA. Now `.cattipu-switch`: square corners, a deeper
            press travel so the pressed state unmistakably inverts the
            bevel, reading as a physical workstation switch. Milestone 9:
            hover/disabled/focus states moved into globals.css (dropped
            the `hover:brightness-105` filter and the blanket
            `disabled:opacity-50`, which faded the button identically
            whether it was empty-and-inert or actively generating);
            `data-busy` lets CSS tell those two disabled cases apart. */}
        <button
          onClick={submit}
          disabled={busy || !draft.trim()}
          data-busy={busy || undefined}
          className="cattipu-cursor-hand cattipu-switch flex shrink-0 items-center justify-center gap-2 bg-navy px-4 py-2.5 font-pixel-ui text-[0.55rem] text-white disabled:cursor-not-allowed"
        >
          {busy ? (
            <>
              <CattipuSpinner size={4} />
              {status === "generating" ? "Thinking…" : "Building…"}
            </>
          ) : (
            "Generate"
          )}
        </button>
      </div>

      {busy ? (
        <div className="mt-2.5 flex items-center gap-2">
          <span className="cattipu-segments" aria-hidden>
            {Array.from({ length: 8 }).map((_, i) => (
              <span key={i} data-sweep="true" style={{ animationDelay: `${i * 90}ms` }} />
            ))}
          </span>
          <span className="cattipu-emboss-text font-pixel-ui text-[0.45rem] tracking-wide text-ink-faint">
            Build Playback
          </span>
        </div>
      ) : (
        /* Milestone 9 — "Example prompt styling." Was a single line of
           body-font text with a dotted underline over the whole
           string, reading as a plain web hyperlink. Split into a small
           pixel-ui "TRY:" label (matching the eyebrow/section-header
           voice above) and the example text itself in font-code — the
           same monospace the field's own placeholder uses — so the
           suggestion visibly reads as "text that would go in the
           field," not as an unrelated caption. Kept the dotted
           underline (a hard, non-glowing affordance, not a modern
           effect) on the quoted text only, and added a hard
           keyboard-focus ring (.cattipu-focus-ring) where there was
           none before. */
        <button
          onClick={useExample}
          disabled={busy}
          className="cattipu-cursor-hand cattipu-focus-ring mt-2 flex items-center gap-1.5 text-left disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className="font-pixel-ui text-[0.38rem] tracking-wide text-ink-faint">TRY:</span>
          <span className="font-code text-[13px] text-ink-dim underline decoration-dotted underline-offset-2 hover:text-navy">
            “{EXAMPLE_PROMPT}”
          </span>
        </button>
      )}
    </div>
  );
}
