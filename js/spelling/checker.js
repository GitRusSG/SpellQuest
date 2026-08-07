/* ===== SpellQuest Spelling Checker ===== */

const Checker = (() => {

    function check(userAnswer, correctWord) {
        const normalizedUser = userAnswer.trim().toLowerCase();
        const normalizedCorrect = correctWord.trim().toLowerCase();
        return normalizedUser === normalizedCorrect;
    }

    // Highlight differences for feedback
    function getDiff(userAnswer, correctWord) {
        const user = userAnswer.trim().toLowerCase();
        const correct = correctWord.trim().toLowerCase();
        
        let result = '';
        const maxLen = Math.max(user.length, correct.length);
        
        for (let i = 0; i < maxLen; i++) {
            if (i < user.length && i < correct.length) {
                if (user[i] === correct[i]) {
                    result += correct[i];
                } else {
                    result += `<mark>${correct[i]}</mark>`;
                }
            } else if (i < correct.length) {
                result += `<mark>${correct[i]}</mark>`;
            }
        }
        return result;
    }

    return { check, getDiff };
})();
