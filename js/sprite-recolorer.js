



function initSpriteRecolorer() {
  const spriteUpload = document.getElementById("spriteUpload");
  const clearSpriteBtn = document.getElementById("clearSpriteBtn");
  const zoomButtons = document.querySelectorAll(".zoom-btn");
  const resetSwapColorsBtn = document.getElementById("resetSwapColorsBtn");
  const swapList = document.getElementById("swapList");
  const originalCanvas = document.getElementById("originalCanvas");
  const previewCanvas = document.getElementById("previewCanvas");
  const originalEmpty = document.getElementById("originalEmpty");
  const previewEmpty = document.getElementById("previewEmpty");
  const originalSize = document.getElementById("originalSize");
  const previewSize = document.getElementById("previewSize");
  const downloadSpriteBtn = document.getElementById("downloadSpriteBtn");
  const downloadIndexedBtn = document.getElementById("downloadIndexedBtn");
  const spriteToast = document.getElementById("spriteToast");
  const paletteFileFormatButton = document.getElementById("paletteFileFormatButton");
  const paletteFileFormatMenu = document.getElementById("paletteFileFormatMenu");
  const paletteFileText = document.getElementById("paletteFileText");
  const copyPaletteFileBtn = document.getElementById("copyPaletteFileBtn");
  const downloadPaletteFileBtn = document.getElementById("downloadPaletteFileBtn");
  const editPaletteFileBtn = document.getElementById("editPaletteFileBtn");
  const excludeBlackWhiteToggle = document.getElementById("excludeBlackWhiteToggle");
  const saveSpritePaletteBtn = document.getElementById("saveSpritePaletteBtn");
  const importSavedPaletteBtn = document.getElementById("importSavedPaletteBtn");
  const importSavedPaletteDialog = document.getElementById("importSavedPaletteDialog");
  const importSavedPaletteList = document.getElementById("importSavedPaletteList");
  const cancelImportSavedPaletteBtn = document.getElementById("cancelImportSavedPaletteBtn");
  const saveSpritePaletteDialog = document.getElementById("saveSpritePaletteDialog");
  const saveSpritePaletteForm = document.getElementById("saveSpritePaletteForm");
  const saveSpritePaletteName = document.getElementById("saveSpritePaletteName");
  const cancelSaveSpritePaletteBtn = document.getElementById("cancelSaveSpritePaletteBtn");
  const importPaletteFileBtn = document.getElementById("importPaletteFileBtn");
  const importPaletteFileInput = document.getElementById("importPaletteFileInput");
  const paletteFormatDialog = document.getElementById("paletteFormatDialog");
  const paletteFormatDialogOptions = document.getElementById("paletteFormatDialogOptions");
  const paletteFormatDialogCancel = document.getElementById("paletteFormatDialogCancel");

  const originalCtx = originalCanvas.getContext("2d", { willReadFrequently: true });
  const previewCtx = previewCanvas.getContext("2d", { willReadFrequently: true });

  let originalImageData = null;
  let spriteColors = [];
  let mappings = [];
  let names = [];
  let paletteFileFormat = "palettes/jasc.pal";
  let isApplyingPaletteText = false;
  let palettePreviewApplyTimer = 0;
  let isPaletteFileEditable = false;
  let spriteZoom = 1;
  let hoveredMappingId = null;
  let pinnedMappingId = null;
  let draggedMappingId = null;
  let currentSpriteName = "Sprite";

  function includeBlackWhite() {
    return !excludeBlackWhiteToggle.checked;
  }

  function getPixelMappingId(event) {
    if (!originalImageData) return null;
    const rect = originalCanvas.getBoundingClientRect();
    const x = Math.floor((event.clientX - rect.left) * (originalImageData.width / rect.width));
    const y = Math.floor((event.clientY - rect.top) * (originalImageData.height / rect.height));
    if (x < 0 || y < 0 || x >= originalImageData.width || y >= originalImageData.height) return null;
    const idx = (y * originalImageData.width + x) * 4;
    if (originalImageData.data[idx + 3] === 0) return null;
    const key = rgbKey(originalImageData.data[idx], originalImageData.data[idx + 1], originalImageData.data[idx + 2]);
    return mappings.find(m => m.key === key)?.id ?? null;
  }

  function updateHighlights() {
    swapList.querySelectorAll(".swap-row--highlighted, .swap-row--pinned").forEach(el => {
      el.classList.remove("swap-row--highlighted", "swap-row--pinned");
    });

    if (pinnedMappingId) {
      const row = swapList.querySelector(`.swap-row[data-mapping-id="${pinnedMappingId}"]`);
      if (row) {
        row.classList.add("swap-row--pinned");
        row.scrollIntoView({ block: "nearest", behavior: "instant" });
      }
    }

    if (hoveredMappingId && hoveredMappingId !== pinnedMappingId) {
      const row = swapList.querySelector(`.swap-row[data-mapping-id="${hoveredMappingId}"]`);
      if (row) {
        row.classList.add("swap-row--highlighted");
        if (!pinnedMappingId) row.scrollIntoView({ block: "nearest", behavior: "instant" });
      }
    }
  }

  function buildMappings(colors) {
    return colors.map((color, index) => ({
      id: `color-${index}`,
      key: color.key,
      source: color,
      replacementHex: color.hex,
      pickr: null
    }));
  }

  function setPaletteFileEditable(isEditable) {
    isPaletteFileEditable = isEditable;
    paletteFileText.readOnly = !isEditable;
    paletteFileText.classList.toggle("is-editable", isEditable);
    editPaletteFileBtn?.classList.toggle("active", isEditable);
    editPaletteFileBtn?.setAttribute("aria-pressed", String(isEditable));
    if (editPaletteFileBtn) editPaletteFileBtn.title = isEditable ? "Stop editing palette file text" : "Edit palette file text";
  }

  function getRows() {
    return buildPaletteRows(mappings, names, includeBlackWhite());
  }

  function getFiles() {
    return buildPaletteFiles(getRows());
  }

  function updatePaletteFilePreview() {
    if (!paletteFileText) return;
    isApplyingPaletteText = true;

    if (!originalImageData || mappings.length === 0) {
      paletteFileText.value = "No sprite uploaded.";
      isApplyingPaletteText = false;
      return;
    }

    const files = getFiles();
    paletteFileText.value = files[paletteFileFormat] || "";
    isApplyingPaletteText = false;
  }

  function renderSwapControls() {
    mappings.forEach(mapping => mapping.pickr?.destroyAndRemove?.());
    swapList.innerHTML = "";

    getSortedSpriteMappings(mappings).forEach(mapping => {
      const originalIndex = mappings.findIndex(item => item.id === mapping.id);
      const row = document.createElement("div");
      row.className = "swap-row";
      row.dataset.mappingId = mapping.id;
      row.style.setProperty("--replacement-color", mapping.replacementHex);
      row.innerHTML = `
        <div class="swap-map">
          <span class="swap-drag-handle material-symbols-rounded" draggable="true" data-drag-mapping-id="${mapping.id}" aria-label="Drag to reorder color" title="Drag to reorder">drag_indicator</span>
          <div class="editable-color">
            <div class="pickr-anchor swap-pickr"></div>
          </div>
          <button class="swap-reset-btn" type="button" aria-label="Reset this color" title="Reset this color" data-reset-mapping-id="${mapping.id}">
            <span class="material-symbols-rounded">restart_alt</span>
          </button>
        </div>
        <div class="swap-editor" data-mapping-id="${mapping.id}">
          <input
            aria-label="Color ${mapping.id} name"
            class="swap-editor-field"
            value="${escapeHtml(names[originalIndex] || getDefaultColorName(mapping, mappings))}"
            data-color-name-index="${originalIndex}"
          />
          <button class="copy-color-btn inline-copy-btn" type="button" aria-label="Copy color name" title="Copy color name" data-color-name-index="${originalIndex}">
            <span class="material-symbols-rounded">content_copy</span>
          </button>
        </div>
      `;
      swapList.appendChild(row);

      const pickrEl = row.querySelector(".swap-pickr");
      mapping.pickr = createPickr(pickrEl, mapping.replacementHex, hex => {
        mapping.replacementHex = hex;
        row.style.setProperty("--replacement-color", hex);
        recolorSprite();
      }, spriteToast);
    });

    updatePaletteFilePreview();
    updateHighlights();
  }

  function applySpriteZoom() {
    originalCanvas.style.width = originalImageData ? `${originalImageData.width * spriteZoom}px` : "";
    originalCanvas.style.height = originalImageData ? `${originalImageData.height * spriteZoom}px` : "";
    previewCanvas.style.width = originalImageData ? `${originalImageData.width * spriteZoom}px` : "";
    previewCanvas.style.height = originalImageData ? `${originalImageData.height * spriteZoom}px` : "";
  }

  function recolorSprite() {
    if (!originalImageData) {
      updatePaletteFilePreview();
      return;
    }

    const imageData = new ImageData(new Uint8ClampedArray(originalImageData.data), originalImageData.width, originalImageData.height);
    const replacementMap = new Map(mappings.map(mapping => [mapping.key, hexToRgb(mapping.replacementHex)]));

    for (let i = 0; i < imageData.data.length; i += 4) {
      const r = imageData.data[i];
      const g = imageData.data[i + 1];
      const b = imageData.data[i + 2];
      const a = imageData.data[i + 3];
      if (a === 0) continue;

      const replacement = replacementMap.get(rgbKey(r, g, b));
      if (!replacement) continue;

      imageData.data[i] = replacement.r;
      imageData.data[i + 1] = replacement.g;
      imageData.data[i + 2] = replacement.b;
    }

    previewCanvas.width = imageData.width;
    previewCanvas.height = imageData.height;
    previewCtx.putImageData(imageData, 0, 0);
    applySpriteZoom();
    previewEmpty.style.display = "none";
    previewCanvas.style.display = "block";
    previewSize.textContent = `${imageData.width}×${imageData.height}`;
    updatePaletteFilePreview();
  }

  function loadSprite(file) {
    const reader = new FileReader();
    reader.onload = event => {
      const img = new Image();
      img.onload = () => {
        originalCanvas.width = img.width;
        originalCanvas.height = img.height;
        previewCanvas.width = img.width;
        previewCanvas.height = img.height;

        originalCtx.clearRect(0, 0, img.width, img.height);
        originalCtx.drawImage(img, 0, 0);
        originalImageData = originalCtx.getImageData(0, 0, img.width, img.height);

        const colorMap = new Map();
        for (let i = 0; i < originalImageData.data.length; i += 4) {
          const r = originalImageData.data[i];
          const g = originalImageData.data[i + 1];
          const b = originalImageData.data[i + 2];
          const a = originalImageData.data[i + 3];
          if (a === 0) continue;

          const key = rgbKey(r, g, b);
          const existing = colorMap.get(key);
          if (existing) existing.count += 1;
          else colorMap.set(key, { key, r, g, b, a, hex: toHex(r, g, b), count: 1 });
        }

        spriteColors = Array.from(colorMap.values()).sort((a, b) => b.count - a.count);
        mappings = buildMappings(spriteColors);
        currentSpriteName = file.name.replace(/\.[^.]+$/, "") || "Sprite";
        names = mappings.map(mapping => getDefaultColorName(mapping, mappings));
        hoveredMappingId = null;
        pinnedMappingId = null;
        draggedMappingId = null;

        originalEmpty.style.display = "none";
        originalCanvas.style.display = "block";
        originalCanvas.classList.add("is-picking");
        originalSize.textContent = `${img.width}×${img.height}`;
        applySpriteZoom();
        setPaletteFileEditable(true);
        renderSwapControls();
        recolorSprite();
        saveSpritePaletteBtn.disabled = false;
        importSavedPaletteBtn.disabled = false;
        downloadPaletteFileBtn.disabled = false;
        copyPaletteFileBtn.disabled = false;
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  }

  function clearSprite() {
    spriteUpload.value = "";
    originalImageData = null;
    spriteColors = [];
    mappings = [];
    names = [];
    currentSpriteName = "Sprite";
    saveSpritePaletteBtn.disabled = true;
    importSavedPaletteBtn.disabled = true;
    downloadPaletteFileBtn.disabled = true;
    copyPaletteFileBtn.disabled = true;

    originalCtx.clearRect(0, 0, originalCanvas.width, originalCanvas.height);
    previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
    originalCanvas.width = 0;
    originalCanvas.height = 0;
    previewCanvas.width = 0;
    previewCanvas.height = 0;

    hoveredMappingId = null;
    pinnedMappingId = null;
    draggedMappingId = null;
    originalCanvas.style.display = "none";
    originalCanvas.classList.remove("is-picking");
    previewCanvas.style.display = "none";
    originalEmpty.style.display = "grid";
    previewEmpty.style.display = "grid";
    originalSize.textContent = "";
    previewSize.textContent = "";
    swapList.innerHTML = "";
    setPaletteFileEditable(true);
    updatePaletteFilePreview();
    showToast(spriteToast, "Image cleared.");
  }

  function getIndexedImageData() {
    if (!originalImageData || mappings.length === 0) return null;

    const imageData = new ImageData(new Uint8ClampedArray(originalImageData.data), originalImageData.width, originalImageData.height);
    const indexMap = new Map(mappings.map((mapping, index) => [mapping.key, index]));
    const maxIndex = Math.max(1, mappings.length - 1);

    for (let i = 0; i < imageData.data.length; i += 4) {
      const a = imageData.data[i + 3];
      if (a === 0) continue;
      const key = rgbKey(imageData.data[i], imageData.data[i + 1], imageData.data[i + 2]);
      const index = indexMap.get(key) ?? 0;
      const shade = Math.round((index / maxIndex) * 255);
      imageData.data[i] = shade;
      imageData.data[i + 1] = shade;
      imageData.data[i + 2] = shade;
    }

    return imageData;
  }

  function applyPalettePreviewText() {
    if (isApplyingPaletteText || !isPaletteFileEditable || !originalImageData || mappings.length === 0) return;

    let parsedColors;
    try {
      parsedColors = parsePalettePreviewText(paletteFileText.value, paletteFileFormat);
    } catch (err) {
      showToast(spriteToast, err.message);
      return;
    }

    const targetMappings = getExportOrderedMappings(mappings, includeBlackWhite());
    if (parsedColors.length !== targetMappings.length) {
      showToast(spriteToast, `Expected ${targetMappings.length} colors, found ${parsedColors.length}.`);
      return;
    }

    parsedColors.forEach((color, index) => {
      const mapping = targetMappings[index];
      const originalIndex = mappings.findIndex(item => item.id === mapping.id);
      if (originalIndex < 0) return;
      mapping.replacementHex = toHex(color.r, color.g, color.b);
      if (color.name) names[originalIndex] = color.name;
    });

    renderSwapControls();
    recolorSprite();
    showToast(spriteToast, "Palette preview applied.");
  }

  function setPaletteFileFormat(value, label) {
    paletteFileFormat = value;
    paletteFileFormatButton.textContent = label || value;
    paletteFileFormatMenu.querySelectorAll("button").forEach(btn => btn.classList.toggle("active", btn.dataset.value === value));
    setPaletteFileEditable(true);
    updatePaletteFilePreview();
  }

  spriteUpload.addEventListener("click", () => {
    spriteUpload.value = "";
  });

  spriteUpload.addEventListener("change", () => {
    const file = spriteUpload.files[0];
    if (file) loadSprite(file);
  });

  clearSpriteBtn.addEventListener("click", clearSprite);

  swapList.addEventListener("click", async event => {
    const resetButton = event.target.closest(".swap-reset-btn");
    if (resetButton) {
      const mapping = mappings.find(item => item.id === resetButton.dataset.resetMappingId);
      if (!mapping) return;
      mapping.replacementHex = mapping.source.hex;
      mapping.pickr?.setColor(mapping.replacementHex, true);
      renderSwapControls();
      recolorSprite();
      showToast(spriteToast, "Color reset.");
      return;
    }

    const copyButton = event.target.closest(".copy-color-btn");
    if (!copyButton) return;
    const index = Number.parseInt(copyButton.dataset.colorNameIndex, 10);
    if (Number.isNaN(index)) return;
    await copyText(names[index] || `Color ${index + 1}`);
    showToast(spriteToast, "Color name copied.");
  });

  swapList.addEventListener("dragstart", event => {
    const handle = event.target.closest(".swap-drag-handle");
    if (!handle) return;
    draggedMappingId = handle.dataset.dragMappingId;
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", draggedMappingId);
    handle.closest(".swap-row")?.classList.add("swap-row--dragging");
  });

  swapList.addEventListener("dragover", event => {
    if (!draggedMappingId) return;
    const row = event.target.closest(".swap-row");
    if (!row || row.dataset.mappingId === draggedMappingId || !row.querySelector(".swap-drag-handle")) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    swapList.querySelectorAll(".swap-row--drop-target").forEach(item => item.classList.remove("swap-row--drop-target"));
    row.classList.add("swap-row--drop-target");
  });

  swapList.addEventListener("drop", event => {
    const targetRow = event.target.closest(".swap-row");
    if (!draggedMappingId || !targetRow || !targetRow.querySelector(".swap-drag-handle")) return;
    event.preventDefault();

    const ordered = getSortedSpriteMappings(mappings);
    const fromIndex = ordered.findIndex(mapping => mapping.id === draggedMappingId);
    const toIndex = ordered.findIndex(mapping => mapping.id === targetRow.dataset.mappingId);
    if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return;

    const values = ordered.map(mapping => {
      const originalIndex = mappings.findIndex(item => item.id === mapping.id);
      return { replacementHex: mapping.replacementHex, name: names[originalIndex] };
    });
    const [moved] = values.splice(fromIndex, 1);
    values.splice(toIndex, 0, moved);
    ordered.forEach((mapping, index) => {
      const originalIndex = mappings.findIndex(item => item.id === mapping.id);
      mapping.replacementHex = values[index].replacementHex;
      names[originalIndex] = values[index].name;
    });

    draggedMappingId = null;
    renderSwapControls();
    recolorSprite();
    showToast(spriteToast, "Color order updated.");
  });

  swapList.addEventListener("dragend", () => {
    draggedMappingId = null;
    swapList.querySelectorAll(".swap-row--dragging, .swap-row--drop-target").forEach(row => row.classList.remove("swap-row--dragging", "swap-row--drop-target"));
  });

  swapList.addEventListener("input", event => {
    const inputEl = event.target.closest("input[data-color-name-index]");
    if (!inputEl) return;
    const index = Number.parseInt(inputEl.dataset.colorNameIndex, 10);
    if (Number.isNaN(index)) return;
    names[index] = inputEl.value.trim() || `Color ${index + 1}`;
    updatePaletteFilePreview();
  });

  zoomButtons.forEach(button => {
    button.addEventListener("click", () => {
      spriteZoom = Number(button.dataset.zoom);
      zoomButtons.forEach(btn => btn.classList.toggle("active", btn === button));
      applySpriteZoom();
    });
  });

  resetSwapColorsBtn.addEventListener("click", () => {
    mappings = buildMappings(spriteColors);
    names = mappings.map(mapping => getDefaultColorName(mapping, mappings));
    draggedMappingId = null;
    renderSwapControls();
    recolorSprite();
    showToast(spriteToast, "Colors reset.");
  });

  downloadSpriteBtn.addEventListener("click", () => {
    if (!originalImageData || previewCanvas.width === 0 || previewCanvas.height === 0) {
      showToast(spriteToast, "Upload a sprite first.");
      return;
    }

    try {
      const fileBase = spriteUpload.files?.[0]?.name?.replace(/\.[^.]+$/, "") || "recolored-sprite";
      const link = document.createElement("a");
      link.download = `${fileBase}-recolored.png`;
      link.href = previewCanvas.toDataURL("image/png");
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      link.remove();
      showToast(spriteToast, "Preview PNG downloaded.");
    } catch {
      showToast(spriteToast, "Download failed.");
    }
  });

  downloadIndexedBtn.addEventListener("click", async () => {
    if (!originalImageData || mappings.length === 0) {
      showToast(spriteToast, "Upload a sprite first.");
      return;
    }

    if (typeof JSZip === "undefined") {
      showToast(spriteToast, "ZIP exporter failed to load.");
      return;
    }

    try {
      const indexedImageData = getIndexedImageData();
      if (!indexedImageData) throw new Error("Indexed export failed.");

      const exportCanvas = document.createElement("canvas");
      const exportCtx = exportCanvas.getContext("2d");
      exportCanvas.width = indexedImageData.width;
      exportCanvas.height = indexedImageData.height;
      exportCtx.putImageData(indexedImageData, 0, 0);

      const pngBlob = await canvasBlob(exportCanvas);
      const fileBase = spriteUpload.files?.[0]?.name?.replace(/\.[^.]+$/, "") || "sprite";
      const zip = new JSZip();
      zip.file("images/indexed-grayscale.png", pngBlob);

      Object.entries(getFiles()).forEach(([filename, contents]) => zip.file(filename, contents));

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const objectUrl = URL.createObjectURL(zipBlob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `${fileBase}-indexed-palette.zip`;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
      showToast(spriteToast, "Indexed package downloaded.");
    } catch {
      showToast(spriteToast, "Indexed export failed.");
    }
  });

  downloadPaletteFileBtn?.addEventListener("click", () => {
    if (!paletteFileText.value.trim() || paletteFileText.value === "No sprite uploaded.") return;
    const selectedName = paletteFileFormat.split("/").pop() || "palette.txt";
    const extension = selectedName.split(".").pop() || "txt";
    const formatSuffix = extension === "txt" ? `-${selectedName.replace(/\.txt$/i, "")}` : "";
    const blob = new Blob([paletteFileText.value], { type: "text/plain;charset=utf-8" });
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = `${sanitizeFileName(currentSpriteName)}${formatSuffix}.${extension}`;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectUrl);
    showToast(spriteToast, "Palette file downloaded.");
  });

  copyPaletteFileBtn.addEventListener("click", async () => {
    if (!paletteFileText.value.trim() || paletteFileText.value === "No sprite uploaded.") return;
    await copyText(paletteFileText.value);
    showToast(spriteToast, "Palette file text copied.");
  });

  editPaletteFileBtn?.addEventListener("click", () => setPaletteFileEditable(!isPaletteFileEditable));

  excludeBlackWhiteToggle.addEventListener("change", updatePaletteFilePreview);

  paletteFileText.addEventListener("input", () => {
    if (!isPaletteFileEditable) return;
    window.clearTimeout(palettePreviewApplyTimer);
    palettePreviewApplyTimer = window.setTimeout(applyPalettePreviewText, 250);
  });

  originalCanvas.addEventListener("mousemove", event => {
    const id = getPixelMappingId(event);
    if (id === hoveredMappingId) return;
    hoveredMappingId = id;
    updateHighlights();
  });

  originalCanvas.addEventListener("mouseleave", () => {
    hoveredMappingId = null;
    updateHighlights();
  });

  originalCanvas.addEventListener("click", event => {
    const id = getPixelMappingId(event);
    pinnedMappingId = (id && id !== pinnedMappingId) ? id : null;
    updateHighlights();
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && pinnedMappingId) {
      pinnedMappingId = null;
      updateHighlights();
    }
  });

  async function openSavedPaletteDialog() {
    importSavedPaletteList.replaceChildren();
    let palettes = [];
    try { palettes = await listPalettes(); } catch {}

    if (!palettes.length) {
      const empty = document.createElement("p");
      empty.className = "saved-palettes-empty";
      empty.textContent = "No saved palettes. Create one in Palette Builder first.";
      importSavedPaletteList.appendChild(empty);
    } else {
      palettes.forEach(palette => {
        const button = document.createElement("button");
        button.className = "import-saved-palette-option";
        button.type = "button";
        button.dataset.paletteId = String(palette.id);
        button.innerHTML = `
          <span class="saved-palette-name">${escapeHtml(palette.name)}</span>
          <span class="saved-palette-meta">${palette.colorCount} color${palette.colorCount === 1 ? "" : "s"}</span>
          <span class="material-symbols-rounded" aria-hidden="true">chevron_right</span>`;
        importSavedPaletteList.appendChild(button);
      });
    }
    importSavedPaletteDialog.showModal();
  }

  function applySavedPalette(palette) {
    const sorted = getSortedSpriteMappings(mappings);
    const currentHasWhite = sorted.length > 0 && sorted[0].source.hex.toUpperCase() === "#FFFFFF";
    const currentHasBlack = sorted.length > 0 && sorted[sorted.length - 1].source.hex.toUpperCase() === "#000000";

    function applyEntry(saved, mapping) {
      const originalIndex = mappings.findIndex(item => item.id === mapping.id);
      mapping.replacementHex = saved.replacementHex;
      if (saved.name) names[originalIndex] = saved.name;
    }

    if (palette.source === "builder") {
      palette.colors.forEach((saved, index) => {
        if (index < sorted.length) applyEntry(saved, sorted[index]);
      });
    } else if (palette.hasWhite !== undefined) {
      const savedNormals = palette.colors.slice(palette.hasWhite ? 1 : 0, palette.colors.length - (palette.hasBlack ? 1 : 0));
      const currentNormals = sorted.slice(currentHasWhite ? 1 : 0, sorted.length - (currentHasBlack ? 1 : 0));
      if (palette.hasWhite && currentHasWhite) applyEntry(palette.colors[0], sorted[0]);
      if (palette.hasBlack && currentHasBlack) applyEntry(palette.colors[palette.colors.length - 1], sorted[sorted.length - 1]);
      savedNormals.forEach((saved, index) => {
        if (index < currentNormals.length) applyEntry(saved, currentNormals[index]);
      });
    } else {
      palette.colors.forEach((saved, index) => {
        if (index < sorted.length) applyEntry(saved, sorted[index]);
      });
    }

    renderSwapControls();
    recolorSprite();
  }

  importSavedPaletteBtn.addEventListener("click", openSavedPaletteDialog);
  cancelImportSavedPaletteBtn.addEventListener("click", () => importSavedPaletteDialog.close());
  importSavedPaletteList.addEventListener("click", async event => {
    const option = event.target.closest(".import-saved-palette-option");
    if (!option) return;
    try {
      const palette = await loadPaletteById(Number(option.dataset.paletteId));
      if (!palette) return;
      applySavedPalette(palette);
      importSavedPaletteDialog.close();
      showToast(spriteToast, `Imported “${palette.name}”.`);
    } catch {
      showToast(spriteToast, "Palette could not be imported.");
    }
  });

  saveSpritePaletteBtn.addEventListener("click", () => {
    if (!originalImageData || mappings.length === 0) {
      showToast(spriteToast, "Upload a sprite first.");
      return;
    }
    saveSpritePaletteName.value = currentSpriteName;
    saveSpritePaletteDialog.showModal();
    saveSpritePaletteName.select();
  });

  cancelSaveSpritePaletteBtn.addEventListener("click", () => saveSpritePaletteDialog.close());

  saveSpritePaletteForm.addEventListener("submit", async event => {
    event.preventDefault();
    if (!originalImageData || mappings.length === 0) {
      saveSpritePaletteDialog.close();
      showToast(spriteToast, "Upload a sprite first.");
      return;
    }
    const name = saveSpritePaletteName.value.trim();
    if (!name) {
      saveSpritePaletteName.focus();
      return;
    }
    const sortedForSave = getSortedSpriteMappings(mappings);
    const hasWhite = sortedForSave.length > 0 && sortedForSave[0].source.hex.toUpperCase() === "#FFFFFF";
    const hasBlack = sortedForSave.length > 0 && sortedForSave[sortedForSave.length - 1].source.hex.toUpperCase() === "#000000";
    const colors = sortedForSave.map(mapping => {
      const originalIndex = mappings.findIndex(item => item.id === mapping.id);
      return {
        replacementHex: mapping.replacementHex,
        name: names[originalIndex] || getDefaultColorName(mapping, mappings)
      };
    });
    try {
      await savePalette(name, colors, hasWhite, hasBlack);
      saveSpritePaletteDialog.close();
      document.dispatchEvent(new CustomEvent("palette-library-changed"));
      showToast(spriteToast, `“${name}” saved to Palette Builder.`);
    } catch {
      showToast(spriteToast, "Failed to save palette.");
    }
  });

  importPaletteFileBtn?.addEventListener("click", () => {
    if (!originalImageData || mappings.length === 0) {
      showToast(spriteToast, "Upload a sprite first.");
      return;
    }
    importPaletteFileInput.click();
  });

  function detectFormatFromContent(text) {
    const firstLine = text.trim().split(/\r?\n/)[0].trim();
    if (firstLine === "JASC-PAL") return "palettes/jasc.pal";
    if (firstLine === "GIMP Palette") return "palettes/gimp.gpl";
    return null;
  }

  function applyPaletteImport(text, format, filename) {
    let parsedColors;
    try {
      parsedColors = parsePalettePreviewText(text, format);
    } catch (err) {
      showToast(spriteToast, err.message || "Could not parse palette file.");
      return;
    }

    if (parsedColors.length === 0) {
      showToast(spriteToast, "No colors found in file.");
      return;
    }

    const sorted = getSortedSpriteMappings(mappings);
    const hasWhiteSlot = sorted.length > 0 && sorted[0].source.hex.toUpperCase() === "#FFFFFF";
    const hasBlackSlot = sorted.length > 0 && sorted[sorted.length - 1].source.hex.toUpperCase() === "#000000";
    const bwCount = (hasWhiteSlot ? 1 : 0) + (hasBlackSlot ? 1 : 0);

    function applyImportColor(color, mapping) {
      const originalIndex = mappings.findIndex(item => item.id === mapping.id);
      mapping.replacementHex = toHex(color.r, color.g, color.b);
      if (color.name) names[originalIndex] = color.name;
    }

    if (bwCount > 0 && parsedColors.length === sorted.length - bwCount) {
      const normals = sorted.slice(hasWhiteSlot ? 1 : 0, sorted.length - (hasBlackSlot ? 1 : 0));
      parsedColors.forEach((color, index) => {
        if (index >= normals.length) return;
        applyImportColor(color, normals[index]);
      });
    } else {
      parsedColors.forEach((color, index) => {
        if (index >= sorted.length) return;
        applyImportColor(color, sorted[index]);
      });
    }

    const formatLabel = paletteFileFormatMenu.querySelector(`[data-value="${format}"]`)?.textContent || format;
    setPaletteFileFormat(format, formatLabel);
    renderSwapControls();
    recolorSprite();
    showToast(spriteToast, `Palette imported from "${filename}".`);
  }

  let pendingImportText = null;
  let pendingImportFilename = null;

  importPaletteFileInput?.addEventListener("change", () => {
    const file = importPaletteFileInput.files[0];
    if (!file) return;
    importPaletteFileInput.value = "";

    const reader = new FileReader();
    reader.onload = event => {
      const text = event.target.result;
      const format = detectFormatFromContent(text);
      if (format) {
        applyPaletteImport(text, format, file.name);
      } else {
        pendingImportText = text;
        pendingImportFilename = file.name;
        paletteFormatDialog.showModal();
      }
    };
    reader.readAsText(file);
  });

  paletteFormatDialogOptions.addEventListener("click", event => {
    const btn = event.target.closest("[data-value]");
    if (!btn) return;
    paletteFormatDialog.close();
    if (pendingImportText !== null) {
      applyPaletteImport(pendingImportText, btn.dataset.value, pendingImportFilename);
      pendingImportText = null;
      pendingImportFilename = null;
    }
  });

  paletteFormatDialogCancel.addEventListener("click", () => {
    paletteFormatDialog.close();
    pendingImportText = null;
    pendingImportFilename = null;
  });

  originalCanvas.style.display = "none";
  previewCanvas.style.display = "none";
  setPaletteFileEditable(true);
  updatePaletteFilePreview();

  return { setPaletteFileFormat };
}
