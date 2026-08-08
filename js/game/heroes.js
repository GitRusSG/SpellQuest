/* ===== SpellQuest Hero System ===== */

const Heroes = (() => {
    const catalog = [
        { id: 'robot', emoji: '🤖', name: 'Robot', price: 0 },
        { id: 'wizard', emoji: '🧙', name: 'Wizard', price: 10 },
        { id: 'fairy', emoji: '🧚', name: 'Fairy', price: 15 },
        { id: 'dragon', emoji: '🐉', name: 'Dragon', price: 30 },
        { id: 'fox', emoji: '🦊', name: 'Fox', price: 20 },
        { id: 'space_robot', emoji: '🚀', name: 'Space Robot', price: 50 },
        { id: 'golden_dragon', emoji: '👑', name: 'Golden Dragon', price: 100 }
    ];

    // Discount: 2% per level, capped at 50%
    function _discount() {
        const data = Store.load();
        return Math.min(data.level * 2, 50) / 100;
    }

    function _discountedPrice(basePrice) {
        if (basePrice === 0) return 0;
        return Math.max(1, Math.round(basePrice * (1 - _discount())));
    }

    function getAll() {
        const data = Store.load();
        return catalog.map(hero => ({
            ...hero,
            basePrice: hero.price,
            price: _discountedPrice(hero.price),
            unlocked: data.unlockedHeroes.includes(hero.id),
            selected: data.selectedHero === hero.id
        }));
    }

    function getSelected() {
        const data = Store.load();
        const hero = catalog.find(h => h.id === data.selectedHero);
        return hero || catalog[0];
    }

    function buy(heroId) {
        const hero = catalog.find(h => h.id === heroId);
        if (!hero) return { success: false, reason: 'Hero not found' };

        const data = Store.load();
        if (data.unlockedHeroes.includes(heroId)) {
            return { success: false, reason: 'Already owned' };
        }

        const price = _discountedPrice(hero.price);
        if (data.coins < price) {
            return { success: false, reason: 'Not enough coins' };
        }

        Store.update(d => {
            d.coins -= price;
            d.unlockedHeroes.push(heroId);
        });

        return { success: true };
    }

    function equip(heroId) {
        const data = Store.load();
        if (!data.unlockedHeroes.includes(heroId)) {
            return { success: false, reason: 'Not unlocked' };
        }
        Store.set('selectedHero', heroId);
        return { success: true };
    }

    function getCatalog() {
        return catalog;
    }

    return { getAll, getSelected, buy, equip, getCatalog };
})();
