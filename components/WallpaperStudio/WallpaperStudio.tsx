"use client";

/**
 * M21 — Wallpaper Studio, the Settings section that configures the desktop
 * surface.
 *
 * It owns no wallpaper state of its own beyond a CANDIDATE: the row a
 * person is looking at before committing to it. What is APPLIED lives in
 * `useSettingsStore.wallpaper`, and what each wallpaper looks like lives in
 * `lib/os/wallpapers.ts`; this panel reads both and writes only through
 * `setWallpaper` on APPLY. It never paints the real desktop and never
 * touches `document` — the Desktop renders the applied value by itself.
 *
 * Staged, like a 1998 Display Properties sheet: choosing a row previews
 * it here, APPLY commits it, RESTORE DEFAULT stages Engineering Paper and
 * still waits for APPLY.
 */

import { useId, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";

import { useAppliedWallpaper } from "@/components/DesktopWallpaper";
import { cattipuCssVariables, cattipuTokens } from "@/design-system/tokens";
import "@/design-system/bevel.css";
import {
  DEFAULT_WALLPAPER_ID,
  WALLPAPERS,
  getWallpaper,
  type WallpaperDefinition,
  type WallpaperId,
  type WallpaperSurfaceKind,
} from "@/lib/os/wallpapers";
import { useSettingsStore } from "@/store/useSettingsStore";

import "./WallpaperStudio.css";

type StudioStyle = CSSProperties & Record<`--cattipu-${string}`, string>;

const KIND_LABEL: Record<WallpaperSurfaceKind, string> = {
  "raster-tile": "RASTER TILE",
  "line-grid": "LINE GRID",
  "pixel-tile": "PIXEL TILE",
};

export function WallpaperStudio() {
  const applied = useAppliedWallpaper();
  const setWallpaper = useSettingsStore((s) => s.setWallpaper);

  // null means "follow the applied wallpaper" — so the candidate is right
  // even before persisted settings have reached this render.
  const [candidateId, setCandidateId] = useState<WallpaperId | null>(null);
  const candidate = getWallpaper(candidateId ?? applied.id);
  const pending = candidate.id !== applied.id;

  const listId = useId();
  const listRef = useRef<HTMLUListElement>(null);
  const optionId = (id: WallpaperId) => `${listId}-${id}`;

  const choose = (id: WallpaperId) => setCandidateId(id);

  const apply = () => {
    setWallpaper(candidate.id);
    setCandidateId(null);
  };

  const restoreDefault = () => setCandidateId(DEFAULT_WALLPAPER_ID);

  const onListKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    const index = WALLPAPERS.findIndex((w) => w.id === candidate.id);
    const last = WALLPAPERS.length - 1;
    const next =
      event.key === "ArrowDown" ? Math.min(index + 1, last)
      : event.key === "ArrowUp" ? Math.max(index - 1, 0)
      : event.key === "Home" ? 0
      : event.key === "End" ? last
      : null;
    if (next !== null) {
      event.preventDefault();
      choose(WALLPAPERS[next].id);
      return;
    }
    if (event.key === "Enter" && pending) {
      event.preventDefault();
      apply();
    }
  };

  const style: StudioStyle = {
    ...cattipuCssVariables,
    "--cattipu-menu-highlight": cattipuTokens.colors.navy,
    "--cattipu-studio-titlebar": cattipuTokens.colors.navy,
    "--cattipu-studio-mark": cattipuTokens.colors.welcome,
  };

  return (
    <div className="cattipu-wallpaper-studio" style={style} data-testid="wallpaper-studio">
      <div className="cattipu-wallpaper-studio__toolbar">
        <span className="cattipu-wallpaper-studio__title">WALLPAPER / DESKTOP</span>
        <span className="cattipu-wallpaper-studio__applied" role="status">
          APPLIED: {applied.name.toUpperCase()}
        </span>
      </div>

      <div className="cattipu-wallpaper-studio__bench">
        <figure className="cattipu-wallpaper-studio__monitor cattipu-bevel--raised">
          <div
            className="cattipu-wallpaper-studio__preview cattipu-bevel--inset"
            role="img"
            aria-label={`Preview: ${candidate.name}`}
          >
            <PreviewDesk wallpaper={candidate} />
          </div>
          <figcaption className="cattipu-wallpaper-studio__caption">
            {pending ? "PREVIEW — NOT APPLIED" : "PREVIEW — APPLIED"}
          </figcaption>
        </figure>

        <div className="cattipu-wallpaper-studio__picker">
          <span className="cattipu-wallpaper-studio__label" id={`${listId}-label`}>
            PATTERN
          </span>
          <ul
            ref={listRef}
            className="cattipu-wallpaper-studio__list cattipu-bevel--inset cattipu-focus--mechanical"
            role="listbox"
            tabIndex={0}
            aria-labelledby={`${listId}-label`}
            aria-activedescendant={optionId(candidate.id)}
            onKeyDown={onListKeyDown}
          >
            {WALLPAPERS.map((w) => {
              const selected = w.id === candidate.id;
              return (
                <li
                  key={w.id}
                  id={optionId(w.id)}
                  role="option"
                  aria-selected={selected}
                  className="cattipu-wallpaper-studio__option"
                  data-selected={selected || undefined}
                  onClick={() => {
                    choose(w.id);
                    listRef.current?.focus();
                  }}
                  onDoubleClick={() => {
                    setWallpaper(w.id);
                    setCandidateId(null);
                  }}
                >
                  <span className="cattipu-wallpaper-studio__marker" aria-hidden="true">
                    {selected ? "►" : ""}
                  </span>
                  <span className="cattipu-wallpaper-studio__swatch" style={w.surface} aria-hidden="true" />
                  <span className="cattipu-wallpaper-studio__name">{w.name}</span>
                  {w.id === applied.id && (
                    <span className="cattipu-wallpaper-studio__flag">APPLIED</span>
                  )}
                  {w.id === DEFAULT_WALLPAPER_ID && w.id !== applied.id && (
                    <span className="cattipu-wallpaper-studio__flag">DEFAULT</span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <section className="cattipu-wallpaper-studio__info cattipu-bevel--inset" aria-label="Pattern information">
        <h3 className="cattipu-wallpaper-studio__info-title">PATTERN INFORMATION</h3>
        <dl className="cattipu-wallpaper-studio__readout">
          <div><dt>NAME</dt><dd>{candidate.name.toUpperCase()}</dd></div>
          <div><dt>TYPE</dt><dd>{KIND_LABEL[candidate.kind]}</dd></div>
          <div><dt>MATERIAL</dt><dd>{candidate.material.toUpperCase()}</dd></div>
          <div><dt>SCALE</dt><dd>{candidate.tilePx} PX REPEAT</dd></div>
        </dl>
        <p className="cattipu-wallpaper-studio__description">{candidate.description}</p>
      </section>

      <div className="cattipu-wallpaper-studio__actions">
        <button
          type="button"
          className="cattipu-wallpaper-studio__button cattipu-bevel--raised cattipu-bevel--pressable cattipu-focus--mechanical"
          onClick={restoreDefault}
          disabled={candidate.id === DEFAULT_WALLPAPER_ID}
        >
          RESTORE DEFAULT
        </button>
        <button
          type="button"
          className="cattipu-wallpaper-studio__button cattipu-bevel--raised cattipu-bevel--pressable cattipu-focus--mechanical"
          onClick={apply}
          disabled={!pending}
          data-testid="wallpaper-apply"
        >
          APPLY
        </button>
      </div>
    </div>
  );
}

/**
 * A miniature of the desktop surface: the candidate pattern at its real
 * 1:1 pixel scale, with two icon blocks and one window plate for
 * reference. Static boxes only — no second shell.
 */
function PreviewDesk({ wallpaper }: { wallpaper: WallpaperDefinition }) {
  return (
    <div
      className="cattipu-wallpaper-studio__desk"
      style={wallpaper.surface}
      data-wallpaper={wallpaper.id}
      data-wallpaper-tone={wallpaper.tone}
    >
      <span className="cattipu-wallpaper-studio__desk-icon" style={{ left: 8, top: 8 }}>
        <span className="cattipu-wallpaper-studio__desk-mark" />
        <span className="cattipu-wallpaper-studio__desk-label" />
      </span>
      <span className="cattipu-wallpaper-studio__desk-icon" style={{ left: 8, top: 48 }}>
        <span className="cattipu-wallpaper-studio__desk-mark" />
        <span className="cattipu-wallpaper-studio__desk-label" />
      </span>
      <span className="cattipu-wallpaper-studio__desk-window">
        <span className="cattipu-wallpaper-studio__desk-titlebar" />
      </span>
    </div>
  );
}
