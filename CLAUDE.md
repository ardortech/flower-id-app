# 花花世界 Flower ID — flower ID app for Mom

## App name
- Name: **花花世界 Flower ID**. Home Screen label / manifest `short_name`: 花花世界; manifest `name`: 花花世界 Flower ID.
- In the zh-TW UI the header shows 花花世界 with a small "Flower ID" beside it.
- 「認識這朵花」 is an action phrase (e.g. the planned iOS Shortcut name), not the app name.

## App icon
Pink five-petal flower, yellow centre, green camera-frame corners, off-white background. Files in `public/icons/`:
- `apple-touch-icon.png` (180×180) → `<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">` — this is what the iPhone Home Screen uses
- `icon-192.png`, `icon-512.png` → manifest `icons`
- `favicon-32.png` → favicon
Icons are square and opaque; iOS rounds the corners itself, so don't pre-round or add transparency. Manifest `background_color` and `theme_color`: #F5F7F2.

## What this is
A mobile web app (PWA) that identifies flowers from photos and explains them in Traditional Chinese (zh-TW).
The only user is my mom: an iPhone user, not technical, who takes flower photos with the iPhone Camera app and wants to know what they are.
Every design decision should favour simplicity, large text and large tap targets over features.

## Users and devices
- iPhone, Safari, added to the Home Screen (standalone mode). Test this case first.
- Main flow: she has ALREADY taken the photo in the Camera app → opens the app → 「從相簿選照片」 → sees the result.
- Secondary flow: 「現在拍照」 opens the rear camera from inside the app.

## Stack
- Frontend: Vite + vanilla JavaScript (no framework), plain CSS. Keep dependencies minimal.
- Backend: one Netlify Function, `netlify/functions/identify.js`.
- Hosting: Netlify, deployed from the GitHub repo.
- Local storage: IndexedDB (via `idb-keyval`) for the flower diary. No login, no database in v1.

## Secrets (never commit, never expose to the browser)
Set as Netlify environment variables:
- `PLANTNET_API_KEY` — from my.plantnet.org (free tier: 500 identifications/day)
- `ANTHROPIC_API_KEY` — from console.anthropic.com
- `MOCK_IDENTIFY=1` — when set, the function returns a canned result without calling any API (use for development and tests). `MOCK_IDENTIFY=low` returns a low-confidence result (top 3 screen); `MOCK_IDENTIFY=no_plant` returns the no_plant error.

## Identification flow (`/api/identify`, POST multipart: image, lang, optional lat/lng, optional species)
1. Accept JPEG/PNG/HEIC. Resize so the long edge is ≤1200px, re-encode as JPEG.
2. Call Pl@ntNet identify (`/v2/identify/all`, organs=auto or flower). Check the current API docs for exact parameters. Keep the top 3 results: scientific name, score, reference image URLs.
   Each candidate sent to the browser: `{ scientificName, commonName, score, images: [url, …] }` — `commonName` in `lang` (Taiwan usage, from Claude), `images` are Pl@ntNet reference photo URLs (medium size).
3. Call the Claude API (Messages API, vision) with the photo and the top Pl@ntNet match. Check the current docs for the model ID; use a Sonnet-class model. Ask for JSON only, in the requested `lang` (default zh-TW), using names commonly used in Taiwan.
4. Return `{ confidence, candidates: [...top 3], info: {...} }` to the browser.
5. If Pl@ntNet finds no plant, return a friendly error code; the UI shows 「看不太清楚，靠近花朵再拍一次」.
6. With `species` (a candidate's scientificName, sent when she taps 「就是 X」 on a candidate other than the top one): skip Pl@ntNet, ask Claude about that species with the photo, return `{ info }` only.

### `info` JSON schema (keys in English, values in `lang`)
```json
{
  "commonName": "九重葛",
  "aliases": ["三角梅", "紙花", "葉子花"],
  "scientificName": "Bougainvillea spectabilis",
  "family": "紫茉莉科・九重葛屬",
  "floweringSeason": "...",
  "origin": "...",
  "howToRecognize": "2–3 short sentences",
  "flowerMeaning": "...",
  "careTips": "...",
  "toxicity": "people, cats and dogs; say clearly if unknown",
  "whereInTaiwan": "..."
}
```
Tell Claude to write warmly and simply, for an older reader, with no jargon. If it is unsure about a field, it should say so rather than guess.

## Screens (match the Design mockup)
1. 首頁 Home — big pink 「從相簿選照片」 (primary), outlined 「現在拍照」, 「最近認識的花」 strip, 「看全部 ›」 → Diary.
2. 辨識中 Loading — her photo, 「正在認識這朵花…」, 取消.
3. 辨識結果 Result — confidence badge, name (large serif), scientific name, aliases, 📍 place + date/time, info card, 「要小心」 toxicity box, 「唸給我聽」 (speechSynthesis, zh-TW voice), 「加入我的花朵日記」, 「存到相簿」, 「不太像？看看其他可能 ›」, disclaimer 「辨識結果僅供參考，請勿據此判斷能否食用」, footer 「辨識技術：Pl@ntNet」 (required attribution).
4. 不太確定時 — shown when top score < 50%: top 3 with Pl@ntNet reference photos, score bars, 「就是 X」 buttons, retake tip.
5. 我的花朵日記 Diary — 2-column grid: photo, name, place, date.

### Visual rules
- Fonts: Noto Sans TC (body), Noto Serif TC (titles, flower name), via Google Fonts.
- Colors: background #F5F7F2, surface #FFFFFF, text #1E261F, muted #4E5A50, primary pink #B0305F (pressed/outline text #8E2149), green #2E6B3C, warning bg #FFF1E3 / text #8A4B0F.
- Body text ≥ 18px, buttons ≥ 56px tall, generous spacing. No emoji in UI — use inline SVG icons.
- Respect iPhone safe areas (`env(safe-area-inset-*)`).

## Feature details
- **Save to album**: iOS web apps cannot write to Photos. Only for photos taken in-app, show 「存到相簿」, which calls `navigator.share({ files: [photo] })` so she can tap 儲存影像.
- **Location**: in-app camera → `navigator.geolocation`. Album photo → try EXIF GPS with `exifr`; if missing, ask 「這張是在這裡拍的嗎？」 (是 / 輸入地點 / 略過). Reverse-geocode to a zh-TW place name (e.g. OpenStreetMap Nominatim with accept-language=zh-TW, with a proper User-Agent, respecting its usage policy). Store place name + coordinates in the diary.
- **Diary**: store photo (resized), result JSON, place, timestamp in IndexedDB.

## i18n
zh-TW only for now, English later. All UI strings live in `src/locales/zh-TW.json`; no hard-coded text in components. Pass `lang` to the backend.

## Build order
- [x] 1. Scaffold Vite app, PWA manifest + icons, Netlify config, locale file
- [x] 2. Home + album picker + Loading + Result screens with `MOCK_IDENTIFY=1`
- [x] 3. Real Netlify Function: resize → Pl@ntNet → Claude → JSON
- [x] 4. Low-confidence screen (top 3)
- [x] 5. Diary (IndexedDB) + Save to album
- [ ] 6. Location (geolocation, EXIF, ask, reverse geocode)
- [ ] 7. Read aloud
- [ ] Later: iOS Share-sheet Shortcut 「認識這朵花」, English, flower map

## Working rules
- Develop and test against the mock; real API calls happen on Netlify deploy previews.
- Never log or commit API keys. Never call Pl@ntNet or Claude from the browser.
- Keep the UI zh-TW and big; when in doubt, choose fewer options on screen.
