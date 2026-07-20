function initPaletteBuilder() {
  const section = document.getElementById("palette-builder");
  const nameInput = document.getElementById("builderPaletteName");
  const formatButton = document.getElementById("builderFormatButton");
  const formatMenu = document.getElementById("builderFormatMenu");
  const addButton = document.getElementById("builderAddColorBtn");
  const count = document.getElementById("builderColorCount");
  const list = document.getElementById("builderColorList");
  const paletteText = document.getElementById("builderPaletteText");
  const clearButton = document.getElementById("clearBuilderPaletteBtn");
  const importButton = document.getElementById("importBuilderPaletteBtn");
  const importInput = document.getElementById("importBuilderPaletteInput");
  const importFormatDialog = document.getElementById("builderImportFormatDialog");
  const importFormatOptions = document.getElementById("builderImportFormatOptions");
  const importFormatCancel = document.getElementById("builderImportFormatCancel");
  const saveButton = document.getElementById("saveBuilderPaletteBtn");
  const saveButtonLabel = document.getElementById("builderSavePaletteLabel");
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

  let displayFormat = "palettes/rgb888.txt";
  let colors = [];
  let currentPaletteId = null;
  let dirty = false;
  let libraryPalettes = [];
  let rowPickrs = [];
  let draggedColorIndex = null;
  let pendingImportText = null;
  let pendingImportFilename = null;
  let autosaveTimer = null;

  function normalizeSavedColor(entry) {
    const hex = typeof entry === "string" ? entry : entry?.replacementHex;
    if (!hex) return null;
    try { return colorFromHex(hex); } catch { return null; }
  }

  function setDirty(value = true) {
    dirty = value;
    saveButtonLabel.textContent = currentPaletteId && !dirty ? "Saved" : "Save Palette";
    if (autosaveTimer) clearTimeout(autosaveTimer);
    autosaveTimer = null;
    if (value && currentPaletteId) {
      autosaveTimer = setTimeout(() => autosaveCurrentPalette(), 400);
    }
  }

  function paletteSignature() {
    return JSON.stringify({ name: nameInput.value.trim(), colors: colors.map(color => color.hex) });
  }

  async function autosaveCurrentPalette() {
    autosaveTimer = null;
    const id = currentPaletteId;
    const name = nameInput.value.trim();
    if (!id || !name) return;
    const signature = paletteSignature();
    const records = colors.map((color, index) => ({ replacementHex: color.hex, name: `Color ${index + 1}` }));
    try {
      await updatePalette(id, name, records, false, false, { source: "builder" });
      if (currentPaletteId !== id) return;
      if (paletteSignature() === signature) setDirty(false);
      await refreshLibrary();
      document.dispatchEvent(new CustomEvent("palette-library-changed"));
    } catch {
      if (currentPaletteId === id) showToast(toast, "Palette changes could not be saved.");
    }
  }

  async function flushAutosave() {
    if (!autosaveTimer) return;
    clearTimeout(autosaveTimer);
    autosaveTimer = null;
    await autosaveCurrentPalette();
  }

  function formattedPalette() {
    const rows = colors.map((color, index) => ({
      index,
      grayscale: color,
      source: color,
      replacement: color,
      replacementHex: color.hex,
      name: `Color ${index + 1}`
    }));
    return buildPaletteFiles(rows)[displayFormat] || "";
  }

  function editorColorFormat() {
    const match = displayFormat.match(/rgb(888|555|565|444)/i);
    return match ? `RGB${match[1]}` : "RGB888";
  }

  function render() {
    rowPickrs.forEach(rowPickr => rowPickr.destroyAndRemove?.());
    rowPickrs = [];
    list.replaceChildren();
    count.textContent = `${colors.length} color${colors.length === 1 ? "" : "s"}`;
    paletteText.value = formattedPalette();
    copyButton.disabled = colors.length === 0;
    downloadButton.disabled = colors.length === 0;
    const downloadType = displayFormat.endsWith(".pal") ? "PAL" : displayFormat.endsWith(".gpl") ? "GPL" : "TXT";
    downloadButton.setAttribute("aria-label", `Download ${downloadType} palette`);
    downloadButton.title = `Download ${downloadType} palette`;

    colors.forEach((color, index) => {
      const row = document.createElement("div");
      row.className = "swap-row palette-builder-color-row";
      row.dataset.index = String(index);
      row.style.setProperty("--replacement-color", color.hex);

      const handle = document.createElement("span");
      handle.className = "swap-drag-handle material-symbols-rounded";
      handle.draggable = true;
      handle.dataset.index = String(index);
      handle.setAttribute("aria-label", `Drag color ${index + 1} to reorder`);
      handle.title = "Drag to reorder";
      handle.textContent = "drag_indicator";

      const editableColor = document.createElement("div");
      editableColor.className = "color-picker-control";
      const pickerAnchor = document.createElement("div");
      pickerAnchor.className = "pickr-anchor palette-builder-row-pickr";
      editableColor.appendChild(pickerAnchor);

      const value = document.createElement("input");
      value.className = "swap-editor-field palette-builder-value";
      value.type = "text";
      value.spellcheck = false;
      value.value = formatOutput(color, editorColorFormat());
      value.dataset.index = String(index);
      value.setAttribute("aria-label", `Color ${index + 1} value`);

      const controls = document.createElement("div");
      controls.className = "palette-builder-row-actions";
      controls.innerHTML = `
        <button class="preview-download-btn builder-copy-color" type="button" data-index="${index}" aria-label="Copy color ${index + 1}" title="Copy color"><span class="material-symbols-rounded">content_copy</span></button>
        <button class="preview-download-btn builder-remove-color" type="button" data-index="${index}" aria-label="Delete color ${index + 1}" title="Delete color"><span class="material-symbols-rounded">delete</span></button>
      `;

      row.append(handle, editableColor, value, controls);
      list.appendChild(row);

      const rowPickr = createPickr(pickerAnchor, color.hex, hex => {
        const updatedColor = colorFromHex(hex);
        colors[index] = updatedColor;
        row.style.setProperty("--replacement-color", updatedColor.hex);
        value.value = formatOutput(updatedColor, editorColorFormat());
        paletteText.value = formattedPalette();
        setDirty();
      }, toast);
      rowPickrs.push(rowPickr);
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
    showToast(toast, `${formatOutput(color, editorColorFormat())} added.`);
    if (options.focus) section.scrollIntoView({ behavior: "smooth", block: "start" });
    return true;
  }

  function setFormat(value, label = value) {
    displayFormat = value;
    formatButton.textContent = label;
    formatMenu.querySelectorAll("button").forEach(button => {
      const selected = button.dataset.value === value;
      button.classList.toggle("active", selected);
      button.setAttribute("aria-selected", String(selected));
    });
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
      item.dataset.id = String(palette.id);
      item.tabIndex = 0;
      item.setAttribute("role", "button");
      item.setAttribute("aria-label", `Edit ${palette.name}`);
      if (palette.id === currentPaletteId) {
        item.classList.add("is-editing");
        item.setAttribute("aria-current", "true");
      }

      const row = document.createElement("div");
      row.className = "saved-palette-row";
      row.innerHTML = `
        <div class="saved-palette-info">
          <span class="saved-palette-name-line">
            <span class="saved-palette-name">${escapeHtml(palette.name)}</span>
            <span class="saved-palette-hover-edit material-symbols-rounded" aria-hidden="true">edit</span>
          </span>
          <span class="saved-palette-meta">${palette.colorCount} color${palette.colorCount === 1 ? "" : "s"}<span class="saved-palette-editing-label"> · Editing</span></span>
        </div>
        <div class="saved-palette-actions">
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
    if (autosaveTimer) clearTimeout(autosaveTimer);
    autosaveTimer = null;
    colors = [];
    currentPaletteId = null;
    nameInput.value = "";
    setDirty(false);
    render();
    renderLibrary();
  }

  addButton.addEventListener("click", () => {
    let seed = (0x63b5ce + colors.length * 0x9e3779) & 0xffffff;
    let hex;
    do {
      hex = `#${seed.toString(16).padStart(6, "0").toUpperCase()}`;
      seed = (seed + 0x9e3779) & 0xffffff;
    } while (colors.some(color => color.hex.toUpperCase() === hex));
    addColor(hex);
  });
  nameInput.addEventListener("input", () => setDirty());
  clearButton.addEventListener("click", async () => { await flushAutosave(); resetPalette(); });

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
      const [color] = parsePalette(input.value, editorColorFormat());
      if (!color) throw new Error("Enter a color value.");
      const duplicate = colors.some((entry, entryIndex) => entryIndex !== index && entry.hex.toUpperCase() === color.hex.toUpperCase());
      if (duplicate) throw new Error("That color is already in the palette.");
      colors[index] = color;
      setDirty();
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
      const value = formatOutput(colors[index], editorColorFormat());
      await copyText(value);
      showToast(toast, `${value} copied.`);
      return;
    }
    if (button.classList.contains("builder-remove-color")) colors.splice(index, 1);
    setDirty();
    render();
  });

  list.addEventListener("dragstart", event => {
    const handle = event.target.closest(".swap-drag-handle");
    if (!handle) return;
    draggedColorIndex = Number(handle.dataset.index);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(draggedColorIndex));
    handle.closest(".palette-builder-color-row")?.classList.add("swap-row--dragging");
  });

  list.addEventListener("dragover", event => {
    if (draggedColorIndex === null) return;
    const targetRow = event.target.closest(".palette-builder-color-row");
    if (!targetRow || Number(targetRow.dataset.index) === draggedColorIndex) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    list.querySelectorAll(".swap-row--drop-target").forEach(row => row.classList.remove("swap-row--drop-target"));
    targetRow.classList.add("swap-row--drop-target");
  });

  list.addEventListener("drop", event => {
    const targetRow = event.target.closest(".palette-builder-color-row");
    if (!targetRow || draggedColorIndex === null) return;
    event.preventDefault();
    const targetIndex = Number(targetRow.dataset.index);
    const [movedColor] = colors.splice(draggedColorIndex, 1);
    colors.splice(targetIndex, 0, movedColor);
    draggedColorIndex = null;
    setDirty();
    render();
  });

  list.addEventListener("dragend", () => {
    draggedColorIndex = null;
    list.querySelectorAll(".swap-row--dragging, .swap-row--drop-target").forEach(row => row.classList.remove("swap-row--dragging", "swap-row--drop-target"));
  });

  paletteText.addEventListener("change", () => {
    try {
      const parsedColors = parsePalettePreviewText(paletteText.value, displayFormat)
        .map(color => colorFromHex(toHex(color.r, color.g, color.b)));
      if (!parsedColors.length) throw new Error("Enter at least one valid color.");
      colors = parsedColors;
      setDirty();
      render();
      showToast(toast, "Palette updated from text.");
    } catch (err) {
      showToast(toast, err.message || "The palette text could not be parsed.");
    }
  });

  function importPaletteText(text, filename, format) {
    let importedColors;
    if (format === "HEX") {
      importedColors = text.split(/\r?\n/)
        .map(line => line.trim())
        .filter(Boolean)
        .map(line => parsePalette(line, "HEX")[0])
        .filter(Boolean);
    } else {
      importedColors = parsePalettePreviewText(text, format).map(color => colorFromHex(toHex(color.r, color.g, color.b)));
    }
    if (!importedColors.length) throw new Error("No colors were found in the file.");

    colors = importedColors;
    currentPaletteId = null;
    nameInput.value = filename.replace(/\.[^.]+$/, "") || "Imported palette";
    const selectedFormat = format === "HEX" ? "palettes/rgb888.txt" : format;
    const formatOption = formatMenu.querySelector(`[data-value="${selectedFormat}"]`);
    setFormat(selectedFormat, formatOption?.textContent || "RGB888 (.txt)");
    setDirty();
    render();
    showToast(toast, `Imported ${colors.length} color${colors.length === 1 ? "" : "s"} from “${filename}”.`);
  }

  importButton.addEventListener("click", () => importInput.click());
  importInput.addEventListener("change", () => {
    const file = importInput.files[0];
    if (!file) return;
    importInput.value = "";
    const reader = new FileReader();
    reader.onload = event => {
      pendingImportText = String(event.target.result || "");
      pendingImportFilename = file.name;
      importFormatDialog.showModal();
    };
    reader.onerror = () => showToast(toast, "The palette file could not be read.");
    reader.readAsText(file);
  });

  importFormatOptions.addEventListener("click", event => {
    const option = event.target.closest("[data-value]");
    if (!option || pendingImportText === null) return;
    importFormatDialog.close();
    try { importPaletteText(pendingImportText, pendingImportFilename, option.dataset.value); }
    catch (err) { showToast(toast, err.message || "The palette could not be imported."); }
    pendingImportText = null;
    pendingImportFilename = null;
  });

  importFormatCancel.addEventListener("click", () => {
    importFormatDialog.close();
    pendingImportText = null;
    pendingImportFilename = null;
  });

  saveButton.addEventListener("click", async () => {
    if (autosaveTimer) clearTimeout(autosaveTimer);
    autosaveTimer = null;
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
    const selectedName = displayFormat.split("/").pop() || "palette.txt";
    const extension = selectedName.split(".").pop() || "txt";
    const suffix = extension === "txt" ? `-${selectedName.replace(/\.txt$/i, "")}` : "";
    link.download = `${sanitizeFileName(nameInput.value)}${suffix}.${extension}`;
    link.click();
    URL.revokeObjectURL(url);
    showToast(toast, "Palette downloaded.");
  });

  savedList.addEventListener("click", async event => {
    const deleteButton = event.target.closest(".builder-delete-palette");
    const loadItem = deleteButton ? null : event.target.closest(".saved-palette-item[data-id]");
    const id = Number((loadItem || deleteButton)?.dataset.id);
    if (!id) return;
    if (loadItem) {
      try {
        await flushAutosave();
        const palette = await loadPaletteById(id);
        if (!palette) return;
        colors = (palette.colors || []).map(normalizeSavedColor).filter(Boolean);
        currentPaletteId = palette.id;
        nameInput.value = palette.name;
        setDirty(false);
        render();
        renderLibrary();
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

  savedList.addEventListener("keydown", event => {
    if (event.target.closest("button")) return;
    const item = event.target.closest(".saved-palette-item[data-id]");
    if (!item || (event.key !== "Enter" && event.key !== " ")) return;
    event.preventDefault();
    item.click();
  });

  document.addEventListener("palette-library-changed", refreshLibrary);
  render();
  refreshLibrary();

  return { addColor, setFormat, refreshLibrary };
}
