/* ===== SpellQuest Tutorial ===== */
/* A friendly ghost guides new users through the app */

const Tutorial = (() => {
    const STEPS = [
        {
            message: "Hey there! I'm Boo, your spelling guide. Let me show you around! 👻",
            action: null
        },
        {
            message: "This is your home screen. You can see your hero, level, and coins up here!",
            highlight: '.home-header',
            action: null
        },
        {
            message: "To get started, you need a spelling list. Tap the 'Manage Lists' tab to see how!",
            highlight: '.home-tabs',
            action: 'switchManageTab'
        },
        {
            message: "See that big '+' button? That's how you add a new spelling list. You can type words or take a photo of your school sheet!",
            highlight: '.btn-add-list',
            action: null
        },
        {
            message: "Once you have a list, switch to 'Practice' to test yourself. You'll earn ⭐ XP and 🪙 coins for every correct answer!",
            action: 'switchPracticeTab'
        },
        {
            message: "Coins let you buy cool heroes! Let me show you the Hero Shop...",
            action: 'showHeroShop'
        },
        {
            message: "Here's the Hero Shop! Save up coins from spelling tests to unlock new heroes. Each one has a different personality!",
            highlight: '.hero-grid',
            action: null
        },
        {
            message: "Here's 5 🪙 coins from me to get you started. Good luck with your spelling! 👻✨",
            action: 'giveCoins'
        }
    ];

    let _step = 0;
    let _overlay = null;

    function shouldShow() {
        return !Store.get('tutorialDone');
    }

    function start() {
        _step = 0;
        _showStep();
    }

    function _showStep() {
        if (_step >= STEPS.length) {
            _finish();
            return;
        }

        const step = STEPS[_step];

        // Perform pre-render actions
        if (step.action === 'switchManageTab') {
            const manageTab = document.querySelectorAll('.home-tab')[1];
            if (manageTab) manageTab.click();
            // Small delay for tab content to render
            setTimeout(() => _renderBubble(step), 300);
            return;
        }
        if (step.action === 'switchPracticeTab') {
            const practiceTab = document.querySelectorAll('.home-tab')[0];
            if (practiceTab) practiceTab.click();
            setTimeout(() => _renderBubble(step), 300);
            return;
        }
        if (step.action === 'showHeroShop') {
            _renderBubble(step);
            return;
        }
        if (step.action === 'giveCoins') {
            Progression.addCoins(5);
            _renderBubble(step);
            return;
        }

        _renderBubble(step);
    }

    function _renderBubble(step) {
        // Remove old overlay
        _removeOverlay();

        _overlay = document.createElement('div');
        _overlay.className = 'tutorial-overlay';

        const highlight = step.highlight ? document.querySelector(step.highlight) : null;

        let spotlightStyle = '';
        if (highlight) {
            const rect = highlight.getBoundingClientRect();
            highlight.classList.add('tutorial-highlight');
            spotlightStyle = `
                --spot-top: ${rect.top - 4}px;
                --spot-left: ${rect.left - 4}px;
                --spot-width: ${rect.width + 8}px;
                --spot-height: ${rect.height + 8}px;
            `;
        }

        _overlay.setAttribute('style', spotlightStyle);
        _overlay.innerHTML = `
            <div class="tutorial-bubble">
                <div class="tutorial-ghost">👻</div>
                <div class="tutorial-message">${step.message}</div>
                <button class="btn btn-primary btn-small tutorial-next-btn" onclick="Tutorial.next()">
                    ${_step < STEPS.length - 1 ? 'Next →' : 'Let\'s go! 🎉'}
                </button>
                <button class="btn-text tutorial-skip-btn" onclick="Tutorial.skip()">Skip tutorial</button>
            </div>
        `;

        document.body.appendChild(_overlay);
    }

    function next() {
        // If current step navigates to hero shop, do it before advancing
        const currentStep = STEPS[_step];
        if (currentStep.action === 'showHeroShop') {
            _removeOverlay();
            Screens.showHeroShop();
            _step++;
            setTimeout(() => _showStep(), 400);
            return;
        }

        _step++;
        _showStep();
    }

    function skip() {
        _finish();
    }

    function _finish() {
        _removeOverlay();
        Store.set('tutorialDone', true);
        // Return to home
        Screens.showHome();
    }

    function _removeOverlay() {
        if (_overlay) {
            _overlay.remove();
            _overlay = null;
        }
        document.querySelectorAll('.tutorial-highlight').forEach(el => {
            el.classList.remove('tutorial-highlight');
        });
    }

    return { shouldShow, start, next, skip };
})();
