const converter = initConverter();
const spriteRecolorer = initSpriteRecolorer();

initFormatMenus((type, value, label) => {
  if (type === "input" || type === "output") {
    converter.setFormat(type, value, label);
  }

  if (type === "palette-file") {
    spriteRecolorer.setPaletteFileFormat(value, label);
  }
});
