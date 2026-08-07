/* ===== SpellQuest Storage Module ===== */
/* Handles all persistent data via localStorage */

const Store = (() => {
    const STORAGE_KEY = 'spellquest_data';

    const defaults = {
        xp: 0,
        level: 1,
        coins: 0,
        selectedHero: 'robot',
        unlockedHeroes: ['robot'],
        unlockedVoices: ['default'],
        selectedVoice: 'default',
        mistakeHistory: [],
        totalWordsCorrect: 0,
        totalWordsAttempted: 0,
        savedLists: []
    };

    function load() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return { ...defaults };
            const data = JSON.parse(raw);
            return { ...defaults, ...data };
        } catch (e) {
            console.warn('Store: failed to load, using defaults', e);
            return { ...defaults };
        }
    }

    function save(data) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (e) {
            console.warn('Store: failed to save', e);
        }
    }

    function get(key) {
        const data = load();
        return data[key];
    }

    function set(key, value) {
        const data = load();
        data[key] = value;
        save(data);
    }

    function update(updater) {
        const data = load();
        updater(data);
        save(data);
        return data;
    }

    function reset() {
        localStorage.removeItem(STORAGE_KEY);
    }

    return { load, save, get, set, update, reset };
})();
