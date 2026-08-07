/* ===== SpellQuest Ad Monetization ===== */
/* Google AdSense integration with placeholder fallbacks */
/* Replace AD_CLIENT and AD_SLOT values with your real AdSense IDs */

const Ads = (() => {
    const CONFIG = {
        adClient: 'ca-pub-XXXXXXXXXXXXXXXX', // Replace with your AdSense publisher ID
        bannerSlot: '1234567890',            // Replace with your banner ad slot
        interstitialSlot: '0987654321',      // Replace with your interstitial ad slot
        testMode: true                        // Set false in production
    };

    let adsEnabled = true;
    let interstitialCount = 0;
    const INTERSTITIAL_FREQUENCY = 2; // Show interstitial every N tests completed

    function init() {
        // Check if user is premium
        adsEnabled = !isPremium();
    }

    function isPremium() {
        return Store.get('premium') === true;
    }

    function setEnabled(enabled) {
        adsEnabled = enabled;
    }

    // ===== BANNER AD =====
    function renderBanner(position = 'bottom') {
        if (!adsEnabled) return '';

        if (CONFIG.testMode || !window.adsbygoogle) {
            // Placeholder banner for development/testing
            return `
                <div class="ad-banner ad-banner-${position}" id="ad-banner-${position}">
                    <div class="ad-placeholder">
                        <span class="ad-label">AD</span>
                        <span class="ad-text">SpellQuest Premium — Remove all ads!</span>
                    </div>
                </div>
            `;
        }

        // Real AdSense banner
        return `
            <div class="ad-banner ad-banner-${position}" id="ad-banner-${position}">
                <ins class="adsbygoogle"
                    style="display:block"
                    data-ad-client="${CONFIG.adClient}"
                    data-ad-slot="${CONFIG.bannerSlot}"
                    data-ad-format="auto"
                    data-full-width-responsive="true"></ins>
            </div>
        `;
    }

    // Push ad after DOM insertion
    function pushBannerAd() {
        if (!adsEnabled || CONFIG.testMode || !window.adsbygoogle) return;
        try {
            (adsbygoogle = window.adsbygoogle || []).push({});
        } catch (e) {
            console.warn('Ad push failed:', e);
        }
    }

    // ===== INTERSTITIAL AD =====
    function shouldShowInterstitial() {
        if (!adsEnabled) return false;
        interstitialCount++;
        return interstitialCount % INTERSTITIAL_FREQUENCY === 0;
    }

    function showInterstitial() {
        return new Promise(resolve => {
            if (!adsEnabled) { resolve(); return; }

            // Create interstitial overlay
            const overlay = document.createElement('div');
            overlay.className = 'ad-interstitial-overlay';
            overlay.innerHTML = `
                <div class="ad-interstitial">
                    <div class="ad-interstitial-header">
                        <span class="ad-label">AD</span>
                        <span class="ad-timer" id="ad-timer">Skip in 5s</span>
                    </div>
                    <div class="ad-interstitial-content">
                        ${CONFIG.testMode ? `
                            <div class="ad-placeholder-large">
                                <p>📢 Advertisement</p>
                                <p style="font-size:14px;margin-top:12px;color:var(--text-light);">
                                    Go Premium to remove all ads and unlock exclusive content!
                                </p>
                                <button class="btn btn-primary btn-small mt-16" onclick="Screens.showPremium()">
                                    ⭐ Get Premium
                                </button>
                            </div>
                        ` : `
                            <ins class="adsbygoogle"
                                style="display:block"
                                data-ad-client="${CONFIG.adClient}"
                                data-ad-slot="${CONFIG.interstitialSlot}"
                                data-ad-format="auto"></ins>
                        `}
                    </div>
                    <button class="btn btn-secondary btn-small ad-skip-btn hidden" id="ad-skip-btn">
                        ✕ Close
                    </button>
                </div>
            `;

            document.body.appendChild(overlay);

            // Push real ad if available
            if (!CONFIG.testMode && window.adsbygoogle) {
                try { (adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) {}
            }

            // Countdown timer
            let seconds = 5;
            const timerEl = document.getElementById('ad-timer');
            const skipBtn = document.getElementById('ad-skip-btn');

            const interval = setInterval(() => {
                seconds--;
                if (timerEl) timerEl.textContent = `Skip in ${seconds}s`;
                if (seconds <= 0) {
                    clearInterval(interval);
                    if (timerEl) timerEl.textContent = '';
                    if (skipBtn) skipBtn.classList.remove('hidden');
                }
            }, 1000);

            // Close handler
            skipBtn.addEventListener('click', () => {
                overlay.remove();
                resolve();
            });
        });
    }

    // ===== REWARDED AD (watch ad for coins) =====
    function showRewardedAd() {
        return new Promise(resolve => {
            if (!adsEnabled) { resolve(true); return; }

            const overlay = document.createElement('div');
            overlay.className = 'ad-interstitial-overlay';
            overlay.innerHTML = `
                <div class="ad-interstitial">
                    <div class="ad-interstitial-header">
                        <span class="ad-label">REWARDED AD</span>
                        <span class="ad-timer" id="reward-timer">Watch for 10s</span>
                    </div>
                    <div class="ad-interstitial-content">
                        <div class="ad-placeholder-large">
                            <p>🎬 Watch this ad</p>
                            <p style="font-size:14px;margin-top:8px;color:var(--text-light);">
                                Earn +5 🪙 bonus coins!
                            </p>
                        </div>
                    </div>
                    <button class="btn btn-success btn-small ad-skip-btn hidden" id="reward-claim-btn">
                        🪙 Claim 5 Coins!
                    </button>
                </div>
            `;

            document.body.appendChild(overlay);

            let seconds = 10;
            const timerEl = document.getElementById('reward-timer');
            const claimBtn = document.getElementById('reward-claim-btn');

            const interval = setInterval(() => {
                seconds--;
                if (timerEl) timerEl.textContent = `Watch for ${seconds}s`;
                if (seconds <= 0) {
                    clearInterval(interval);
                    if (timerEl) timerEl.textContent = 'Done!';
                    if (claimBtn) claimBtn.classList.remove('hidden');
                }
            }, 1000);

            claimBtn.addEventListener('click', () => {
                Progression.addCoins(5);
                overlay.remove();
                resolve(true);
            });
        });
    }

    return {
        init,
        isPremium,
        setEnabled,
        renderBanner,
        pushBannerAd,
        shouldShowInterstitial,
        showInterstitial,
        showRewardedAd,
        CONFIG
    };
})();
