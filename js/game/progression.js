/* ===== SpellQuest Progression System ===== */
/* XP, Levels, and Coins */

const Progression = (() => {
    // Level N requires N * 10 XP to reach the next level
    function xpForNextLevel(currentLevel) {
        return currentLevel * 10;
    }

    function addXP(amount) {
        let leveledUp = false;
        let newLevel = 0;

        Store.update(data => {
            data.xp += amount;

            // Check for level up
            let required = xpForNextLevel(data.level);
            while (data.xp >= required) {
                data.xp -= required;
                data.level++;
                leveledUp = true;
                newLevel = data.level;
                required = xpForNextLevel(data.level);
            }
        });

        return { leveledUp, newLevel };
    }

    function addCoins(amount) {
        Store.update(data => {
            data.coins += amount;
        });
    }

    function spendCoins(amount) {
        const data = Store.load();
        if (data.coins < amount) return false;
        Store.update(d => { d.coins -= amount; });
        return true;
    }

    function getProgress() {
        const data = Store.load();
        const required = xpForNextLevel(data.level);
        return {
            xp: data.xp,
            level: data.level,
            coins: data.coins,
            xpRequired: required,
            xpPercentage: Math.round((data.xp / required) * 100)
        };
    }

    return { addXP, addCoins, spendCoins, getProgress, xpForNextLevel };
})();
