import { lang } from './i18n.js';

// Where a photo was taken: { name, lat, lng }, or null when we don't know.
// Nothing here ever throws: any failure (permission denied, no GPS, offline)
// just means "no place", the same as 略過.

// Coordinates are rounded to about 10 m before leaving the phone, which is
// plenty for a place name and lets the server cache repeated lookups.
const round = (value) => Math.round(value * 1e4) / 1e4;

// Current position, for 「現在拍照」 and 「是」 in the sheet. Only call this
// after she has tapped something, so iOS asks for permission at a moment
// that makes sense to her.
export function currentPosition() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: round(pos.coords.latitude), lng: round(pos.coords.longitude) }),
      (err) => {
        console.info(`[location] current position unavailable (${err.code}: ${err.message})`);
        resolve(null);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  });
}

// GPS from the photo's EXIF. Must get the original file: our resized copy has no EXIF.
export async function photoPosition(file) {
  try {
    const { gps } = await import('exifr/dist/lite.esm.mjs');
    const found = await gps(file);
    if (found && Number.isFinite(found.latitude) && Number.isFinite(found.longitude)) {
      console.info(`[location] EXIF GPS found in ${file.type || 'photo'} (${file.size} bytes)`);
      return { lat: round(found.latitude), lng: round(found.longitude) };
    }
    console.info(`[location] no EXIF GPS in ${file.type || 'photo'} (${file.size} bytes)`);
  } catch (err) {
    console.info('[location] no EXIF GPS: could not read EXIF', err);
  }
  return null;
}

// Short zh-TW place name for coordinates, e.g. 「台北市大安區・大安森林公園附近」.
// Goes through our /api/place function (OpenStreetMap Nominatim behind it).
export async function placeAt(coords) {
  if (!coords) return null;
  const query = new URLSearchParams({ lat: coords.lat, lng: coords.lng, lang });
  try {
    const res = await fetch(`/api/place?${query}`, { signal: AbortSignal.timeout(10000) });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.name) {
      console.info(`[location] no place name (HTTP ${res.status}${data?.error ? `, ${data.error}` : ''})`);
      return null;
    }
    return { name: data.name, lat: coords.lat, lng: coords.lng };
  } catch (err) {
    console.info('[location] place lookup failed', err);
    return null;
  }
}
