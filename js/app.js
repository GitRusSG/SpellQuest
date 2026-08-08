/* ===== SpellQuest App Entry Point ===== */

(async function () {
    'use strict';

    const app = document.getElementById('app');

    // Show a loading splash while we check auth
    app.innerHTML = `
        <div class="screen" style="justify-content:center;align-items:center;">
            <div style="text-align:center;">
                <div style="font-size:64px;margin-bottom:16px;">🤖</div>
                <h2>SpellQuest</h2>
                <p style="color:var(--text-light);margin-top:8px;">Loading…</p>
            </div>
        </div>
    `;

    // Init animations and TTS (parallel — both are independent)
    Animations.init();
    const voicePromise = Voice.init();

    // Init auth — restores existing session if one exists
    const user = await Auth.init(async (event, currentUser) => {
        // Called whenever auth state changes (sign in, sign out, token refresh)
        if (event === 'SIGNED_IN' && currentUser) {
            await Store.hydrateFromSupabase();
            Screens.showHome();
        } else if (event === 'SIGNED_OUT') {
            Store.reset();
            Screens.showSignIn();
        }
    });

    await voicePromise;
    window._testMode = 'keyboard';
    Screens.init(app);

    // Route to the right screen based on auth state
    if (user) {
        await Store.hydrateFromSupabase();
        Screens.showHome();
    } else {
        Screens.showSignIn();
    }

    console.log('SpellQuest initialized ✓');
})();
