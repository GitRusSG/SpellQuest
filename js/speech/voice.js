/* ===== SpellQuest Speech Module ===== */
/* Text-to-speech for word pronunciation */

const Voice = (() => {
    let selectedVoice = null;
    let voicesLoaded = false;

    function init() {
        return new Promise(resolve => {
            if (speechSynthesis.getVoices().length > 0) {
                selectBestVoice();
                resolve();
                return;
            }
            speechSynthesis.addEventListener('voiceschanged', () => {
                selectBestVoice();
                resolve();
            }, { once: true });
            // Fallback timeout
            setTimeout(() => {
                selectBestVoice();
                resolve();
            }, 1000);
        });
    }

    function selectBestVoice() {
        const voices = speechSynthesis.getVoices();
        // Prefer high-quality English voices
        const preferred = [
            'Google UK English Female',
            'Google UK English Male',
            'Samantha',
            'Daniel',
            'Karen',
            'Moira',
            'Tessa',
            'Google US English'
        ];

        for (const name of preferred) {
            const voice = voices.find(v => v.name.includes(name));
            if (voice) {
                selectedVoice = voice;
                voicesLoaded = true;
                return;
            }
        }

        // Fallback: any English voice
        const englishVoice = voices.find(v => v.lang.startsWith('en'));
        if (englishVoice) {
            selectedVoice = englishVoice;
        }
        voicesLoaded = true;
    }

    function speak(word) {
        return new Promise(resolve => {
            speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(word);
            if (selectedVoice) {
                utterance.voice = selectedVoice;
            }
            utterance.lang = 'en-GB';
            utterance.rate = 0.85; // Slightly slower for clarity
            utterance.pitch = 1.0;
            utterance.volume = 1.0;
            utterance.onend = () => resolve();
            utterance.onerror = () => resolve();
            speechSynthesis.speak(utterance);
        });
    }

    // Double pronunciation with pause (as per spec)
    async function pronounceWord(word) {
        await speak(word);
        await pause(2500); // 2.5 second pause
        await speak(word);
    }

    function pause(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function getAvailableVoices() {
        return speechSynthesis.getVoices().filter(v => v.lang.startsWith('en'));
    }

    return { init, speak, pronounceWord, getAvailableVoices };
})();
