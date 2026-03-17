# Affirm App — Build Summary

## What Is This App?

Affirm is a mobile-first daily affirmations app. Users record affirmations in their own voice, listen to them daily, and cap each session with a quick doodle. Over time, the doodle history builds into a visual grid of all past entries. The PRD lives at `affirm-prd.md`.

---

## What Was Built

### Scope: M1 (Foundation) + M2 (Record) + M3 (Listen + Doodle) + M4 (Playlist + Library) + M4.5 (FTUE + Settings)

The goal: a user can record an affirmation, listen to it, doodle after listening, and see their doodle history on the dashboard. M4 added playlist playback of multiple affirmations and an in-sheet library management experience. M4.5 added a first-time user experience that guides new users through recording 3 affirmations, a full intro animation sequence, and a settings screen with account management.

### Tech Stack

| Layer | Technology | Version |
|-------|------------|---------|
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
- **Playlist audio preloading**: All signed URLs for playlist tracks are fetched in parallel on mount via `getAudioUrl()`. When switching tracks, the URL is already resolved so the player can load immediately without waiting for the async URL fetch.
- **Auto-play between tracks**: `usePlayback` accepts an `autoPlay` option and a `resolvedUrl` for pre-fetched URLs. It uses a `readySource` state to track when the player has genuinely loaded the new audio (not stale state from the previous track), then triggers `player.play()` automatically.

---

## File Structure


affirmationdoodles/
├── .env # Supabase URL + key
├── app.json # Expo config (scheme: "affirm", audio permissions)
├── tsconfig.json # Path alias @/* -> ./src/*
├── package.json # main: "expo-router/entry"
├── affirm-prd.md # Full product requirements document
├── supabase-migration.sql # Initial SQL to run in Supabase dashboard
├── supabase-migration-doodles.sql # Doodle support migration (add columns + storage bucket)
│
└── src/
├── app/ # expo-router file-based routes
│ ├── _layout.tsx # Root: loads Geist fonts, AuthProvider, splash screen
│ ├── index.tsx # Auth gate: redirects to (auth) or (main)
│ │
│ ├── (auth)/
│ │ ├── _layout.tsx # Auth stack
│ │ ├── sign-in.tsx # Email input + "Send magic link" button
│ │ └── verify.tsx # "Check your email" + deep link handler
│ │
│ └── (main)/
│ ├── _layout.tsx # Protected routes (redirects if not authed)
│ ├── settings.tsx # Settings screen: logout (with confirmation), delete account (with DELETE confirmation modal)
│ ├── manage.tsx # All Affirmations list (modal presentation, legacy — replaced by in-sheet library)
│ │
│ ├── (tabs)/
│ │ ├── _layout.tsx # Stack (not tabs yet — placeholder for future)
│ │ └── index.tsx # Dashboard: intro animation, hero text, history grid, bottom sheet (playlist/FTUE/library/completed)
│ │
│ ├── create/
│ │ ├── _layout.tsx # Create flow stack (explicit screen registrations)
│ │ ├── index.tsx # Choose method: pre-written scripts, write own, just talk
│ │ ├── customize.tsx # Edit a pre-written script before recording
│ │ ├── custom.tsx # Write your own script from scratch
│ │ └── record.tsx # Record screen with speech recognition + word highlighting
│ │
│ └── listen/
│ ├── _layout.tsx # Listen flow stack (explicit screen registrations)
│ ├── index.tsx # "Hear it." playlist playback with segmented progress, auto-advance
│ ├── doodle.tsx # "Doodle time!" drawing canvas after listening
│ └── complete.tsx # "Done." session complete screen (legacy fallback)
│
├── components/
│ ├── ui/
│ │ ├── Button.tsx # Filled (dark) and outlined variants, 63px height
│ │ ├── BottomBar.tsx # Back arrow + CTA button, fixed bottom
│ │ ├── Card.tsx # White bg, rounded corners, border
│ │ ├── Confetti.tsx # Celebration confetti animation on doodle completion
│ │ ├── GradientOverlay.tsx # Top/bottom fade for scrolling text areas
│ │ └── ScreenHeader.tsx # Geist 600SemiBold, 24vw responsive, line-height 0.8
│ │
│ ├── affirmation/
│ │ ├── AffirmationCard.tsx # Play/stop, waveform, title/date, script accordion, optional menu
│ │ ├── Waveform.tsx # Audio waveform bars (Web Audio API decode, placeholder on native)
│ │ └── PreWrittenScriptCard.tsx # Horizontal scrollable script card
│ │
│ └── doodle/
│ ├── DoodleCanvas.tsx # SVG drawing canvas with PanResponder, undo support
│ └── DoodleThumbnail.tsx # Renders stroke data as SVG at any size/color scheme
│
├── contexts/
│ └── AuthContext.tsx # Session state, signInWithMagicLink, signOut, deleteAccount (clears storage + data)
│
├── hooks/
│ ├── useAffirmations.ts # CRUD for affirmations table
│ ├── usePreWrittenScripts.ts # Fetch pre-written scripts
│ ├── useRecording.ts # Wraps expo-audio recorder, prepareToRecordAsync, cumulative duration
│ ├── usePlayback.ts # Wraps expo-audio player with text line sync, autoPlay + resolvedUrl options
│ ├── useListeningSession.ts # Create/complete sessions, save doodle data, getAllSessions, updateSessionDate
│ └── useSpeechRecognition.ts # Web Speech API for real-time word detection
│
├── lib/
│ ├── supabase.ts # Supabase client singleton
│ ├── database.types.ts # Full Supabase DB types (profiles, affirmations, etc.)
│ ├── storage.ts # uploadAudio (platform-aware: blob fetch on web, File on native), getAudioUrl, deleteAudio
│ └── constants.ts # COLORS, FONTS, STORAGE bucket config, DOODLE styling constants
│
└── types/
└── index.ts # Affirmation, ListeningSession, PreWrittenScript, DoodleData, etc.


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
- **Intro animation** (plays on every mount, not just FTUE):
  1. Blank cream screen for 500ms
  2. "I am more than enough" types out character by character (centered on screen, 45ms/char)
  3. 500ms beat, then text slides up to hero position (800ms, easeInOut). Uses `measureInWindow` to calculate exact target Y. Overlay text stays at full opacity during slide, then instant-swaps with the real hero text at the end — no fade/pop.
  4. History grid fades in + slides up from below (600ms, easeInOut)
  5. Bottom sheet slides up from off-screen (700ms, easeInOut). Slide offset is dynamic — `Animated.multiply((1-progress), sheetHeight)` so it works regardless of sheet height.
  - All animated values initialize to their "hidden" state (`introHeroOpacity: 0`, `introGridReveal: 0`, etc.) to prevent flash of unstyled content on mount.
- **Settings link** (top-right, underlined) navigates to `/(main)/settings`
- Large Geist hero text (24vw, responsive) — static "I am more than enough"
- **History grid:** Reverse-chronological grid of all completed sessions (all-time, not monthly)
  - Index 0 (top-left) = most recent doodle; last cell = first-ever doodle
  - **Gray placeholder cells** for missed days: if today hasn't been completed and the last session was N days ago, N gray cells are prepended before the first doodle. Once a session is completed, the gray cell fills with the new doodle at position 0.
  - Gap cells are also interleaved between sessions for skipped days
  - Grid cells: `#E8E2DB` background with 2px `#E8E2DB` border
  - Completed cells with doodle: `#2D1E3C` background + inline SVG doodle thumbnail (white strokes)
  - 140 trailing empty gray cells appended after real entries as an "empty state" representing pre-signup history
  - `LinearGradient` overlay (transparent → `#FDF8ED`) covers bottom 60% of the grid, fading out the trailing cells
  - 7% vw padding on left/right
  - Tapping a doodle cell opens a **view modal**: centered card with expanded doodle preview, affirmation title, formatted date ("Today" or "Month Day"), and a 3-dot menu with Redo Doodle / Delete Entry actions
  - Data fetched via `getAllSessions()` (all completed sessions, ordered by `listened_at` desc)
- **Bottom sheet modal** (draggable via PanResponder):
  - Scroll spacer is dynamic — `Animated.View` height tied to current `sheetHeight`, so collapsing the sheet reduces scrollable area
  - **FTUE mode** (no recordings at all):
    - Welcome text: "Record your first affirmations to get started."
    - 3 script cards in a horizontal slider (66% screen width each)
    - Cards show title + script preview (4 lines), with a shuffle icon (top-right) that swaps to a random alternative from the FTUE pool
    - Scripts are sourced from `SCRIPT_CATEGORIES` in `create/index.tsx` — items with `ftue: true` are in the pool (single source of truth)
    - "Start Recording" CTA button sends user through all 3 scripts sequentially (record → save → next script → ... → doodle)
    - After recording the 3rd script, creates a listening session and routes to doodle
    - Celebration modal after first doodle includes: "Come back tomorrow for your first affirmation listen."
    - Sheet height: 340px for FTUE content
  - **Playlist mode** (has recordings, no completion today):
    - Collapsed state (130px): drag handle + CTA button only
    - Expanded state (dynamic height based on playlist count): header + timeline list + CTA
    - Header: "Today's affirmations ({total_duration})" with "Library" link
    - **Timeline list** with checkboxes, play buttons, and connector lines:
      - Each item has a checkbox (left), vertical connector lines (above/below play button), play/pause button, and title with duration
      - Checkboxes: all checked by default, unchecking removes item from playlist and updates total duration
      - Unchecked items: strikethrough text with 40% opacity
      - Connector lines: 2px wide, 8px tall, opacity 0.15. First item top line = opacity 0, last item bottom line = opacity 0
      - Each item has its own `useAudioPlayer` for inline preview playback
      - Shared `playingId` state coordinates exclusive playback (only one at a time)
      - Progress fill background on the active item
    - "Start Affirmation" button passes only checked items to the listen screen
    - Sheet height: `sheetHeightForCount(n)` calculates dynamically based on item count
  - **Completion mode** (today's session done with doodle):
    - Collapsed state (80px): drag handle + small doodle thumbnail + "X complete" text
    - Expanded state (500px): large doodle preview (inverted colors) + affirmation title + "Today"
    - "Manage Affirmations" button opens the library view
    - 3-dot menu (top-right) with Redo Doodle / Delete Entry
  - **Library mode** (in-sheet, replaces manage.tsx page):
    - Triggered by "Library" link or "Manage Affirmations" button
    - 90vh max height, flexible based on content, scrollable when overflowing
    - ManageItem cards with 8px gap:
      - Play/pause with progress fill background
      - Title, "Recorded {date}" label, duration
      - Expandable script text with chevron
      - Kebab menu (inline) with Re-record and Delete actions
    - Bottom bar: back button (returns to playlist view) + "Add New" (goes to create flow)
  - Pan responder disabled in library mode
  - Snap threshold at 60px, spring animation between states
  - Sheet bg: `#FAFAFC`, rounded top corners (25px), subtle shadow

### Create Flow
1. **Choose Method:** Horizontal scrollable pre-written script cards + "Write your own" / "Just start talking"
2. **Customize:** Editable text area
3. **Custom:** Empty text area with placeholder
4. **Record:** Speech-recognition-powered recording screen
   - **FTUE queue mode**: When launched from the FTUE sheet, the record screen receives `ftueScripts` (JSON array) and `ftueIndex` params. Subtitle shows "1 of 3 — Script Title" progress indicator. After saving each recording, `router.replace` navigates to the next script (no stack buildup). After the final script, creates a session and routes to doodle.
   - The `ftue` param is also threaded through choose → customize → custom → record for the single-script FTUE path (used by "Create Affirmation" from dashboard).

### Script System
- All scripts live in `SCRIPT_CATEGORIES` (exported from `create/index.tsx`) — a typed array of categories, each with labeled scripts.
- Each `ScriptItem` has `title`, `script`, and optional `ftue: boolean`.
- The FTUE pool is derived via `SCRIPT_CATEGORIES.flatMap(c => c.scripts.filter(s => s.ftue))` — no duplication.
- Currently 9 of 12 scripts are marked `ftue: true`. To change the FTUE pool, just toggle the flag.

### Settings
- **Header:** Back arrow (circle, 2px border) + "Settings" title (57px Geist Medium)
- **Delete my account** button: red outline (`#C30000`), pill shape, soft shadow
- **Logout** button: white fill, `#DEDEDE` border, pill shape, soft shadow
- **Logout flow:** Platform-aware confirmation alert (native Alert.alert / web window.confirm), then `signOut()`
- **Delete flow:** Opens a bottom sheet modal (slides up, dark overlay):
  - "Are you sure?" warning in red
  - Description: "All recordings and user data will be deleted and not able to be recovered."
  - Divider
  - Text input with "Type DELETE below to confirm" label, placeholder "DELETE"
  - Bottom bar: back arrow + red "Delete account" button (disabled at 20% opacity until "DELETE" is typed)
  - Tapping overlay above sheet dismisses modal; tapping inside sheet (including input) does not dismiss (separate Pressable layers)
  - `deleteAccount()` in AuthContext: deletes all audio files from storage bucket, deletes all affirmations and listening sessions, then signs out

### Listen Flow (Playlist Playback)
1. **Hear it.:** Plays a playlist of up to 5 affirmations in succession
   - Accepts `playlistIds` route param (comma-separated IDs from checked items)
   - Falls back to single random active affirmation if no params
   - **Audio preloading**: all playlist URLs pre-fetched in parallel on mount
   - **Auto-play**: tracks auto-advance when each finishes, using `usePlayback`'s `autoPlay` + `resolvedUrl` options
   - **Time display**: `currentElapsed/totalPlaylistDuration` format (bold current, lighter total)
   - **Segmented progress bar**: one segment per track with 4px gap
     - Active segment: 5px tall, partially filled to current playback position
     - Completed segments: 5px tall, fully filled
     - Future segments: 3px tall, unfilled
   - **Play/pause button**: outlined circle (border only), dark icons
   - Synced scrolling text with gradient overlays
   - Creates one listening session per playlist run
2. **Doodle time!:** Drawing canvas after playback completes. Gray canvas (`#E8E2DB`), thick dark strokes (`#2D1E3C`, 5px). Undo button (circle, bottom-left) removes last stroke. "Save Doodle" button (disabled until first stroke) saves JSON stroke data to `listening_sessions.doodle_data` and navigates to dashboard with celebration confetti.
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
- Navigation: `router.dismissAll()` → `router.replace('/(main)/(tabs)')` with `justCompleted` param triggering celebration confetti

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
- **Grid cells:** `#E8E2DB` background/border
- **Doodle canvas:** `#E8E2DB` background, `#2D1E3C` strokes (5px)
- **Doodle thumbnails:** `#2D1E3C` background, `#FFFFFF` strokes (inverted)
- **Sheet background:** `#FAFAFC`
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
- **Share functionality** (M5) — share doodle/streak/card
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
5. **Dashboard hero text** is static. Today's playlist is randomly selected on mount from active affirmations with audio.
6. **Web audio format** is `.webm` while native is `.m4a`. The playback hook and listen screen may need to handle both formats when playing back on different platforms.
7. **Doodle data is JSON in a TEXT column** — works fine for the current scale. If doodle data gets very large (many complex strokes), consider compressing or limiting stroke point density.
8. **PanResponder in DoodleCanvas** uses a static `useRef` — the panResponder is created once and doesn't update with state changes. The `onStrokesChange` callback is passed at creation time, so stroke state changes use `setStrokes` functional updates internally.
9. **Signed audio URLs expire after 1 hour** — pre-fetched URLs in the listen screen cache are not refreshed. Long idle sessions may need URL re-fetching.

### Important Technical Notes (M4.5 additions)

- **Animated.multiply for sheet slide** — the intro sheet animation uses `Animated.multiply((1-progress), sheetHeight)` to derive translateY from the actual sheet height (which varies by state). This avoids hardcoded offsets that break when sheet height changes.
- **measureInWindow for text handoff** — the intro animation measures the hero text's screen position to calculate the exact translateY for the overlay text slide. This ensures a seamless swap between the animated overlay and the static hero text regardless of device/safe area.
- **Supabase OTP rate limiting** — returns `"For security purposes, you can only request this once every 60 seconds"`. The sign-in screen detects this via `isRateLimitError()` which checks for "rate limit", "too many requests", "email rate limit", and "security purposes" in the error message. Without custom SMTP configured, Supabase free tier limits to 2 emails/hour.
- **Account deletion** — uses client-side data cleanup (delete storage files + database rows) followed by `signOut()`. Full user record deletion requires Supabase admin API (server-side), which is not implemented. The user's auth record remains but all data is wiped.
- **FTUE record queue** — uses `router.replace` (not `dismissAll` + `push`) between scripts to avoid "POP_TO_TOP was not handled" warnings. Each recording creates a new affirmation; only the last one gets a listening session for the doodle.
- **Delete modal touch handling** — the overlay and sheet are separate `Pressable` layers so tapping inside the sheet (e.g. the text input) doesn't dismiss the modal. The dark overlay area above the sheet is its own `Pressable` that closes on tap.

## Continued Guidance
Continue to update this file as work is done and keep it updated every addition.
