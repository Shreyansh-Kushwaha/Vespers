# Vespers — mobile (Expo / React Native)

A native shell for Vespers, sharing the same backend as the web app. The web
frontend in `../frontend` is **untouched** by this folder — install, build, and
ship are entirely independent.

## What's here

```
mobile/
├── app/                 # Expo Router screens (file-based routing)
│   ├── _layout.tsx      # root stack
│   ├── index.tsx        # landing
│   └── chat.tsx         # chat screen
├── lib/                 # ported from frontend/lib (web-free)
│   ├── api.ts           # builds full URLs from EXPO_PUBLIC_API_BASE
│   ├── chat.ts          # talks to /api/chat + /api/session
│   ├── letters.ts       # letters API + types
│   ├── recovery-code.ts # VESP-XXXX-XXXX generator + validator
│   ├── risk.ts          # parses risk headers, region from device locale
│   ├── storage.ts       # expo-secure-store wrapper for the recovery code
│   └── theme.ts         # shared palette/spacing
├── app.json             # Expo config
├── eas.json             # EAS Build profiles (preview = APK)
└── package.json
```

## Local development

1. **Install:**
   ```bash
   cd mobile
   npm install
   ```

2. **Configure the backend URL.** Copy `.env.example` to `.env` and set
   `EXPO_PUBLIC_API_BASE` to your backend.

   - Running the backend locally (`cd ../backend && npm run dev` → `:8787`)?
     Use your machine's **LAN IP**, not `localhost` — Expo Go on a phone has
     to reach your laptop. Find it with `ipconfig getifaddr en0` (macOS) or
     `hostname -I` (Linux). Example: `http://192.168.1.42:8787`.

3. **Start the dev server:**
   ```bash
   npm run start
   ```
   Scan the QR code with the Expo Go app (iOS/Android), or press `a` / `i`
   for an emulator.

## Building an APK

The mobile app ships via [EAS Build](https://docs.expo.dev/build/introduction/).
The `preview` profile in `eas.json` produces an installable APK (not an AAB) —
ideal for sideload, internal testing, and friends-and-family.

1. **One-time setup** (free Expo account required):
   ```bash
   npx eas-cli login
   npx eas-cli init   # links the project to an EAS project ID
   ```
   Update `app.json → expo.extra.eas.projectId` with the value EAS prints.

2. **Set the production backend URL.** Edit the `preview.env.EXPO_PUBLIC_API_BASE`
   value in `eas.json` to point at your deployed backend.

3. **Build the APK on EAS servers** (free tier ≈ 30 builds/month):
   ```bash
   npm run build:apk
   ```
   ~10–20 minutes. EAS prints a download link when done.

4. **Or build locally** (requires Android SDK + JDK 17 installed):
   ```bash
   npm run build:apk:local
   ```

5. **Install on a phone.** Open the APK link on the device, or `adb install
   path/to/app.apk`. Android requires "Install from unknown sources" enabled
   for your browser/file manager.

## Going to the Play Store

When you're ready: switch to the `production` profile (`eas build --profile
production --platform android`) which emits an `.aab` for Play Store upload.
`eas submit --platform android` automates the upload itself.

## Backend contract

The mobile app talks to the same Hono backend as the web frontend, but
**directly** (no Next.js proxy). Endpoints used:

- `POST /api/chat` — main chat turn
- `GET  /api/session?code=…` — restore transcript
- `GET/POST/PATCH/DELETE /api/letters` — letters CRUD (wired in `lib/letters.ts`,
  not yet surfaced in UI)

CORS: native fetch sends no `Origin` header, so the backend's allowlist (which
is keyed off origin) does not block mobile clients. No backend change required.

## What's intentionally not done yet

This is the plumbing skeleton. The following ports are pending and are easy
follow-ups now that the wiring is verified:

- The full ten-movement editorial landing (currently a one-screen distillation)
- Letters (compose, list, whisper) — API client is ported, UI is not
- Closing rituals, crisis-support banner, inactivity nudge
- Token-by-token streaming (web uses `ReadableStream`; React Native fetch is
  not stream-friendly, so the mobile chat currently waits for the full reply.
  Fix path: `expo/fetch` streaming, or switch chat to SSE)
- Custom fonts (paper-and-ink calligraphy) via `expo-font`

## Why this is isolated from `../frontend`

- Separate `package.json` and `node_modules` — no chance of npm hoisting
  pulling React Native packages into the Next.js build.
- No imports from `../frontend`. The lib files are **copied**, not symlinked.
  When a helper is updated in either place, sync it manually.
- Backend (`../backend`) is shared and unchanged.
