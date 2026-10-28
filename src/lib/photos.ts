/* ---------- PHOTOS ----------
   Full-size photos live in IndexedDB (localStorage is ~5 MB and would fill
   after a few dozen finds). Each observation also keeps a small JPEG thumbnail
   inline so lists render instantly and survive if IndexedDB is unavailable
   (some private-browsing modes), in which case only the thumbnail is kept and
   the UI says so. */
const DB = "co-field-atlas";
const STORE = "photos";

let memory: Map<string, Blob> | null = null; // fallback when IndexedDB is missing or blocked

function openDb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      if (typeof indexedDB === "undefined") return resolve(null);
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => { req.result.createObjectStore(STORE); };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

let dbPromise: Promise<IDBDatabase | null> | null = null;
const db = () => (dbPromise ??= openDb());

function tx<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T | undefined> {
  return db().then((d) => new Promise<T | undefined>((resolve, reject) => {
    if (!d) return resolve(undefined);
    try {
      const r = run(d.transaction(STORE, mode).objectStore(STORE));
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    } catch (e) {
      reject(e);
    }
  }));
}

/** true when full-size photos are kept across sessions */
export async function photosPersist(): Promise<boolean> {
  return !!(await db());
}

export async function putPhoto(id: string, blob: Blob): Promise<boolean> {
  if (await db()) {
    try { await tx("readwrite", (s) => s.put(blob, id)); return true; } catch { return false; }
  }
  (memory ??= new Map()).set(id, blob);
  return false;
}

export async function getPhoto(id: string): Promise<Blob | null> {
  if (await db()) {
    try { return ((await tx<Blob>("readonly", (s) => s.get(id))) as Blob | undefined) ?? null; } catch { return null; }
  }
  return memory?.get(id) ?? null;
}

export async function deletePhoto(id: string): Promise<void> {
  if (await db()) {
    try { await tx("readwrite", (s) => s.delete(id)); } catch { /* already gone */ }
    return;
  }
  memory?.delete(id);
}

/* ---- image processing ----
   iPhone photos are 12+ MP; we keep a 1600 px JPEG (plenty for a field
   record) and a 240 px thumbnail. Safari applies EXIF orientation when it
   decodes into an <img>, so the canvas copy comes out upright. */
export interface Processed { blob: Blob; thumb: string; width: number; height: number }

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("unreadable image"));
    img.src = src;
  });
}

function draw(img: HTMLImageElement, maxSide: number) {
  const scale = Math.min(1, maxSide / Math.max(img.naturalWidth || img.width, img.naturalHeight || img.height));
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round((img.naturalWidth || img.width) * scale));
  c.height = Math.max(1, Math.round((img.naturalHeight || img.height) * scale));
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("no canvas");
  ctx.drawImage(img, 0, 0, c.width, c.height);
  return c;
}

const toBlob = (c: HTMLCanvasElement, q: number) =>
  new Promise<Blob>((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error("encode failed"))), "image/jpeg", q));

export async function processImage(src: Blob | string): Promise<Processed> {
  const url = typeof src === "string" ? src : URL.createObjectURL(src);
  try {
    const img = await loadImage(url);
    const full = draw(img, 1600);
    const blob = await toBlob(full, 0.82);
    const thumb = draw(img, 240).toDataURL("image/jpeg", 0.7);
    return { blob, thumb, width: full.width, height: full.height };
  } finally {
    if (typeof src !== "string") URL.revokeObjectURL(url);
  }
}
