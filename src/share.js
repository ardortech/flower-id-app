// 「存到相簿」: iOS web apps can't write to Photos, so open the share sheet with
// the photo and she taps 儲存影像 there.
export function photoFile(blob) {
  return blob instanceof File ? blob : new File([blob], 'flower.jpg', { type: blob.type || 'image/jpeg' });
}

export function canSharePhoto(file) {
  try {
    return Boolean(navigator.share && navigator.canShare?.({ files: [file] }));
  } catch {
    return false;
  }
}

// Must run inside the tap handler. Closing the share sheet is not an error.
export async function sharePhoto(file) {
  try {
    await navigator.share({ files: [file] });
  } catch (err) {
    if (err.name !== 'AbortError') console.warn('share failed', err);
  }
}
