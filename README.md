# SpellQuest 🤖

A mobile-first, browser-based spelling practice app for children. SpellQuest reads words aloud and asks kids to spell them — earning XP, leveling up, and unlocking hero characters along the way.

No installation, no account, no backend. It runs entirely in the browser and works offline after the first load.

---

## Features

- **Word list input** — type a list manually or photograph a printed spelling sheet (OCR)
- **Audio pronunciation** — words are spoken aloud twice using the Web Speech API, mimicking a classroom spelling test
- **Two answer modes** — type using a custom on-screen keyboard, or write on paper and photograph the answer
- **XP & leveling system** — earn 10 XP per correct answer; level up as XP accumulates
- **Coin rewards** — earn 1 coin per correct answer; spend coins to unlock hero characters
- **Hero shop** — 7 free heroes + 5 premium-exclusive heroes, all represented as emoji
- **Mistake tracking** — incorrect words are saved and can be re-practiced immediately
- **Premium tier** — optional paid plans that remove ads and unlock extra heroes/voices
- **No system keyboard** — a custom QWERTY keyboard avoids OS autocorrect cheating the test

---

## Tech Stack

| Concern | Technology |
|---|---|
| Language | Vanilla JavaScript (ES6+, IIFE modules) |
| Markup / Styles | HTML5, CSS3 (mobile-first, single file) |
| Text-to-speech | Web Speech API (`SpeechSynthesis`) |
| OCR (photo input) | [Tesseract.js v5](https://github.com/naptha/tesseract.js) (CDN) |
| Persistence | `localStorage` (single JSON blob) |
| Deployment | GitHub Pages via GitHub Actions |
| Build tooling | None — static files served directly |

---

## Getting Started

### Running locally

Because the app uses ES modules and the camera/file APIs, it must be served over HTTP (not opened as a `file://` URL).

Any static file server works:

```bash
# Python 3
python3 -m http.server 8080

# Node.js (npx)
npx serve .

# VS Code / Kiro
Use the "Live Server" extension or equivalent
```

Then open `http://localhost:8080` in your browser.

### Deploying to GitHub Pages

The repo includes a GitHub Actions workflow that deploys automatically on every push to `main`:

```
.github/workflows/deploy-pages.yml
```

No build step is needed. All source files are served as-is.

To deploy manually: go to **Settings → Pages** in your GitHub repo and set the source to the `gh-pages` branch (or configure GitHub Actions as above).

---

## Project Structure

```
SpellQuest/
├── index.html                  # Single entry point — loads all scripts
├── css/
│   └── styles.css              # All styles (~600 lines, mobile-first)
├── js/
│   ├── app.js                  # App bootstrap (async IIFE)
│   ├── storage/
│   │   └── store.js            # localStorage wrapper
│   ├── game/
│   │   ├── heroes.js           # Hero catalog + buy/equip logic
│   │   └── progression.js      # XP, leveling, coins
│   ├── speech/
│   │   └── voice.js            # TTS voice selection and pronunciation
│   ├── spelling/
│   │   └── checker.js          # Answer comparison and diff highlighting
│   ├── camera/
│   │   ├── ocr.js              # Printed word list → word array (Tesseract)
│   │   └── handwriting.js      # Handwritten answer → text (Tesseract)
│   ├── monetization/
│   │   ├── ads.js              # AdSense integration + rewarded ads
│   │   └── premium.js          # Premium plans and purchase simulation
│   └── ui/
│       ├── screens.js          # All screen rendering and game flow
│       ├── keyboard.js         # Custom QWERTY keyboard widget
│       └── animations.js       # Level-up overlay and coin float effects
└── .github/
    └── workflows/
        └── deploy-pages.yml    # GitHub Pages CI/CD
```

---

## How to Use

1. **Open the app** — the home screen shows your hero, XP, level, and coins.
2. **Enter a word list** — tap "Type Spelling List" to enter words manually, or "Photo Spelling List" to photograph a printed sheet.
3. **Review the list** — edit or delete words before starting.
4. **Choose input mode** — Keyboard (type answers) or Paper (photograph handwritten answers).
5. **Start spelling** — the app reads each word aloud twice. Type or photograph your answer, then tap the check button.
6. **See results** — review your score, XP earned, and any mistakes. Practice missed words again with one tap.

---

## Configuration

There is no configuration file. A few values worth knowing if you're modifying the code:

| Location | Value | Purpose |
|---|---|---|
| `js/game/progression.js` | `10` XP per correct word | Base XP reward |
| `js/game/progression.js` | `level × 10` XP per level | Level-up threshold formula |
| `js/game/progression.js` | `1` coin per correct word | Coin reward |
| `js/speech/voice.js` | `rate: 0.85` | Speech rate (slower for clarity) |
| `js/speech/voice.js` | `2500ms` pause between readings | Gap between double pronunciation |
| `js/monetization/ads.js` | `INTERSTITIAL_FREQUENCY: 2` | Show interstitial every N tests |
| `js/monetization/premium.js` | `$2.99 / $19.99 / $39.99` | Monthly / Yearly / Lifetime pricing |

---

## Monetization Setup

The app has AdSense and premium purchase stubs ready for production wiring:

- **Ads**: Replace the placeholder publisher ID and slot IDs in `js/monetization/ads.js`, and set `testMode: false`.
- **Premium**: Replace `Premium.purchase()` in `js/monetization/premium.js` with a real payment provider (Stripe, PayPal, or platform in-app purchase).

---

## Browser Support

Requires a modern browser with:
- `SpeechSynthesis` API (Chrome, Safari, Edge, Firefox)
- `localStorage`
- `<input type="file" capture="environment">` for camera features (mobile browsers)

Tesseract.js (OCR) requires WebAssembly support, which all modern browsers provide.

---

## License

See `LICENSE` if present, or contact the project owner.
