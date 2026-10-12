// Inline SVG icons (no emoji in the UI). All use currentColor.
const svg = (body, viewBox = '0 0 24 24') =>
  `<svg viewBox="${viewBox}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;

export const icons = {
  photos: svg(
    '<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="2"/><path d="m21 16-4.5-4.5L7 21"/>'
  ),
  camera: svg(
    '<path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z"/><circle cx="12" cy="13.5" r="3.5"/>'
  ),
  back: svg('<path d="m15 5-7 7 7 7"/>'),
  close: svg('<path d="M6 6l12 12M18 6 6 18"/>'),
  pin: svg('<path d="M12 21s7-6.1 7-11.5A7 7 0 0 0 5 9.5C5 14.9 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.5"/>'),
  clock: svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  warning: svg('<path d="M12 3 2 20h20L12 3Z"/><path d="M12 10v4"/><path d="M12 17h.01"/>'),
  flower: svg(
    '<circle cx="12" cy="12" r="2.5"/><path d="M12 9.5c-1.8-2.2-1.8-5.5 0-6.5 1.8 1 1.8 4.3 0 6.5Z" transform="rotate(0 12 12)"/><path d="M12 9.5c-1.8-2.2-1.8-5.5 0-6.5 1.8 1 1.8 4.3 0 6.5Z" transform="rotate(72 12 12)"/><path d="M12 9.5c-1.8-2.2-1.8-5.5 0-6.5 1.8 1 1.8 4.3 0 6.5Z" transform="rotate(144 12 12)"/><path d="M12 9.5c-1.8-2.2-1.8-5.5 0-6.5 1.8 1 1.8 4.3 0 6.5Z" transform="rotate(216 12 12)"/><path d="M12 9.5c-1.8-2.2-1.8-5.5 0-6.5 1.8 1 1.8 4.3 0 6.5Z" transform="rotate(288 12 12)"/>'
  ),
  refresh: svg('<path d="M20 12a8 8 0 1 1-2.3-5.7L20 8.5"/><path d="M20 4v4.5h-4.5"/>'),
};
