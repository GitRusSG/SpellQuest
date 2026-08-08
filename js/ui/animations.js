/* ===== SpellQuest Animations ===== */

const Animations = (() => {

    function showLevelUp(level, bonusCoins) {
        const hero = Heroes.getSelected();
        const overlay = document.createElement('div');
        overlay.className = 'level-up-overlay';
        overlay.innerHTML = `
            <div class="level-up-content">
                <div class="level-up-sparkle">✨</div>
                <div class="level-up-hero">${hero.emoji}</div>
                <div class="level-up-text">🎉 LEVEL UP!</div>
                <div class="level-up-sparkle" style="margin-top:8px;">Level ${level}</div>
                ${bonusCoins ? `<div class="level-up-coins">+${bonusCoins} 🪙 bonus!</div>` : ''}
            </div>
        `;

        document.body.appendChild(overlay);

        overlay.addEventListener('click', () => {
            overlay.remove();
        });

        // Auto dismiss after 2 seconds
        setTimeout(() => {
            if (overlay.parentNode) {
                overlay.style.opacity = '0';
                overlay.style.transition = 'opacity 0.3s';
                setTimeout(() => overlay.remove(), 300);
            }
        }, 2000);
    }

    function showCoinEarned(container) {
        const coin = document.createElement('span');
        coin.textContent = '+1 🪙';
        coin.style.cssText = `
            position: absolute;
            font-size: 16px;
            font-weight: 700;
            color: #FFD700;
            animation: floatUp 1s ease forwards;
            pointer-events: none;
        `;
        container.style.position = 'relative';
        container.appendChild(coin);
        setTimeout(() => coin.remove(), 1000);
    }

    // Inject float animation
    function injectAnimations() {
        if (document.getElementById('sq-animations')) return;
        const style = document.createElement('style');
        style.id = 'sq-animations';
        style.textContent = `
            @keyframes floatUp {
                0% { opacity: 1; transform: translateY(0); }
                100% { opacity: 0; transform: translateY(-30px); }
            }
        `;
        document.head.appendChild(style);
    }

    function init() {
        injectAnimations();
    }

    return { showLevelUp, showCoinEarned, init };
})();
