# Affirm — Product Requirements Document

## Overview

Affirm is a mobile-first app that lets you record personal affirmations in your own voice, listen to them daily, and cap each listening session with a quick doodle. Over time, your doodle history builds into a visual calendar — a record of showing up for yourself.

**Core loop:** Record → Listen → Doodle → Repeat

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React Native (Expo) |
| Backend / DB | Supabase (Postgres) |
| Auth | Supabase Auth — Magic Link (email) |
| File Storage | Supabase Storage (audio recordings + doodle images) |
| Audio | expo-av for recording and playback |
| Drawing | react-native-skia or @terrylinla/react-native-sketch-canvas |

---

## Design Language

Based on the Figma designs, the visual identity follows these principles:

- **Warm, muted palette:** Off-white / cream background (`#F5F0EB` or similar), black text, minimal accent color (purple used sparingly for CTAs and active states)
- **Bold typographic hero:** Large serif or display type for screen headers ("I am more than enough", "Create.", "Record.", "Hear it.", "Doodle time!") — these act as emotional anchors, not just navigation
- **Minimal chrome:** No heavy nav bars, no tab bars on inner screens. Navigation is contextual and flow-based
- **Card-based UI:** Affirmation items displayed as expandable cards with title, date recorded, and script preview
- **Mobile-first, single-column layout:** Designed for one-handed use, thumb-zone-friendly CTAs at the bottom of the screen

---

## User Flows

### Flow 1: Onboarding / First Launch

1. **Magic link auth** — User enters email, receives a magic link, taps it to sign in
2. **Empty state dashboard** — No affirmations yet. Prominent CTA to record their first one
3. Redirect into the **Create flow**

### Flow 2: Dashboard (Home)

The dashboard is the main hub. It contains:

- **Hero text:** A rotating motivational phrase displayed large at the top (e.g., "I am more than enough"). This can pull from the user's own affirmation scripts
- **Doodle history grid:** A calendar-style grid (similar to GitHub's contribution graph) where each cell represents a day. Days with completed doodles show a thumbnail of the doodle. Empty days are blank/greyed. This gives a visual streak of consistency
- **Today's Affirmation card:** Shows the auto-selected affirmation for today with title, date recorded, and a preview of the script text
- **"Start Affirmation" button:** Primary CTA at the bottom — initiates the daily listening flow

#### Dashboard States
- **Default:** Shows history grid + today's affirmation + Start button
- **Scrolled:** History grid compresses, affirmation card scrolls into view
- **Completion:** After finishing today's session (listen + doodle), show a completion state with option to share
- **Share (TBD):** Allows sharing completion — could be the doodle, a streak badge, or a styled card. Exact share payload to be determined

### Flow 3: Create / Record a New Affirmation

This is a multi-step flow for recording a new affirmation:

#### Step 1 — Choose Method (screen: "Create.")
Two options presented:
- **Select a script to customize** — Choose from pre-written affirmation scripts (the three sets generated earlier, or community templates in future)
- **Write your own script** — Freeform text input

Also shown: "Just start talking" — skip the script entirely and free-record

#### Step 2a — Customize Script (if selected a pre-written one)
- Display the full script text
- User can edit/customize any line before recording
- "Custom options" section at bottom
- **"Next" button** to proceed to recording

#### Step 2b — Write Custom Script (screen: "Affirm.")
- Large text area with placeholder "Tap to start typing"
- User types their own affirmation script
- Text displays in the area as they type
- **"Save" button** to proceed to recording

#### Step 3 — Pre-Record Preview (screen: "Record.")
- Shows "Words will scroll as you speak"
- Displays the full script broken into individual lines/sentences
- Each affirmation statement on its own line for readability
- **Record button (microphone icon)** at bottom center

#### Step 4 — Recording (screen: "Record." — active state)
- Active recording indicator
- The current line being spoken is **highlighted/bolded**
- Previously spoken lines remain visible above
- Upcoming lines visible below (dimmed)
- **Pause button** replaces record button
- Words scroll automatically as user speaks (or user manually advances)

#### Step 5 — Save
- **"Restart"** button to re-record
- **"Save"** button to save the affirmation
- On save: audio file uploaded to Supabase Storage, metadata saved to DB

### Flow 4: Daily Listening Flow

This is the core daily ritual:

#### Step 1 — Listen (screen: "Hear it.")
- Auto-selects a **random affirmation** from the user's library
- Large background text shows affirmation lines scrolling/fading as audio plays
- The **currently playing line** is prominent and centered
- Other lines are faded/blurred in background
- **Progress bar** at bottom showing playback position
- **Pause/Play button** centered below text
- User can **swipe or skip** to switch to a different affirmation from their library

#### Step 2 — Doodle (screen: "Doodle time!")
- Triggered automatically when audio playback completes
- **Drawing canvas** takes up most of the screen
- Subtitle: "Scribble below with whatever you're feeling"
- Minimal tools — just a pen (single color: black on cream). Keep it simple and expressive, not a full drawing app
- **"Save Doodle" button** at bottom
- Optional: a small undo button

#### Step 3 — Completion
- Doodle saved to Supabase Storage
- Session record created (date, affirmation played, doodle reference)
- Return to dashboard with updated doodle history grid
- Completion state shown on dashboard

### Flow 5: Manage Affirmations

Accessed from the dashboard (likely via a "Manage Affirmations" link or menu):

#### Affirmation List (screen: "All Affirmations")
- List of all recorded affirmations as **expandable cards**
- Each card shows: Title, "Recorded [date]", and a "Script" label
- Tapping a card **expands** it to reveal the full script text
- **Expanded card actions:**
  - **Re-record** — re-record audio for this script
  - **Delete** — remove affirmation (with confirmation)
- **"+ Add New" button** fixed at bottom — enters the Create flow
- Navigation: back arrow to return to dashboard

---

## Data Model (Supabase)

### Tables

#### `profiles`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK, references auth.users |
| email | text | From auth |
| display_name | text | Optional |
| created_at | timestamptz | |
| updated_at | timestamptz | |

#### `affirmations`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| user_id | uuid | FK → profiles.id |
| title | text | e.g., "Creative Energy" |
| script | text | Full affirmation text |
| audio_url | text | Path in Supabase Storage |
| audio_duration_seconds | integer | Duration for playback UI |
| is_active | boolean | Whether included in random rotation (default: true) |
| created_at | timestamptz | |
| updated_at | timestamptz | |

#### `listening_sessions`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| user_id | uuid | FK → profiles.id |
| affirmation_id | uuid | FK → affirmations.id |
| doodle_url | text | Path in Supabase Storage |
| listened_at | date | The calendar day (used for doodle grid) |
| completed_at | timestamptz | Full timestamp |
| created_at | timestamptz | |

#### `pre_written_scripts` (for starter templates)
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| title | text | e.g., "Creative Energy" |
| script | text | Full template text |
| category | text | Optional grouping |
| sort_order | integer | Display order |

### Storage Buckets

#### `audio-recordings`
- Path pattern: `{user_id}/{affirmation_id}.m4a`
- Private bucket — RLS enforced, only owner can read/write
- Audio format: M4A (AAC) via expo-av — good quality at small file size

#### `doodles`
- Path pattern: `{user_id}/{session_id}.png`
- Private bucket — RLS enforced, only owner can read/write
- Saved as PNG from canvas export

### Row Level Security (RLS)

All tables enforce RLS so users can only access their own data:

```sql
-- Example policy for affirmations
CREATE POLICY "Users can only access own affirmations"
ON affirmations FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

Apply similar policies to `listening_sessions` and storage buckets.

---

## Screen Inventory

| Screen | Route | Key Components |
|--------|-------|----------------|
| Auth / Magic Link | `/auth` | Email input, magic link send/confirm |
| Dashboard | `/` | Hero text, doodle calendar grid, today's affirmation card, start button |
| All Affirmations | `/affirmations` | Expandable card list, add new button |
| Create — Choose Method | `/create` | Script selection, write-your-own, just-talk options |
| Create — Customize Script | `/create/customize` | Editable script text |
| Create — Write Custom | `/create/custom` | Freeform text input |
| Create — Pre-Record | `/create/record` | Script preview, record button |
| Create — Recording | `/create/record` (active state) | Live recording, scrolling text, pause |
| Listen — Playback | `/listen` | Audio playback, scrolling affirmation text, skip |
| Doodle | `/listen/doodle` | Drawing canvas, save button |
| Completion | `/` (state) | Dashboard with completion overlay |

---

## Key Technical Considerations

### Audio Recording (expo-av)
- Use `Audio.Recording` API with preset `Audio.RecordingOptionsPresets.HIGH_QUALITY`
- Output format: M4A (AAC) — natively supported on both iOS and Android
- Request microphone permissions with graceful fallback messaging
- Show real-time recording duration indicator
- Handle interruptions (phone call, notification) gracefully — pause recording

### Audio Playback
- Use `Audio.Sound` for playback
- Support background audio mode so affirmation continues if user briefly leaves app
- Track playback position for the scrolling text sync
- On playback complete, automatically transition to doodle screen

### Drawing Canvas
- Use `react-native-skia` for performant, smooth drawing
- Single black pen on cream background — keep it intentionally minimal
- Export canvas as PNG via `makeImageSnapshot()`
- Pen settings: medium stroke width, slight smoothing for natural feel

### Doodle Calendar Grid
- Display as a 7-column grid (Sun–Sat) similar to GitHub contribution graph
- Each cell is a small square
- Filled cells show a tiny thumbnail of that day's doodle
- Empty cells are a light grey or outlined
- Show the current month by default, with ability to scroll to previous months
- Query `listening_sessions` grouped by `listened_at` date

### Offline Considerations (v1 — keep it simple)
- v1 requires network connectivity for recording upload and session save
- Future: cache affirmations locally for offline playback, queue uploads

### Random Affirmation Selection
- On entering listening flow, query all `affirmations` where `is_active = true`
- Select one at random (client-side)
- Provide swipe/skip gesture to cycle through others
- Optionally weight toward less-recently-played affirmations (v2)

---

## Seed Data — Starter Scripts

Pre-populate `pre_written_scripts` with these three sets:

### Creative Energy
I am a creator. I am capable of building things that inspire others. I am constantly growing in my craft. I am worthy of the opportunities coming my way. I am resourceful, and I find solutions where others see obstacles. I am proud of the work I put into the world.

### Calm Confidence
I am grounded and steady, no matter what the day brings. I am enough exactly as I am right now. I am in control of my energy and where I direct it. I am releasing what no longer serves me. I am trusting the process, even when progress feels slow. I am becoming the person I'm meant to be.

### Builder's Mindset
I am someone who follows through. I am disciplined, focused, and intentional with my time. I am making progress every single day, even in small ways. I am not defined by setbacks — I am defined by how I respond. I am building something meaningful, and I am patient with the journey. I am surrounded by possibility.

---

## Milestones

### M1 — Foundation
- [ ] Expo project setup with navigation (expo-router)
- [ ] Supabase project setup (auth, DB, storage buckets)
- [ ] Magic link authentication flow
- [ ] Profile creation on first sign-in
- [ ] Basic dashboard shell with empty states

### M2 — Record
- [ ] Create flow — choose method / write custom script
- [ ] Audio recording with expo-av
- [ ] Scrolling script text during recording
- [ ] Upload audio to Supabase Storage
- [ ] Save affirmation metadata to DB
- [ ] Manage affirmations screen (list, expand, delete)

### M3 — Listen + Doodle
- [ ] Daily listening flow — random selection + skip
- [ ] Audio playback with synced scrolling text
- [ ] Doodle canvas after playback completion
- [ ] Save doodle to Supabase Storage
- [ ] Create listening session record

### M4 — Dashboard + History
- [ ] Doodle calendar grid (GitHub-style)
- [ ] Today's affirmation card
- [ ] Completion state after daily session
- [ ] Hero text rotation from user's scripts

### M5 — Polish
- [ ] Share functionality (TBD — doodle, streak, styled card)
- [ ] Animations and transitions between flow states
- [ ] Haptic feedback on record start/stop
- [ ] Empty state illustrations
- [ ] Error handling and edge cases
- [ ] Performance optimization for doodle grid with many entries

---

## Open Questions

1. **Share feature** — What exactly gets shared? Options: the doodle image, a styled card with streak count + doodle, or a screenshot of the completion state. Needs design decision.
2. **Notifications** — Should the app send a daily reminder push notification to do your affirmation? If yes, what time / is it configurable?
3. **Multiple sessions per day** — Can a user listen + doodle more than once per day? If so, does the calendar grid show the first or latest doodle?
4. **Affirmation playback speed** — Should there be a speed control (0.5x, 1x, 1.5x)?
5. **Doodle tools** — Is black pen on cream the final call, or should there be a small color palette or eraser?
6. **Script line syncing** — During recording, should lines auto-advance (via speech detection) or should the user tap to advance to the next line?
