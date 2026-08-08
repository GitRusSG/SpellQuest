# SpellQuest — Architecture

## Overview

SpellQuest is a single-page app built with vanilla JavaScript, no framework, and no build tooling. The frontend is static files deployed to GitHub Pages. The backend is Supabase (Postgres, Auth, Edge Functions). All modules are IIFE singletons loaded via `<script>` tags.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vanilla JS (ES6+), HTML5, CSS3 |
| Backend | Supabase (Postgres + GoTrue auth + Edge Functions) |
| OCR | Supabase Edge Function → Gemini Flash Lite |
| OCR fallback | Tesseract.js v5 (CDN) |
| TTS | Web Speech API |
| Offline cache | localStorage |
| Hosting | GitHub Pages |
| CI/CD | GitHub Actions |

---

## Module Pattern

Every module is an IIFE singleton:

```js
const ModuleName = (() => {
    // private state
    return { publicMethod() { ... } };
})();
```

Script load order in `index.html` is the dependency graph.

---

## Script Load Order

```
1.  js/supabase/client.js      — Supabase client singleton
2.  js/supabase/auth.js        — Auth (depends on SupabaseClient)
3.  js/supabase/db.js          — DB operations (depends on SupabaseClient, Auth)
4.  js/storage/store.js        — localStorage + Supabase sync
5.  js/game/progression.js     — XP/leveling (depends on Store)
6.  js/game/heroes.js          — Heroes (depends on Store)
7.  js/game/testpause.js       — Pause/resume state (localStorage only)
8.  js/speech/voice.js         — TTS
9.  js/spelling/checker.js     — Answer comparison
10. js/camera/ocr.js           — Edge Function OCR + Tesseract fallback
11. js/camera/handwriting.js   — Handwriting OCR
12. js/ui/keyboard.js          — Custom QWERTY keyboard
13. js/ui/animations.js        — Level-up overlay
14. js/ui/screens.js           — All screens (depends on everything above)
15. js/app.js                  — Bootstrap
```

---

## Key Modules

### `SupabaseClient` — `js/supabase/client.js`

Singleton. Exposes `get()` which returns the supabase-js client instance. Also exposes `supabaseUrl` and `supabaseKey` for Edge Function calls.

### `Auth` — `js/supabase/auth.js`

Email/password auth. Methods: `init(callback)`, `signUp()`, `signIn()`, `signOut()`, `sendPasswordReset()`, `isSignedIn()`, `getUser()`.

### `DB` — `js/supabase/db.js`

All database CRUD:
- **Profiles**: `getProfile()`, `updateProfile(fields)`
- **Word lists**: `getLists({status})`, `saveList(name, words, id?, {testDate, status})`, `saveAllLists(lists)`, `archiveList(id)`, `unarchiveList(id)`, `deleteList(id)`
- **Results**: `saveResult(...)`, `getResults({limit})`, `getLastResultPerList()`, `getStats()`

### `Store` — `js/storage/store.js`

localStorage is the fast synchronous cache. Supabase is the source of truth.
- On sign-in: `hydrateFromSupabase()` overwrites localStorage from Supabase
- On every write: `update()` saves locally and syncs to Supabase (non-blocking)

### `TestPause` — `js/game/testpause.js`

Saves/restores in-progress test state to localStorage. Methods: `save(state)`, `load()`, `clear()`, `hasPaused()`.

### `OCR` — `js/camera/ocr.js`

Calls the Supabase Edge Function (`/functions/v1/ocr`) with the image and user's JWT. The Edge Function proxies to Gemini with the server-side key. Falls back to Tesseract.js if the function fails.

Returns `[{ name, words }]` — one object per list found in the image.

### `Screens` — `js/ui/screens.js`

All screen rendering and navigation. Key screens:
- **Home**: Practice tab (active lists with last score) and Manage tab (add/edit/archive/delete)
- **Add list**: Photo OCR or manual type → review with mandatory name → auto-save on confirm
- **Test**: Word pronunciation → keyboard/paper input → feedback → results
- **Results**: Score, practice again, practice mistakes
- **Profile**: Stats, hero shop access, sign out

---

## Data Flow

```
User Action
    │
    ▼
Screens
    ├── Auth.signIn/Out ──────────► Supabase Auth
    ├── Store.update() ───────────► localStorage + DB.updateProfile() → Supabase
    ├── DB.getLists/saveList ──────► Supabase word_lists table
    ├── DB.saveResult ────────────► Supabase test_results table
    ├── OCR.recognizeMultipleLists ► Edge Function → Gemini API
    │       └── fallback ─────────► Tesseract.js (browser)
    ├── Voice.pronounceWord ──────► Web Speech API
    ├── Checker.check ────────────► (pure function)
    └── TestPause.save/load ──────► localStorage
```

---

## Database Schema

All tables have RLS enabled. Users only access their own rows.

### `profiles`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | → auth.users |
| username | text | Display name |
| xp, level, coins | integer | Game state |
| selected_hero | text | Active hero ID |
| unlocked_heroes | text[] | Owned heroes |
| premium | boolean | Premium status |
| created_at, updated_at | timestamptz | Auto-managed |

Auto-created via trigger on `auth.users` insert.

### `word_lists`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | Auto-generated |
| user_id | uuid | → profiles |
| name | text | List name (from OCR or user input) |
| words | text[] | Spelling words |
| status | text | `active` or `archived` |
| test_date | date | Optional school test date |
| created_at, updated_at | timestamptz | Auto-managed |

### `test_results`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | Auto-generated |
| user_id | uuid | → profiles |
| list_id | uuid nullable | → word_lists |
| list_name | text | Denormalized for display |
| words_attempted, words_correct | integer | Score |
| mistakes | text[] | Words answered wrong |
| completed_at | timestamptz | When test finished |

---

## Edge Function: OCR

`supabase/functions/ocr/index.ts`

- Receives `{ imageBase64, mimeType }` from the browser
- Verifies user JWT by calling Supabase `/auth/v1/user`
- Sends image to Gemini Flash Lite with a structured prompt
- Parses Gemini's JSON response into `[{ name, words }]`
- Returns the parsed lists to the browser
- GEMINI_KEY stored as a Supabase secret (never exposed)

---

## Security

| Layer | Mechanism |
|---|---|
| Database | RLS policies: `auth.uid() = user_id` on all tables |
| Edge Function | Verifies Bearer token against Supabase Auth; 401 if invalid |
| Gemini key | Stored in Supabase secrets; only accessible server-side |
| Frontend keys | Publishable key is safe to expose; can't bypass RLS |
| Auth | Supabase GoTrue; email/password with optional email confirmation |

---

## Deployment

GitHub Actions workflow triggers on push to `main`:
1. Uploads repo root as GitHub Pages artifact
2. Deploys to GitHub Pages

No build step — source files served directly.

Edge Function deployed separately via Supabase CLI:
```bash
npx supabase functions deploy ocr --project-ref <ref> --no-verify-jwt
npx supabase secrets set GEMINI_KEY="..." --project-ref <ref>
```

---

## Key Design Decisions

1. **IIFE singletons on window** — simple, no bundler, script load order is the DI container
2. **No system keyboard** — custom QWERTY prevents OS autocorrect from cheating the test
3. **localStorage as cache, Supabase as truth** — UI stays fast (sync reads), data persists across devices
4. **Edge Function for OCR** — keeps API key server-side; adds auth gating; allows future rate limiting
5. **Practice/Manage tabs** — separates daily use (practice) from weekly/quarterly admin (add/edit lists)
6. **Auto-save on confirm** — no separate save button; naming is mandatory to prevent unnamed lists
7. **Duplicate detection by name** — re-scanning same sheet doesn't create duplicates
8. **Pause/resume in localStorage** — lightweight, no server roundtrip for mid-test state
