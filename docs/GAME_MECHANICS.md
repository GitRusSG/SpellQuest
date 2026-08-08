# SpellQuest — Game Mechanics

This document covers the full game flow from a player's perspective, and explains all the mechanical systems that drive it: progression, heroes, rewards, and input modes.

---

## The Spelling Test Loop

The core game loop is a listen-and-spell cycle. The app reads a word aloud and the child spells it. Repeat for every word in the list. At the end, results are shown and mistakes can be practiced again.

```
Home Screen
    │
    ▼
Enter Word List ──► (Manual typing  OR  Photo OCR)
    │
    ▼
Review & Edit List
    │
    ▼
Choose Input Mode ──► (Keyboard  OR  Paper)
    │
    ▼
┌─────────────────────────────────────┐
│  For each word:                     │
│    1. Word is spoken aloud (×2)     │
│    2. Child types or photographs    │
│       their answer                  │
│    3. Answer is checked             │
│    4. Feedback shown (+ XP/coins    │
│       if correct)                   │
└─────────────────────────────────────┘
    │
    ▼
Results Screen
    │
    └──► (optional) Practice Mistakes → back to test loop
```

---

## Screen-by-Screen Walkthrough

### 1. Home Screen

The home screen is the persistent hub the child returns to after each test. It shows:

- The active hero emoji (top left)
- Current XP and level
- Coin balance
- XP progress bar toward the next level
- Three action cards:
  - **Photo Spelling List** — enter words by photographing a printed sheet
  - **Type Spelling List** — enter words manually by typing
  - **Hero Shop** — browse and purchase hero characters

---

### 2. Word List Entry

There are two ways to load a spelling list:

#### Manual Input
A plain `<textarea>` accepts one word per line. Words can include numbering or bullet formatting from a copied list — the app strips common prefixes automatically:

- `1. apple` → `apple`
- `a) banana` → `banana`
- `- cherry` → `cherry`

Words are lowercased and filtered to a minimum of 2 characters.

#### Photo OCR
The camera (or file picker on desktop) captures a photo of a printed spelling list. Tesseract.js processes the image with:

- Page segmentation mode 6 (uniform block of text)
- Character whitelist: letters, spaces, hyphens, apostrophes

The same cleaning rules as manual input apply to the OCR output. Lines with large gaps are split into separate words. Duplicates are removed.

---

### 3. List Review

Before starting, the child (or a parent/teacher) can clean up the word list:

- Each word is shown in an editable text input
- Words can be deleted individually
- New words can be added at the end
- Empty entries are ignored when the list is confirmed

This step is important after OCR, which may occasionally misread a character.

---

### 4. Start Screen — Choosing Input Mode

Two modes are available:

| Mode | How the child answers |
|---|---|
| **Keyboard** | Types using the on-screen custom QWERTY keyboard |
| **Paper** | Writes the answer on paper, then photographs it |

The mode is set here and applies to every word in the test. It can be changed by starting a new test.

---

### 5. The Test — Word Pronunciation

When each new word appears, it is **automatically spoken aloud** after a 400ms delay. The word is spoken **twice** with a 2.5-second gap between readings — this mirrors how a teacher delivers words in a classroom spelling test.

Two buttons are available at all times during a test:

- **Listen** — re-triggers the double pronunciation (word spoken twice)
- **Replay** — speaks the word once immediately (for a quick reminder)

---

### 6. The Test — Keyboard Mode

The on-screen keyboard is a full custom QWERTY layout. It replaces the system keyboard entirely to prevent:

- Autocorrect
- Autocapitalize
- Predictive text suggestions

All of these would undermine the point of a spelling test.

The keyboard layout:

```
[ Q ][ W ][ E ][ R ][ T ][ Y ][ U ][ I ][ O ][ P ]
  [ A ][ S ][ D ][ F ][ G ][ H ][ J ][ K ][ L ]
[CLR][ Z ][ X ][ C ][ V ][ B ][ N ][ M ][  ⌫  ]
[        SPACE        ][       CHECK ✓       ]
```

- **CLR** — clears the entire current answer
- **⌫** — deletes the last character
- **CHECK ✓** — submits the answer for checking

As the child types, their current answer is shown in a large display above the keyboard.

---

### 7. The Test — Paper Mode

In paper mode:

1. The child writes their answer on a piece of paper
2. They tap **"Take Photo of Answer"**
3. The camera/file picker opens; they photograph the paper
4. Tesseract.js processes the image (single-line mode for better accuracy)
5. The recognized text is shown for review — the child or parent can correct it before submitting

When multiple words are recognized from the image, the one that most closely matches the expected word's character pattern is selected automatically.

---

### 8. Answer Checking

Answers are checked as an **exact match** after trimming whitespace and converting to lowercase. There is no fuzzy tolerance — `recieve` and `receive` are different answers.

```
userAnswer.trim().toLowerCase() === correctWord.trim().toLowerCase()
```

This is intentional: the purpose of the app is to practice correct spelling, not approximate spelling.

---

### 9. Feedback

After each answer:

**If correct:**
- Large green "✓ Correct!" message
- XP and coin reward displayed: `+10 ⭐ XP  •  +1 🪙`
- If this answer triggered a level-up, the level-up animation plays before the next word

**If incorrect:**
- The child's answer shown in red
- The correct spelling shown in green
- The word is added to the mistakes list for end-of-test review

A "Next" button advances to the next word (or to the results screen if it was the last word).

---

### 10. Results Screen

After the final word, a summary is shown:

- Score: `X / total` and percentage
- Total XP and coins earned in this session
- A list of all misspelled words with their correct spellings

Two actions are available:

- **Practice Mistakes** — starts a new test using only the words that were missed
- **Home** — returns to the home screen

Stats are saved to `localStorage`:
- `totalWordsCorrect` incremented
- `totalWordsAttempted` incremented
- Misspelled words appended to `mistakeHistory` (capped at 50, deduplicated)

---

## Progression System

### XP

Each correctly spelled word earns **10 XP**. XP is permanent — it never resets.

### Leveling Up

The XP required to advance from level N to level N+1 is `N × 10`.

| Level | XP needed to level up | Total XP to reach level |
|---|---|---|
| 1 → 2 | 10 | 10 |
| 2 → 3 | 20 | 30 |
| 3 → 4 | 30 | 60 |
| 5 → 6 | 50 | 150 |
| 10 → 11 | 100 | 550 |

There is no level cap.

Multiple level-ups from a single session are handled correctly — if enough XP is earned to skip multiple levels, each level-up fires in sequence.

### Level-Up Animation

When a level-up occurs, a full-screen overlay appears with:
- The active hero emoji
- "LEVEL UP! 🎉" text
- "Level N" in large text

The overlay auto-dismisses after 2 seconds. The child does not need to tap to continue.

---

## Coin System

### Earning Coins

Each correctly spelled word earns **1 coin**. Coins accumulate with each test session.

Coins can also be earned by watching a rewarded ad (premium users are exempt from ads):
- Watching a 10-second rewarded ad grants **+5 coins**

### Spending Coins

Coins are spent in the **Hero Shop** to unlock new hero characters. Coins deducted only once at purchase; heroes stay unlocked permanently.

---

## Hero System

### Free Heroes

| Hero | Emoji | Cost |
|---|---|---|
| Robot | 🤖 | Free (default) |
| Wizard | 🧙 | 10 🪙 |
| Fairy | 🧚 | 15 🪙 |
| Fox | 🦊 | 20 🪙 |
| Dragon | 🐉 | 30 🪙 |
| Space Robot | 🚀 | 50 🪙 |
| Golden Dragon | 👑 | 100 🪙 |

### Premium Heroes

Premium heroes are unlocked immediately upon any premium purchase and cannot be purchased with coins:

| Hero | Emoji |
|---|---|
| Unicorn | 🦄 |
| Phoenix | 🔥 |
| Alien | 👽 |
| Ninja | 🥷 |
| Diamond Knight | 💎 |

### Equipping Heroes

Unlocked heroes can be swapped at any time from the Hero Shop. The active hero's emoji appears in the header on every screen. The hero choice is purely cosmetic — it has no effect on gameplay.

---

## Ads and Premium

### Ads (Free Tier)

Free users see ads in two places:

- **Banner ads** — displayed on certain screens
- **Interstitial ads** — shown as a full-screen break every 2 completed tests. A 5-second countdown must complete before the ad can be skipped.

A **rewarded ad** option is available: watch a 10-second ad to earn +5 coins.

### Premium Tier

Premium removes all ads and unlocks all premium heroes. Three plans are available:

| Plan | Price | Duration |
|---|---|---|
| Monthly | $2.99 | 1 month |
| Yearly | $19.99 | 1 year (~44% saving) |
| Lifetime | $39.99 | Forever |

Premium benefits:
- No ads
- All 5 premium heroes unlocked
- Premium voice packs (planned)
- Custom themes (planned)
- Detailed stats (planned)
- Unlimited saved lists (planned)
- Premium badge

> **Developer note**: The purchase flow is currently a stub — `Premium.purchase()` writes directly to `localStorage`. A real payment provider (Stripe, PayPal, or platform in-app purchase) must be integrated before going live.

---

## Mistake Practice

At the end of any test, the results screen offers a **"Practice Mistakes"** button if any words were missed. Tapping it starts a new test containing only the missed words, using the same input mode as the original test.

Mistakes from each session are also stored in `mistakeHistory` in `localStorage` (up to 50 words, deduplicated). This history persists across sessions and could be used in future features (e.g., a "practice your hardest words" mode).

---

## Persistence

All progress is saved automatically after every action. There is no save button and no risk of losing progress by closing the browser. Data persists in `localStorage` indefinitely unless the browser's storage is cleared.

What is saved:
- XP and level
- Coin balance
- Unlocked and selected hero
- Unlocked and selected voice
- Mistake history (last 50 words)
- Lifetime correct/attempted word counts
- Premium status and expiry

What is **not** saved:
- The current word list (word lists are entered fresh each session)
- Mid-test state (closing the browser during a test loses that test's progress)
