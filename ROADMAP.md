# Roadmap

Planned enhancements for RetroColorLab, in no particular order.

## Planned

- **Grayscale conversion** — one-click button to convert the current palette to grayscale
- **Spritesheet splitting & animation preview** — basic tools to slice a spritesheet into frames and preview the animation
- **Export rework** — revisit and improve the current export flow (formats, options, UX)
- **Saved palette filtering** — filter saved palettes

## Completed

- **Palette file import** — import existing palettes from `.pal`, `.gpl`, and `.txt` formats directly onto the loaded sprite; black/white slots are matched semantically so they always land in the correct position
- **Palette saving** — save and load palettes locally using IndexedDB, with JSON export/import for portability; no backend or sign-in required
- **Color swapping** — swap two colors' positions in the swap list with a two-click flow; also swaps the actual replacement colors applied to the sprite
