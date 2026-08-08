/* ===== SpellQuest Profanity Guard ===== */
/* Detects swear words (including with missing/extra letters) and locks the app for 2 days */

const ProfanityGuard = (() => {
    const LOCKOUT_KEY = 'sq_lockout_until';
    const LOCKOUT_DAYS = 2;

    // Base swear words to check against (kept minimal but effective)
    const BAD_WORDS = [
        'fuck', 'shit', 'ass', 'damn', 'bitch', 'crap', 'dick', 'cock',
        'pussy', 'bastard', 'slut', 'whore', 'cunt', 'piss', 'bollocks',
        'wanker', 'twat', 'arse', 'nigger', 'nigga', 'fag', 'faggot',
        'retard', 'motherfucker'
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

    // Generate fuzzy variants: allow one missing letter or one extra letter
    function _isFuzzyMatch(input, badWord) {
        // Exact match
        if (input === badWord) return true;

        // Input is the bad word with one letter removed (e.g. "fck" matches "fuck")
        if (badWord.length - input.length === 1) {
            for (let i = 0; i < badWord.length; i++) {
                const variant = badWord.slice(0, i) + badWord.slice(i + 1);
                if (input === variant) return true;
            }
        }

        // Input is the bad word with one extra letter inserted (e.g. "fuuck" matches "fuck")
        if (input.length - badWord.length === 1) {
            for (let i = 0; i < input.length; i++) {
                const variant = input.slice(0, i) + input.slice(i + 1);
                if (variant === badWord) return true;
            }
        }

        // Input is the bad word with one letter substituted (e.g. "fvck" matches "fuck")
        if (input.length === badWord.length) {
            let diffs = 0;
            for (let i = 0; i < input.length; i++) {
                if (input[i] !== badWord[i]) diffs++;
                if (diffs > 1) break;
            }
            if (diffs === 1) return true;
        }

        return false;
    }

    // Check a string for profanity. Returns true if profanity detected.
    function check(text) {
        if (!text) return false;
        const cleaned = text.toLowerCase().replace(/[^a-z]/g, '');
        if (!cleaned) return false;

        // Check each word in the input
        const words = text.toLowerCase().split(/\s+/);
        for (const word of words) {
            const w = word.replace(/[^a-z]/g, '');
            if (!w) continue;
            for (const bad of BAD_WORDS) {
                if (_isFuzzyMatch(w, bad)) {
                    _lockOut();
                    return true;
                }
            }
        }

        // Also check the entire cleaned string for embedded swear words
        for (const bad of BAD_WORDS) {
            if (cleaned.includes(bad)) {
                _lockOut();
                return true;
            }
        }

        return false;
    }

    return { isLockedOut, showLockoutScreen, check };
})();
