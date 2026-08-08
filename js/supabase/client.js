/* ===== SpellQuest Supabase Client ===== */
/* Singleton — loaded before all other supabase modules */

const SupabaseClient = (() => {
    const SUPABASE_URL = 'https://hqqulakmvbipztzvpsha.supabase.co';
    const SUPABASE_KEY = 'sb_publishable_70tGx9O1UU0xvP0QwqR6Xw_LoyEtUFU';

    let _client = null;

    function get() {
        if (_client) return _client;
        if (typeof supabase === 'undefined') {
            throw new Error('Supabase SDK not loaded. Check index.html script order.');
        }
        _client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true
            }
        });
        // Expose URL and key for Edge Function calls
        _client.supabaseUrl = SUPABASE_URL;
        _client.supabaseKey = SUPABASE_KEY;
        return _client;
    }

    return { get };
})();
