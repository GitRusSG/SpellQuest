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

    async function getLists() {
        const user = Auth.getUser();
        if (!user) return [];

        const { data, error } = await SupabaseClient.get()
            .from('word_lists')
            .select('*')
            .eq('user_id', user.id)
            .order('updated_at', { ascending: false });

        if (error) {
            console.warn('DB.getLists error:', error.message);
            return [];
        }
        return data;
    }

    async function saveList(name, words, existingId = null) {
        const user = Auth.getUser();
        if (!user) return { success: false };

        const db = SupabaseClient.get();
        let error;

        if (existingId) {
            // Update existing list
            ({ error } = await db
                .from('word_lists')
                .update({ name, words, updated_at: new Date().toISOString() })
                .eq('id', existingId)
                .eq('user_id', user.id));
        } else {
            // Insert new list
            ({ error } = await db
                .from('word_lists')
                .insert({ user_id: user.id, name, words }));
        }

        if (error) {
            console.warn('DB.saveList error:', error.message);
            return { success: false, message: error.message };
        }
        return { success: true };
    }

    async function deleteList(listId) {
        const user = Auth.getUser();
        if (!user) return { success: false };

        const { error } = await SupabaseClient.get()
            .from('word_lists')
            .delete()
            .eq('id', listId)
            .eq('user_id', user.id);

        if (error) {
            console.warn('DB.deleteList error:', error.message);
            return { success: false, message: error.message };
        }
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
        deleteList,
        saveResult,
        getResults,
        getStats
    };
})();
