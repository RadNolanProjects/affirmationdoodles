# Affirm App — Build Summary

## What Is This App?

Affirm is a mobile-first daily affirmations app. Users record affirmations in their own voice, listen to them daily, and (eventually) cap each session with a quick doodle. The PRD lives at `affirm-prd.md`.

---

## What Was Built

### Scope: M1 (Foundation) + M2 (Record) + Partial M3 (Listen)

The goal: a user can record an affirmation, listen to it, and the app saves that they did it.

### Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | React Native (Expo) | SDK 55 |
| Routing | expo-router (file-based) | ~55.0.3 |
| Backend | Supabase (Postgres + Auth + Storage) | supabase-js 2.98 |
| Auth | Supabase Magic Link (email) | — |
| Audio | expo-audio | ~55.0.8 |
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

---

## File Structure

```
affirmationdoodles/
├── .env                          # Supabase URL + key
├── app.json                      # Expo config (scheme: "affirm", audio permissions)
├── tsconfig.json                 # Path alias @/* -> ./src/*
├── package.json                  # main: "expo-router/entry"
├── affirm-prd.md                 # Full product requirements document
├── supabase-migration.sql        # SQL to run in Supabase dashboard
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
    │       │   └── index.tsx     # Dashboard: hero text, history grid, today's card
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
    │           └── complete.tsx  # "Done." session complete screen
    │
    ├── components/
    │   ├── ui/
    │   │   ├── Button.tsx        # Filled (dark) and outlined variants, 63px height
    │   │   ├── BottomBar.tsx     # Back arrow + CTA button, fixed bottom
    │   │   ├── Card.tsx          # White bg, rounded corners, border
    │   │   ├── GradientOverlay.tsx # Top/bottom fade for scrolling text areas
    │   │   └── ScreenHeader.tsx  # Geist 600SemiBold, 24vw responsive, line-height 0.8
    │   │
    │   └── affirmation/
    │       ├── AffirmationCard.tsx  # Play/stop, waveform, title/date, script accordion, optional menu
    │       ├── Waveform.tsx         # Audio waveform bars (Web Audio API decode, placeholder on native)
    │       └── PreWrittenScriptCard.tsx  # Horizontal scrollable script card
    │
    ├── contexts/
    │   └── AuthContext.tsx        # Session state, signInWithMagicLink, signOut (platform-aware)
    │
    ├── hooks/
    │   ├── useAffirmations.ts    # CRUD for affirmations table
    │   ├── usePreWrittenScripts.ts # Fetch pre-written scripts
    │   ├── useRecording.ts       # Wraps expo-audio recorder, prepareToRecordAsync, cumulative duration
    │   ├── usePlayback.ts        # Wraps expo-audio player with text line sync
    │   ├── useListeningSession.ts # Create/complete listening sessions, monthly query
    │   └── useSpeechRecognition.ts # Web Speech API for real-time word detection
    │
    ├── lib/
    │   ├── supabase.ts           # Supabase client singleton
    │   ├── database.types.ts     # Full Supabase DB types (profiles, affirmations, etc.)
    │   ├── storage.ts            # uploadAudio (platform-aware: blob fetch on web, File on native)
    │   └── constants.ts          # COLORS, FONTS, STORAGE bucket config
    │
    └── types/
        └── index.ts              # Affirmation, ListeningSession, PreWrittenScript, etc.
```

---

## Database Schema (in supabase-migration.sql)

### Tables

| Table | Purpose |
|-------|---------|
| `profiles` | User profile, auto-created on signup via trigger |
| `affirmations` | User's recorded affirmations (title, script, audio_url, duration) |
| `listening_sessions` | Tracks daily listening (affirmation played, date, completion) |
| `pre_written_scripts` | 3 seeded starter scripts (Creative Confidence, Calm Confidence, Builder's Mindset) |

### Storage

- **Bucket:** `audio-recordings` (private, RLS enforced)
- **Path pattern:** `{user_id}/{affirmation_id}.m4a` (native) or `.webm` (web)

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
  - Completed days: filled `#2D1E3C`
  - 7% vw padding on left/right
- **Bottom sheet modal** (draggable via PanResponder):
  - Collapsed state (130px): drag handle + CTA button only
  - Expanded state (420px): Today's Affirmation card + "Manage" link + CTA button
  - Snap threshold at 60px, spring animation between states
  - Tap handle or swipe to toggle
  - Sheet bg: `#FAFAFC`, rounded top corners (25px), subtle shadow
  - CTA area has top border separator
- Today's Affirmation: uses shared `AffirmationCard` with play/stop, waveform, title, date, duration, script accordion
- "Start Affirmation" button → listen flow (or "Create Affirmation" / "Record Affirmation" if none exist)
- "Manage" link → manage screen
- Main content (hero + grid) scrolls behind the sheet with extra bottom padding

### Create Flow
1. **Choose Method:** Horizontal scrollable pre-written script cards + "Write your own" / "Just start talking". Pre-made scripts go directly to Record (skip customize).
2. **Customize:** Editable text area (available from "Write your own" flow)
3. **Custom:** Empty text area with placeholder
4. **Record:** Speech-recognition-powered recording screen:
   - **Idle state:** Script text displayed in Geist 400Regular at 8.5vw. Full-width dark record button (86% vw) with Ionicons mic icon.
   - **Recording state:** Real-time word-by-word bold highlighting via Web Speech API. Current line gets `rgba(45,30,60,0.1)` background highlight with rounded corners. Past lines fade to 40% opacity, future lines progressively fade. Auto-scrolls to current line. Bottom controls: [Restart circle] [Finish ghost button] [Pause circle] — all 74px height.
   - **Paused state:** Same 3 buttons, pause becomes resume (mic icon). Speech recognition pauses and resumes from where it left off.
   - **Auto-complete:** When all words detected, automatically stops recording, saves, and navigates to dashboard.
   - **Confirmation alerts:** "Finish early?" if not all words said. "Restart recording?" before discarding.
   - **Save flow:** stop recorder → get URI + duration → create DB record → upload audio (blob fetch on web) → update with audio_url → navigate to dashboard

### Manage Affirmations (modal)
- "All affirmations" header with Close button
- FlatList of shared `AffirmationCard` components with waveform visualization
- Each card: play/stop button, title, date, duration, waveform bars, script accordion
- "..." menu (via optional props) with Re-record (→ record screen with affirmationId) and Delete (platform-aware: `window.confirm` on web, `Alert.alert` on native)
- Bottom: back + "+ Add New" → create flow

### Listen Flow (2 screens)
1. **Hear it.:** Random active affirmation selected, audio loaded via signed URL, script lines scroll with current line bold/large and others faded, gradient overlays, progress bar, play/pause button
2. **Complete:** "Done." header, "You showed up for yourself today." message, "Back to Home" button

---

## Design Language

- **Background:** `#FDF8ED` (warm cream)
- **Text/Accent:** `#2D1E3C` (deep purple-black)
- **Cards:** `#FFFFFF` with `#E0DAD3` border
- **Grid cells:** `#E8E2DB` background/border, first cell `#2D1E3C` border
- **Muted text:** `#A0A0A0`
- **Secondary text:** `#6B6B6B`
- **Headers:** Geist 600SemiBold, 24vw responsive, line-height 0.8, letter-spacing -0.5vw
- **Body text:** Geist 400Regular (script display), Geist 500Medium (labels), Geist 700Bold (spoken words)
- **CTAs:** Dark (`#2D1E3C`) filled buttons, 63-74px height, pill shape
- **Ghost buttons:** `rgba(45,30,60,0.1)` bg, `#2D1E3C` border, dark text/icons
- **Circle buttons:** 74px, border only, for pause/restart controls
- **Layout:** Single column, 7% vw horizontal padding, bottom-positioned actions
- **Gradient overlays:** Top and bottom fades on scrolling text areas

---

## Supabase Configuration

- **Project URL:** `https://mjhgdjvcrhgatzijoyuv.supabase.co`
- **Site URL:** Set to Supabase project URL
- **Redirect URLs:** `affirm://(auth)/verify`, `http://localhost:8081`, `exp://`
- **Migration:** Run `supabase-migration.sql` in SQL Editor (press Run)

---

## What Has NOT Been Built Yet

### Not built (future milestones):
- **Doodle canvas** (M3 remaining) — drawing after listening, save as PNG
- **Doodle calendar thumbnails** (M4) — history grid shows doodle images instead of plain squares
- **Share functionality** (M5) — share doodle/streak/card
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

## Continued Guidance
Continue to update this file as work is done and keep it updated every addition.
