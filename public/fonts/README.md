# CATTIPU OS — Bundled Fonts

## Web437 IBM VGA 8x16

- **File:** `Web437_IBM_VGA_8x16.woff`
- **Font:** "Web437 IBM VGA 8x16", from *The Ultimate Oldschool PC Font Pack*
  v2.2 (2020-11-21)
- **Author:** VileR — <https://int10h.org/oldschool-pc-fonts/>
- **Source archive:** `oldschool_pc_font_pack_v2.2_web.zip`
  (MD5 `614e7eb1541cff3e6a163df43c0ad6da`, as published on the download page)
- **Licence:** Creative Commons Attribution-ShareAlike 4.0 International
  (CC BY-SA 4.0) — <https://creativecommons.org/licenses/by-sa/4.0/>.
  The full licence text shipped with the pack is in
  `LICENSE-oldschool-pc-font-pack.txt` (whitespace-trimmed only).
- **Changes:** none. The font file is byte-for-byte the file from the
  archive (MD5 `342b88aacf9bb4e01595ac5f80711ce8`).

`app/globals.css` registers this file under the family name
`'Px437 IBM VGA8'` — the name the design-system stack in
`design-system/tokens.ts` already uses. That was the face's v1.x name. v2.x
of the pack renamed "IBM VGA8" to "IBM VGA 8x16", and the `Web437` fonts are
the web-optimized versions of the square-pixel `Px437` outlines.

(c) 2016-2020 VileR. Used under CC BY-SA 4.0.

## Ark Pixel Proportional (12px and 10px, Latin)

- **Files:** `ArkPixel-12px-Proportional-Latin.woff2`, `ArkPixel-10px-Proportional-Latin.woff2`
- **Font:** "Ark Pixel 12px Proportional" and "Ark Pixel 10px Proportional", Latin builds,
  release `2026.09.01`
- **Author:** TakWolf — <https://github.com/TakWolf/ark-pixel-font>
- **Source archives:** `ark-pixel-font-12px-proportional-otf.woff2-v2026.09.01.zip`
  (MD5 `b67bc0cab13dfa27232a2499ebba4f50`) and
  `ark-pixel-font-10px-proportional-otf.woff2-v2026.09.01.zip`
  (MD5 `99d86a806d8f95b1c79eaba3c4c4f70b`), from the project's GitHub releases.
- **Licence:** SIL Open Font License 1.1. The licence text shipped with both archives
  (identical) is in `LICENSE-OFL-ark-pixel.txt`. No Reserved Font Name is declared.
- **Changes:** subset with fontTools `pyftsubset` to the characters the shell renders
  (U+0020–007E, U+00A0–00FF, U+00B7, U+2013–2014, U+2018–201D, U+2022, U+2026, U+2190–2193),
  keeping every name-table record, including the embedded licence. Glyph outlines are
  unmodified.

`app/globals.css` registers these faces for the shell's standard GUI roles. Each face
carries a `size-adjust` so the role size lands exactly on its pixel grid: the 13px
body/menu/control role renders the 12px design at 1:1 (`12 / 13`), and the 11px compact
role renders the 10px design at 1:1 (`10 / 11`). Titles keep Px437 IBM VGA8.

(c) 2021 TakWolf. Used under the SIL Open Font License 1.1.
