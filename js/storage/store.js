/* ===== SpellQuest Storage Module ===== */
/* localStorage is the live cache; Supabase is the source of truth.
   All synchronous reads come from localStorage so the UI stays fast.
   Writes go to both localStorage AND Supabase (fire-and-forget). */

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
        savedLists: [],
        premium: false,
        premiumPlan: null,
        premiumExpiry: null,
        premiumPurchaseDate: null
    };

    // ── localStorage helpers ─────────────────────────────────────────────────

    function load() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return { ...defaults };
            return { ...defaults, ...JSON.parse(raw) };
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
        return load()[key];
    }

    function set(key, value) {
        const data = load();
        data[key] = value;
        save(data);
        _syncProfileField(key, value);
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

    // ── Supabase sync ────────────────────────────────────────────────────────
    // Maps localStorage keys to profile column names

    const PROFILE_FIELDS = {
        xp:              'xp',
        level:           'level',
        coins:           'coins',
        selectedHero:    'selected_hero',
        unlockedHeroes:  'unlocked_heroes',
        premium:         'premium',
        premiumPlan:     'premium_plan',
        premiumExpiry:   'premium_expiry'
    };

    // Push a single field change to Supabase (non-blocking)
    function _syncProfileField(key, value) {
        const col = PROFILE_FIELDS[key];
        if (!col || !Auth.isSignedIn()) return;
        DB.updateProfile({ [col]: value }).catch(e =>
            console.warn('Store: sync error for', key, e)
        );
    }

    // Push the full profile state to Supabase — called after bulk updates
    function _syncProfile(data) {
        if (!Auth.isSignedIn()) return;
        const fields = {};
        for (const [localKey, col] of Object.entries(PROFILE_FIELDS)) {
            if (data[localKey] !== undefined) fields[col] = data[localKey];
        }
        DB.updateProfile(fields).catch(e =>
            console.warn('Store: full sync error', e)
        );
    }

    // Overwrite localStorage from a Supabase profile row (called on sign-in)
    async function hydrateFromSupabase() {
        const profile = await DB.getProfile();
        if (!profile) return;

        update(data => {
            data.xp             = profile.xp             ?? data.xp;
            data.level          = profile.level          ?? data.level;
            data.coins          = profile.coins          ?? data.coins;
            data.selectedHero   = profile.selected_hero  ?? data.selectedHero;
            data.unlockedHeroes = profile.unlocked_heroes ?? data.unlockedHeroes;
            data.premium        = profile.premium        ?? data.premium;
            data.premiumPlan    = profile.premium_plan   ?? data.premiumPlan;
            data.premiumExpiry  = profile.premium_expiry ?? data.premiumExpiry;
        });
    }

    // Override update() to also push to Supabase after every bulk mutation
    const _originalUpdate = update;
    function syncedUpdate(updater) {
        const data = _originalUpdate(updater);
        _syncProfile(data);
        return data;
    }

    return {
        load,
        save,
        get,
        set,
        update: syncedUpdate,
        reset,
        hydrateFromSupabase
    };
})();
