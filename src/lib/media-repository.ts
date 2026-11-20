'use client';

export interface MediaRecord {
  id: string;
  name: string;
  type: string;
  size: number;
  alt: string;
  createdAt: string;
  blob: Blob;
}

const DATABASE = 'kdeals_stage4_media';
const STORE = 'media';
const MAX_FILE_SIZE = 8 * 1024 * 1024;
const imageTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: 'id' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => { request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
}

export function validateMediaFile(file: File, kind: 'image' | 'document'): string | null {
  if (file.size > MAX_FILE_SIZE) return 'Files must be 8 MB or smaller.';
  if (kind === 'document') return file.type === 'application/pdf' ? null : 'Only PDF documents are supported.';
  if (file.type === 'image/svg+xml') return 'SVG uploads are rejected in Stage 4 because a trusted sanitizer is not configured.';
  return imageTypes.has(file.type) ? null : 'Use a JPG, PNG, or WebP image.';
}

export async function saveMedia(file: File, alt = ''): Promise<MediaRecord> {
  const kind = file.type === 'application/pdf' ? 'document' : 'image';
  const error = validateMediaFile(file, kind);
  if (error) throw new Error(error);
  const record: MediaRecord = { id: crypto.randomUUID(), name: file.name, type: file.type, size: file.size, alt, createdAt: new Date().toISOString(), blob: file };
  const db = await database();
  await requestResult(db.transaction(STORE, 'readwrite').objectStore(STORE).put(record));
  db.close();
  return record;
}

export async function listMedia(): Promise<MediaRecord[]> { const db = await database(); const records = await requestResult(db.transaction(STORE).objectStore(STORE).getAll()); db.close(); return records.sort((a, b) => b.createdAt.localeCompare(a.createdAt)); }
export async function getMedia(id: string): Promise<MediaRecord | undefined> { const db = await database(); const record = await requestResult(db.transaction(STORE).objectStore(STORE).get(id)); db.close(); return record; }
export async function deleteMedia(id: string): Promise<void> { const db = await database(); await requestResult(db.transaction(STORE, 'readwrite').objectStore(STORE).delete(id)); db.close(); }
export async function updateMediaAlt(id: string, alt: string): Promise<void> { const media = await getMedia(id); if (!media) throw new Error('Media file was not found.'); const db = await database(); await requestResult(db.transaction(STORE, 'readwrite').objectStore(STORE).put({ ...media, alt })); db.close(); }

export function mediaRef(id: string): string { return `media:${id}`; }
export function mediaIdFromRef(value: string): string | null { return value.startsWith('media:') ? value.slice(6) : null; }
