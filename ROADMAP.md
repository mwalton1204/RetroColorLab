# Roadmap

Planned enhancements for RetroColorLab, in no particular order.

## Planned

- **Spritesheet splitting & animation preview** — basic tools to slice a spritesheet into frames and preview the animation
- **Saved palette filtering** — filter saved palettes
- **Palette Manager cleanup and UI/UX pass** — simplify and polish palette organization, editing, importing, saving, and downloading without losing functionality
- **Content and copy improvements** — revise headings, descriptions, labels, empty states, tooltips, and feedback messages for greater clarity and consistency across the page
- **Theme improvements and light/dark modes** — refine the visual theme and introduce polished light and dark appearances with an accessible theme switcher

## Deferred

- **Indexed-style export** — the previous index-map ZIP export has been removed for now; revisit a clearer, more useful indexed export workflow later

## Completed

- **Grayscale conversion** — convert the current sprite palette to grayscale with one click
- **Palette file import** — import existing palettes from `.pal`, `.gpl`, and `.txt` formats directly onto the loaded sprite; black/white slots are matched semantically so they always land in the correct position
- **Palette saving** — save and load palettes locally using IndexedDB, with JSON export/import for portability; no backend or sign-in required
- **Color swapping** — swap two colors' positions in the swap list with a two-click flow; also swaps the actual replacement colors applied to the sprite
