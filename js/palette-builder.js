function initPaletteBuilder() {
  const section = document.getElementById("palette-builder");
  const nameInput = document.getElementById("builderPaletteName");
  const formatButton = document.getElementById("builderFormatButton");
  const formatMenu = document.getElementById("builderFormatMenu");
  const colorInput = document.getElementById("builderColorInput");
  const colorPickerEl = document.getElementById("builderColorPicker");
  const addButton = document.getElementById("builderAddColorBtn");
  const error = document.getElementById("builderError");
  const count = document.getElementById("builderColorCount");
  const list = document.getElementById("builderColorList");
  const newButton = document.getElementById("newBuilderPaletteBtn");
  const saveButton = document.getElementById("saveBuilderPaletteBtn");
  const copyButton = document.getElementById("copyBuilderPaletteBtn");
  const downloadButton = document.getElementById("downloadBuilderPaletteBtn");
  const savedList = document.getElementById("builderSavedPalettes");
  const librarySearchButton = document.getElementById("builderPaletteSearchBtn");
  const librarySortButton = document.getElementById("builderPaletteSortBtn");
  const librarySearchControl = document.getElementById("builderPaletteSearchControl");
  const librarySortControl = document.getElementById("builderPaletteSortControl");
  const librarySearch = document.getElementById("builderPaletteSearch");
  const librarySort = document.getElementById("builderPaletteSort");
  const toast = document.getElementById("builderToast");

  let displayFormat = "HEX";
  let colors = [];
  let currentPaletteId = null;
  let dirty = false;
  let libraryPalettes = [];
  let pickr;

  function normalizeSavedColor(entry) {
    const hex = typeof entry === "string" ? entry : entry?.replacementHex;
    if (!hex) return null;
    try { return colorFromHex(hex); } catch { return null; }
  }

  function setDirty(value = true) {
    dirty = value;
    saveButton.textContent = currentPaletteId && !dirty ? "Saved" : "Save palette";
  }

  function showInputError(message = "") {
    error.textContent = message;
    error.style.display = message ? "block" : "none";
  }

  function formattedPalette() {
    return colors.map(color => formatOutput(color, displayFormat)).join("\n");
  }

  function render() {
    list.replaceChildren();
    count.textContent = `${colors.length} color${colors.length === 1 ? "" : "s"}`;
    copyButton.disabled = colors.length === 0;
    downloadButton.disabled = colors.length === 0;

    if (!colors.length) {
      const empty = document.createElement("div");
      empty.className = "palette-builder-empty";
      empty.innerHTML = '<span class="material-symbols-rounded" aria-hidden="true">palette</span><p>No colors yet. Add a value above or send one from the converter.</p>';
      list.appendChild(empty);
      return;
    }

    colors.forEach((color, index) => {
      const row = document.createElement("div");
      row.className = "palette-builder-color-row";
      row.dataset.index = String(index);

      const position = document.createElement("span");
      position.className = "palette-builder-index";
      position.textContent = String(index).padStart(2, "0");

      const swatch = document.createElement("span");
      swatch.className = "palette-builder-swatch";
      swatch.style.backgroundColor = color.hex;
      swatch.title = color.hex;

      const value = document.createElement("input");
      value.className = "builder-text-input palette-builder-value";
      value.type = "text";
      value.spellcheck = false;
      value.value = formatOutput(color, displayFormat);
      value.dataset.index = String(index);
      value.setAttribute("aria-label", `Color ${index + 1} value`);

      const controls = document.createElement("div");
      controls.className = "palette-builder-row-actions";
      controls.innerHTML = `
        <button class="builder-row-btn builder-move-up" type="button" data-index="${index}" aria-label="Move color ${index + 1} up" title="Move up" ${index === 0 ? "disabled" : ""}><span class="material-symbols-rounded">arrow_upward</span></button>
        <button class="builder-row-btn builder-move-down" type="button" data-index="${index}" aria-label="Move color ${index + 1} down" title="Move down" ${index === colors.length - 1 ? "disabled" : ""}><span class="material-symbols-rounded">arrow_downward</span></button>
        <button class="builder-row-btn builder-copy-color" type="button" data-index="${index}" aria-label="Copy color ${index + 1}" title="Copy color"><span class="material-symbols-rounded">content_copy</span></button>
        <button class="builder-row-btn builder-remove-color" type="button" data-index="${index}" aria-label="Remove color ${index + 1}" title="Remove color"><span class="material-symbols-rounded">delete</span></button>
      `;

      row.append(position, swatch, value, controls);
      list.appendChild(row);
    });
  }

  function addColor(hex, options = {}) {
    let color;
    try { color = colorFromHex(hex); } catch { return false; }
    if (colors.some(entry => entry.hex.toUpperCase() === color.hex.toUpperCase())) {
      showToast(toast, `${color.hex} is already in this palette.`);
      if (options.focus) section.scrollIntoView({ behavior: "smooth", block: "start" });
      return false;
    }
    colors.push(color);
    setDirty();
    render();
    showToast(toast, `${formatOutput(color, displayFormat)} added.`);
    if (options.focus) section.scrollIntoView({ behavior: "smooth", block: "start" });
    return true;
  }

  function parseBuilderInput() {
    try {
      const [color] = parsePalette(colorInput.value, displayFormat);
      if (!color) throw new Error("Enter a color value first.");
      showInputError();
      return color;
    } catch (err) {
      showInputError(err.message);
      return null;
    }
  }

  function setFormat(value, label = value) {
    let pendingColor = null;
    try { [pendingColor] = parsePalette(colorInput.value, displayFormat); } catch {}
    displayFormat = value;
    formatButton.textContent = label;
    formatMenu.querySelectorAll("button").forEach(button => {
      const selected = button.dataset.value === value;
      button.classList.toggle("active", selected);
      button.setAttribute("aria-selected", String(selected));
    });
    colorInput.placeholder = placeholderForFormat(displayFormat);
    if (pendingColor) colorInput.value = formatOutput(pendingColor, displayFormat);
    showInputError();
    render();
  }

  function renderLibrary() {
    const query = librarySearch.value.trim().toLocaleLowerCase();
    const palettes = libraryPalettes.filter(palette => {
      return !query || palette.name.toLocaleLowerCase().includes(query);
    });
    const sorters = {
      newest: (a, b) => new Date(b.savedAt) - new Date(a.savedAt),
      oldest: (a, b) => new Date(a.savedAt) - new Date(b.savedAt),
      "name-asc": (a, b) => a.name.localeCompare(b.name),
      "name-desc": (a, b) => b.name.localeCompare(a.name),
      "colors-asc": (a, b) => a.colorCount - b.colorCount,
      "colors-desc": (a, b) => b.colorCount - a.colorCount
    };
    palettes.sort(sorters[librarySort.value] || sorters.newest);
    savedList.replaceChildren();
    if (!palettes.length) {
      const empty = document.createElement("p");
      empty.className = "saved-palettes-empty";
      empty.textContent = libraryPalettes.length ? "No palettes match your search." : "No saved palettes.";
      savedList.appendChild(empty);
      return;
    }
    palettes.forEach(palette => {
      const item = document.createElement("div");
      item.className = "saved-palette-item";

      const row = document.createElement("div");
      row.className = "saved-palette-row";
      row.innerHTML = `
        <div class="saved-palette-info">
          <span class="saved-palette-name">${escapeHtml(palette.name)}</span>
          <span class="saved-palette-meta">${palette.colorCount} color${palette.colorCount === 1 ? "" : "s"}</span>
        </div>
        <div class="saved-palette-actions">
          <button class="preview-download-btn builder-load-palette" type="button" data-id="${palette.id}" aria-label="Edit ${escapeHtml(palette.name)}" title="Edit palette"><span class="material-symbols-rounded">edit</span></button>
          <button class="preview-download-btn builder-delete-palette" type="button" data-id="${palette.id}" aria-label="Delete ${escapeHtml(palette.name)}" title="Delete palette"><span class="material-symbols-rounded">delete</span></button>
        </div>`;

      const paletteColors = (palette.colors || []).map(normalizeSavedColor).filter(Boolean);
      if (paletteColors.length) {
        row.classList.add("has-color-strip");
        const strip = document.createElement("div");
        strip.className = "saved-palette-color-strip";
        strip.setAttribute("aria-label", `${palette.name} colors in order`);
        paletteColors.forEach((color, index) => {
          const swatch = document.createElement("span");
          swatch.style.backgroundColor = color.hex;
          swatch.title = `${index + 1}: ${color.hex}`;
          strip.appendChild(swatch);
        });
        item.append(row, strip);
      } else {
        item.appendChild(row);
      }
      savedList.appendChild(item);
    });
  }

  async function refreshLibrary() {
    try { libraryPalettes = await listPalettes(); } catch { libraryPalettes = []; }
    renderLibrary();
  }

  function resetPalette() {
    colors = [];
    currentPaletteId = null;
    nameInput.value = "Untitled palette";
    setDirty(false);
    render();
  }

  addButton.addEventListener("click", () => {
    const color = parseBuilderInput();
    if (color) addColor(color.hex);
  });
  colorInput.addEventListener("keydown", event => {
    if (event.key === "Enter") addButton.click();
  });
  nameInput.addEventListener("input", () => setDirty());
  newButton.addEventListener("click", resetPalette);

  function toggleLibraryControl(button, control, focusTarget) {
    const willOpen = control.hidden;
    control.hidden = !willOpen;
    button.setAttribute("aria-expanded", String(willOpen));
    if (willOpen) focusTarget.focus();
  }

  librarySearchButton.addEventListener("click", () => toggleLibraryControl(librarySearchButton, librarySearchControl, librarySearch));
  librarySortButton.addEventListener("click", () => toggleLibraryControl(librarySortButton, librarySortControl, librarySort));
  librarySearch.addEventListener("input", renderLibrary);
  librarySort.addEventListener("change", renderLibrary);

  list.addEventListener("change", event => {
    const input = event.target.closest(".palette-builder-value");
    if (!input) return;
    const index = Number(input.dataset.index);
    try {
      const [color] = parsePalette(input.value, displayFormat);
      if (!color) throw new Error("Enter a color value.");
      const duplicate = colors.some((entry, entryIndex) => entryIndex !== index && entry.hex.toUpperCase() === color.hex.toUpperCase());
      if (duplicate) throw new Error("That color is already in the palette.");
      colors[index] = color;
      setDirty();
      showInputError();
      render();
    } catch (err) {
      showToast(toast, err.message);
      render();
    }
  });

  list.addEventListener("click", async event => {
    const button = event.target.closest("button[data-index]");
    if (!button) return;
    const index = Number(button.dataset.index);
    if (button.classList.contains("builder-copy-color")) {
      const value = formatOutput(colors[index], displayFormat);
      await copyText(value);
      showToast(toast, `${value} copied.`);
      return;
    }
    if (button.classList.contains("builder-remove-color")) colors.splice(index, 1);
    if (button.classList.contains("builder-move-up") && index > 0) [colors[index - 1], colors[index]] = [colors[index], colors[index - 1]];
    if (button.classList.contains("builder-move-down") && index < colors.length - 1) [colors[index + 1], colors[index]] = [colors[index], colors[index + 1]];
    setDirty();
    render();
  });

  saveButton.addEventListener("click", async () => {
    const name = nameInput.value.trim();
    if (!name) { nameInput.focus(); showToast(toast, "Enter a palette name."); return; }
    if (!colors.length) { showToast(toast, "Add at least one color first."); return; }
    const records = colors.map((color, index) => ({ replacementHex: color.hex, name: `Color ${index + 1}` }));
    try {
      if (currentPaletteId) await updatePalette(currentPaletteId, name, records, false, false, { source: "builder" });
      else currentPaletteId = await savePalette(name, records, false, false, { source: "builder" });
      setDirty(false);
      await refreshLibrary();
      document.dispatchEvent(new CustomEvent("palette-library-changed"));
      showToast(toast, `“${name}” saved.`);
    } catch {
      showToast(toast, "Palette could not be saved.");
    }
  });

  copyButton.addEventListener("click", async () => {
    await copyText(formattedPalette());
    showToast(toast, "Palette copied.");
  });
  downloadButton.addEventListener("click", () => {
    const blob = new Blob([formattedPalette()], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${sanitizeFileName(nameInput.value)}-${displayFormat.toLowerCase()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    showToast(toast, "Palette downloaded.");
  });

  savedList.addEventListener("click", async event => {
    const loadButton = event.target.closest(".builder-load-palette");
    const deleteButton = event.target.closest(".builder-delete-palette");
    const id = Number((loadButton || deleteButton)?.dataset.id);
    if (!id) return;
    if (loadButton) {
      try {
        const palette = await loadPaletteById(id);
        if (!palette) return;
        colors = (palette.colors || []).map(normalizeSavedColor).filter(Boolean);
        currentPaletteId = palette.id;
        nameInput.value = palette.name;
        setDirty(false);
        render();
        showToast(toast, `Editing “${palette.name}”.`);
      } catch { showToast(toast, "Palette could not be loaded."); }
    }
    if (deleteButton) {
      try {
        await deletePaletteById(id);
        if (currentPaletteId === id) resetPalette();
        await refreshLibrary();
        document.dispatchEvent(new CustomEvent("palette-library-changed"));
        showToast(toast, "Palette deleted.");
      } catch { showToast(toast, "Palette could not be deleted."); }
    }
  });

  pickr = createPickr(colorPickerEl, "#63B5CE", hex => {
    const color = colorFromHex(hex);
    colorInput.value = formatOutput(color, displayFormat);
    showInputError();
  }, toast);

  document.addEventListener("palette-library-changed", refreshLibrary);
  render();
  refreshLibrary();

  return { addColor, setFormat, refreshLibrary };
}
