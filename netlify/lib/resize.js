// Long edge ≤ 1200px, re-encoded as JPEG. sharp is loaded lazily so that a
// missing native binary on the server falls back to the original upload
// (the browser already shrinks to 1600px JPEG) instead of failing the request.
const MAX_EDGE = 1200;

export async function resizeImage(bytes, log) {
  let sharp;
  try {
    ({ default: sharp } = await import('sharp'));
  } catch (err) {
    log.error('resize: sharp failed to load, using the original image:', err.message);
    return { bytes, type: null };
  }
  try {
    const out = await sharp(bytes)
      .rotate() // apply EXIF orientation
      .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();
    return { bytes: out, type: 'image/jpeg' };
  } catch (err) {
    log.error('resize: failed, using the original image:', err.message);
    return { bytes, type: null };
  }
}
