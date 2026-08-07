/* ===== SpellQuest Screens Module ===== */
/* Renders all screens and handles navigation */

const Screens = (() => {
    let app = null;
    let currentScreen = 'home';
    let testState = null;

    function init(appEl) {
        app = appEl;
        showHome();
    }

    function navigate(screen) {
        currentScreen = screen;
    }

    // ===== HEADER =====
    function renderHeader() {
        const hero = Heroes.getSelected();
        const progress = Progression.getProgress();
        return `
            <div class="header">
                <div class="header-left">
                    <span class="header-hero">${hero.emoji}</span>
                    <span class="header-title">SpellQuest</span>
                </div>
                <div class="header-stats">
                    <span>⭐ ${progress.xp}/${progress.xpRequired} XP</span>
                    <span class="coins">🪙 ${progress.coins}</span>
                    <span class="level-badge">🆙 Level ${progress.level}</span>
                </div>
            </div>
        `;
    }

    // ===== HOME SCREEN =====
    function showHome() {
        navigate('home');
        const progress = Progression.getProgress();
        const xpNeeded = progress.xpRequired - progress.xp;

        app.innerHTML = `
            <div class="screen">
                ${renderHeader()}
                <div class="xp-bar-container">
                    <div class="xp-label">
                        <span>Level ${progress.level}</span>
                        <span>${xpNeeded} XP until Level ${progress.level + 1}</span>
                    </div>
                    <div class="xp-bar">
                        <div class="xp-bar-fill" style="width:${progress.xpPercentage}%"></div>
                    </div>
                </div>
                <div class="home-actions">
                    <div class="action-card" onclick="Screens.showListInput()">
                        <div class="action-icon">📸</div>
                        <div class="action-text">
                            <h3>Photo Spelling List</h3>
                            <p>Take a photo or upload your list</p>
                        </div>
                    </div>
                    <div class="action-card" onclick="Screens.showManualInput()">
                        <div class="action-icon">✏️</div>
                        <div class="action-text">
                            <h3>Type Spelling List</h3>
                            <p>Enter words manually</p>
                        </div>
                    </div>
                    <div class="action-card" onclick="Screens.showHeroShop()">
                        <div class="action-icon">🏪</div>
                        <div class="action-text">
                            <h3>Hero Shop</h3>
                            <p>Spend coins on new heroes</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // ===== MANUAL INPUT SCREEN =====
    function showManualInput() {
        navigate('manual-input');
        app.innerHTML = `
            <div class="screen">
                ${renderHeader()}
                <div class="card">
                    <h2 style="margin-bottom:12px;">✏️ Type Your Words</h2>
                    <p style="font-size:13px;color:var(--text-light);margin-bottom:16px;">
                        Enter one word per line
                    </p>
                    <textarea id="manual-words" rows="10" 
                        placeholder="beautiful&#10;necessary&#10;environment&#10;temperature&#10;knowledge"
                        style="width:100%;padding:12px;border:2px solid var(--border);border-radius:var(--radius-sm);font-size:16px;resize:vertical;outline:none;font-family:inherit;"
                    ></textarea>
                </div>
                <div class="flex-row mt-12">
                    <button class="btn btn-secondary" onclick="Screens.showHome()">← Back</button>
                    <button class="btn btn-primary" onclick="Screens.processManualInput()">Next →</button>
                </div>
            </div>
        `;
        // Focus textarea
        setTimeout(() => {
            const ta = document.getElementById('manual-words');
            if (ta) ta.focus();
        }, 100);
    }

    function processManualInput() {
        const ta = document.getElementById('manual-words');
        if (!ta) return;
        const text = ta.value;
        const words = text.split('\n')
            .map(w => w.replace(/^\s*[\d]+[\.\)\-\s]*/g, '').trim().toLowerCase())
            .filter(w => w.length >= 2);
        if (words.length === 0) {
            alert('Please enter at least one word.');
            return;
        }
        showListReview(words);
    }

    // ===== PHOTO INPUT SCREEN =====
    function showListInput() {
        navigate('list-input');
        app.innerHTML = `
            <div class="screen">
                ${renderHeader()}
                <div class="card text-center">
                    <h2 style="margin-bottom:12px;">📸 Photo Spelling List</h2>
                    <p style="font-size:13px;color:var(--text-light);margin-bottom:20px;">
                        Take a photo of your printed spelling list or choose from gallery
                    </p>
                    <button class="btn btn-primary" onclick="Screens.captureList()">
                        📷 Take Photo / Choose Image
                    </button>
                    <div id="ocr-status" class="mt-16" style="display:none;">
                        <p style="font-size:14px;color:var(--text-light);">
                            Reading your spelling list...
                        </p>
                        <div class="xp-bar mt-8">
                            <div class="xp-bar-fill" id="ocr-progress" style="width:0%"></div>
                        </div>
                    </div>
                </div>
                <button class="btn btn-secondary mt-12" onclick="Screens.showHome()">← Back</button>
            </div>
        `;
    }

    async function captureList() {
        try {
            const imageData = await OCR.captureImage();
            const statusEl = document.getElementById('ocr-status');
            const progressEl = document.getElementById('ocr-progress');
            if (statusEl) statusEl.style.display = 'block';

            const words = await OCR.recognizeList(imageData, (pct) => {
                if (progressEl) progressEl.style.width = pct + '%';
            });

            if (words.length === 0) {
                alert('No words found. Try again with a clearer photo.');
                return;
            }
            showListReview(words);
        } catch (err) {
            console.error('OCR error:', err);
            alert('Could not read the image. Please try again.');
        }
    }

    // ===== LIST REVIEW SCREEN =====
    function showListReview(words) {
        navigate('list-review');
        window._reviewWords = [...words];
        renderReviewScreen();
    }

    function renderReviewScreen() {
        const words = window._reviewWords;
        const wordItems = words.map((w, i) => `
            <div class="word-item" data-index="${i}">
                <span class="word-item-number">${i + 1}.</span>
                <input class="word-item-input" value="${w}" 
                    onchange="Screens.updateReviewWord(${i}, this.value)"
                    autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false">
                <button class="word-item-delete" onclick="Screens.deleteReviewWord(${i})">✕</button>
            </div>
        `).join('');

        app.innerHTML = `
            <div class="screen">
                ${renderHeader()}
                <div class="card">
                    <h2 style="margin-bottom:4px;">Check Your Spelling List</h2>
                    <p style="font-size:13px;color:var(--text-light);margin-bottom:12px;">
                        Edit, delete or add words before starting
                    </p>
                    <div class="word-list">
                        ${wordItems}
                    </div>
                    <button class="btn btn-secondary btn-small mt-8" onclick="Screens.addReviewWord()">
                        + Add Word
                    </button>
                </div>
                <div class="flex-row mt-12">
                    <button class="btn btn-secondary" onclick="Screens.showHome()">← Back</button>
                    <button class="btn btn-success" onclick="Screens.confirmList()">✓ Confirm List</button>
                </div>
            </div>
        `;
    }

    function updateReviewWord(index, value) {
        window._reviewWords[index] = value.trim().toLowerCase();
    }

    function deleteReviewWord(index) {
        window._reviewWords.splice(index, 1);
        renderReviewScreen();
    }

    function addReviewWord() {
        window._reviewWords.push('');
        renderReviewScreen();
        // Focus the new input
        setTimeout(() => {
            const inputs = document.querySelectorAll('.word-item-input');
            if (inputs.length > 0) inputs[inputs.length - 1].focus();
        }, 50);
    }

    function confirmList() {
        // Filter out empty words
        const words = window._reviewWords.filter(w => w.trim().length > 0);
        if (words.length === 0) {
            alert('Please add at least one word.');
            return;
        }
        window._reviewWords = words;
        showStartScreen(words);
    }

    // ===== START SCREEN =====
    function showStartScreen(words) {
        navigate('start');
        app.innerHTML = `
            <div class="screen" style="justify-content:center;align-items:center;">
                ${renderHeader()}
                <div class="card text-center" style="flex:1;display:flex;flex-direction:column;justify-content:center;align-items:center;">
                    <div style="font-size:48px;margin-bottom:16px;">📝</div>
                    <h2 style="margin-bottom:8px;">Ready to Spell!</h2>
                    <p style="color:var(--text-light);margin-bottom:4px;">${words.length} words in your list</p>
                    <p style="font-size:12px;color:var(--text-light);margin-bottom:24px;">
                        Each word will be read twice. Listen carefully!
                    </p>
                    <div class="mode-toggle mb-16">
                        <button class="${(window._testMode !== 'paper') ? 'active' : ''}" 
                            onclick="window._testMode='keyboard';Screens.showStartScreen(window._reviewWords)">
                            ⌨️ Keyboard
                        </button>
                        <button class="${(window._testMode === 'paper') ? 'active' : ''}" 
                            onclick="window._testMode='paper';Screens.showStartScreen(window._reviewWords)">
                            ✍️ Paper
                        </button>
                    </div>
                    <button class="btn btn-primary" style="max-width:280px;" 
                        onclick="Screens.startTest(${JSON.stringify(words).replace(/"/g, '&quot;')})">
                        ▶️ START SPELLING
                    </button>
                </div>
            </div>
        `;
    }

    // ===== SPELLING TEST =====
    function startTest(words) {
        testState = {
            words: words,
            currentIndex: 0,
            results: [], // {word, userAnswer, correct}
            mistakes: []
        };
        showTestWord();
    }

    function showTestWord() {
        const { words, currentIndex } = testState;
        const word = words[currentIndex];
        const total = words.length;
        const isPaper = window._testMode === 'paper';

        Keyboard.reset();

        app.innerHTML = `
            <div class="screen" style="padding-bottom:0;">
                <div class="test-header">
                    <div class="test-progress">Word ${currentIndex + 1} / ${total}</div>
                    <div class="test-title">SPELLING</div>
                </div>
                <div class="listen-area">
                    <button class="listen-btn" onclick="Screens.listenWord()">
                        🔊 Listen
                    </button>
                    <button class="listen-btn replay" onclick="Screens.replayWord()">
                        🔊 Replay
                    </button>
                </div>
                <div class="answer-display empty" id="answer-display">
                    ${isPaper ? 'Write on paper, then take a photo' : 'Type your answer below'}
                </div>
                ${isPaper ? `
                    <div class="text-center mt-12">
                        <button class="btn btn-primary" style="max-width:280px;" onclick="Screens.paperCapture()">
                            📸 Take Photo of Answer
                        </button>
                    </div>
                ` : ''}
                <div id="keyboard-container"></div>
            </div>
        `;

        // Attach keyboard if not paper mode
        if (!isPaper) {
            const kbContainer = document.getElementById('keyboard-container');
            Keyboard.setCallbacks(
                (val) => {
                    const display = document.getElementById('answer-display');
                    if (display) {
                        display.textContent = val || '';
                        display.className = val ? 'answer-display' : 'answer-display empty';
                        if (!val) display.textContent = 'Type your answer below';
                    }
                },
                (val) => {
                    checkAnswer(val);
                }
            );
            kbContainer.appendChild(Keyboard.render());
        }

        // Auto-pronounce the word
        setTimeout(() => Voice.pronounceWord(word), 400);
    }

    function listenWord() {
        const word = testState.words[testState.currentIndex];
        Voice.pronounceWord(word);
    }

    function replayWord() {
        const word = testState.words[testState.currentIndex];
        Voice.speak(word);
    }

    // ===== PAPER MODE CAPTURE =====
    async function paperCapture() {
        const word = testState.words[testState.currentIndex];
        try {
            const imageData = await Handwriting.captureAnswer();
            // Show processing state
            const display = document.getElementById('answer-display');
            if (display) {
                display.textContent = 'Reading your handwriting...';
                display.className = 'answer-display empty';
            }

            const recognized = await Handwriting.recognizeHandwriting(imageData, word);
            // Show confirmation - do NOT auto-check
            showPaperConfirm(recognized, imageData);
        } catch (err) {
            console.error('Paper capture error:', err);
            alert('Could not capture. Please try again.');
        }
    }

    function showPaperConfirm(recognized, imageData) {
        const display = document.getElementById('answer-display');
        app.innerHTML = `
            <div class="screen">
                <div class="test-header">
                    <div class="test-progress">Word ${testState.currentIndex + 1} / ${testState.words.length}</div>
                    <div class="test-title">CHECK YOUR ANSWER</div>
                </div>
                <img src="${imageData}" class="camera-preview" alt="Your handwriting">
                <div class="ocr-confirm">
                    <p style="color:var(--text-light);margin-bottom:8px;">I read:</p>
                    <div class="ocr-result" id="paper-result">${recognized || '(nothing detected)'}</div>
                    <p style="font-size:13px;color:var(--text-light);margin-bottom:16px;">Is this what you wrote?</p>
                    <div class="flex-row">
                        <button class="btn btn-success" onclick="Screens.confirmPaperAnswer()">✓ Yes</button>
                        <button class="btn btn-secondary" onclick="Screens.editPaperAnswer()">✏️ Edit</button>
                    </div>
                </div>
            </div>
        `;
        window._paperRecognized = recognized;
    }

    function confirmPaperAnswer() {
        checkAnswer(window._paperRecognized || '');
    }

    function editPaperAnswer() {
        // Show modal to correct the answer
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal">
                <h3>Correct your answer</h3>
                <input type="text" id="paper-edit-input" value="${window._paperRecognized || ''}"
                    autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false">
                <button class="btn btn-primary" onclick="Screens.submitPaperEdit()">✓ Confirm</button>
            </div>
        `;
        document.body.appendChild(modal);
        setTimeout(() => document.getElementById('paper-edit-input')?.focus(), 100);
    }

    function submitPaperEdit() {
        const input = document.getElementById('paper-edit-input');
        const val = input ? input.value.trim() : '';
        // Remove modal
        document.querySelector('.modal-overlay')?.remove();
        checkAnswer(val);
    }

    // ===== ANSWER CHECKING =====
    function checkAnswer(userAnswer) {
        const word = testState.words[testState.currentIndex];
        const correct = Checker.check(userAnswer, word);

        testState.results.push({
            word: word,
            userAnswer: userAnswer.trim().toLowerCase(),
            correct: correct
        });

        if (correct) {
            const result = Progression.addXP(10);
            Progression.addCoins(1);
            showFeedback(true, word, userAnswer, result);
        } else {
            testState.mistakes.push(word);
            showFeedback(false, word, userAnswer, null);
        }
    }

    function showFeedback(correct, word, userAnswer, levelResult) {
        const hero = Heroes.getSelected();
        
        app.innerHTML = `
            <div class="screen" style="justify-content:center;">
                <div class="feedback">
                    <div class="feedback-icon">${correct ? '🎉' : '❌'}</div>
                    <div class="feedback-title ${correct ? 'correct' : 'incorrect'}">
                        ${correct ? 'Correct!' : 'Not quite'}
                    </div>
                    ${!correct ? `
                        <div class="feedback-detail">You wrote:</div>
                        <div class="feedback-word" style="color:var(--error);">${userAnswer || '(empty)'}</div>
                        <div class="feedback-detail mt-8">Correct spelling:</div>
                        <div class="feedback-word" style="color:var(--success);">${word}</div>
                    ` : ''}
                    ${correct ? `
                        <div class="feedback-xp">+10 ⭐ XP  •  +1 🪙</div>
                    ` : ''}
                </div>
                <button class="btn btn-primary mt-24" onclick="Screens.nextWord()">
                    ${testState.currentIndex < testState.words.length - 1 ? 'Next Word →' : 'See Results 🏆'}
                </button>
            </div>
        `;

        // Show level up animation if applicable
        if (levelResult && levelResult.leveledUp) {
            setTimeout(() => Animations.showLevelUp(levelResult.newLevel), 500);
        }
    }

    function nextWord() {
        testState.currentIndex++;
        if (testState.currentIndex >= testState.words.length) {
            showResults();
        } else {
            showTestWord();
        }
    }

    // ===== RESULTS SCREEN =====
    function showResults() {
        navigate('results');
        const { results, mistakes, words } = testState;
        const correctCount = results.filter(r => r.correct).length;
        const total = words.length;
        const percentage = Math.round((correctCount / total) * 100);
        const xpEarned = correctCount * 10;
        const coinsEarned = correctCount;

        // Save mistakes to history
        if (mistakes.length > 0) {
            Store.update(data => {
                const newMistakes = mistakes.filter(m => !data.mistakeHistory.includes(m));
                data.mistakeHistory = [...data.mistakeHistory, ...newMistakes].slice(-50);
            });
        }

        // Update stats
        Store.update(data => {
            data.totalWordsCorrect += correctCount;
            data.totalWordsAttempted += total;
        });

        const mistakeItems = mistakes.map(m => `
            <div class="mistake-item">❌ ${m}</div>
        `).join('');

        app.innerHTML = `
            <div class="screen">
                ${renderHeader()}
                <div class="card">
                    <div class="results-score">
                        <div class="trophy">🏆</div>
                        <div class="score">${correctCount} / ${total}</div>
                        <div class="percentage">${percentage}%</div>
                    </div>
                    <div class="results-rewards">
                        <div class="reward-item">
                            <div class="value">+${xpEarned} ⭐</div>
                            <div class="label">XP Earned</div>
                        </div>
                        <div class="reward-item">
                            <div class="value">+${coinsEarned} 🪙</div>
                            <div class="label">Coins Earned</div>
                        </div>
                    </div>
                </div>
                ${mistakes.length > 0 ? `
                    <div class="card">
                        <h3 style="margin-bottom:8px;">Practice these:</h3>
                        <div class="mistakes-list">${mistakeItems}</div>
                        <button class="btn btn-primary btn-small mt-12" onclick="Screens.practiceMistakes()">
                            🔁 Practice Mistakes
                        </button>
                    </div>
                ` : `
                    <div class="card text-center">
                        <p style="font-size:18px;">🌟 Perfect score!</p>
                    </div>
                `}
                <button class="btn btn-secondary mt-12" onclick="Screens.showHome()">
                    🏠 Home
                </button>
            </div>
        `;
    }

    function practiceMistakes() {
        const mistakes = testState.mistakes;
        if (mistakes.length === 0) return;
        window._reviewWords = [...mistakes];
        showStartScreen(mistakes);
    }

    // ===== HERO SHOP =====
    function showHeroShop() {
        navigate('hero-shop');
        const heroes = Heroes.getAll();
        const progress = Progression.getProgress();

        const heroCards = heroes.map(hero => {
            let statusHtml = '';
            let actionHtml = '';

            if (hero.selected) {
                statusHtml = '<span class="hero-status equipped">✓ Equipped</span>';
            } else if (hero.unlocked) {
                statusHtml = '<span class="hero-status owned">Owned</span>';
                actionHtml = `<button class="btn btn-small btn-primary mt-8" 
                    onclick="Screens.equipHero('${hero.id}')">⭐ Equip</button>`;
            } else if (progress.coins >= hero.price) {
                actionHtml = `<button class="btn btn-small btn-primary mt-8" 
                    onclick="Screens.buyHero('${hero.id}')">Buy ${hero.price} 🪙</button>`;
            } else {
                statusHtml = `<span class="hero-status">${hero.price} 🪙</span>`;
            }

            return `
                <div class="hero-card ${hero.selected ? 'selected' : ''} ${!hero.unlocked ? 'locked' : ''}">
                    <div class="hero-emoji">${hero.emoji}</div>
                    <div class="hero-name">${hero.name}</div>
                    ${statusHtml}
                    ${actionHtml}
                </div>
            `;
        }).join('');

        app.innerHTML = `
            <div class="screen">
                ${renderHeader()}
                <div class="card">
                    <h2 style="margin-bottom:4px;">🏪 Hero Shop</h2>
                    <p style="font-size:13px;color:var(--text-light);">
                        You have ${progress.coins} 🪙
                    </p>
                </div>
                <div class="hero-grid">
                    ${heroCards}
                </div>
                <button class="btn btn-secondary mt-12" onclick="Screens.showHome()">
                    🏠 Home
                </button>
            </div>
        `;
    }

    function buyHero(heroId) {
        const result = Heroes.buy(heroId);
        if (result.success) {
            // Auto equip after purchase
            Heroes.equip(heroId);
            showHeroPurchased(heroId);
        } else {
            alert(result.reason || 'Cannot buy this hero.');
        }
    }

    function showHeroPurchased(heroId) {
        const hero = Heroes.getCatalog().find(h => h.id === heroId);
        app.innerHTML = `
            <div class="screen" style="justify-content:center;align-items:center;">
                <div class="feedback">
                    <div class="feedback-icon" style="font-size:64px;">${hero.emoji}</div>
                    <div class="feedback-title correct">🎉 ${hero.name} unlocked!</div>
                    <p style="color:var(--text-light);margin-top:8px;">Equipped as your hero</p>
                </div>
                <button class="btn btn-primary mt-24" onclick="Screens.showHeroShop()">
                    ← Back to Shop
                </button>
                <button class="btn btn-secondary mt-8" onclick="Screens.showHome()">
                    🏠 Home
                </button>
            </div>
        `;
    }

    function equipHero(heroId) {
        Heroes.equip(heroId);
        showHeroShop();
    }

    // ===== PUBLIC API =====
    return {
        init,
        showHome,
        showManualInput,
        processManualInput,
        showListInput,
        captureList,
        showListReview,
        updateReviewWord,
        deleteReviewWord,
        addReviewWord,
        confirmList,
        showStartScreen,
        startTest,
        showTestWord,
        listenWord,
        replayWord,
        paperCapture,
        confirmPaperAnswer,
        editPaperAnswer,
        submitPaperEdit,
        checkAnswer,
        nextWord,
        showResults,
        practiceMistakes,
        showHeroShop,
        buyHero,
        equipHero
    };
})();
