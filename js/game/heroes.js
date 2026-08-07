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

    function getAll() {
        const data = Store.load();
        return catalog.map(hero => ({
            ...hero,
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
        if (data.coins < hero.price) {
            return { success: false, reason: 'Not enough coins' };
        }

        Store.update(d => {
            d.coins -= hero.price;
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
