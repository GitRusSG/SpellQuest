/* ===== SpellQuest OCR Module ===== */
/* Uses Supabase Edge Function (proxies Gemini) as primary OCR engine.
   Falls back to Tesseract.js if the Edge Function is unavailable.
   Supports extracting multiple named spelling lists from a single image. */

const OCR = (() => {
    // Edge Function URL — set from SupabaseClient config
    function _edgeFnUrl() {
        return SupabaseClient.get().supabaseUrl + '/functions/v1/ocr';
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

    // ── Edge Function OCR ─────────────────────────────────────────────────────
    async function recognizeWithEdgeFunction(imageData, onProgress) {
        if (onProgress) onProgress(10);

        const [meta, base64] = imageData.split(',');
        const mimeType = meta.match(/:(.*?);/)[1];

        if (onProgress) onProgress(25);

        // Get the user's session token for authenticated requests
        const { data: { session } } = await SupabaseClient.get().auth.getSession();
        const accessToken = session?.access_token;
        if (!accessToken) {
            throw new Error('Not authenticated — please sign in');
        }

        const response = await fetch(_edgeFnUrl(), {
            method:  'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': SupabaseClient.get().supabaseKey,
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({ imageBase64: base64, mimeType })
        });

        if (onProgress) onProgress(80);

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err?.error || `Edge Function HTTP ${response.status}`);
        }

        const data = await response.json();
        if (onProgress) onProgress(95);

        return data.lists || [];
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

        return [{ name: 'Spelling List', words: _parseWordList(data.text) }];
    }

    function _parseWordList(rawText) {
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
    async function recognizeMultipleLists(imageData, onProgress) {
        try {
            const lists = await recognizeWithEdgeFunction(imageData, onProgress);
            if (onProgress) onProgress(100);
            if (lists.length > 0) return lists;
            console.warn('OCR: Edge Function returned no lists, trying Tesseract');
        } catch (err) {
            console.warn('OCR: Edge Function failed, falling back to Tesseract —', err.message);
        }
        return recognizeWithTesseract(imageData, onProgress);
    }

    // Legacy single-list API
    async function recognizeList(imageData, onProgress) {
        const lists = await recognizeMultipleLists(imageData, onProgress);
        return lists.length > 0 ? lists[0].words : [];
    }

    return {
        captureImage,
        recognizeList,
        recognizeMultipleLists
    };
})();
