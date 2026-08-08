/* ===== SpellQuest Handwriting Recognition ===== */
/* Paper Mode: recognize handwritten answers */

const Handwriting = (() => {

    // Capture photo of handwritten answer
    function captureAnswer() {
        return new Promise((resolve, reject) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            
            input.onchange = (e) => {
                const file = e.target.files[0];
                if (!file) {
                    reject(new Error('No file selected'));
                    return;
                }
                const reader = new FileReader();
                reader.onload = (ev) => resolve(ev.target.result);
                reader.onerror = () => reject(new Error('Failed to read file'));
                reader.readAsDataURL(file);
            };
            
            input.click();
        });
    }

    // Recognize handwritten text from image
    async function recognizeHandwriting(imageData, expectedWord, onProgress) {
        if (typeof Tesseract === 'undefined') {
            throw new Error('OCR engine not available.');
        }

        const worker = await Tesseract.createWorker('eng', 1, {
            logger: m => {
                if (onProgress && m.status === 'recognizing text') {
                    onProgress(Math.round(m.progress * 100));
                }
            }
        });

        // For handwriting, use slightly different settings
        await worker.setParameters({
            tessedit_pageseg_mode: '7', // Treat the image as a single text line
            tessedit_char_whitelist: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ -\''
        });

        const { data } = await worker.recognize(imageData);
        await worker.terminate();

        // Clean up recognized text
        let recognized = data.text
            .trim()
            .replace(/[^a-zA-Z\s\-']/g, '')
            .trim()
            .toLowerCase();

        // If we got multiple words, try to find the one closest to expected
        const words = recognized.split(/\s+/).filter(w => w.length > 0);
        if (words.length > 1) {
            // Pick the word most similar to expected
            recognized = findClosest(words, expectedWord.toLowerCase());
        } else if (words.length === 1) {
            recognized = words[0];
        }

        return recognized;
    }

    // Simple similarity check - find closest match to expected word
    function findClosest(candidates, expected) {
        let bestMatch = candidates[0];
        let bestScore = similarity(candidates[0], expected);

        for (let i = 1; i < candidates.length; i++) {
            const score = similarity(candidates[i], expected);
            if (score > bestScore) {
                bestScore = score;
                bestMatch = candidates[i];
            }
        }
        return bestMatch;
    }

    // Basic similarity score (0-1)
    function similarity(a, b) {
        if (a === b) return 1;
        const maxLen = Math.max(a.length, b.length);
        if (maxLen === 0) return 1;
        let matches = 0;
        const minLen = Math.min(a.length, b.length);
        for (let i = 0; i < minLen; i++) {
            if (a[i] === b[i]) matches++;
        }
        return matches / maxLen;
    }

    return { captureAnswer, recognizeHandwriting };
})();
