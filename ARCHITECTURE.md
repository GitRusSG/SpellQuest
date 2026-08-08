# SpellQuest — Architecture

## Overview

SpellQuest is a single-page application built with no framework and no build tooling. All modules are plain JavaScript files loaded via `<script>` tags in `index.html`. Inter-module communication is direct global function calls. There is no server, no bundler, and no runtime dependencies beyond Tesseract.js (loaded from CDN).

---

## Module Pattern

Every module follows the same **IIFE singleton** pattern:

```js
const ModuleName = (() => {
    // private state and helpers

    return {
        publicMethod() { ... },
    };
})();
```

The returned object is assigned to a `const` on the global scope. Modules reference each other by name directly (e.g., `Store.get()`, `Voice.pronounceWord()`). There is no import/export, no dependency injection, and no event bus.

The script load order in `index.html` is the dependency graph — modules that are depended upon must appear earlier in the file.

### Load order

```
1. store.js          (no dependencies)
2. heroes.js         (depends on Store)
3. progression.js    (depends on Store)
4. voice.js          (no Store dependency; async Web API init)
5. checker.js        (no dependencies)
6. ocr.js            (no dependencies; depends on Tesseract CDN global)
7. handwriting.js    (no dependencies; depends on Tesseract CDN global)
8. ads.js            (depends on Premium)
9. premium.js        (depends on Store)
10. keyboard.js      (no dependencies)
11. animations.js    (no dependencies)
12. screens.js       (depends on all of the above)
13. app.js           (depends on Voice, Animations, Screens)
```

---

## Module Reference

### `Store` — `js/storage/store.js`

The single source of truth. Wraps `localStorage` with a typed read/write interface.

**Public API**

| Method | Description |
|---|---|
| `Store.get()` | Returns the full state object (parsed from localStorage) |
| `Store.update(fn)` | Applies a mutator function to state, then saves. `fn` receives the current state object and should mutate it in place. |

**Data shape**

```js
{
    xp: 0,
    level: 1,
    coins: 0,
    selectedHero: 'robot',
    unlockedHeroes: ['robot'],
    unlockedVoices: ['default'],
    selectedVoice: 'default',
    mistakeHistory: [],          // last 50 incorrect words (deduplicated)
    totalWordsCorrect: 0,
    totalWordsAttempted: 0,
    savedLists: [],
    // added on premium purchase:
    premium: false,
    premiumPlan: null,
    premiumExpiry: null,
    premiumPurchaseDate: null
}
```

All state is persisted under the localStorage key `"spellquest_data"`. Missing keys are merged with defaults on every read, so the shape is forward-compatible when new fields are added.

**Mutation pattern used across all modules**

```js
Store.update(state => {
    state.coins += 5;
    state.xp += 10;
});
```

---

### `Progression` — `js/game/progression.js`

Manages XP accumulation, level-up logic, and coin rewards.

**Public API**

| Method | Returns | Description |
|---|---|---|
| `Progression.addXP(amount)` | `{ leveledUp: bool, newLevel: number }` | Adds XP and processes level-ups |
| `Progression.addCoins(amount)` | `void` | Adds coins to the store |
| `Progression.getXPForLevel(level)` | `number` | XP required to reach the next level from `level` |

**Level-up formula**

Level N requires `N × 10` XP to advance to level N+1.

| Current Level | XP to next level |
|---|---|
| 1 | 10 |
| 2 | 20 |
| 3 | 30 |
| 10 | 100 |

`addXP` runs a `while` loop to handle cascading level-ups in a single call (e.g., if a large XP grant crosses multiple thresholds). The return value tells the caller whether a level-up occurred so the UI can trigger the animation.

---

### `Heroes` — `js/game/heroes.js`

Manages the hero catalog, purchases, and the active hero selection.

**Hero catalog**

| ID | Emoji | Cost | Availability |
|---|---|---|---|
| `robot` | 🤖 | 0 🪙 | Default (always unlocked) |
| `wizard` | 🧙 | 10 🪙 | Free tier |
| `fairy` | 🧚 | 15 🪙 | Free tier |
| `fox` | 🦊 | 20 🪙 | Free tier |
| `dragon` | 🐉 | 30 🪙 | Free tier |
| `space_robot` | 🚀 | 50 🪙 | Free tier |
| `golden_dragon` | 👑 | 100 🪙 | Free tier |
| `unicorn` | 🦄 | — | Premium only |
| `phoenix` | 🔥 | — | Premium only |
| `alien` | 👽 | — | Premium only |
| `ninja` | 🥷 | — | Premium only |
| `diamond_knight` | 💎 | — | Premium only |

**Public API**

| Method | Description |
|---|---|
| `Heroes.getAll()` | Returns the full hero catalog array |
| `Heroes.buy(heroId)` | Deducts coins and adds hero to `unlockedHeroes`; returns `{ success, reason }` |
| `Heroes.equip(heroId)` | Sets `selectedHero` in Store |
| `Heroes.isUnlocked(heroId)` | Returns boolean |
| `Heroes.getSelected()` | Returns the currently equipped hero object |

---

### `Voice` — `js/speech/voice.js`

Abstracts the Web Speech API for word pronunciation.

**Initialization**

`Voice.init()` is async. It waits for the browser's `voiceschanged` event (with a 1-second fallback timeout), then selects the best available English voice from a priority list:

1. Google UK English Female
2. Google UK English Male
3. Samantha, Daniel, Karen, Moira, Tessa (system voices)
4. Google US English
5. Any `en-*` voice
6. Any available voice (last resort)

**Speech parameters**: `rate: 0.85`, `pitch: 1.0`, `lang: 'en-GB'`

**Public API**

| Method | Description |
|---|---|
| `Voice.init()` | Async. Loads voices and selects the best one. Must be awaited before use. |
| `Voice.pronounceWord(word)` | Speaks the word, pauses 2.5s, then speaks it again (double pronunciation, matching classroom practice) |
| `Voice.speak(text)` | Speaks text once with no repeat |

---

### `Checker` — `js/spelling/checker.js`

Compares a user's answer against the correct word.

**Public API**

| Method | Returns | Description |
|---|---|---|
| `Checker.check(userAnswer, correctWord)` | `boolean` | Strict exact match after `trim().toLowerCase()` on both |
| `Checker.getDiff(userAnswer, correctWord)` | `string` (HTML) | Character-by-character diff with `<mark>` on incorrect positions |

> **Note**: `getDiff` is implemented but not currently called in the UI. The feedback screen shows the correct word as plain text. This is a known improvement opportunity.

---

### `OCR` — `js/camera/ocr.js`

Processes a photographed word list into a clean string array using Tesseract.js.

**Flow**

1. A hidden `<input type="file" capture="environment">` is programmatically clicked
2. The selected image is read as a base64 data URL
3. Tesseract is run with `tessedit_pageseg_mode=6` (uniform text block) and a character whitelist of `[a-zA-Z \-']`
4. Raw output is cleaned:
   - Bullet points and list-number prefixes (`1.`, `a)`, `-`) are stripped
   - Lines shorter than 2 characters are dropped
   - Lines containing 3+ consecutive spaces are split
   - Results are deduplicated

**Public API**

| Method | Returns | Description |
|---|---|---|
| `OCR.captureList()` | `Promise<string[]>` | Opens camera/file picker, runs OCR, returns cleaned word array |

---

### `Handwriting` — `js/camera/handwriting.js`

Recognizes a single handwritten answer from a photograph.

**Flow**

1. Same file-picker approach as `OCR`
2. Tesseract runs with `tessedit_pageseg_mode=7` (single text line) for better single-word accuracy
3. When multiple words are recognized, the one most similar to the expected word is selected using a character-position similarity score
4. Result is returned to the caller for optional user confirmation/editing before submission

**Public API**

| Method | Returns | Description |
|---|---|---|
| `Handwriting.captureAnswer()` | `Promise<string>` | Opens camera/file picker, returns raw image data URL |
| `Handwriting.recognizeHandwriting(imageData, expectedWord)` | `Promise<string>` | Runs OCR on image, returns best-matching word |

---

### `Keyboard` — `js/ui/keyboard.js`

A fully custom QWERTY keyboard rendered in JavaScript. Replaces the system keyboard to prevent OS autocorrect, autocapitalize, and predictive text from aiding the spelling test.

**Layout**

```
[ Q ][ W ][ E ][ R ][ T ][ Y ][ U ][ I ][ O ][ P ]
  [ A ][ S ][ D ][ F ][ G ][ H ][ J ][ K ][ L ]
[CLR][ Z ][ X ][ C ][ V ][ B ][ N ][ M ][  ⌫  ]
[        SPACE        ][       CHECK ✓       ]
```

**Input handling**: Uses `touchstart` + `e.preventDefault()` as the primary handler on touch devices. `click` fires only on non-touch devices. This prevents the 300ms tap delay and the ghost-click problem on mobile.

**Public API**

| Method | Description |
|---|---|
| `Keyboard.render(container, onInput, onCheck)` | Renders keyboard HTML into `container`; calls `onInput(value)` on every keystroke and `onCheck(value)` when CHECK is tapped |
| `Keyboard.getValue()` | Returns the current typed string |
| `Keyboard.clear()` | Resets the internal value |

---

### `Animations` — `js/ui/animations.js`

Handles visual feedback animations.

**Public API**

| Method | Description |
|---|---|
| `Animations.init()` | Injects `@keyframes floatUp` CSS into `<head>` |
| `Animations.showLevelUp(level)` | Shows a full-screen overlay with hero emoji and "LEVEL UP! Level N" text; auto-dismisses after 2 seconds |
| `Animations.floatCoin(element)` | Triggers a floating coin animation from a given DOM element |

---

### `Ads` — `js/monetization/ads.js`

Manages Google AdSense banner ads, interstitial ads, and rewarded ads.

**Configuration** (at top of file)

```js
const CONFIG = {
    publisherId: 'ca-pub-XXXXXXXXXXXXXXXX',  // replace for production
    testMode: true,                           // set false for production
    INTERSTITIAL_FREQUENCY: 2,               // show interstitial every N tests
};
```

**Public API**

| Method | Description |
|---|---|
| `Ads.init()` | Initializes ads; no-ops if user is premium |
| `Ads.renderBanner()` | Returns HTML string for a banner ad placement |
| `Ads.showInterstitial(onComplete)` | Shows a full-screen interstitial with a 5s countdown; calls `onComplete` when dismissed |
| `Ads.showRewarded(onReward)` | Shows a 10s rewarded ad; calls `onReward()` on completion (grants +5 coins) |

---

### `Premium` — `js/monetization/premium.js`

Manages premium subscription plans and benefits.

**Plans**

| ID | Price | Period |
|---|---|---|
| `monthly` | $2.99 | Per month |
| `yearly` | $19.99 | Per year (~44% saving) |
| `lifetime` | $39.99 | One-time |

**Benefits**: No ads, premium heroes, voice packs, custom themes, detailed stats, unlimited saved lists, premium badge.

**Public API**

| Method | Returns | Description |
|---|---|---|
| `Premium.isPremium()` | `boolean` | Checks active premium status; auto-revokes expired subscriptions |
| `Premium.getPlans()` | `Plan[]` | Returns all available plans |
| `Premium.purchase(planId)` | `{ success, message }` | **Stub** — writes to localStorage directly. Replace with real payment provider. |
| `Premium.getExpiryDate()` | `Date \| null` | Returns subscription expiry (null for lifetime) |

---

### `Screens` — `js/ui/screens.js`

The application shell. Owns all screen rendering, navigation, and the spelling test loop. This is the largest and most central module (~600+ lines).

**Rendering approach**: Every navigation call replaces `app.innerHTML` entirely. Event listeners are attached as inline `onclick="Screens.method()"` attributes in the HTML strings, coupling template strings to the public `Screens` API.

**Public API (screen navigation)**

| Method | Description |
|---|---|
| `Screens.init(appEl)` | Mounts the app into `appEl` and renders the home screen |
| `Screens.showHome()` | Renders the home screen |
| `Screens.showListInput()` | Photo OCR word list entry |
| `Screens.showManualInput()` | Text area word list entry |
| `Screens.showListReview(words)` | Editable list review before starting |
| `Screens.confirmList()` | Reads review edits, filters empties, navigates to start screen |
| `Screens.showStartScreen(words)` | Mode selection (keyboard/paper) + test launch |
| `Screens.startTest(words)` | Initializes `testState`, begins test loop |
| `Screens.showTestWord()` | Renders the current word's test screen |
| `Screens.checkAnswer(val)` | Validates answer, advances test state |
| `Screens.showFeedback(correct, userAnswer, word)` | Renders correct/incorrect feedback |
| `Screens.nextWord()` | Advances to next word or shows results |
| `Screens.showResults()` | Renders final score screen |
| `Screens.showHeroShop()` | Renders the hero purchase/equip screen |
| `Screens.buyHero(heroId)` | Handles hero purchase flow |
| `Screens.equipHero(heroId)` | Handles hero equip flow |
| `Screens.showPremium()` | Renders premium plan selection screen |
| `Screens.purchasePremium(planId)` | Handles premium purchase flow |

**Test state object**

```js
const testState = {
    words: [],          // word list for this session
    currentIndex: 0,    // index into words[]
    results: [],        // { word, correct, userAnswer }[]
    mistakes: [],       // words answered incorrectly
};
```

---

### `app.js` — Bootstrap

```js
(async function() {
    Animations.init();                              // inject keyframes
    await Voice.init();                             // async voice selection
    window._testMode = 'keyboard';                  // default input mode
    Screens.init(document.getElementById('app'));   // render home screen
})();
```

`Ads` and `Premium` are not initialized here — they are initialized lazily by `Screens` when their screens are first visited.

---

## Data Flow Diagram

```
User Action
    │
    ▼
Screens (ui/screens.js)
    ├── reads/writes ──► Store (storage/store.js) ──► localStorage
    ├── calls ──────────► Voice (speech/voice.js) ──► SpeechSynthesis API
    ├── calls ──────────► Checker (spelling/checker.js)
    ├── calls ──────────► Progression (game/progression.js) ──► Store
    ├── calls ──────────► Heroes (game/heroes.js) ──► Store
    ├── calls ──────────► OCR (camera/ocr.js) ──► Tesseract.js ──► Camera/File
    ├── calls ──────────► Handwriting (camera/handwriting.js) ──► Tesseract.js
    ├── calls ──────────► Keyboard (ui/keyboard.js)
    ├── calls ──────────► Animations (ui/animations.js)
    ├── calls ──────────► Ads (monetization/ads.js) ──► AdSense
    └── calls ──────────► Premium (monetization/premium.js) ──► Store
```

All state mutations go through `Store.update()`. `Screens` is the only module that directly manipulates the DOM.

---

## Global State

Two pieces of transient state live on `window` rather than inside a module:

| Global | Set by | Purpose |
|---|---|---|
| `window._testMode` | `app.js`, `Screens.showStartScreen` | `'keyboard'` or `'paper'` — active input mode for the current test |
| `window._reviewWords` | `Screens.showListReview` | The working word list during the review/edit step |

These are minor inconsistencies in an otherwise module-contained design. They work correctly for the single-page, single-session usage pattern.

---

## CSS Architecture

All styles are in a single file: `css/styles.css` (~600 lines).

**Design tokens** (CSS custom properties not used — values are inline):

| Purpose | Value |
|---|---|
| Primary / brand | `#6C63FF` (purple) |
| Success | `#4CAF50` (green) |
| Error | `#F44336` (red) |
| Coins | `#FFD700` (gold) |
| XP | `#9C27B0` (purple) |

**Key decisions**:
- `max-width: 480px` centered — phone-sized viewport regardless of screen size
- `100dvh` for full-height layouts (handles mobile browser chrome correctly)
- `env(safe-area-inset-*)` for iPhone notch/home-bar clearance
- `font-size: 16px !important` on `<textarea>` elements prevents iOS auto-zoom on focus
- `overscroll-behavior-y: contain` disables pull-to-refresh
- Minimum 44px touch targets on all interactive elements
- Screen transitions use a `fadeIn` CSS animation (`opacity + translateY`)
- Breakpoints: landscape (`max-height: 600px`) and small phones (`max-width: 360px`)

---

## Deployment

```yaml
# .github/workflows/deploy-pages.yml
on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy:
    - Upload repo root as GitHub Pages artifact
    - Deploy to GitHub Pages
```

No build step. Source files are served directly. The workflow runs on every push to `main` and can also be triggered manually from the Actions tab.

---

## Known Limitations and Improvement Opportunities

| Area | Issue |
|---|---|
| `Checker.getDiff` | Implemented but never called in the UI — feedback shows plain correct word instead of highlighted diff |
| `Premium.purchase` | Writes directly to localStorage — no real payment provider integrated |
| `Ads` config | Placeholder publisher ID and slot IDs — needs replacing for production |
| Global state | `window._testMode` and `window._reviewWords` could be encapsulated inside `Screens` |
| No PWA manifest | App has mobile web app meta tags but no `manifest.json` or service worker — can't be installed as a PWA |
| No tests | No test suite of any kind — all modules are plain IIFEs that could be tested with any test runner |
| Tesseract memory | OCR engine is instantiated and terminated per use (no persistent worker) — acceptable for infrequent use, but slow if users photograph answers repeatedly |
