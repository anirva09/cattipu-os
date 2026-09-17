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
