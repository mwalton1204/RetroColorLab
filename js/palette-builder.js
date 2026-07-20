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
  const folderDialog = document.getElementById("paletteFolderDialog");
  const folderForm = document.getElementById("paletteFolderForm");
  const folderDialogTitle = document.getElementById("paletteFolderDialogTitle");
  const folderDeleteHelp = document.getElementById("paletteFolderDeleteHelp");
  const folderNameControl = document.getElementById("paletteFolderNameControl");
  const folderNameInput = document.getElementById("paletteFolderName");
  const folderCancelButton = document.getElementById("paletteFolderCancelBtn");
  const folderSubmitButton = document.getElementById("paletteFolderSubmitBtn");
  const paletteDeleteDialog = document.getElementById("paletteDeleteDialog");
  const paletteDeleteForm = document.getElementById("paletteDeleteForm");
  const paletteDeleteHelp = document.getElementById("paletteDeleteHelp");
  const paletteDeleteCancelButton = document.getElementById("paletteDeleteCancelBtn");
  const saveButton = document.getElementById("saveBuilderPaletteBtn");
  const saveButtonLabel = document.getElementById("builderSavePaletteLabel");
  const copyButton = document.getElementById("copyBuilderPaletteBtn");
  const downloadButton = document.getElementById("downloadBuilderPaletteBtn");
  const savedList = document.getElementById("builderSavedPalettes");
  const addFolderButton = document.getElementById("builderAddFolderBtn");
  const folderSearchButton = document.getElementById("builderFolderSearchBtn");
  const folderSearchControl = document.getElementById("builderFolderSearchControl");
  const folderSearch = document.getElementById("builderFolderSearch");
  const librarySearchButton = document.getElementById("builderPaletteSearchBtn");
  const librarySortButton = document.getElementById("builderPaletteSortBtn");
  const librarySearchControl = document.getElementById("builderPaletteSearchControl");
  const librarySortControl = document.getElementById("builderPaletteSortControl");
  const librarySearch = document.getElementById("builderPaletteSearch");
  const librarySort = document.getElementById("builderPaletteSort");
  const toast = document.getElementById("appToast");

  let displayFormat = "palettes/rgb888.txt";
  let colors = [];
  let currentPaletteId = null;
  let dirty = false;
  let libraryPalettes = [];
  let libraryFolders = [];
  const collapsedFolderIds = new Set();
  const knownFolderIds = new Set();
  let draggedPaletteId = null;
  let draggedFolderId = null;
  let rowPickrs = [];
  let draggedColorIndex = null;
  let pendingImportText = null;
  let pendingImportFilename = null;
  let autosaveTimer = null;
  let folderDialogMode = "create";
  let folderDialogId = null;
  let pendingDeletePaletteId = null;
  let scrollCueObserver = null;
  let folderViewportHeight = 223;

  function updateColorListFade() {
    const hasOverflow = list.scrollHeight > list.clientHeight + 1;
    const hasMoreBelow = list.scrollTop + list.clientHeight < list.scrollHeight - 1;
    list.classList.toggle("has-scroll-fade", hasOverflow && hasMoreBelow);
  }

  list.addEventListener("scroll", updateColorListFade, { passive: true });
  if (typeof ResizeObserver === "function") new ResizeObserver(updateColorListFade).observe(list);

  function normalizeSavedColor(entry, index = 0) {
    const hex = typeof entry === "string" ? entry : entry?.replacementHex;
    if (!hex) return null;
    try {
      return {
        ...colorFromHex(hex),
        name: typeof entry?.name === "string" && entry.name.trim() ? entry.name.trim() : `Color ${index + 1}`
      };
    } catch { return null; }
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
    return JSON.stringify({ name: nameInput.value.trim(), colors: colors.map(color => ({ hex: color.hex, name: color.name })) });
  }

  async function autosaveCurrentPalette() {
    autosaveTimer = null;
    const id = currentPaletteId;
    const name = nameInput.value.trim();
    if (!id || !name) return;
    const signature = paletteSignature();
    const records = colors.map((color, index) => ({ replacementHex: color.hex, name: color.name || `Color ${index + 1}` }));
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
      name: color.name || `Color ${index + 1}`
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

      const name = document.createElement("input");
      name.className = "swap-editor-field palette-builder-color-name";
      name.type = "text";
      name.value = color.name || `Color ${index + 1}`;
      name.placeholder = `Color ${index + 1}`;
      name.dataset.index = String(index);
      name.setAttribute("aria-label", `Color ${index + 1} name`);

      const controls = document.createElement("div");
      controls.className = "palette-builder-row-actions";
      controls.innerHTML = `
        <button class="preview-download-btn builder-copy-color" type="button" data-index="${index}" aria-label="Copy color ${index + 1}" title="Copy color"><span class="material-symbols-rounded">content_copy</span></button>
        <button class="preview-download-btn builder-remove-color" type="button" data-index="${index}" aria-label="Delete color ${index + 1}" title="Delete color"><span class="material-symbols-rounded">delete</span></button>
      `;

      row.append(handle, editableColor, name, controls);
      list.appendChild(row);

      const rowPickr = createPickr(pickerAnchor, color.hex, hex => {
        const updatedColor = colorFromHex(hex);
        colors[index] = { ...updatedColor, name: colors[index]?.name || `Color ${index + 1}` };
        row.style.setProperty("--replacement-color", updatedColor.hex);
        paletteText.value = formattedPalette();
        setDirty();
      }, toast);
      rowPickrs.push(rowPickr);
    });
    requestAnimationFrame(updateColorListFade);
  }

  function addColor(hex, options = {}) {
    let color;
    try { color = colorFromHex(hex); } catch { return false; }
    if (colors.some(entry => entry.hex.toUpperCase() === color.hex.toUpperCase())) {
      showToast(toast, `${color.hex} is already in this palette.`);
      if (options.focus) section.scrollIntoView({ behavior: "smooth", block: "start" });
      return false;
    }
    colors.push({ ...color, name: options.name?.trim() || `Color ${colors.length + 1}` });
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
    const restoreSearchFocus = document.activeElement === librarySearch;
    const searchSelectionStart = librarySearch.selectionStart;
    const searchSelectionEnd = librarySearch.selectionEnd;
    const restoreFolderSearchFocus = document.activeElement === folderSearch;
    const folderSearchSelectionStart = folderSearch.selectionStart;
    const folderSearchSelectionEnd = folderSearch.selectionEnd;
    const query = librarySearch.value.trim().toLocaleLowerCase();
    const folderQuery = folderSearch.value.trim().toLocaleLowerCase();
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
    const visibleFolders = libraryFolders
      .filter(folder => query || !folderQuery || folder.name.toLocaleLowerCase().includes(folderQuery));
    savedList.replaceChildren();

    const foldersHeader = document.createElement("div");
    foldersHeader.className = "saved-palette-groups-head is-folders-head";
    foldersHeader.innerHTML = `<span class="saved-palette-folder-name">Folders</span><span class="saved-palette-folder-count">${visibleFolders.length}</span>`;
    const folderTools = document.createElement("div");
    folderTools.className = "palette-builder-library-tools";
    addFolderButton.hidden = false;
    folderSearchButton.hidden = false;
    folderTools.append(addFolderButton, folderSearchButton);
    foldersHeader.appendChild(folderTools);

    function createPaletteItem(palette) {
      const item = document.createElement("div");
      item.className = "saved-palette-item";
      item.dataset.id = String(palette.id);
      item.draggable = true;
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
            <span class="saved-palette-editing-label">Editing</span>
          </span>
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
      return item;
    }

    function createFolderGroup(folder, folderPalettes) {
      const folderId = folder ? String(folder.id) : "";
      const collapsed = folder ? collapsedFolderIds.has(folderId) : false;
      const group = document.createElement("section");
      group.className = "saved-palette-folder";
      if (!folder) {
        group.classList.add("is-unfiled");
      }
      group.dataset.folderId = folderId;

      const header = document.createElement("div");
      if (folder) {
        header.className = "saved-palette-folder-head";
        header.draggable = true;
        header.innerHTML = `
          <button class="saved-palette-folder-toggle" type="button" data-folder-id="${folderId}" aria-expanded="${!collapsed}">
            <span class="material-symbols-rounded" aria-hidden="true">folder</span>
            <span class="saved-palette-folder-name">${escapeHtml(folder.name)}</span>
            <span class="saved-palette-folder-count">${folderPalettes.length}</span>
          </button>`;
        const actions = document.createElement("div");
        actions.className = "saved-palette-folder-actions";
        actions.innerHTML = `
          <button class="preview-download-btn saved-palette-folder-rename" type="button" data-folder-id="${folderId}" aria-label="Rename ${escapeHtml(folder.name)}" title="Rename folder"><span class="material-symbols-rounded" aria-hidden="true">edit</span></button>
          <button class="preview-download-btn saved-palette-folder-delete" type="button" data-folder-id="${folderId}" aria-label="Delete ${escapeHtml(folder.name)}" title="Delete folder"><span class="material-symbols-rounded" aria-hidden="true">delete</span></button>`;
        header.appendChild(actions);
        const chevron = document.createElement("span");
        chevron.className = "saved-palette-folder-chevron material-symbols-rounded";
        chevron.setAttribute("aria-hidden", "true");
        chevron.textContent = "expand_more";
        header.appendChild(chevron);
      } else {
        header.className = "saved-palette-folder-head saved-palette-groups-head";
        header.innerHTML = `<span class="saved-palette-folder-name">Unfiled Palettes</span><span class="saved-palette-folder-count">${folderPalettes.length}</span>`;
        const tools = document.createElement("div");
        tools.className = "saved-palette-unfiled-tools";
        librarySortButton.hidden = false;
        librarySearchButton.hidden = false;
        tools.append(librarySortButton, librarySearchButton);
        header.appendChild(tools);
      }

      const contents = document.createElement("div");
      contents.className = "saved-palette-folder-contents";
      contents.hidden = collapsed;
      if (!folder) {
        contents.append(librarySearchControl, librarySortControl);
      }

      const paletteList = document.createElement("div");
      paletteList.className = "saved-palette-folder-palette-list";
      if (folderPalettes.length > 3) paletteList.classList.add("has-more-than-three");
      if (folderPalettes.length) {
        folderPalettes.forEach(palette => paletteList.appendChild(createPaletteItem(palette)));
      } else {
        const empty = document.createElement("p");
        empty.className = "saved-palette-folder-empty";
        empty.textContent = query ? "No matching palettes" : "Drop palettes here";
        paletteList.appendChild(empty);
      }
      contents.appendChild(paletteList);
      group.append(header, contents);
      return group;
    }

    const foldersRegion = document.createElement("div");
    foldersRegion.className = "saved-palette-folders-region";
    foldersRegion.style.height = `${folderViewportHeight}px`;
    foldersRegion.style.minHeight = `${folderViewportHeight}px`;
    foldersRegion.style.maxHeight = `${folderViewportHeight}px`;
    foldersRegion.style.flexBasis = `${folderViewportHeight}px`;
    visibleFolders.forEach(folder => {
      const folderPalettes = palettes
        .filter(palette => Number(palette.folderId) === Number(folder.id))
        .sort((a, b) => (Number.isFinite(a.folderOrder) ? a.folderOrder : Number.MAX_SAFE_INTEGER) - (Number.isFinite(b.folderOrder) ? b.folderOrder : Number.MAX_SAFE_INTEGER));
      foldersRegion.appendChild(createFolderGroup(folder, folderPalettes));
    });
    const unfiledPalettes = palettes.filter(palette => palette.folderId === null || !libraryFolders.some(folder => Number(folder.id) === Number(palette.folderId)));
    const splitDivider = document.createElement("div");
    splitDivider.className = "saved-palette-split-divider";
    splitDivider.tabIndex = 0;
    splitDivider.setAttribute("role", "separator");
    splitDivider.setAttribute("aria-orientation", "horizontal");
    splitDivider.setAttribute("aria-label", "Resize Unfiled Palettes and Folders");
    savedList.append(createFolderGroup(null, unfiledPalettes), splitDivider, foldersHeader, folderSearchControl);

    if (!visibleFolders.length) {
      const emptyFolders = document.createElement("p");
      emptyFolders.className = "saved-palette-folder-empty saved-palette-folders-empty";
      emptyFolders.textContent = folderQuery && !query ? "No folders match your search." : "No palette folders.";
      foldersRegion.appendChild(emptyFolders);
    }
    savedList.appendChild(foldersRegion);

    const resizeFolderViewport = nextHeight => {
      const controlsHeight = [folderSearchControl]
        .filter(control => !control.hidden)
        .reduce((height, control) => height + control.offsetHeight + 6, 0);
      const maximumHeight = Math.max(90, savedList.clientHeight - foldersHeader.offsetHeight - controlsHeight - 130);
      folderViewportHeight = Math.round(Math.min(maximumHeight, Math.max(90, nextHeight)));
      foldersRegion.style.height = `${folderViewportHeight}px`;
      foldersRegion.style.minHeight = `${folderViewportHeight}px`;
      foldersRegion.style.maxHeight = `${folderViewportHeight}px`;
      foldersRegion.style.flexBasis = `${folderViewportHeight}px`;
      splitDivider.setAttribute("aria-valuemin", "90");
      splitDivider.setAttribute("aria-valuemax", String(Math.round(maximumHeight)));
      splitDivider.setAttribute("aria-valuenow", String(folderViewportHeight));
    };
    resizeFolderViewport(folderViewportHeight);

    splitDivider.addEventListener("pointerdown", event => {
      event.preventDefault();
      const startY = event.clientY;
      const startHeight = folderViewportHeight;
      splitDivider.classList.add("is-dragging");
      splitDivider.setPointerCapture(event.pointerId);
      const handleMove = moveEvent => resizeFolderViewport(startHeight - (moveEvent.clientY - startY));
      const handleEnd = endEvent => {
        splitDivider.classList.remove("is-dragging");
        if (splitDivider.hasPointerCapture(endEvent.pointerId)) splitDivider.releasePointerCapture(endEvent.pointerId);
        splitDivider.removeEventListener("pointermove", handleMove);
        splitDivider.removeEventListener("pointerup", handleEnd);
        splitDivider.removeEventListener("pointercancel", handleEnd);
      };
      splitDivider.addEventListener("pointermove", handleMove);
      splitDivider.addEventListener("pointerup", handleEnd);
      splitDivider.addEventListener("pointercancel", handleEnd);
    });

    splitDivider.addEventListener("keydown", event => {
      if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
      event.preventDefault();
      resizeFolderViewport(folderViewportHeight + (event.key === "ArrowUp" ? 18 : -18));
    });

    if (!savedList.children.length) {
      const empty = document.createElement("p");
      empty.className = "saved-palettes-empty";
      empty.textContent = "No palettes match your search.";
      savedList.appendChild(empty);
    }
    if (restoreSearchFocus) {
      librarySearch.focus({ preventScroll: true });
      librarySearch.setSelectionRange(searchSelectionStart, searchSelectionEnd);
    }
    if (restoreFolderSearchFocus) {
      folderSearch.focus({ preventScroll: true });
      folderSearch.setSelectionRange(folderSearchSelectionStart, folderSearchSelectionEnd);
    }

    const scrollAreas = [foldersRegion, ...savedList.querySelectorAll(".saved-palette-folder-palette-list")];
    scrollCueObserver?.disconnect();
    scrollCueObserver = typeof ResizeObserver === "function" ? new ResizeObserver(entries => {
      entries.forEach(entry => {
        const area = entry.target;
        const hasOverflow = area.scrollHeight > area.clientHeight + 1;
        const hasMoreBelow = area.scrollTop + area.clientHeight < area.scrollHeight - 1;
        area.classList.toggle("has-scroll-fade", hasOverflow && hasMoreBelow);
      });
    }) : null;
    scrollAreas.forEach(area => {
      const updateScrollFade = () => {
        const hasOverflow = area.scrollHeight > area.clientHeight + 1;
        const hasMoreBelow = area.scrollTop + area.clientHeight < area.scrollHeight - 1;
        area.classList.toggle("has-scroll-fade", hasOverflow && hasMoreBelow);
      };
      area.addEventListener("scroll", updateScrollFade, { passive: true });
      scrollCueObserver?.observe(area);
      requestAnimationFrame(updateScrollFade);
    });
  }

  async function refreshLibrary() {
    try {
      [libraryPalettes, libraryFolders] = await Promise.all([listPalettes(), listPaletteFolders()]);
      const currentFolderIds = new Set(libraryFolders.map(folder => String(folder.id)));
      libraryFolders.forEach(folder => {
        const id = String(folder.id);
        if (!knownFolderIds.has(id)) {
          knownFolderIds.add(id);
          collapsedFolderIds.add(id);
        }
      });
      Array.from(knownFolderIds).forEach(id => {
        if (!currentFolderIds.has(id)) {
          knownFolderIds.delete(id);
          collapsedFolderIds.delete(id);
        }
      });
    } catch {
      libraryPalettes = [];
      libraryFolders = [];
    }
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
  folderSearchButton.addEventListener("click", () => toggleLibraryControl(folderSearchButton, folderSearchControl, folderSearch));
  librarySearch.addEventListener("input", renderLibrary);
  librarySort.addEventListener("change", renderLibrary);
  folderSearch.addEventListener("input", renderLibrary);

  function openFolderDialog(mode, folder = null) {
    folderDialogMode = mode;
    folderDialogId = folder?.id ?? null;
    const deleting = mode === "delete";
    folderDialogTitle.textContent = mode === "create" ? "Create Folder" : mode === "rename" ? "Save" : "Delete Folder";
    folderDeleteHelp.hidden = !deleting;
    folderNameControl.hidden = deleting;
    folderNameInput.required = !deleting;
    folderNameInput.value = mode === "rename" ? folder.name : "";
    folderSubmitButton.textContent = mode === "create" ? "Create Folder" : mode === "rename" ? "Save" : "Delete Folder";
    folderDialog.showModal();
    if (!deleting) folderNameInput.focus();
  }

  addFolderButton.addEventListener("click", () => openFolderDialog("create"));
  folderCancelButton.addEventListener("click", () => folderDialog.close());
  folderForm.addEventListener("submit", async event => {
    event.preventDefault();
    const name = folderNameInput.value.trim();
    if (folderDialogMode !== "delete" && !name) { folderNameInput.focus(); return; }
    try {
      if (folderDialogMode === "create") await createPaletteFolder(name);
      if (folderDialogMode === "rename") await renamePaletteFolder(folderDialogId, name);
      if (folderDialogMode === "delete") {
        collapsedFolderIds.delete(String(folderDialogId));
        await deletePaletteFolder(folderDialogId);
      }
      folderDialog.close();
      await refreshLibrary();
      document.dispatchEvent(new CustomEvent("palette-library-changed"));
      showToast(toast, folderDialogMode === "create" ? `Folder “${name}” created.` : folderDialogMode === "rename" ? `Folder renamed to “${name}”.` : "Folder deleted; palettes moved to Unfiled.");
    } catch { showToast(toast, "Folder could not be updated."); }
  });

  paletteDeleteCancelButton.addEventListener("click", () => paletteDeleteDialog.close());
  paletteDeleteDialog.addEventListener("close", () => { pendingDeletePaletteId = null; });
  paletteDeleteForm.addEventListener("submit", async event => {
    event.preventDefault();
    const id = pendingDeletePaletteId;
    if (!id) return;
    try {
      await deletePaletteById(id);
      paletteDeleteDialog.close();
      if (currentPaletteId === id) resetPalette();
      await refreshLibrary();
      document.dispatchEvent(new CustomEvent("palette-library-changed"));
      showToast(toast, "Palette deleted.");
    } catch {
      showToast(toast, "Palette could not be deleted.");
    }
  });

  list.addEventListener("input", event => {
    const input = event.target.closest(".palette-builder-color-name");
    if (!input) return;
    const index = Number(input.dataset.index);
    if (!colors[index]) return;
    colors[index].name = input.value;
    paletteText.value = formattedPalette();
    setDirty();
  });

  list.addEventListener("change", event => {
    const input = event.target.closest(".palette-builder-color-name");
    if (!input) return;
    const index = Number(input.dataset.index);
    if (!colors[index] || input.value.trim()) return;
    colors[index].name = `Color ${index + 1}`;
    input.value = colors[index].name;
    paletteText.value = formattedPalette();
    setDirty();
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
        .map((color, index) => ({
          ...colorFromHex(toHex(color.r, color.g, color.b)),
          name: color.name?.trim() || colors[index]?.name || `Color ${index + 1}`
        }));
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
      importedColors = parsePalettePreviewText(text, format).map(color => ({
        ...colorFromHex(toHex(color.r, color.g, color.b)),
        name: color.name
      }));
    }
    if (!importedColors.length) throw new Error("No colors were found in the file.");

    importedColors = importedColors.map((color, index) => ({
      ...color,
      name: color.name?.trim() || `Color ${index + 1}`
    }));

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
    const records = colors.map((color, index) => ({ replacementHex: color.hex, name: color.name || `Color ${index + 1}` }));
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
    const folderCard = event.target.closest(".saved-palette-folder:not(.is-unfiled)[data-folder-id]");
    const bypassFolderToggle = event.target.closest(".saved-palette-folder-rename, .saved-palette-folder-delete, .saved-palette-item, input, select, textarea");
    if (folderCard && !bypassFolderToggle) {
      const folderToggle = folderCard.querySelector(":scope > .saved-palette-folder-head > .saved-palette-folder-toggle[data-folder-id]");
      const folderId = folderToggle.dataset.folderId;
      const willExpand = collapsedFolderIds.has(folderId);
      if (willExpand) collapsedFolderIds.delete(folderId);
      else collapsedFolderIds.add(folderId);
      renderLibrary();
      const refreshedToggle = savedList.querySelector(`.saved-palette-folder-toggle[data-folder-id="${folderId}"]`);
      refreshedToggle?.focus({ preventScroll: true });
      if (willExpand) refreshedToggle?.closest(".saved-palette-folder")?.scrollIntoView({ block: "nearest" });
      return;
    }
    const renameButton = event.target.closest(".saved-palette-folder-rename[data-folder-id]");
    if (renameButton) {
      const folder = libraryFolders.find(entry => Number(entry.id) === Number(renameButton.dataset.folderId));
      if (!folder) return;
      openFolderDialog("rename", folder);
      return;
    }
    const deleteFolderButton = event.target.closest(".saved-palette-folder-delete[data-folder-id]");
    if (deleteFolderButton) {
      const folder = libraryFolders.find(entry => Number(entry.id) === Number(deleteFolderButton.dataset.folderId));
      if (!folder) return;
      openFolderDialog("delete", folder);
      return;
    }
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
      const palette = libraryPalettes.find(entry => Number(entry.id) === id);
      pendingDeletePaletteId = id;
      paletteDeleteHelp.textContent = palette
        ? `“${palette.name}” will be permanently deleted. This cannot be undone.`
        : "This palette will be permanently deleted. This cannot be undone.";
      paletteDeleteDialog.showModal();
    }
  });

  savedList.addEventListener("keydown", event => {
    if (event.target.closest("button")) return;
    const item = event.target.closest(".saved-palette-item[data-id]");
    if (!item || (event.key !== "Enter" && event.key !== " ")) return;
    event.preventDefault();
    item.click();
  });

  savedList.addEventListener("dragstart", event => {
    const item = event.target.closest(".saved-palette-item[data-id]");
    if (item && !event.target.closest("button")) {
      draggedPaletteId = Number(item.dataset.id);
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", `palette:${draggedPaletteId}`);
      item.classList.add("is-dragging");
      return;
    }
    const header = event.target.closest(".saved-palette-folder-head[draggable='true']");
    if (!header || event.target.closest(".saved-palette-folder-actions button")) { event.preventDefault(); return; }
    const folder = header.closest(".saved-palette-folder[data-folder-id]");
    draggedFolderId = Number(folder.dataset.folderId);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", `folder:${draggedFolderId}`);
    folder.classList.add("is-dragging");
  });

  savedList.addEventListener("dragover", event => {
    const folder = event.target.closest(".saved-palette-folder[data-folder-id]");
    if (!folder) return;
    if (draggedFolderId) {
      if (!folder.dataset.folderId || Number(folder.dataset.folderId) === draggedFolderId) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      savedList.querySelectorAll(".is-folder-drop-target").forEach(target => target.classList.remove("is-folder-drop-target"));
      folder.classList.add("is-folder-drop-target");
      return;
    }
    if (!draggedPaletteId) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    savedList.querySelectorAll(".is-drop-target, .is-palette-drop-target").forEach(target => target.classList.remove("is-drop-target", "is-palette-drop-target"));
    folder.classList.add("is-drop-target");
    const palette = event.target.closest(".saved-palette-item[data-id]");
    if (palette && Number(palette.dataset.id) !== draggedPaletteId) palette.classList.add("is-palette-drop-target");
  });

  savedList.addEventListener("drop", async event => {
    const folder = event.target.closest(".saved-palette-folder[data-folder-id]");
    if (!folder) return;
    event.preventDefault();
    if (draggedFolderId) {
      const sourceId = draggedFolderId;
      const targetId = Number(folder.dataset.folderId);
      draggedFolderId = null;
      if (!targetId || sourceId === targetId) return;
      const orderedIds = libraryFolders.map(entry => Number(entry.id));
      const sourceIndex = orderedIds.indexOf(sourceId);
      const targetIndex = orderedIds.indexOf(targetId);
      [orderedIds[sourceIndex], orderedIds[targetIndex]] = [orderedIds[targetIndex], orderedIds[sourceIndex]];
      try {
        await reorderPaletteFolders(orderedIds);
        await refreshLibrary();
        document.dispatchEvent(new CustomEvent("palette-library-changed"));
        showToast(toast, "Folder order updated.");
      } catch { showToast(toast, "Folders could not be reordered."); }
      return;
    }
    if (!draggedPaletteId) return;
    const paletteId = draggedPaletteId;
    const folderId = folder.dataset.folderId ? Number(folder.dataset.folderId) : null;
    const targetPalette = event.target.closest(".saved-palette-item[data-id]");
    draggedPaletteId = null;
    if (targetPalette && Number(targetPalette.dataset.id) === paletteId) return;
    try {
      const sourcePalette = libraryPalettes.find(palette => Number(palette.id) === paletteId);
      const sourceFolderId = sourcePalette && libraryFolders.some(entry => Number(entry.id) === Number(sourcePalette.folderId))
        ? Number(sourcePalette.folderId)
        : null;
      const orderedIds = libraryPalettes
        .filter(palette => folderId === null
          ? palette.folderId === null || !libraryFolders.some(entry => Number(entry.id) === Number(palette.folderId))
          : Number(palette.folderId) === folderId)
        .sort((a, b) => (Number.isFinite(a.folderOrder) ? a.folderOrder : Number.MAX_SAFE_INTEGER) - (Number.isFinite(b.folderOrder) ? b.folderOrder : Number.MAX_SAFE_INTEGER) || new Date(a.savedAt) - new Date(b.savedAt))
        .map(palette => Number(palette.id));
      const targetId = targetPalette ? Number(targetPalette.dataset.id) : null;
      if (sourceFolderId === folderId && targetId) {
        const sourceIndex = orderedIds.indexOf(paletteId);
        const targetIndex = orderedIds.indexOf(targetId);
        [orderedIds[sourceIndex], orderedIds[targetIndex]] = [orderedIds[targetIndex], orderedIds[sourceIndex]];
      } else {
        const sourceIndex = orderedIds.indexOf(paletteId);
        if (sourceIndex >= 0) orderedIds.splice(sourceIndex, 1);
        const targetIndex = targetId ? orderedIds.indexOf(targetId) : -1;
        orderedIds.splice(targetIndex < 0 ? orderedIds.length : targetIndex, 0, paletteId);
      }
      await reorderPalettesInFolder(folderId, orderedIds);
      await refreshLibrary();
      document.dispatchEvent(new CustomEvent("palette-library-changed"));
      if (folderId !== null) showToast(toast, "Palette order updated.");
    } catch { showToast(toast, "Palette could not be reordered."); }
  });

  savedList.addEventListener("dragend", () => {
    draggedPaletteId = null;
    draggedFolderId = null;
    savedList.querySelectorAll(".is-dragging, .is-drop-target, .is-folder-drop-target, .is-palette-drop-target").forEach(target => target.classList.remove("is-dragging", "is-drop-target", "is-folder-drop-target", "is-palette-drop-target"));
  });

  document.addEventListener("palette-library-changed", refreshLibrary);
  render();
  refreshLibrary();

  return { addColor, setFormat, refreshLibrary };
}
