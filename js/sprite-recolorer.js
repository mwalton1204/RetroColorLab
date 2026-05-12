



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

  function includeBlackWhite() {
    return !excludeBlackWhiteToggle.checked;
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
    editPaletteFileBtn.classList.toggle("active", isEditable);
    editPaletteFileBtn.setAttribute("aria-pressed", String(isEditable));
    editPaletteFileBtn.title = isEditable ? "Stop editing palette file text" : "Edit palette file text";
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

    getSortedSpriteMappings(mappings).forEach((mapping, visibleIndex) => {
      const originalIndex = mappings.findIndex(item => item.id === mapping.id);
      const row = document.createElement("div");
      row.className = "swap-row";
      row.dataset.mappingId = mapping.id;
      row.style.setProperty("--replacement-color", mapping.replacementHex);
      row.innerHTML = `
        <div class="swap-map">
          <span class="swap-index">${visibleIndex + 1}</span>
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
        names = mappings.map(mapping => getDefaultColorName(mapping, mappings));

        originalEmpty.style.display = "none";
        originalCanvas.style.display = "block";
        originalSize.textContent = `${img.width}×${img.height}`;
        applySpriteZoom();
        setPaletteFileEditable(false);
        renderSwapControls();
        recolorSprite();
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

    originalCtx.clearRect(0, 0, originalCanvas.width, originalCanvas.height);
    previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
    originalCanvas.width = 0;
    originalCanvas.height = 0;
    previewCanvas.width = 0;
    previewCanvas.height = 0;

    originalCanvas.style.display = "none";
    previewCanvas.style.display = "none";
    originalEmpty.style.display = "grid";
    previewEmpty.style.display = "grid";
    originalSize.textContent = "";
    previewSize.textContent = "";
    swapList.innerHTML = "";
    setPaletteFileEditable(false);
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
    setPaletteFileEditable(false);
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
    renderSwapControls();
    recolorSprite();
    showToast(spriteToast, "Swap colors reset.");
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

  downloadPaletteFileBtn.addEventListener("click", () => {
    if (!paletteFileText.value.trim() || paletteFileText.value === "No sprite uploaded.") return;
    const selectedName = paletteFileFormat.split("/").pop() || "palette.txt";
    const blob = new Blob([paletteFileText.value], { type: "text/plain;charset=utf-8" });
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = `${sanitizeFileName("retrocolorlab")}-${selectedName}`;
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

  editPaletteFileBtn.addEventListener("click", () => setPaletteFileEditable(!isPaletteFileEditable));

  excludeBlackWhiteToggle.addEventListener("change", updatePaletteFilePreview);

  paletteFileText.addEventListener("input", () => {
    if (!isPaletteFileEditable) return;
    window.clearTimeout(palettePreviewApplyTimer);
    palettePreviewApplyTimer = window.setTimeout(applyPalettePreviewText, 250);
  });

  originalCanvas.style.display = "none";
  previewCanvas.style.display = "none";
  setPaletteFileEditable(false);
  updatePaletteFilePreview();

  return { setPaletteFileFormat };
}
