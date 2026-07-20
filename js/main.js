const paletteBuilder = initPaletteBuilder();
const converter = initConverter();
const spriteRecolorer = initSpriteRecolorer();

document.querySelectorAll(".panel > .section-head .section-collapse-btn").forEach((button) => {
  const panel = button.closest(".panel");
  const sectionName = panel.querySelector("h2")?.textContent.trim() || "section";

  button.addEventListener("click", () => {
    const isCollapsed = panel.classList.toggle("is-collapsed");
    button.setAttribute("aria-expanded", String(!isCollapsed));
    button.setAttribute("aria-label", `${isCollapsed ? "Expand" : "Collapse"} ${sectionName}`);
    button.title = `${isCollapsed ? "Expand" : "Collapse"} section`;
    button.querySelector(".material-symbols-rounded").textContent = isCollapsed ? "expand_more" : "expand_less";
  });
});

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
