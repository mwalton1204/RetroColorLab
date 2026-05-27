

const NEWLINE = "\n";

function buildPaletteRows(mappings, names, includeBlackWhite) {
  const ordered = getExportOrderedMappings(mappings, includeBlackWhite);

  return ordered.map((mapping, orderedIndex) => {
    const originalIndex = mappings.findIndex(item => item.id === mapping.id);
    const color = colorFromHex(mapping.replacementHex);
    const gray = ordered.length <= 1 ? 0 : Math.round((orderedIndex / (ordered.length - 1)) * 255);

    return {
      index: orderedIndex,
      mapping,
      grayscale: { r: gray, g: gray, b: gray, hex: toHex(gray, gray, gray) },
      source: mapping.source,
      replacement: color,
      replacementHex: mapping.replacementHex,
      name: names[originalIndex] || getDefaultColorName(mapping, mappings)
    };
  });
}

function getSortedSpriteMappings(mappings) {
  const white = [];
  const black = [];
  const normal = [];

  mappings.forEach(mapping => {
    const hex = mapping.source.hex.toUpperCase();
    if (hex === "#FFFFFF") white.push(mapping);
    else if (hex === "#000000") black.push(mapping);
    else normal.push(mapping);
  });

  return [...white, ...normal, ...black];
}

function getExportOrderedMappings(mappings, includeBlackWhite) {
  const sorted = getSortedSpriteMappings(mappings);
  if (includeBlackWhite) return sorted;
  return sorted.filter(mapping => {
    const hex = mapping.source.hex.toUpperCase();
    return hex !== "#FFFFFF" && hex !== "#000000";
  });
}

function getDefaultColorName(mapping, mappings) {
  const hex = mapping.source.hex.toUpperCase();
  if (hex === "#000000") return "Black";
  if (hex === "#FFFFFF") return "White";

  const normalMappings = getSortedSpriteMappings(mappings).filter(item => {
    const itemHex = item.source.hex.toUpperCase();
    return itemHex !== "#000000" && itemHex !== "#FFFFFF";
  });

  const visibleIndex = normalMappings.findIndex(item => item.id === mapping.id);
  return `Color ${visibleIndex + 1}`;
}

function buildPaletteFiles(rows) {
  const options = { name: "RetroColorLab Export", columns: 8 };
  const timestamp = new Date().toISOString();

  const jascLines = [
    "JASC-PAL",
    "0100",
    String(rows.length),
    ...rows.map(row => `${row.replacement.r8} ${row.replacement.g8} ${row.replacement.b8}`)
  ];

  const gplLines = [
    "GIMP Palette",
    `Name: ${options.name}`,
    `Columns: ${options.columns}`,
    ...rows.map(row => `${String(row.replacement.r8).padStart(3, " ")} ${String(row.replacement.g8).padStart(3, " ")} ${String(row.replacement.b8).padStart(3, " ")}\t${row.name}`)
  ];

  const rgbComment = row => ` ; ${row.name}`;
  const rgb888Lines = rows.map(row => `${formatOutput(row.replacement, "RGB888")}${rgbComment(row)}`);
  const rgb555Lines = rows.map(row => `${formatOutput(row.replacement, "RGB555")}${rgbComment(row)}`);
  const rgb565Lines = rows.map(row => `${formatOutput(row.replacement, "RGB565")}${rgbComment(row)}`);
  const rgb444Lines = rows.map(row => `${formatOutput(row.replacement, "RGB444")}${rgbComment(row)}`);
  const hexLines = rows.map(row => row.replacementHex);
  const csvLines = [
    "index,grayscale_hex,grayscale_rgb888,source_hex,source_rgb888,replacement_hex,replacement_rgb888,replacement_rgb555,replacement_rgb565,replacement_rgb444,color_name",
    ...rows.map(row => [
      row.index,
      row.grayscale.hex,
      `RGB ${row.grayscale.r}, ${row.grayscale.g}, ${row.grayscale.b}`,
      row.source.hex,
      `RGB ${row.source.r}, ${row.source.g}, ${row.source.b}`,
      row.replacementHex,
      formatOutput(row.replacement, "RGB888"),
      formatOutput(row.replacement, "RGB555"),
      formatOutput(row.replacement, "RGB565"),
      formatOutput(row.replacement, "RGB444"),
      row.name
    ].map(value => `"${String(value).replaceAll('"', '""')}"`).join(","))
  ];

  const manifest = {
    app: "RetroColorLab",
    exportedAt: timestamp,
    colorCount: rows.length,
    indexedImage: {
      file: "images/indexed-grayscale.png",
      note: "RGBA PNG grayscale index-map exported from browser canvas; not a true binary indexed PNG with a PLTE chunk."
    },
    paletteFiles: {
      "palettes/jasc.pal": "JASC PAL. Header plus strict numeric RGB888 rows only.",
      "palettes/gimp.gpl": "GIMP GPL. Uses Name, Columns, and final color-name column.",
      "palettes/rgb888.txt": "One RGB888 triplet per line with semicolon color-name comments.",
      "palettes/rgb555.txt": "One RGB555 triplet per line with semicolon color-name comments.",
      "palettes/rgb565.txt": "One RGB565 triplet per line with semicolon color-name comments.",
      "palettes/rgb444.txt": "One RGB444 triplet per line with semicolon color-name comments.",
      "palettes/hex.txt": "One HEX color per line. No comments.",
      "palettes/map.csv": "Full mapping from grayscale index to source and replacement colors, plus color_name column."
    }
  };

  return {
    "palettes/jasc.pal": jascLines.join(NEWLINE),
    "palettes/gimp.gpl": gplLines.join(NEWLINE),
    "palettes/rgb888.txt": rgb888Lines.join(NEWLINE),
    "palettes/rgb555.txt": rgb555Lines.join(NEWLINE),
    "palettes/rgb565.txt": rgb565Lines.join(NEWLINE),
    "palettes/rgb444.txt": rgb444Lines.join(NEWLINE),
    "palettes/hex.txt": hexLines.join(NEWLINE),
    "palettes/map.csv": csvLines.join(NEWLINE),
    "manifest.json": JSON.stringify(manifest, null, 2),
    "README.txt": [
      "RetroColorLab indexed export",
      "",
      "Package structure:",
      "- images/indexed-grayscale.png",
      "- palettes/jasc.pal",
      "- palettes/gimp.gpl",
      "- palettes/rgb888.txt",
      "- palettes/rgb555.txt",
      "- palettes/rgb565.txt",
      "- palettes/rgb444.txt",
      "- palettes/hex.txt",
      "- palettes/map.csv",
      "- manifest.json",
      "",
      "Important:",
      "- The grayscale PNG is exported through browser canvas as RGBA PNG data.",
      "- It is not a true binary indexed PNG with a PLTE chunk."
    ].join(NEWLINE)
  };
}

function parsePalettePreviewText(text, format) {
  const lines = String(text).split(/\r?\n/);
  const colors = [];

  if (format === "palettes/jasc.pal") {
    const meaningful = lines.map(line => line.trim()).filter(Boolean);
    const isJasc = meaningful.length >= 3 && meaningful[0] === "JASC-PAL";
    const colorLines = isJasc ? meaningful.slice(3) : meaningful;
    colorLines.forEach(line => {
      const numbers = line.match(/[0-9]+/g)?.map(Number) || [];
      if (numbers.length < 3) return;
      colors.push({ r: numbers[0], g: numbers[1], b: numbers[2] });
    });
  } else if (format === "palettes/gimp.gpl") {
    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed === "GIMP Palette" || trimmed.startsWith("Name:") || trimmed.startsWith("Columns:") || trimmed.startsWith("#")) return;
      const parts = trimmed.replaceAll(String.fromCharCode(9), " ").split(" ").filter(Boolean);
      if (parts.length < 3) return;
      colors.push({ r: Number(parts[0]), g: Number(parts[1]), b: Number(parts[2]), name: parts.slice(3).join(" ").trim() });
    });
  } else if (["palettes/rgb888.txt", "palettes/rgb555.txt", "palettes/rgb565.txt", "palettes/rgb444.txt"].includes(format)) {
    const sourceFormat = format.includes("rgb555") ? "RGB555" : format.includes("rgb565") ? "RGB565" : format.includes("rgb444") ? "RGB444" : "RGB888";
    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) return;
      const pieces = trimmed.split(";");
      let parsed;
      try { parsed = parsePalette(pieces[0].trim(), sourceFormat)[0]; } catch { return; }
      if (!parsed) return;
      colors.push({ r: parsed.r8, g: parsed.g8, b: parsed.b8, name: pieces.slice(1).join(";").trim() });
    });
  } else {
    throw new Error("This preview format cannot be applied back to the sprite.");
  }

  return colors.filter(color => [color.r, color.g, color.b].every(value => Number.isFinite(value) && value >= 0 && value <= 255));
}
