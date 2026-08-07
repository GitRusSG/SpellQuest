/* ===== SpellQuest OCR Module ===== */
/* Handles image capture and text recognition for printed spelling lists */

const OCR = (() => {
    let tesseractLoaded = false;

    async function loadTesseract() {
        if (tesseractLoaded) return;
        // Tesseract.js is loaded via CDN in index.html
        if (typeof Tesseract === 'undefined') {
            console.warn('Tesseract.js not loaded');
            return;
        }
        tesseractLoaded = true;
    }

    // Capture image from camera or file input
    function captureImage() {
        return new Promise((resolve, reject) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.capture = 'environment';
            
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

    // Recognize text from image, optimized for printed word lists
    async function recognizeList(imageData, onProgress) {
        await loadTesseract();
        
        if (typeof Tesseract === 'undefined') {
            throw new Error('OCR engine not available. Please check your internet connection.');
        }

        const worker = await Tesseract.createWorker('eng', 1, {
            logger: m => {
                if (onProgress && m.status === 'recognizing text') {
                    onProgress(Math.round(m.progress * 100));
                }
            }
        });

        await worker.setParameters({
            tessedit_pageseg_mode: '6', // Assume a single uniform block of text
            tessedit_char_whitelist: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ -\''
        });

        const { data } = await worker.recognize(imageData);
        await worker.terminate();

        return parseWordList(data.text);
    }

    // Parse OCR output into a clean word list
    function parseWordList(rawText) {
        const lines = rawText.split('\n');
        const words = [];

        for (let line of lines) {
            // Remove common list prefixes: numbers, dots, dashes, bullets
            let cleaned = line
                .replace(/^\s*[\d]+[\.\)\-\s]*/g, '')  // Remove "1. " or "1) " or "1- "
                .replace(/^\s*[-•●○◦▪]\s*/g, '')       // Remove bullet points
                .replace(/[^a-zA-Z\s\-']/g, '')         // Keep only letters, spaces, hyphens, apostrophes
                .trim();

            // Skip empty lines or very short fragments
            if (cleaned.length < 2) continue;

            // If line has multiple words separated by lots of space, try to split
            const spaceParts = cleaned.split(/\s{3,}/);
            for (let part of spaceParts) {
                const word = part.trim();
                if (word.length >= 2 && !word.includes('  ')) {
                    words.push(word.toLowerCase());
                }
            }
        }

        // Deduplicate
        return [...new Set(words)];
    }

    return { captureImage, recognizeList, parseWordList };
})();
