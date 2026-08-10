/* ===== SpellQuest Profanity Guard ===== */
/* Detects swear words (exact or with one vowel removed) and locks the app for 2 days */

const ProfanityGuard = (() => {
    const LOCKOUT_KEY = 'sq_lockout_until';
    const LOCKOUT_DAYS = 2;

    // Only the most obvious swear words — kept short to avoid false positives
    const BAD_WORDS = [
        'fuck', 'shit', 'bitch', 'cunt', 'dick', 'cock',
        'pussy', 'slut', 'whore', 'nigger', 'nigga',
        'faggot', 'motherfucker'
    ];

    // Check if the app is currently locked out
    function isLockedOut() {
        const until = localStorage.getItem(LOCKOUT_KEY);
        if (!until) return false;
        const lockUntil = parseInt(until, 10);
        if (isNaN(lockUntil)) return false;
        return Date.now() < lockUntil;
    }

    // Activate lockout
    function _lockOut() {
        const until = Date.now() + (LOCKOUT_DAYS * 24 * 60 * 60 * 1000);
        localStorage.setItem(LOCKOUT_KEY, String(until));
    }

    // Show the black lockout screen
    function showLockoutScreen() {
        document.getElementById('app').innerHTML = '';
        document.body.style.background = '#000';
        document.getElementById('app').style.background = '#000';
    }

    // Check if input matches a bad word with one vowel removed (e.g. "fck" → "fuck")
    function _isVowelRemovedMatch(input, badWord) {
        const vowels = 'aeiou';
        for (let i = 0; i < badWord.length; i++) {
            if (vowels.includes(badWord[i])) {
                const variant = badWord.slice(0, i) + badWord.slice(i + 1);
                if (input === variant) return true;
            }
        }
        return false;
    }

    // Check a string for profanity. Returns true if profanity detected.
    function check(text) {
        if (!text) return false;

        const words = text.toLowerCase().split(/\s+/);
        for (const word of words) {
            const w = word.replace(/[^a-z]/g, '');
            if (w.length < 3) continue;
            for (const bad of BAD_WORDS) {
                // Exact match
                if (w === bad) { _lockOut(); return true; }
                // One vowel removed (e.g. "fck", "sht", "btch")
                if (_isVowelRemovedMatch(w, bad)) { _lockOut(); return true; }
            }
        }

        return false;
    }

    return { isLockedOut, showLockoutScreen, check };
})();
