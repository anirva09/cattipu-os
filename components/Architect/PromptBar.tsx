"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { useArchitectStore } from "@/store/useArchitectStore";
import { CattipuSpinner } from "../System/CattipuSpinner";

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
      <div className="cattipu-emboss-text flex items-center gap-2 font-pixel-ui text-[0.55rem] tracking-wide text-navy">
        <Sparkles className="h-3.5 w-3.5 text-navy" strokeWidth={2.5} />
        What are we building?
      </div>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-start">
        <textarea
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
          className="cattipu-recessed min-h-[3.5rem] flex-1 resize-none rounded-[5px] bg-surface-solid px-3 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-ink-faint focus:outline focus:outline-2 focus:outline-navy disabled:cursor-not-allowed disabled:opacity-70"
        />
        <button
          onClick={submit}
          disabled={busy || !draft.trim()}
          className="cattipu-cursor-hand cattipu-press flex shrink-0 items-center justify-center gap-2 rounded-[5px] border-2 border-black/25 bg-navy px-4 py-2.5 font-pixel-ui text-[0.55rem] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.3),inset_0_-2px_0_rgba(0,0,0,0.2),0_2px_0_rgba(11,20,40,0.18)] hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50 sm:h-[3.5rem]"
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

      <button
        onClick={useExample}
        disabled={busy}
        className="cattipu-cursor-hand mt-2 text-left text-[12px] text-ink-dim underline decoration-dotted underline-offset-2 hover:text-navy disabled:cursor-not-allowed disabled:opacity-60"
      >
        Try: “{EXAMPLE_PROMPT}”
      </button>
    </div>
  );
}
