const PALETTE_DB_NAME = "retropalettelab";
const PALETTE_DB_VERSION = 2;
const PALETTE_STORE = "palettes";
const PALETTE_FOLDER_STORE = "paletteFolders";

function openPaletteDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(PALETTE_DB_NAME, PALETTE_DB_VERSION);
    request.onupgradeneeded = event => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(PALETTE_STORE)) {
        db.createObjectStore(PALETTE_STORE, { keyPath: "id", autoIncrement: true });
      }
      if (!db.objectStoreNames.contains(PALETTE_FOLDER_STORE)) {
        db.createObjectStore(PALETTE_FOLDER_STORE, { keyPath: "id", autoIncrement: true });
      }
    };
    request.onsuccess = event => resolve(event.target.result);
    request.onerror = event => reject(event.target.error);
  });
}

async function savePalette(name, colors, hasWhite = false, hasBlack = false, metadata = {}) {
  const db = await openPaletteDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PALETTE_STORE, "readwrite");
    const store = tx.objectStore(PALETTE_STORE);
    const request = store.add({
      name: String(name || "Unnamed Palette").trim(),
      savedAt: new Date().toISOString(),
      colors,
      hasWhite,
      hasBlack,
      ...metadata
    });
    request.onsuccess = event => resolve(event.target.result);
    request.onerror = event => reject(event.target.error);
  });
}

async function updatePalette(id, name, colors, hasWhite = false, hasBlack = false, metadata = {}) {
  const existing = await loadPaletteById(Number(id));
  const db = await openPaletteDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PALETTE_STORE, "readwrite");
    const store = tx.objectStore(PALETTE_STORE);
    const request = store.put({
      ...(existing || {}),
      id: Number(id),
      name: String(name || "Unnamed Palette").trim(),
      savedAt: new Date().toISOString(),
      colors,
      hasWhite,
      hasBlack,
      ...metadata
    });
    request.onsuccess = event => resolve(event.target.result);
    request.onerror = event => reject(event.target.error);
  });
}

async function listPalettes() {
  const db = await openPaletteDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PALETTE_STORE, "readonly");
    const store = tx.objectStore(PALETTE_STORE);
    const request = store.getAll();
    request.onsuccess = event => {
      const records = event.target.result;
      resolve(
        records
          .map(({ id, name, savedAt, colors, folderId, folderOrder }) => ({ id, name, savedAt, colors: colors || [], folderId: folderId ?? null, folderOrder, colorCount: (colors || []).length }))
          .reverse()
      );
    };
    request.onerror = event => reject(event.target.error);
  });
}

async function loadPaletteById(id) {
  const db = await openPaletteDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PALETTE_STORE, "readonly");
    const store = tx.objectStore(PALETTE_STORE);
    const request = store.get(id);
    request.onsuccess = event => resolve(event.target.result || null);
    request.onerror = event => reject(event.target.error);
  });
}

async function deletePaletteById(id) {
  const db = await openPaletteDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PALETTE_STORE, "readwrite");
    const store = tx.objectStore(PALETTE_STORE);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = event => reject(event.target.error);
  });
}

async function listPaletteFolders() {
  const db = await openPaletteDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction(PALETTE_FOLDER_STORE, "readonly").objectStore(PALETTE_FOLDER_STORE).getAll();
    request.onsuccess = event => resolve(event.target.result.sort((a, b) => {
      const aOrder = Number.isFinite(a.sortOrder) ? a.sortOrder : Number.MAX_SAFE_INTEGER;
      const bOrder = Number.isFinite(b.sortOrder) ? b.sortOrder : Number.MAX_SAFE_INTEGER;
      return aOrder - bOrder || a.name.localeCompare(b.name) || new Date(a.createdAt) - new Date(b.createdAt);
    }));
    request.onerror = event => reject(event.target.error);
  });
}

async function createPaletteFolder(name) {
  const db = await openPaletteDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PALETTE_FOLDER_STORE, "readwrite");
    const store = tx.objectStore(PALETTE_FOLDER_STORE);
    const request = store.getAll();
    request.onsuccess = () => {
      const existingFolders = request.result.sort((a, b) => {
        const aOrder = Number.isFinite(a.sortOrder) ? a.sortOrder : Number.MAX_SAFE_INTEGER;
        const bOrder = Number.isFinite(b.sortOrder) ? b.sortOrder : Number.MAX_SAFE_INTEGER;
        return aOrder - bOrder || a.name.localeCompare(b.name);
      });
      existingFolders.forEach((folder, index) => {
        if (folder.sortOrder !== index) store.put({ ...folder, sortOrder: index });
      });
      const sortOrder = existingFolders.length;
      const addRequest = store.add({ name: String(name || "New Folder").trim(), createdAt: new Date().toISOString(), sortOrder });
      addRequest.onsuccess = event => resolve(event.target.result);
      addRequest.onerror = event => reject(event.target.error);
    };
    request.onerror = event => reject(event.target.error);
  });
}

async function reorderPaletteFolders(orderedIds) {
  const db = await openPaletteDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PALETTE_FOLDER_STORE, "readwrite");
    const store = tx.objectStore(PALETTE_FOLDER_STORE);
    const request = store.getAll();
    request.onsuccess = () => {
      const orderById = new Map(orderedIds.map((id, index) => [Number(id), index]));
      request.result.forEach(folder => {
        if (orderById.has(Number(folder.id))) store.put({ ...folder, sortOrder: orderById.get(Number(folder.id)) });
      });
    };
    tx.oncomplete = () => resolve();
    tx.onerror = event => reject(event.target.error);
    tx.onabort = event => reject(event.target.error);
  });
}

async function renamePaletteFolder(id, name) {
  const db = await openPaletteDb();
  return new Promise((resolve, reject) => {
    const store = db.transaction(PALETTE_FOLDER_STORE, "readwrite").objectStore(PALETTE_FOLDER_STORE);
    const getRequest = store.get(Number(id));
    getRequest.onsuccess = () => {
      if (!getRequest.result) { reject(new Error("Folder not found.")); return; }
      const request = store.put({ ...getRequest.result, name: String(name).trim() });
      request.onsuccess = event => resolve(event.target.result);
      request.onerror = event => reject(event.target.error);
    };
    getRequest.onerror = event => reject(event.target.error);
  });
}

async function deletePaletteFolder(id) {
  const db = await openPaletteDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([PALETTE_FOLDER_STORE, PALETTE_STORE], "readwrite");
    const folderId = Number(id);
    tx.objectStore(PALETTE_FOLDER_STORE).delete(folderId);
    const palettesRequest = tx.objectStore(PALETTE_STORE).getAll();
    palettesRequest.onsuccess = () => {
      palettesRequest.result.forEach(palette => {
        if (Number(palette.folderId) === folderId) {
          tx.objectStore(PALETTE_STORE).put({ ...palette, folderId: null });
        }
      });
    };
    tx.oncomplete = () => resolve();
    tx.onerror = event => reject(event.target.error);
    tx.onabort = event => reject(event.target.error);
  });
}

async function movePaletteToFolder(paletteId, folderId = null) {
  const db = await openPaletteDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PALETTE_STORE, "readwrite");
    const store = tx.objectStore(PALETTE_STORE);
    const request = store.getAll();
    request.onsuccess = () => {
      const palette = request.result.find(entry => Number(entry.id) === Number(paletteId));
      if (!palette) { tx.abort(); return; }
      const destinationId = folderId === null ? null : Number(folderId);
      const folderOrder = request.result
        .filter(entry => entry.id !== palette.id && (destinationId === null ? entry.folderId == null : Number(entry.folderId) === destinationId))
        .reduce((maximum, entry) => Math.max(maximum, Number.isFinite(entry.folderOrder) ? entry.folderOrder : -1), -1) + 1;
      store.put({ ...palette, folderId: destinationId, folderOrder });
    };
    tx.oncomplete = () => resolve();
    request.onerror = event => reject(event.target.error);
    tx.onerror = event => reject(event.target.error || new Error("Palette not found."));
    tx.onabort = event => reject(event.target.error || new Error("Palette not found."));
  });
}

async function reorderPalettesInFolder(folderId, orderedIds) {
  const db = await openPaletteDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PALETTE_STORE, "readwrite");
    const store = tx.objectStore(PALETTE_STORE);
    const request = store.getAll();
    request.onsuccess = () => {
      const records = new Map(request.result.map(palette => [Number(palette.id), palette]));
      const destinationId = folderId === null ? null : Number(folderId);
      orderedIds.forEach((id, index) => {
        const palette = records.get(Number(id));
        if (palette) store.put({ ...palette, folderId: destinationId, folderOrder: index });
      });
    };
    tx.oncomplete = () => resolve();
    tx.onerror = event => reject(event.target.error);
    tx.onabort = event => reject(event.target.error);
  });
}

async function exportPalettesJson() {
  const db = await openPaletteDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PALETTE_STORE, "readonly");
    const store = tx.objectStore(PALETTE_STORE);
    const request = store.getAll();
    request.onsuccess = event => resolve(JSON.stringify(event.target.result, null, 2));
    request.onerror = event => reject(event.target.error);
  });
}

async function importPalettesJson(jsonString) {
  const parsed = JSON.parse(jsonString);
  if (!Array.isArray(parsed)) throw new Error("Expected a JSON array.");
  const db = await openPaletteDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PALETTE_STORE, "readwrite");
    const store = tx.objectStore(PALETTE_STORE);
    let count = 0;
    let pending = parsed.length;
    if (pending === 0) { resolve(0); return; }
    parsed.forEach(entry => {
      const { name, savedAt, colors } = entry;
      const request = store.add({
        name: String(name || "Imported").trim(),
        savedAt: savedAt || new Date().toISOString(),
        colors: Array.isArray(colors) ? colors : []
      });
      request.onsuccess = () => { count++; if (--pending === 0) resolve(count); };
      request.onerror = () => { if (--pending === 0) resolve(count); };
    });
    tx.onerror = event => reject(event.target.error);
  });
}
