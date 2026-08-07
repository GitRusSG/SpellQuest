/* ===== SpellQuest App Entry Point ===== */

(async function() {
    'use strict';

    // Initialize modules
    Animations.init();
    await Voice.init();

    // Default test mode
    window._testMode = 'keyboard';

    // Initialize screens
    const app = document.getElementById('app');
    Screens.init(app);

    console.log('SpellQuest initialized ✓');
})();
