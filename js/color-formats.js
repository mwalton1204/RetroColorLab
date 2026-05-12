const FORMATS = ["RGB888", "RGB555", "RGB565", "RGB444", "HEX"];

function channelTo8Bit(value, max) {
  return Math.round((value / max) * 255);
}

function channelFrom8Bit(value, max) {
  return Math.round((value / 255) * max);
}

function rgb5ToRgb8(value) {
  return channelTo8Bit(value, 31);
}

function rgb8ToRgb5(value) {
  return channelFrom8Bit(value, 31);
}

function formatChannel(value, width = 2) {
  return String(value).padStart(width, "0");
}

function formatRgb555(value) {
  return String(value).padStart(2, "0");
}

function toHexPart(value) {
  return value.toString(16).padStart(2, "0").toUpperCase();
}

function toHex(r, g, b) {
  return `#${toHexPart(r)}${toHexPart(g)}${toHexPart(b)}`;
}

function hexToRgb(hex) {
  const cleanHex = String(hex).replace("#", "").trim();
  if (!/^[0-9a-fA-F]{6}$/.test(cleanHex)) {
    throw new Error("HEX input must be 6 digits, like #63B5CE.");
  }

  return {
    r: parseInt(cleanHex.slice(0, 2), 16),
    g: parseInt(cleanHex.slice(2, 4), 16),
    b: parseInt(cleanHex.slice(4, 6), 16)
  };
}

function rgbKey(r, g, b) {
  return `${r},${g},${b}`;
}

function parsePalette(text, sourceFormat) {
  const line = String(text).trim();
  if (!line) return [];

  let r8;
  let g8;
  let b8;
  let sourceValues = [];

  if (sourceFormat === "HEX") {
    const rgb = hexToRgb(line);
    r8 = rgb.r;
    g8 = rgb.g;
    b8 = rgb.b;
  } else {
    const numbers = line.match(/[0-9]+/g)?.map(Number) ?? [];
    if (numbers.length !== 3) throw new Error("Expected exactly 3 numbers.");

    sourceValues = numbers;

    if (sourceFormat === "RGB555") {
      if (!numbers.every(value => value >= 0 && value <= 31)) throw new Error("RGB555 values must be between 0 and 31.");
      r8 = channelTo8Bit(numbers[0], 31);
      g8 = channelTo8Bit(numbers[1], 31);
      b8 = channelTo8Bit(numbers[2], 31);
    } else if (sourceFormat === "RGB565") {
      if (!(numbers[0] >= 0 && numbers[0] <= 31 && numbers[1] >= 0 && numbers[1] <= 63 && numbers[2] >= 0 && numbers[2] <= 31)) {
        throw new Error("RGB565 values must be R 0–31, G 0–63, B 0–31.");
      }
      r8 = channelTo8Bit(numbers[0], 31);
      g8 = channelTo8Bit(numbers[1], 63);
      b8 = channelTo8Bit(numbers[2], 31);
    } else if (sourceFormat === "RGB444") {
      if (!numbers.every(value => value >= 0 && value <= 15)) throw new Error("RGB444 values must be between 0 and 15.");
      r8 = channelTo8Bit(numbers[0], 15);
      g8 = channelTo8Bit(numbers[1], 15);
      b8 = channelTo8Bit(numbers[2], 15);
    } else {
      if (!numbers.every(value => value >= 0 && value <= 255)) throw new Error("RGB888 values must be between 0 and 255.");
      [r8, g8, b8] = numbers;
    }
  }

  return [{
    line,
    sourceValues,
    r8,
    g8,
    b8,
    r5: rgb8ToRgb5(r8),
    g5: rgb8ToRgb5(g8),
    b5: rgb8ToRgb5(b8),
    hex: toHex(r8, g8, b8),
    sourceFormat
  }];
}

function formatRgb888Line(color) {
  return `RGB ${String(color.r8).padStart(3, "0")}, ${String(color.g8).padStart(3, "0")}, ${String(color.b8).padStart(3, "0")}`;
}

function formatRgb555Line(color) {
  return `RGB ${formatRgb555(color.r5)}, ${formatRgb555(color.g5)}, ${formatRgb555(color.b5)}`;
}

function formatRgb565Line(color) {
  return `RGB ${formatChannel(channelFrom8Bit(color.r8, 31))}, ${formatChannel(channelFrom8Bit(color.g8, 63))}, ${formatChannel(channelFrom8Bit(color.b8, 31))}`;
}

function formatRgb444Line(color) {
  return `RGB ${formatChannel(channelFrom8Bit(color.r8, 15))}, ${formatChannel(channelFrom8Bit(color.g8, 15))}, ${formatChannel(channelFrom8Bit(color.b8, 15))}`;
}

function formatOutput(color, targetFormat) {
  if (targetFormat === "RGB888") return formatRgb888Line(color);
  if (targetFormat === "RGB565") return formatRgb565Line(color);
  if (targetFormat === "RGB444") return formatRgb444Line(color);
  if (targetFormat === "HEX") return color.hex;
  return formatRgb555Line(color);
}

function formatInputFromRgb888(r, g, b, targetFormat) {
  const color = {
    r8: r,
    g8: g,
    b8: b,
    r5: rgb8ToRgb5(r),
    g5: rgb8ToRgb5(g),
    b5: rgb8ToRgb5(b),
    hex: toHex(r, g, b)
  };

  return formatOutput(color, targetFormat);
}

function colorFromHex(hex) {
  const rgb = hexToRgb(hex);
  return {
    r8: rgb.r,
    g8: rgb.g,
    b8: rgb.b,
    r5: rgb8ToRgb5(rgb.r),
    g5: rgb8ToRgb5(rgb.g),
    b5: rgb8ToRgb5(rgb.b),
    hex: toHex(rgb.r, rgb.g, rgb.b)
  };
}

function placeholderForFormat(format) {
  if (format === "HEX") return "EX: #63B5CE";
  if (format === "RGB555") return "EX: RGB 12, 22, 25";
  if (format === "RGB565") return "EX: RGB 12, 45, 25";
  if (format === "RGB444") return "EX: RGB 06, 11, 12";
  return "EX: RGB 099, 181, 206";
}
