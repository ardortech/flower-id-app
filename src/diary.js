import { createStore, set, get, update, values } from 'idb-keyval';

// 我的花朵日記: one IndexedDB record per saved flower, kept on this phone only.
// { id, savedAt, takenAt, source, photo: Blob (the resized JPEG), result: { confidence, info, candidates },
//   place: { name, lat, lng } | null }  (lat/lng are null for a place she typed)
const store = createStore('flower-diary', 'entries');

export async function addEntry({ photo, result, takenAt, source, place = null }) {
  const savedAt = Date.now();
  const entry = {
    id: `${savedAt}-${Math.random().toString(36).slice(2, 8)}`,
    savedAt,
    takenAt: takenAt.getTime(),
    source,
    photo,
    result,
    place,
  };
  await set(entry.id, entry, store);
  // Ask Safari not to clear the diary when space runs low (best effort).
  navigator.storage?.persist?.().catch(() => {});
  return entry.id;
}

export const getEntry = (id) => get(id, store);

// The place can arrive after she saved (e.g. she answered 「這張是在這裡拍的嗎？」 later).
export async function setEntryPlace(id, place) {
  await update(id, (entry) => (entry ? { ...entry, place } : entry), store);
}

// Newest first.
export async function listEntries() {
  const entries = await values(store);
  return entries.sort((a, b) => b.savedAt - a.savedAt);
}

// Number of different flowers (not photos) in the diary.
export function countKinds(entries) {
  return new Set(entries.map((e) => e.result?.info?.scientificName || e.result?.info?.commonName || e.id)).size;
}
