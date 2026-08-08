/* ===== SpellQuest OCR Module ===== */
/* Uses Gemini Flash (multimodal LLM) as primary OCR engine.
   Falls back to Tesseract.js if Gemini is unavailable or fails.
   Supports extracting multiple named spelling lists from a single image. */

const OCR = (() => {
    const GEMINI_MODEL = 'gemini-flash-lite-latest';
    const GEMINI_URL   = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

    const GEMINI_PROMPT = `You are processing a school spelling list sheet.

The image may contain ONE or MULTIPLE spelling lists on the same page.

For EACH spelling list you find:
1. Extract its name/title (e.g. "Spelling & Dictation 1 - Vocabulary for Writing")
2. Extract ONLY the numbered spelling words — ignore dictation sentences, teacher instructions, and handwritten notes
3. Words appear in a numbered table — extract them in order

Return ONLY a JSON array, no markdown, no explanation:
[
  {
    "name": "list name here",
    "words": ["word1", "word2", "word3"]
  }
]

Rules:
- All words must be lowercase
- A valid spelling word is 1–4 words at most (e.g. "mustered up the courage" is acceptable, but a full sentence is not)
- Ignore any item that is a full sentence (contains a verb and reads as a sentence)
- Ignore handwritten annotations
- If no lists are found, return []`;

    // ── API key ───────────────────────────────────────────────────────────────
    function getApiKey() {
        return localStorage.getItem('spellquest_gemini_key') || '';
    }

    function setApiKey(key) {
        localStorage.setItem('spellquest_gemini_key', key.trim());
    }

    function hasApiKey() {
        return !!getApiKey();
    }

    // ── Image capture ─────────────────────────────────────────────────────────
    function captureImage() {
        return new Promise((resolve, reject) => {
            const input = document.createElement('input');
            input.type    = 'file';
            input.accept  = 'image/*';
            input.capture = 'environment';

            input.onchange = e => {
                const file = e.target.files[0];
                if (!file) { reject(new Error('No file selected')); return; }
                const reader = new FileReader();
                reader.onload  = ev => resolve(ev.target.result);
                reader.onerror = () => reject(new Error('Failed to read file'));
                reader.readAsDataURL(file);
            };

            input.click();
        });
    }

    // ── Gemini OCR ────────────────────────────────────────────────────────────
    // Returns an array of { name, words } objects — one per list found in image
    async function recognizeWithGemini(imageData, onProgress) {
        const apiKey = getApiKey();
        if (!apiKey) throw new Error('No Gemini API key set');

        if (onProgress) onProgress(10);

        const [meta, base64] = imageData.split(',');
        const mimeType = meta.match(/:(.*?);/)[1];

        const body = {
            contents: [{
                parts: [
                    { text: GEMINI_PROMPT },
                    { inline_data: { mime_type: mimeType, data: base64 } }
                ]
            }],
            generationConfig: { temperature: 0, maxOutputTokens: 1024 }
        };

        if (onProgress) onProgress(30);

        const response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(body)
        });

        if (onProgress) onProgress(80);

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(`Gemini error: ${err?.error?.message || `HTTP ${response.status}`}`);
        }

        const data = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

        if (onProgress) onProgress(95);

        return parseGeminiResponse(text);
    }

    // Returns [{ name: string, words: string[] }]
    function parseGeminiResponse(text) {
        const match = text.match(/\[[\s\S]*\]/);
        if (!match) return [];

        let parsed;
        try { parsed = JSON.parse(match[0]); } catch { return []; }
        if (!Array.isArray(parsed)) return [];

        return parsed
            .map(item => ({
                name:  String(item.name  || 'Spelling List').trim(),
                words: (Array.isArray(item.words) ? item.words : [])
                    .map(w => String(w).trim().toLowerCase())
                    .filter(w => w.length >= 2)
            }))
            .filter(item => item.words.length > 0);
    }

    // ── Tesseract fallback ────────────────────────────────────────────────────
    // Returns a single { name, words } object
    async function recognizeWithTesseract(imageData, onProgress) {
        if (typeof Tesseract === 'undefined') {
            throw new Error('OCR engine not available');
        }

        const worker = await Tesseract.createWorker('eng', 1, {
            logger: m => {
                if (onProgress && m.status === 'recognizing text') {
                    onProgress(Math.round(m.progress * 100));
                }
            }
        });

        await worker.setParameters({
            tessedit_pageseg_mode:   '6',
            tessedit_char_whitelist: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ -\''
        });

        const { data } = await worker.recognize(imageData);
        await worker.terminate();

        return [{ name: 'Spelling List', words: parseWordList(data.text) }];
    }

    function parseWordList(rawText) {
        const words = [];
        for (let line of rawText.split('\n')) {
            let cleaned = line
                .replace(/^\s*[\d]+[\.\)\-\s]*/g, '')
                .replace(/^\s*[-•●○◦▪]\s*/g, '')
                .replace(/[^a-zA-Z\s\-']/g, '')
                .trim();
            if (cleaned.length < 2) continue;
            for (let part of cleaned.split(/\s{3,}/)) {
                const word = part.trim();
                if (word.length >= 2 && !word.includes('  ')) {
                    words.push(word.toLowerCase());
                }
            }
        }
        return [...new Set(words)];
    }

    // ── Public: recognizeMultipleLists ────────────────────────────────────────
    // Returns [{ name, words }] — may contain multiple lists if Gemini finds them
    async function recognizeMultipleLists(imageData, onProgress) {
        if (hasApiKey()) {
            try {
                const lists = await recognizeWithGemini(imageData, onProgress);
                if (onProgress) onProgress(100);
                if (lists.length > 0) return lists;
                console.warn('OCR: Gemini returned no lists, trying Tesseract');
            } catch (err) {
                console.warn('OCR: Gemini failed, falling back to Tesseract —', err.message);
            }
        }
        return recognizeWithTesseract(imageData, onProgress);
    }

    // Legacy single-list API (used by handwriting module and old call sites)
    async function recognizeList(imageData, onProgress) {
        const lists = await recognizeMultipleLists(imageData, onProgress);
        return lists.length > 0 ? lists[0].words : [];
    }

    return {
        captureImage,
        recognizeList,
        recognizeMultipleLists,
        parseWordList,
        setApiKey,
        getApiKey,
        hasApiKey
    };
})();
