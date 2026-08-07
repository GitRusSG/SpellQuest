/* ===== SpellQuest Built-in QWERTY Keyboard ===== */
/* No autocorrect, no predictive text, no suggestions */

const Keyboard = (() => {
    let onInput = null;
    let onCheck = null;
    let currentValue = '';

    const rows = [
        ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
        ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
        ['z', 'x', 'c', 'v', 'b', 'n', 'm']
    ];

    function render() {
        const kb = document.createElement('div');
        kb.className = 'keyboard';
        kb.id = 'spellquest-keyboard';

        // Row 1
        kb.appendChild(createRow(rows[0]));

        // Row 2
        kb.appendChild(createRow(rows[1]));

        // Row 3 with backspace and clear
        const row3 = document.createElement('div');
        row3.className = 'keyboard-row';
        
        const clearKey = createSpecialKey('CLR', 'key-wide', handleClear);
        row3.appendChild(clearKey);
        
        rows[2].forEach(letter => {
            row3.appendChild(createKey(letter));
        });
        
        const bksp = createSpecialKey('⌫', 'key-wide', handleBackspace);
        row3.appendChild(bksp);
        kb.appendChild(row3);

        // Row 4: space + check
        const row4 = document.createElement('div');
        row4.className = 'keyboard-row';
        
        const spaceKey = createSpecialKey('SPACE', 'key-space', handleSpace);
        row4.appendChild(spaceKey);
        
        const checkKey = createSpecialKey('CHECK ✓', 'key-check', handleCheck);
        row4.appendChild(checkKey);
        kb.appendChild(row4);

        return kb;
    }

    function createRow(letters) {
        const row = document.createElement('div');
        row.className = 'keyboard-row';
        letters.forEach(letter => {
            row.appendChild(createKey(letter));
        });
        return row;
    }

    function createKey(letter) {
        const key = document.createElement('button');
        key.className = 'key';
        key.textContent = letter;
        key.type = 'button';
        key.addEventListener('touchstart', (e) => {
            e.preventDefault();
            handleLetter(letter);
        });
        key.addEventListener('click', (e) => {
            // Fallback for non-touch
            if (!('ontouchstart' in window)) {
                handleLetter(letter);
            }
        });
        return key;
    }

    function createSpecialKey(label, className, handler) {
        const key = document.createElement('button');
        key.className = `key ${className}`;
        key.textContent = label;
        key.type = 'button';
        key.addEventListener('touchstart', (e) => {
            e.preventDefault();
            handler();
        });
        key.addEventListener('click', (e) => {
            if (!('ontouchstart' in window)) {
                handler();
            }
        });
        return key;
    }

    function handleLetter(letter) {
        currentValue += letter;
        if (onInput) onInput(currentValue);
    }

    function handleSpace() {
        currentValue += ' ';
        if (onInput) onInput(currentValue);
    }

    function handleBackspace() {
        currentValue = currentValue.slice(0, -1);
        if (onInput) onInput(currentValue);
    }

    function handleClear() {
        currentValue = '';
        if (onInput) onInput(currentValue);
    }

    function handleCheck() {
        if (onCheck) onCheck(currentValue);
    }

    function getValue() {
        return currentValue;
    }

    function setValue(val) {
        currentValue = val;
        if (onInput) onInput(currentValue);
    }

    function reset() {
        currentValue = '';
    }

    function setCallbacks(inputCb, checkCb) {
        onInput = inputCb;
        onCheck = checkCb;
    }

    return { render, getValue, setValue, reset, setCallbacks };
})();
