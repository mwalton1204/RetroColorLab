const paletteBuilder = initPaletteBuilder();
const converter = initConverter(hex => paletteBuilder.addColor(hex, { focus: true }));
const spriteRecolorer = initSpriteRecolorer();

initFormatMenus((type, value, label) => {
  if (type === "input" || type === "output") {
    converter.setFormat(type, value, label);
  }

  if (type === "palette-file") {
    spriteRecolorer.setPaletteFileFormat(value, label);
  }

  if (type === "builder-display") {
    paletteBuilder.setFormat(value, label);
  }
});
