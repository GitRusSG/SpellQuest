# SpellQuest — Game Mechanics

## Core Loop

The child receives a spelling list from school → adds it to the app → practices daily until the school test.

```
Add List (once per list)
    │
    ▼
Practice (daily)
    │  ┌──────────────────────────┐
    │  │ Word spoken aloud (×2)   │
    │  │ Child types/writes answer│
    │  │ Immediate feedback       │
    │  │ +10 XP, +1 coin if right │
    │  └──────────────────────────┘
    │  repeat for each word
    ▼
Results → Practice Again / Practice Mistakes / Home
    │
    ▼
Archive list after school test
```

---

## Adding Lists

### Photo OCR
1. Take a photo of the printed spelling sheet
2. AI (Gemini Flash Lite via Edge Function) extracts list names and words
3. Multiple lists on one page are detected and saved separately
4. Duplicate detection: if a list with the same name exists, user can update it or skip

### Manual Entry
1. Type words one per line
2. Common list formatting (numbering, bullets) is stripped automatically

### Review & Save
- List name is mandatory (pre-filled from OCR when available)
- Optional school test date
- Words can be edited, added, or removed
- Auto-saves to Supabase on confirm

---

## Practicing

### Home Screen (Practice Tab)
- Shows active lists with last score and test date countdown
- Tap a list → start screen → begin test
- "Resume" banner if a paused test exists

### Input Modes

| Mode | How it works |
|---|---|
| **Keyboard** | Custom QWERTY (no autocorrect/predictive text) |
| **Paper** | Write on paper → photograph → OCR recognizes answer |

### Pronunciation
- Each word spoken aloud **twice** with 2.5s gap (mimics classroom practice)
- "Listen" button replays double pronunciation
- "Again" button speaks once

### Answer Checking
Strict exact match after `trim().toLowerCase()`. No fuzzy tolerance — the point is correct spelling.

### Pause & Resume
- ✕ button in test header opens modal:
  - **Pause & Resume Later** — saves progress to localStorage; shows resume banner on home
  - **Abandon** — discards progress, goes home

---

## Progression

### XP & Leveling
- +10 XP per correct answer
- Level N requires `N × 10` XP to advance
- Level-up shows a full-screen celebration overlay (auto-dismisses)
- No level cap

### Coins
- +1 coin per correct answer
- Spent in the Hero Shop on cosmetic characters

### Heroes
7 free heroes (robot default, 6 purchasable with coins) + 5 premium heroes.

| Hero | Cost |
|---|---|
| Robot 🤖 | Free |
| Wizard 🧙 | 10 |
| Fairy 🧚 | 15 |
| Fox 🦊 | 20 |
| Dragon 🐉 | 30 |
| Space Robot 🚀 | 50 |
| Golden Dragon 👑 | 100 |

The active hero emoji appears in the app header.

---

## Results

After each test:
- Score shown as percentage with medal (🥇 100%, 🥈 80%+, 🥉 60%+)
- XP and coins earned
- Mistakes listed with "Practice Mistakes Only" button
- "Practice Again" button repeats the same list
- Result saved to Supabase (linked to list for per-list history)

### Results History
All past test scores viewable from Profile or History screen.

### Stats (Profile)
- Total tests taken
- Total words correct
- Overall accuracy %
- Most missed words (top 10 with repeat count)

---

## List Lifecycle

```
Created (active) → Practiced daily → School test done → Archived
```

| Status | Where it shows |
|---|---|
| `active` | Practice tab (daily use) |
| `archived` | Manage tab → Archived section |

Lists can be unarchived if needed.

---

## Persistence

All data synced to Supabase per account:
- Profile (XP, level, coins, heroes)
- Word lists (name, words, status, test date)
- Test results (every completed test)

localStorage is a fast cache — overwritten from Supabase on sign-in.

Mid-test progress (pause/resume) is localStorage only — not synced to server.
