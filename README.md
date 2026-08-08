# SpellQuest 🤖

A mobile-first spelling practice app for children. Kids receive spelling lists from their teachers, add them to the app (by photo or typing), and practice daily until their school test.

---

## Features

- **Photo OCR** — photograph a printed spelling sheet; AI (Gemini) extracts words and list names automatically. Multiple lists on one page are split and saved separately.
- **Manual entry** — type words one per line as an alternative
- **Persistent lists** — lists are saved to the cloud; practice the same list daily across multiple sessions
- **Duplicate detection** — re-scanning the same sheet won't create duplicates
- **Practice / Manage tabs** — daily practice is front-and-centre; list management (add, edit, archive, delete) is a separate tab
- **Test date** — optional school test date per list; countdown shown on practice cards
- **Archive** — hide lists after the school test is done
- **Pause & resume** — exit mid-test and resume later from where you left off
- **Audio pronunciation** — words spoken aloud twice using the Web Speech API
- **Two answer modes** — custom on-screen keyboard (prevents autocorrect) or handwriting on paper + photo
- **XP & leveling** — 10 XP per correct answer, leveling curve
- **Coins & hero shop** — 1 coin per correct answer, spend on cosmetic heroes
- **Results history** — every test score saved, viewable over time
- **Profile & stats** — accuracy rate, total tests, most missed words
- **Accounts** — email/password sign up per child; all data synced via Supabase

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vanilla JavaScript (ES6+, IIFE modules), HTML5, CSS3 |
| Backend / Auth / DB | [Supabase](https://supabase.com) (Postgres + Auth + Edge Functions) |
| OCR | Supabase Edge Function → Gemini Flash Lite (server-side key) |
| OCR fallback | Tesseract.js v5 (CDN, runs in browser) |
| TTS | Web Speech API (`SpeechSynthesis`) |
| Offline cache | `localStorage` (syncs with Supabase on sign-in) |
| Hosting | GitHub Pages |
| CI/CD | GitHub Actions (deploy on push to main) |

---

## Getting Started

### Prerequisites

- A [Supabase](https://supabase.com) project
- A [Gemini API key](https://aistudio.google.com/apikey) (free tier)
- Node.js (for local dev server)

### 1. Apply the database schema

In your Supabase dashboard → **SQL Editor**, run:
- `supabase/schema.sql` — creates tables, RLS policies, triggers
- `supabase/migration_001_list_status.sql` — adds status and test_date columns

### 2. Deploy the Edge Function

```bash
npx supabase functions deploy ocr --project-ref <your-project-ref> --no-verify-jwt
npx supabase secrets set GEMINI_KEY="<your-gemini-key>" --project-ref <your-project-ref>
```

The function verifies authentication internally (checks JWT against Supabase Auth).

### 3. Configure the frontend

Edit `js/supabase/client.js` and set your project URL and publishable key:

```js
const SUPABASE_URL = 'https://<ref>.supabase.co';
const SUPABASE_KEY = 'sb_publishable_...';
```

### 4. Run locally

```bash
npm start
```

Opens at `http://localhost:8080`.

### 5. Deploy to GitHub Pages

Push to `main` — the GitHub Actions workflow deploys automatically.

After deploying, add your Pages URL to Supabase under **Authentication → URL Configuration → Site URL and Redirect URLs**.

---

## Project Structure

```
SpellQuest/
├── index.html                       # Entry point, loads all scripts
├── package.json                     # npm start script
├── css/
│   └── styles.css                   # All styles (single clean file)
├── js/
│   ├── app.js                       # Bootstrap — auth init, routing
│   ├── supabase/
│   │   ├── client.js                # Supabase client singleton
│   │   ├── auth.js                  # Sign up/in/out, password reset
│   │   └── db.js                    # Profiles, word lists, test results CRUD
│   ├── storage/
│   │   └── store.js                 # localStorage cache + Supabase sync
│   ├── game/
│   │   ├── heroes.js                # Hero catalog + buy/equip
│   │   ├── progression.js           # XP, leveling, coins
│   │   └── testpause.js             # Pause/resume test state
│   ├── speech/
│   │   └── voice.js                 # TTS pronunciation
│   ├── spelling/
│   │   └── checker.js               # Answer comparison
│   ├── camera/
│   │   ├── ocr.js                   # Edge Function client + Tesseract fallback
│   │   └── handwriting.js           # Handwritten answer recognition
│   └── ui/
│       ├── screens.js               # All screens and navigation
│       ├── keyboard.js              # Custom QWERTY keyboard
│       └── animations.js            # Level-up overlay
├── supabase/
│   ├── schema.sql                   # Full database schema
│   ├── migration_001_list_status.sql # Migration for existing DBs
│   └── functions/
│       └── ocr/
│           └── index.ts             # Edge Function: Gemini OCR proxy
└── .github/
    └── workflows/
        └── deploy-pages.yml         # GitHub Pages deployment
```

---

## Security

| Layer | Protection |
|---|---|
| Database | Row Level Security — users only access their own data |
| Edge Function | Verifies user JWT against Supabase Auth; 401 if unauthenticated |
| Gemini API key | Stored as Supabase secret; never exposed to clients |
| Publishable key | Safe to be public — identifies project only, can't bypass RLS |

---

## How to Use

1. **Sign up** — parent creates an account with their email + a display name for the child
2. **Add lists** — Manage tab → Add New → photo or type. Lists auto-save on confirm.
3. **Practice daily** — Practice tab shows active lists. Tap one to start.
4. **Pause/resume** — tap ✕ during a test → Pause & Resume Later
5. **Archive** — after the school test, archive the list from Manage tab
6. **View progress** — Profile screen shows stats; results history shows all past scores

---

## Configuration

| File | Value | Purpose |
|---|---|---|
| `js/supabase/client.js` | `SUPABASE_URL` | Project URL |
| `js/supabase/client.js` | `SUPABASE_KEY` | Publishable key |
| Supabase secret | `GEMINI_KEY` | Gemini API key (server-side) |

---

## Browser Support

- Chrome, Safari, Edge, Firefox (modern versions)
- `SpeechSynthesis` API for pronunciation
- WebAssembly for Tesseract.js fallback
- `<input type="file" capture="environment">` for camera (mobile)
