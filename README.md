# RetroColorLab

A browser-based toolkit for retro palette workflows. Convert color values between common formats, upload sprite images to detect and swap colors automatically, and export palette files ready for use in your editor. No server, no build step, no data sent anywhere.

Built for retro game developers, pixel artists, and ROM hackers working with constrained-color systems like Game Boy Color, GBA, NES, and SNES.

**[Live demo →](https://mwalton1204.github.io/RetroColorLab/)**

<img src="assets/screenshot.png" alt="RetroColorLab screenshot"/>

---

## Features

### Palette Converter
- Convert a single color between **RGB555, RGB888, RGB565, RGB444, and HEX**
- Integrated color picker with custom format input fields injected directly into the Pickr UI — supports typing values in any supported format, not just hex
- Input and output format selectable independently

### Sprite Recolor
- Upload any PNG, JPEG, WebP, or GIF image
- All unique non-transparent colors are detected automatically via the Canvas API and mapped to individual color pickers
- Swap any color in real time; preview updates instantly
- **Swap two colors' positions** in the palette using the swap button on each row — also swaps the actual replacement colors on the sprite
- Per-color name labels, editable inline
- Reset any individual color or all colors at once
- Hover over the original sprite to highlight the matching row in the swap list; click to pin the highlight; click again or press Esc to clear
- 1×, 2×, 4× zoom for pixel-accurate inspection

### Palette Manager
- Live preview of the exported palette file, updated as you make changes
- Import a palette file (`.pal`, `.gpl`, `.txt`) to apply its colors to the current sprite; black and white slots are always matched semantically regardless of palette count
- Edit mode: paste values directly into the preview text area to apply them back to the sprite
- Exclude black and white from exports with a toggle
- Download, copy, or select the export format inline
- Format selector: **JASC .pal**, **GIMP .gpl**, **RGB888 / RGB555 / RGB565 / RGB444 .txt**

### Index-map Export (ZIP package)
- **Grayscale index-map PNG** — each pixel's brightness encodes its palette position
- **Current palette file** — exported in the selected JASC, GIMP, RGB888, RGB555, RGB565, or RGB444 format
- **manifest.json** — documents the grayscale values and their source/replacement color mappings
- The canvas-generated PNG is an RGBA grayscale index map, not a binary PLTE-indexed PNG

### Saved Palettes
- Save the current replacement palette with a custom name, stored locally via **IndexedDB** — no account or server required
- Load a saved palette onto any sprite; black and white entries are matched by identity, normal colors positionally
- Export all saved palettes as a JSON backup file; import to restore them on any device
- Delete individual palettes

---

## Technical notes

- **Vanilla JS, no framework, no build step.** Plain `<script>` tags loaded in dependency order. The codebase is split into focused modules (`color-formats.js`, `converter.js`, `sprite-recolorer.js`, `palette-export.js`, etc.) without requiring a bundler.
- **Custom Pickr format fields.** The Pickr color picker normally only accepts hex input. A custom UI is injected into each picker instance after initialization, adding a format selector and text input that parses and applies any supported color format directly.
- **Canvas-based color detection.** Sprite colors are extracted by reading raw `ImageData` pixel-by-pixel, keyed by RGB triplet, and deduplicated into a sorted palette. Recoloring applies a replacement map over the same `ImageData` in a single pass.
- **Semantic black/white matching.** When loading a saved or imported palette, white and black source slots are matched by identity (not position), so they never receive incorrect replacements even when the palette counts differ between sprites.
- **Client-side ZIP generation.** The index-map PNG, selected palette file, and mapping manifest are assembled entirely in the browser using JSZip.
- **IndexedDB palette storage.** Saved palettes are persisted locally with IndexedDB. Each record stores the replacement colors, names, and flags indicating whether the palette included white/black entries, so loading onto a different sprite always aligns correctly.
- **Zero data transmission.** Uploaded images are read with `FileReader` and processed locally. Nothing is sent to a server.

---

## Run locally

Open `index.html` directly in a browser, or serve the folder:

```bash
python -m http.server 8000
# then open http://localhost:8000
```

Both work — no server is required.

---

## Project structure

```
retrocolorlab/
├── index.html
├── css/
│   └── styles.css
└── js/
    ├── main.js               # Entry point — wires converter, sprite recolorer, format menus
    ├── color-formats.js      # Color parsing and formatting for all supported formats
    ├── converter.js          # Palette converter section logic
    ├── sprite-recolorer.js   # Sprite upload, color detection, swap UI, export
    ├── palette-export.js     # Palette file generation (JASC, GIMP, txt, indexed PNG)
    ├── palette-storage.js    # IndexedDB save/load/export/import for named palettes
    ├── format-menus.js       # Dropdown menu open/close behavior
    ├── pickr-enhancements.js # Custom format fields injected into Pickr instances
    └── ui-utils.js           # Shared utilities (toast, clipboard, canvas blob, etc.)
```

---

## Dependencies

Loaded via CDN — no npm install required:

| Library | Purpose |
|---|---|
| [Pickr](https://github.com/Simonwep/pickr) | Color picker UI |
| [JSZip](https://stuk.github.io/jszip/) | Client-side ZIP generation |
| [Material Symbols](https://fonts.google.com/icons) | Icon font |

---

## License

MIT © 2026 Michael Walton
