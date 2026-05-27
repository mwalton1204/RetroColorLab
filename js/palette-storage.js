const PALETTE_DB_NAME = "retropalettelab";
const PALETTE_DB_VERSION = 1;
const PALETTE_STORE = "palettes";

function openPaletteDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(PALETTE_DB_NAME, PALETTE_DB_VERSION);
    request.onupgradeneeded = event => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(PALETTE_STORE)) {
        db.createObjectStore(PALETTE_STORE, { keyPath: "id", autoIncrement: true });
      }
    };
    request.onsuccess = event => resolve(event.target.result);
    request.onerror = event => reject(event.target.error);
  });
}

async function savePalette(name, colors, hasWhite = false, hasBlack = false) {
  const db = await openPaletteDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PALETTE_STORE, "readwrite");
    const store = tx.objectStore(PALETTE_STORE);
    const request = store.add({
      name: String(name || "Unnamed Palette").trim(),
      savedAt: new Date().toISOString(),
      colors,
      hasWhite,
      hasBlack
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
          .map(({ id, name, savedAt, colors }) => ({ id, name, savedAt, colorCount: (colors || []).length }))
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
