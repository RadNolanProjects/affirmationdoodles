# Affirm App — Build Summary

## What Is This App?

Affirm is a mobile-first daily affirmations app. Users record affirmations in their own voice, listen to them daily, and cap each session with a quick doodle. Over time, the doodle history builds into a visual calendar. The PRD lives at `affirm-prd.md`.

---

## What Was Built

### Scope: M1 (Foundation) + M2 (Record) + M3 (Listen + Doodle)

The goal: a user can record an affirmation, listen to it, doodle after listening, and see their doodle history on the dashboard.

### Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | React Native (Expo) | SDK 55 |
| Routing | expo-router (file-based) | ~55.0.3 |
| Backend | Supabase (Postgres + Auth + Storage) | supabase-js 2.98 |
| Auth | Supabase Magic Link (email) | — |
| Audio | expo-audio | ~55.0.8 |
| Drawing | react-native-svg (SVG paths + PanResponder) | ^15.15.3 |
| File System | expo-file-system (new File API, native only) | ~55.0.10 |
| Fonts | Geist (via @expo-google-fonts/geist) | — |
| Icons | @expo/vector-icons (Ionicons) | bundled with Expo |

### Important Technical Notes

- **expo-av is deprecated** as of SDK 52. We use `expo-audio` instead, which provides `useAudioRecorder` and `useAudioPlayer` hooks.
- **expo-audio on web** requires `recorder.prepareToRecordAsync()` before calling `recorder.record()`. Without it, you get "Cannot start an audio recording without initializing a MediaRecorder."
- **expo-file-system** has a completely new API in SDK 55. Uses `File`, `Directory`, `Paths` classes. The legacy `readAsStringAsync` / `EncodingType` functions throw at runtime.
- **Web audio uploads**: On web, `recorder.uri` is a blob URL (`blob:http://...`). The `expo-file-system` `File` class can't handle blob URLs. `storage.ts` detects web platform and uses `fetch()` to get the blob, then uploads the ArrayBuffer. Web recordings use `audio/webm` format (not `audio/mp4`).
- **Alert.alert() doesn't work on web** — silently fails. Use `window.alert()` / `window.confirm()` on web via platform detection.
- **Supabase type inference** doesn't fully resolve with the generic `Database` type on queries. We use `.returns<Type[]>()` and `.single<Type>()` for explicit type annotations.
- **expo-linear-gradient** requires `as const` assertion on colors arrays for TypeScript tuple typing.
- **Expo Router nested stacks** need explicit `<Stack.Screen>` declarations in their layout files. Without them, `router.back()` fails with "The action 'GO_BACK' was not handled by any navigator."
- **Waveform visualization**: On web, uses Web Audio API (`AudioContext.decodeAudioData`) to extract amplitude data from audio files. On native, falls back to a procedurally-generated placeholder waveform. The `Waveform` component renders vertical bars with playback progress highlighting.
- **AffirmationCard** is a shared component used by both the dashboard (without menu) and manage screen (with "..." menu for Re-record/Delete). Uses `useAudioPlayer`/`useAudioPlayerStatus` from expo-audio for inline playback.
- **Doodle drawing** uses `react-native-svg` with `PanResponder` for cross-platform drawing. Strokes are stored as arrays of `{x, y}` points and rendered as SVG `<Path>` elements with quadratic bezier smoothing. Canvas data (strokes + dimensions) is serialized as JSON and stored in `listening_sessions.doodle_data`.
- **Doodle thumbnails** are rendered inline as SVG at any size/color using the `DoodleThumbnail` component. The dashboard grid shows inverted thumbnails (white strokes on dark background) by re-rendering the stroke data — no image downloads needed for the grid.

---

## File Structure

```
affirmationdoodles/
├── .env                          # Supabase URL + key
├── app.json                      # Expo config (scheme: "affirm", audio permissions)
├── tsconfig.json                 # Path alias @/* -> ./src/*
├── package.json                  # main: "expo-router/entry"
├── affirm-prd.md                 # Full product requirements document
├── supabase-migration.sql        # Initial SQL to run in Supabase dashboard
├── supabase-migration-doodles.sql # Doodle support migration (add columns + storage bucket)
│
└── src/
    ├── app/                      # expo-router file-based routes
    │   ├── _layout.tsx           # Root: loads Geist fonts, AuthProvider, splash screen
    │   ├── index.tsx             # Auth gate: redirects to (auth) or (main)
    │   │
    │   ├── (auth)/
    │   │   ├── _layout.tsx       # Auth stack
    │   │   ├── sign-in.tsx       # Email input + "Send magic link" button
    │   │   └── verify.tsx        # "Check your email" + deep link handler
    │   │
    │   └── (main)/
    │       ├── _layout.tsx       # Protected routes (redirects if not authed)
    │       ├── manage.tsx        # All Affirmations list (modal presentation)
    │       │
    │       ├── (tabs)/
    │       │   ├── _layout.tsx   # Stack (not tabs yet — placeholder for future)
    │       │   └── index.tsx     # Dashboard: hero text, history grid with doodle thumbnails, bottom sheet
    │       │
    │       ├── create/
    │       │   ├── _layout.tsx   # Create flow stack (explicit screen registrations)
    │       │   ├── index.tsx     # Choose method: pre-written scripts, write own, just talk
    │       │   ├── customize.tsx # Edit a pre-written script before recording
    │       │   ├── custom.tsx    # Write your own script from scratch
    │       │   └── record.tsx    # Record screen with speech recognition + word highlighting
    │       │
    │       └── listen/
    │           ├── _layout.tsx   # Listen flow stack (explicit screen registrations)
    │           ├── index.tsx     # "Hear it." playback with synced scrolling text
    │           ├── doodle.tsx    # "Doodle time!" drawing canvas after listening
    │           └── complete.tsx  # "Done." session complete screen (legacy fallback)
    │
    ├── components/
    │   ├── ui/
    │   │   ├── Button.tsx        # Filled (dark) and outlined variants, 63px height
    │   │   ├── BottomBar.tsx     # Back arrow + CTA button, fixed bottom
    │   │   ├── Card.tsx          # White bg, rounded corners, border
    │   │   ├── GradientOverlay.tsx # Top/bottom fade for scrolling text areas
    │   │   └── ScreenHeader.tsx  # Geist 600SemiBold, 24vw responsive, line-height 0.8
    │   │
    │   ├── affirmation/
    │   │   ├── AffirmationCard.tsx  # Play/stop, waveform, title/date, script accordion, optional menu
    │   │   ├── Waveform.tsx         # Audio waveform bars (Web Audio API decode, placeholder on native)
    │   │   └── PreWrittenScriptCard.tsx  # Horizontal scrollable script card
    │   │
    │   └── doodle/
    │       ├── DoodleCanvas.tsx     # SVG drawing canvas with PanResponder, undo support
    │       └── DoodleThumbnail.tsx  # Renders stroke data as SVG at any size/color scheme
    │
    ├── contexts/
    │   └── AuthContext.tsx        # Session state, signInWithMagicLink, signOut (platform-aware)
    │
    ├── hooks/
    │   ├── useAffirmations.ts    # CRUD for affirmations table
    │   ├── usePreWrittenScripts.ts # Fetch pre-written scripts
    │   ├── useRecording.ts       # Wraps expo-audio recorder, prepareToRecordAsync, cumulative duration
    │   ├── usePlayback.ts        # Wraps expo-audio player with text line sync
    │   ├── useListeningSession.ts # Create/complete sessions, save doodle data, monthly query with joins
    │   └── useSpeechRecognition.ts # Web Speech API for real-time word detection
    │
    ├── lib/
    │   ├── supabase.ts           # Supabase client singleton
    │   ├── database.types.ts     # Full Supabase DB types (profiles, affirmations, etc.)
    │   ├── storage.ts            # uploadAudio (platform-aware: blob fetch on web, File on native)
    │   └── constants.ts          # COLORS, FONTS, STORAGE bucket config, DOODLE styling constants
    │
    └── types/
        └── index.ts              # Affirmation, ListeningSession, PreWrittenScript, DoodleData, etc.
```

---

## Database Schema (in supabase-migration.sql + supabase-migration-doodles.sql)

### Tables

| Table | Purpose |
|-------|---------|
| `profiles` | User profile, auto-created on signup via trigger |
| `affirmations` | User's recorded affirmations (title, script, audio_url, duration) |
| `listening_sessions` | Tracks daily listening (affirmation played, date, completion, doodle data) |
| `pre_written_scripts` | 3 seeded starter scripts (Creative Confidence, Calm Confidence, Builder's Mindset) |

### listening_sessions columns (after doodle migration)

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| user_id | uuid | FK → profiles.id |
| affirmation_id | uuid | FK → affirmations.id |
| listened_at | date | The calendar day |
| completed_at | timestamptz | When session was completed |
| doodle_url | text | Path in Supabase Storage (for future share/export) |
| doodle_data | text | JSON string of stroke data `{ strokes, canvasWidth, canvasHeight }` |
| created_at | timestamptz | |

### Storage

- **Bucket:** `audio-recordings` (private, RLS enforced)
- **Path pattern:** `{user_id}/{affirmation_id}.m4a` (native) or `.webm` (web)
- **Bucket:** `doodles` (private, RLS enforced) — for future PNG export/sharing
- **Path pattern:** `{user_id}/{session_id}.png`

### RLS

All tables have row-level security. Users can only access their own data. `pre_written_scripts` is readable by all authenticated users.

---

## Screen-by-Screen Summary

### Auth
- **Sign-in:** Large "Affirm." header, email input, "Send magic link" dark button
- **Verify:** "Check your email." message, handles deep link callback to set session. Auto-redirects to dashboard when session is established.
- **Web auth:** Uses `window.location.origin` for redirect URL (not `affirm://` scheme). Checks `window.location.hash` for tokens on mount.

### Dashboard (Home)
- Large Geist hero text (24vw, responsive) — static "I am more than enough"
- History grid: 7-column calendar for current month, responsive vw-based sizing
  - Grid cells: `#E8E2DB` background with 2px `#E8E2DB` border
  - First day cell: `#2D1E3C` border
  - Completed days without doodle: filled `#2D1E3C`
  - Completed days with doodle: `#2D1E3C` background + inline SVG doodle thumbnail (white strokes)
  - 7% vw padding on left/right
- **Bottom sheet modal** (draggable via PanResponder):
  - **Normal mode** (no completion today):
    - Collapsed state (130px): drag handle + CTA button only
    - Expanded state (420px): Today's Affirmation card + "Manage" link + CTA button
  - **Completion mode** (today's session done with doodle):
    - Collapsed state (80px): drag handle + small doodle thumbnail + "X complete" text
    - Expanded state (420px): large doodle preview (inverted colors) + affirmation title + "Today" + Share button
  - Snap threshold at 60px, spring animation between states
  - Sheet bg: `#FAFAFC`, rounded top corners (25px), subtle shadow

### Create Flow
1. **Choose Method:** Horizontal scrollable pre-written script cards + "Write your own" / "Just start talking"
2. **Customize:** Editable text area
3. **Custom:** Empty text area with placeholder
4. **Record:** Speech-recognition-powered recording screen

### Manage Affirmations (modal)
- FlatList of AffirmationCard components with waveform visualization
- "..." menu with Re-record and Delete options
- "+ Add New" button at bottom

### Listen Flow (3 screens)
1. **Hear it.:** Random active affirmation selected, audio playback with synced scrolling text, progress bar, play/pause
2. **Doodle time!:** Drawing canvas after playback completes. Gray canvas (`#E8E2DB`), thick dark strokes (`#2D1E3C`, 5px). Undo button (circle, bottom-left) removes last stroke. "Save Doodle" button (disabled until first stroke) saves JSON stroke data to `listening_sessions.doodle_data` and navigates to dashboard.
3. **Complete (legacy):** "Done." screen — kept as fallback but primary flow goes Doodle → Dashboard

---

## Doodle System

### How Drawing Works
- `DoodleCanvas` uses `PanResponder` to track touch/mouse input
- Each continuous touch gesture (down → move → up) creates one stroke
- Strokes are arrays of `{x, y}` coordinate points
- Points are converted to SVG `<Path>` elements using quadratic bezier curves for smooth lines
- Current stroke uses a ref for performance; completed strokes stored in state
- Canvas background: `#E8E2DB` (warm gray), stroke color: `#2D1E3C` (dark purple-black), width: 5px

### How Undo Works
- Each stroke is one entry in the strokes array
- Undo removes the last entry (last full mouse-down → mouse-up gesture)
- Undo button disabled when no strokes exist

### How Doodles Are Saved
- On "Save Doodle": stroke data + canvas dimensions serialized as JSON
- Stored in `listening_sessions.doodle_data` column (TEXT)
- Session also marked as completed via `completed_at` timestamp
- Navigation: `router.dismissAll()` → `router.replace('/(main)/(tabs)')` back to dashboard

### How Thumbnails Render
- `DoodleThumbnail` component takes `DoodleData` + desired `width`/`height`
- Uses SVG `viewBox` to scale strokes proportionally to any size
- `inverted` prop (default true): white strokes on `#2D1E3C` background
- `inverted=false`: original colors (dark strokes on gray)
- No image downloads — thumbnails render from stored JSON data

---

## Design Language

- **Background:** `#FDF8ED` (warm cream)
- **Text/Accent:** `#2D1E3C` (deep purple-black)
- **Cards:** `#FFFFFF` with `#E0DAD3` border
- **Grid cells:** `#E8E2DB` background/border, first cell `#2D1E3C` border
- **Doodle canvas:** `#E8E2DB` background, `#2D1E3C` strokes (5px)
- **Doodle thumbnails:** `#2D1E3C` background, `#FFFFFF` strokes (inverted)
- **Muted text:** `#A0A0A0`
- **Secondary text:** `#6B6B6B`
- **Headers:** Geist 600SemiBold, 24vw responsive, line-height 0.8, letter-spacing -0.5vw
- **Body text:** Geist 400Regular (script display), Geist 500Medium (labels), Geist 700Bold (spoken words)
- **CTAs:** Dark (`#2D1E3C`) filled buttons, 63-74px height, pill shape
- **Ghost buttons:** `rgba(45,30,60,0.1)` bg, `#2D1E3C` border, dark text/icons
- **Circle buttons:** 74px, border only, for pause/restart controls
- **Layout:** Single column, 7% vw horizontal padding, bottom-positioned actions

---

## Supabase Configuration

- **Project URL:** `https://mjhgdjvcrhgatzijoyuv.supabase.co`
- **Site URL:** Set to Supabase project URL
- **Redirect URLs:** `affirm://(auth)/verify`, `http://localhost:8081`, `exp://`
- **Migrations:**
  1. Run `supabase-migration.sql` in SQL Editor (initial setup)
  2. Run `supabase-migration-doodles.sql` in SQL Editor (doodle support — adds columns + storage bucket)

---

## What Has NOT Been Built Yet

### Not built (future milestones):
- **Share functionality** (M5) — share doodle/streak/card (Share button exists but is a no-op)
- **Doodle PNG export** — save doodle as PNG to Supabase Storage for sharing (stroke JSON is saved, PNG export deferred)
- **Animations/transitions** (M5) — smooth flow between states
- **Push notifications** — daily reminders
- **Offline support** — cache affirmations for offline playback
- **Audio playback speed control**
- **Native speech recognition** — currently only works on web via Web Speech API

---

## Known Limitations / Things to Watch

1. **Speech recognition is web-only** — uses the Web Speech API (`webkitSpeechRecognition`). On native, the word highlighting won't activate. A native library (like `expo-speech-recognition` or a cloud API) would be needed for iOS/Android.
2. **Text-to-audio sync during playback** uses even time division (total duration / number of lines). This is approximate. Fix: store per-line timestamps during recording.
3. **The (tabs) layout** is a Stack, not actual tabs. Placeholder for future tab bar.
4. **No error boundaries** or loading skeletons yet.
5. **Dashboard hero text and today's affirmation** are picked randomly on each render. Should persist the daily pick.
6. **Web audio format** is `.webm` while native is `.m4a`. The playback hook and listen screen may need to handle both formats when playing back on different platforms.
7. **Doodle data is JSON in a TEXT column** — works fine for the current scale. If doodle data gets very large (many complex strokes), consider compressing or limiting stroke point density.
8. **PanResponder in DoodleCanvas** uses a static `useRef` — the panResponder is created once and doesn't update with state changes. The `onStrokesChange` callback is passed at creation time, so stroke state changes use `setStrokes` functional updates internally.

## Continued Guidance
Continue to update this file as work is done and keep it updated every addition.
