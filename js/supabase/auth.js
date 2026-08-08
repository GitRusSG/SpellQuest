/* ===== SpellQuest Auth Module ===== */
/* Email/password sign up, sign in, sign out, session management */

const Auth = (() => {
    let _currentUser = null;
    let _onAuthChange = null; // callback set by app.js

    // ===== SESSION =====

    async function init(onAuthChange) {
        const db = SupabaseClient.get();
        _onAuthChange = onAuthChange;

        // Restore existing session
        const { data: { session } } = await db.auth.getSession();
        _currentUser = session?.user ?? null;

        // Listen for auth state changes (sign in, sign out, token refresh)
        db.auth.onAuthStateChange((event, session) => {
            _currentUser = session?.user ?? null;
            if (_onAuthChange) _onAuthChange(event, _currentUser);
        });

        return _currentUser;
    }

    function getUser() {
        return _currentUser;
    }

    function isSignedIn() {
        return _currentUser !== null;
    }

    // ===== SIGN UP =====

    async function signUp(email, password, username) {
        const db = SupabaseClient.get();

        const { data, error } = await db.auth.signUp({
            email: email.trim().toLowerCase(),
            password,
            options: {
                data: { username: username.trim() }
            }
        });

        if (error) return { success: false, message: _friendlyError(error) };

        // Supabase may require email confirmation depending on project settings.
        // If email confirmation is disabled, the user is signed in immediately.
        const needsConfirmation = !data.session;
        return { success: true, needsConfirmation, user: data.user };
    }

    // ===== SIGN IN =====

    async function signIn(email, password) {
        const db = SupabaseClient.get();

        const { data, error } = await db.auth.signInWithPassword({
            email: email.trim().toLowerCase(),
            password
        });

        if (error) return { success: false, message: _friendlyError(error) };
        return { success: true, user: data.user };
    }

    // ===== SIGN OUT =====

    async function signOut() {
        const db = SupabaseClient.get();
        await db.auth.signOut();
        _currentUser = null;
    }

    // ===== PASSWORD RESET =====

    async function sendPasswordReset(email) {
        const db = SupabaseClient.get();
        const { error } = await db.auth.resetPasswordForEmail(
            email.trim().toLowerCase()
        );
        if (error) return { success: false, message: _friendlyError(error) };
        return { success: true };
    }

    // ===== HELPERS =====

    function _friendlyError(error) {
        const msg = error.message || '';
        if (msg.includes('Invalid login credentials'))
            return 'Wrong email or password. Please try again.';
        if (msg.includes('Email not confirmed'))
            return 'Please check your email and confirm your account first.';
        if (msg.includes('User already registered'))
            return 'An account with this email already exists. Please sign in.';
        if (msg.includes('Password should be at least'))
            return 'Password must be at least 6 characters.';
        if (msg.includes('Unable to validate email'))
            return 'Please enter a valid email address.';
        if (msg.includes('rate limit'))
            return 'Too many attempts. Please wait a moment and try again.';
        return msg || 'Something went wrong. Please try again.';
    }

    return {
        init,
        getUser,
        isSignedIn,
        signUp,
        signIn,
        signOut,
        sendPasswordReset
    };
})();
