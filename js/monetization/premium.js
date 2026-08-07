/* ===== SpellQuest Premium System ===== */
/* Handles premium purchase, benefits, and status */

const Premium = (() => {
    const PLANS = {
        monthly: {
            id: 'premium_monthly',
            name: 'Monthly',
            price: '$2.99/mo',
            priceValue: 2.99,
            period: 'month',
            badge: '⭐'
        },
        yearly: {
            id: 'premium_yearly',
            name: 'Yearly',
            price: '$19.99/yr',
            priceValue: 19.99,
            period: 'year',
            badge: '👑',
            savings: 'Save 44%'
        },
        lifetime: {
            id: 'premium_lifetime',
            name: 'Lifetime',
            price: '$39.99',
            priceValue: 39.99,
            period: 'forever',
            badge: '💎',
            popular: true
        }
    };

    // Premium benefits list
    const BENEFITS = [
        { icon: '🚫', text: 'Remove all ads forever' },
        { icon: '🦄', text: 'Unlock 5 exclusive premium heroes' },
        { icon: '🎤', text: 'Unlock all voice packs' },
        { icon: '✨', text: 'Exclusive Level Up effects' },
        { icon: '🎨', text: 'Custom themes & colors' },
        { icon: '📊', text: 'Detailed progress statistics' },
        { icon: '♾️', text: 'Unlimited saved word lists' },
        { icon: '🏆', text: 'Premium badge on profile' }
    ];

    // Premium-exclusive heroes
    const PREMIUM_HEROES = [
        { id: 'unicorn', emoji: '🦄', name: 'Unicorn' },
        { id: 'phoenix', emoji: '🔥', name: 'Phoenix' },
        { id: 'alien', emoji: '👽', name: 'Alien' },
        { id: 'ninja', emoji: '🥷', name: 'Ninja' },
        { id: 'diamond', emoji: '💎', name: 'Diamond Knight' }
    ];

    // Premium voice options
    const PREMIUM_VOICES = [
        { id: 'british_clear', name: 'British Clear', description: 'Crystal clear UK accent' },
        { id: 'friendly', name: 'Friendly', description: 'Warm & encouraging' },
        { id: 'robot_voice', name: 'Robot Voice', description: 'Fun robotic style' },
        { id: 'wizard_voice', name: 'Wizard Voice', description: 'Mystical & wise' }
    ];

    function isPremium() {
        const data = Store.load();
        if (!data.premium) return false;

        // Check expiry for non-lifetime plans
        if (data.premiumPlan !== 'lifetime' && data.premiumExpiry) {
            const expiry = new Date(data.premiumExpiry);
            if (expiry < new Date()) {
                // Expired
                Store.update(d => {
                    d.premium = false;
                    d.premiumPlan = null;
                    d.premiumExpiry = null;
                });
                return false;
            }
        }
        return true;
    }

    function getPlanInfo() {
        const data = Store.load();
        if (!data.premium) return null;
        return {
            plan: data.premiumPlan,
            expiry: data.premiumExpiry,
            purchaseDate: data.premiumPurchaseDate
        };
    }

    // Simulate purchase (in production, integrate with Stripe/PayPal/etc)
    function purchase(planId) {
        const plan = PLANS[planId];
        if (!plan) return { success: false, reason: 'Invalid plan' };

        // In production: redirect to payment provider
        // For now: simulate successful purchase
        let expiry = null;
        if (planId === 'monthly') {
            const d = new Date();
            d.setMonth(d.getMonth() + 1);
            expiry = d.toISOString();
        } else if (planId === 'yearly') {
            const d = new Date();
            d.setFullYear(d.getFullYear() + 1);
            expiry = d.toISOString();
        }
        // lifetime = no expiry

        Store.update(data => {
            data.premium = true;
            data.premiumPlan = planId;
            data.premiumExpiry = expiry;
            data.premiumPurchaseDate = new Date().toISOString();
            // Unlock premium heroes
            PREMIUM_HEROES.forEach(h => {
                if (!data.unlockedHeroes.includes(h.id)) {
                    data.unlockedHeroes.push(h.id);
                }
            });
            // Unlock premium voices
            PREMIUM_VOICES.forEach(v => {
                if (!data.unlockedVoices.includes(v.id)) {
                    data.unlockedVoices.push(v.id);
                }
            });
        });

        // Disable ads
        Ads.setEnabled(false);

        return { success: true, plan: plan };
    }

    function restore() {
        // In production: verify with payment provider
        // For now: check localStorage
        return isPremium();
    }

    function cancel() {
        Store.update(data => {
            data.premium = false;
            data.premiumPlan = null;
            data.premiumExpiry = null;
        });
        Ads.setEnabled(true);
    }

    function getPlans() {
        return PLANS;
    }

    function getBenefits() {
        return BENEFITS;
    }

    function getPremiumHeroes() {
        return PREMIUM_HEROES;
    }

    function getPremiumVoices() {
        return PREMIUM_VOICES;
    }

    return {
        isPremium,
        getPlanInfo,
        purchase,
        restore,
        cancel,
        getPlans,
        getBenefits,
        getPremiumHeroes,
        getPremiumVoices,
        PLANS,
        BENEFITS,
        PREMIUM_HEROES,
        PREMIUM_VOICES
    };
})();
