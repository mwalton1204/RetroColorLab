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
          .map(({ id, name, savedAt, colors, folderId }) => ({ id, name, savedAt, colors: colors || [], folderId: folderId ?? null, colorCount: (colors || []).length }))
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
    request.onsuccess = event => resolve(event.target.result.sort((a, b) => a.name.localeCompare(b.name)));
    request.onerror = event => reject(event.target.error);
  });
}

async function createPaletteFolder(name) {
  const db = await openPaletteDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction(PALETTE_FOLDER_STORE, "readwrite").objectStore(PALETTE_FOLDER_STORE).add({
      name: String(name || "New Folder").trim(),
      createdAt: new Date().toISOString()
    });
    request.onsuccess = event => resolve(event.target.result);
    request.onerror = event => reject(event.target.error);
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
  const palette = await loadPaletteById(Number(paletteId));
  if (!palette) throw new Error("Palette not found.");
  const db = await openPaletteDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction(PALETTE_STORE, "readwrite").objectStore(PALETTE_STORE).put({
      ...palette,
      folderId: folderId === null ? null : Number(folderId)
    });
    request.onsuccess = event => resolve(event.target.result);
    request.onerror = event => reject(event.target.error);
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
