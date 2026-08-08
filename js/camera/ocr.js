/* ===== SpellQuest OCR Module ===== */
/* Uses Gemini Flash (multimodal LLM) as primary OCR engine.
   Falls back to Tesseract.js if Gemini is unavailable or fails. */

const OCR = (() => {
    const GEMINI_MODEL  = 'gemini-flash-lite-latest';
    const GEMINI_URL    = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
    const GEMINI_PROMPT = `You are helping a child practice spelling. 
Look at this image of a spelling word list.
Extract every spelling word you can see.
Return ONLY a JSON array of lowercase strings, no explanation, no markdown, no numbering.
Example output: ["beautiful","necessary","environment"]
If you cannot find any words, return an empty array: []`;

    // ── API key ───────────────────────────────────────────────────────────────
    // Stored in localStorage so it survives page reloads without being
    // hardcoded into the source. Set once via OCR.setApiKey(key).
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
    async function recognizeWithGemini(imageData, onProgress) {
        const apiKey = getApiKey();
        if (!apiKey) throw new Error('No Gemini API key set');

        if (onProgress) onProgress(10);

        // Strip the data URL prefix to get pure base64 + mime type
        const [meta, base64] = imageData.split(',');
        const mimeType = meta.match(/:(.*?);/)[1];

        const body = {
            contents: [{
                parts: [
                    { text: GEMINI_PROMPT },
                    { inline_data: { mime_type: mimeType, data: base64 } }
                ]
            }],
            generationConfig: {
                temperature:     0,     // deterministic — we want exact words
                maxOutputTokens: 512
            }
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
            const msg = err?.error?.message || `HTTP ${response.status}`;
            throw new Error(`Gemini error: ${msg}`);
        }

        const data = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

        if (onProgress) onProgress(95);

        return parseGeminiResponse(text);
    }

    function parseGeminiResponse(text) {
        // Extract JSON array from the response
        const match = text.match(/\[[\s\S]*\]/);
        if (!match) return [];

        try {
            const words = JSON.parse(match[0]);
            if (!Array.isArray(words)) return [];
            return words
                .map(w => String(w).trim().toLowerCase())
                .filter(w => w.length >= 2 && /^[a-z][a-z'\- ]*$/.test(w));
        } catch {
            return [];
        }
    }

    // ── Tesseract fallback ────────────────────────────────────────────────────
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
        return parseWordList(data.text);
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

    // ── Public: recognizeList ─────────────────────────────────────────────────
    // Tries Gemini first; falls back to Tesseract on any error.
    async function recognizeList(imageData, onProgress) {
        if (hasApiKey()) {
            try {
                const words = await recognizeWithGemini(imageData, onProgress);
                if (onProgress) onProgress(100);
                if (words.length > 0) return words;
                // Gemini returned empty — fall through to Tesseract
                console.warn('OCR: Gemini returned no words, trying Tesseract');
            } catch (err) {
                console.warn('OCR: Gemini failed, falling back to Tesseract —', err.message);
            }
        }
        // Tesseract fallback
        return recognizeWithTesseract(imageData, onProgress);
    }

    return {
        captureImage,
        recognizeList,
        parseWordList,
        setApiKey,
        getApiKey,
        hasApiKey
    };
})();
