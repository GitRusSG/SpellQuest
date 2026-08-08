/* ===== SpellQuest TestPause Module ===== */
/* Saves and restores in-progress test state to localStorage */

const TestPause = (() => {
    const KEY = 'spellquest_paused_test';

    function save({ words, currentIndex, results, mistakes, listId, listName }) {
        try {
            localStorage.setItem(KEY, JSON.stringify({
                words, currentIndex, results, mistakes,
                listId, listName,
                savedAt: new Date().toISOString()
            }));
        } catch (e) {
            console.warn('TestPause.save error:', e);
        }
    }

    function load() {
        try {
            const raw = localStorage.getItem(KEY);
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            return null;
        }
    }

    function clear() {
        localStorage.removeItem(KEY);
    }

    function hasPaused() {
        return !!load();
    }

    return { save, load, clear, hasPaused };
})();
