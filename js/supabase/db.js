/* ===== SpellQuest Database Module ===== */
/* All Supabase read/write operations: profile, word lists, test results */

const DB = (() => {

    // ===== PROFILE =====

    async function getProfile() {
        const user = Auth.getUser();
        if (!user) return null;

        const { data, error } = await SupabaseClient.get()
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (error) {
            console.warn('DB.getProfile error:', error.message);
            return null;
        }
        return data;
    }

    async function updateProfile(fields) {
        const user = Auth.getUser();
        if (!user) return { success: false };

        const { error } = await SupabaseClient.get()
            .from('profiles')
            .update(fields)
            .eq('id', user.id);

        if (error) {
            console.warn('DB.updateProfile error:', error.message);
            return { success: false, message: error.message };
        }
        return { success: true };
    }

    // ===== WORD LISTS =====

    // status: 'active' | 'archived' | 'all' (default: 'active')
    async function getLists({ status = 'active' } = {}) {
        const user = Auth.getUser();
        if (!user) return [];

        let query = SupabaseClient.get()
            .from('word_lists')
            .select('*')
            .eq('user_id', user.id)
            .order('test_date', { ascending: true, nullsFirst: false });

        if (status !== 'all') query = query.eq('status', status);

        const { data, error } = await query;
        if (error) { console.warn('DB.getLists error:', error.message); return []; }
        return data;
    }

    // Save a single list. Accepts { name, words, testDate?, status?, existingId? }
    async function saveList(name, words, existingId = null, { testDate = null, status = 'active' } = {}) {
        const user = Auth.getUser();
        if (!user) return { success: false };

        const db     = SupabaseClient.get();
        const fields = {
            name,
            words,
            status,
            test_date:  testDate || null,
            updated_at: new Date().toISOString()
        };
        let result;

        if (existingId) {
            result = await db.from('word_lists').update(fields)
                .eq('id', existingId).eq('user_id', user.id).select('id').single();
        } else {
            result = await db.from('word_lists')
                .insert({ user_id: user.id, ...fields }).select('id').single();
        }

        if (result.error) {
            console.warn('DB.saveList error:', result.error.message);
            return { success: false, message: result.error.message };
        }
        return { success: true, id: result.data.id };
    }

    // Save multiple lists at once (from multi-list OCR). Returns array of saved ids.
    async function saveAllLists(lists) {
        const results = await Promise.all(
            lists.map(l => saveList(l.name, l.words, null, { testDate: l.testDate || null }))
        );
        return results;
    }

    async function archiveList(listId) {
        const user = Auth.getUser();
        if (!user) return { success: false };
        const { error } = await SupabaseClient.get()
            .from('word_lists')
            .update({ status: 'archived', updated_at: new Date().toISOString() })
            .eq('id', listId).eq('user_id', user.id);
        if (error) { console.warn('DB.archiveList error:', error.message); return { success: false }; }
        return { success: true };
    }

    async function unarchiveList(listId) {
        const user = Auth.getUser();
        if (!user) return { success: false };
        const { error } = await SupabaseClient.get()
            .from('word_lists')
            .update({ status: 'active', updated_at: new Date().toISOString() })
            .eq('id', listId).eq('user_id', user.id);
        if (error) { console.warn('DB.unarchiveList error:', error.message); return { success: false }; }
        return { success: true };
    }

    async function deleteList(listId) {
        const user = Auth.getUser();
        if (!user) return { success: false };
        const { error } = await SupabaseClient.get()
            .from('word_lists').delete()
            .eq('id', listId).eq('user_id', user.id);
        if (error) { console.warn('DB.deleteList error:', error.message); return { success: false }; }
        return { success: true };
    }

    // ===== TEST RESULTS =====

    async function saveResult({ listId, listName, wordsAttempted, wordsCorrect, mistakes }) {
        const user = Auth.getUser();
        if (!user) return { success: false };

        const { error } = await SupabaseClient.get()
            .from('test_results')
            .insert({
                user_id:          user.id,
                list_id:          listId   || null,
                list_name:        listName || null,
                words_attempted:  wordsAttempted,
                words_correct:    wordsCorrect,
                mistakes:         mistakes
            });

        if (error) {
            console.warn('DB.saveResult error:', error.message);
            return { success: false, message: error.message };
        }
        return { success: true };
    }

    async function getResults({ limit = 50 } = {}) {
        const user = Auth.getUser();
        if (!user) return [];

        const { data, error } = await SupabaseClient.get()
            .from('test_results')
            .select('*')
            .eq('user_id', user.id)
            .order('completed_at', { ascending: false })
            .limit(limit);

        if (error) {
            console.warn('DB.getResults error:', error.message);
            return [];
        }
        return data;
    }

    // Returns the most recent test result for each list_id
    // { [listId]: { words_correct, words_attempted, completed_at } }
    async function getLastResultPerList() {
        const user = Auth.getUser();
        if (!user) return {};

        const { data, error } = await SupabaseClient.get()
            .from('test_results')
            .select('list_id, words_correct, words_attempted, completed_at')
            .eq('user_id', user.id)
            .not('list_id', 'is', null)
            .order('completed_at', { ascending: false });

        if (error) {
            console.warn('DB.getLastResultPerList error:', error.message);
            return {};
        }

        // Keep only the first (most recent) result per list_id
        const map = {};
        for (const row of data) {
            if (!map[row.list_id]) map[row.list_id] = row;
        }
        return map;
    }

    // ===== STATS HELPER =====
    // Returns aggregate stats computed from test_results rows

    async function getStats() {
        const results = await getResults({ limit: 1000 });
        if (results.length === 0) {
            return {
                totalTests: 0,
                totalAttempted: 0,
                totalCorrect: 0,
                accuracy: 0,
                commonMistakes: []
            };
        }

        const totalTests     = results.length;
        const totalAttempted = results.reduce((s, r) => s + r.words_attempted, 0);
        const totalCorrect   = results.reduce((s, r) => s + r.words_correct, 0);
        const accuracy       = totalAttempted > 0
            ? Math.round((totalCorrect / totalAttempted) * 100)
            : 0;

        // Tally mistakes across all results
        const mistakeCounts = {};
        results.forEach(r => {
            (r.mistakes || []).forEach(m => {
                mistakeCounts[m] = (mistakeCounts[m] || 0) + 1;
            });
        });
        const commonMistakes = Object.entries(mistakeCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([word, count]) => ({ word, count }));

        return { totalTests, totalAttempted, totalCorrect, accuracy, commonMistakes };
    }

    return {
        getProfile,
        updateProfile,
        getLists,
        saveList,
        saveAllLists,
        archiveList,
        unarchiveList,
        deleteList,
        saveResult,
        getResults,
        getLastResultPerList,
        getStats
    };
})();
