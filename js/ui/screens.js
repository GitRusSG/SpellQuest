/* ===== SpellQuest Screens Module ===== */
/* Renders all screens and handles navigation */

const Screens = (() => {
    let app = null;
    let currentScreen = 'home';
    let testState = null;
    // tracks which saved list (if any) the current test came from
    let _activeListId = null;
    let _activeListName = null;

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
        const user = Auth.getUser();
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
                    ${user ? `<button class="btn-icon" onclick="Screens.showProfile()" title="Profile">👤</button>` : ''}
                </div>
            </div>
        `;
    }

    // ===== AUTH SCREENS =====

    function showSignIn(message = '') {
        navigate('sign-in');
        app.innerHTML = `
            <div class="screen auth-screen">
                <div class="auth-logo">
                    <div style="font-size:56px;">🤖</div>
                    <h1 class="auth-title">SpellQuest</h1>
                    <p class="auth-subtitle">Spelling practice that's actually fun</p>
                </div>
                ${message ? `<div class="auth-message">${message}</div>` : ''}
                <div class="card">
                    <h2 style="margin-bottom:16px;">Sign In</h2>
                    <div class="form-group">
                        <label class="form-label">Email</label>
                        <input id="si-email" type="email" class="form-input"
                            placeholder="parent@example.com"
                            autocomplete="email" autocapitalize="off">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Password</label>
                        <input id="si-password" type="password" class="form-input"
                            placeholder="••••••••" autocomplete="current-password">
                    </div>
                    <div id="si-error" class="form-error hidden"></div>
                    <button id="si-btn" class="btn btn-primary btn-full mt-12"
                        onclick="Screens.submitSignIn()">Sign In</button>
                    <button class="btn btn-ghost btn-small mt-8 btn-full"
                        onclick="Screens.showForgotPassword()">Forgot password?</button>
                </div>
                <div class="auth-switch">
                    <span>No account yet?</span>
                    <button class="btn btn-secondary" onclick="Screens.showSignUp()">Create Account</button>
                </div>
            </div>
        `;
        document.getElementById('si-email')?.addEventListener('keydown', e => {
            if (e.key === 'Enter') document.getElementById('si-password')?.focus();
        });
        document.getElementById('si-password')?.addEventListener('keydown', e => {
            if (e.key === 'Enter') submitSignIn();
        });
    }

    async function submitSignIn() {
        const email    = document.getElementById('si-email')?.value.trim();
        const password = document.getElementById('si-password')?.value;
        const errEl    = document.getElementById('si-error');
        const btn      = document.getElementById('si-btn');
        if (!email || !password) {
            _showFormError(errEl, 'Please enter your email and password.');
            return;
        }
        btn.disabled = true;
        btn.textContent = 'Signing in…';
        const result = await Auth.signIn(email, password);
        if (!result.success) {
            btn.disabled = false;
            btn.textContent = 'Sign In';
            _showFormError(errEl, result.message);
            return;
        }
        // onAuthStateChange in app.js handles the redirect
    }

    function showSignUp() {
        navigate('sign-up');
        app.innerHTML = `
            <div class="screen auth-screen">
                <div class="auth-logo">
                    <div style="font-size:56px;">🤖</div>
                    <h1 class="auth-title">SpellQuest</h1>
                </div>
                <div class="card">
                    <h2 style="margin-bottom:16px;">Create Account</h2>
                    <div class="form-group">
                        <label class="form-label">Child's name (display name)</label>
                        <input id="su-username" type="text" class="form-input"
                            placeholder="e.g. Emma"
                            autocomplete="off" autocapitalize="words">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Email (parent's email)</label>
                        <input id="su-email" type="email" class="form-input"
                            placeholder="parent@example.com"
                            autocomplete="email" autocapitalize="off">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Password (min 6 characters)</label>
                        <input id="su-password" type="password" class="form-input"
                            placeholder="••••••••" autocomplete="new-password">
                    </div>
                    <div id="su-error" class="form-error hidden"></div>
                    <button id="su-btn" class="btn btn-primary btn-full mt-12"
                        onclick="Screens.submitSignUp()">Create Account</button>
                </div>
                <div class="auth-switch">
                    <span>Already have an account?</span>
                    <button class="btn btn-secondary" onclick="Screens.showSignIn()">Sign In</button>
                </div>
            </div>
        `;
    }

    async function submitSignUp() {
        const username = document.getElementById('su-username')?.value.trim();
        const email    = document.getElementById('su-email')?.value.trim();
        const password = document.getElementById('su-password')?.value;
        const errEl    = document.getElementById('su-error');
        const btn      = document.getElementById('su-btn');

        if (!username) { _showFormError(errEl, 'Please enter a display name.'); return; }
        if (!email)    { _showFormError(errEl, 'Please enter an email address.'); return; }
        if (!password || password.length < 6) {
            _showFormError(errEl, 'Password must be at least 6 characters.');
            return;
        }
        btn.disabled = true;
        btn.textContent = 'Creating account…';
        const result = await Auth.signUp(email, password, username);
        if (!result.success) {
            btn.disabled = false;
            btn.textContent = 'Create Account';
            _showFormError(errEl, result.message);
            return;
        }
        if (result.needsConfirmation) {
            showSignIn('Account created! Check your email to confirm, then sign in.');
        }
        // If email confirmation is disabled, onAuthStateChange handles the redirect
    }

    function showForgotPassword() {
        navigate('forgot-password');
        app.innerHTML = `
            <div class="screen auth-screen">
                <div class="auth-logo">
                    <div style="font-size:56px;">🔑</div>
                    <h1 class="auth-title">Reset Password</h1>
                    <p class="auth-subtitle">We'll send a reset link to your email</p>
                </div>
                <div class="card">
                    <div class="form-group">
                        <label class="form-label">Email</label>
                        <input id="fp-email" type="email" class="form-input"
                            placeholder="parent@example.com"
                            autocomplete="email" autocapitalize="off">
                    </div>
                    <div id="fp-error" class="form-error hidden"></div>
                    <div id="fp-success" class="form-success hidden"></div>
                    <button id="fp-btn" class="btn btn-primary btn-full mt-12"
                        onclick="Screens.submitForgotPassword()">Send Reset Link</button>
                </div>
                <button class="btn btn-secondary mt-8" onclick="Screens.showSignIn()">← Back to Sign In</button>
            </div>
        `;
    }

    async function submitForgotPassword() {
        const email = document.getElementById('fp-email')?.value.trim();
        const errEl = document.getElementById('fp-error');
        const sucEl = document.getElementById('fp-success');
        const btn   = document.getElementById('fp-btn');
        if (!email) { _showFormError(errEl, 'Please enter your email.'); return; }
        btn.disabled = true;
        btn.textContent = 'Sending…';
        const result = await Auth.sendPasswordReset(email);
        if (!result.success) {
            btn.disabled = false;
            btn.textContent = 'Send Reset Link';
            _showFormError(errEl, result.message);
            return;
        }
        errEl.classList.add('hidden');
        sucEl.textContent = 'Reset link sent! Check your inbox.';
        sucEl.classList.remove('hidden');
        btn.textContent = 'Sent ✓';
    }

    // ===== PROFILE SCREEN =====

    async function showProfile() {
        navigate('profile');
        app.innerHTML = `
            <div class="screen">
                ${renderHeader()}
                <div class="card text-center">
                    <div style="font-size:48px;margin-bottom:8px;">👤</div>
                    <p style="color:var(--text-light);font-size:13px;">Loading…</p>
                </div>
            </div>
        `;
        const profile = await DB.getProfile();
        const stats   = await DB.getStats();
        const user    = Auth.getUser();

        app.innerHTML = `
            <div class="screen">
                ${renderHeader()}
                <div class="card text-center">
                    <div style="font-size:48px;margin-bottom:8px;">${Heroes.getSelected().emoji}</div>
                    <h2>${profile?.username || user?.email || 'Speller'}</h2>
                    <p style="color:var(--text-light);font-size:13px;">${user?.email || ''}</p>
                </div>
                <div class="card">
                    <h3 style="margin-bottom:12px;">📊 Stats</h3>
                    <div class="stats-grid">
                        <div class="stat-item">
                            <div class="stat-value">${stats.totalTests}</div>
                            <div class="stat-label">Tests taken</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value">${stats.totalCorrect}</div>
                            <div class="stat-label">Words correct</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value">${stats.accuracy}%</div>
                            <div class="stat-label">Accuracy</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value">Lv ${Progression.getProgress().level}</div>
                            <div class="stat-label">Level</div>
                        </div>
                    </div>
                </div>
                ${stats.commonMistakes.length > 0 ? `
                    <div class="card">
                        <h3 style="margin-bottom:8px;">🔁 Most missed words</h3>
                        <div class="mistakes-list">
                            ${stats.commonMistakes.map(m =>
                                `<div class="mistake-item">❌ ${m.word} <span style="color:var(--text-light);font-size:12px;">(${m.count}×)</span></div>`
                            ).join('')}
                        </div>
                    </div>
                ` : ''}
                <div class="card">
                    <h3 style="margin-bottom:4px;">⚙️ Settings</h3>
                    <p style="font-size:12px;color:var(--text-light);margin-bottom:12px;">
                        Gemini API key improves photo word list accuracy
                    </p>
                    <div class="flex-row" style="gap:8px;align-items:center;">
                        <input id="gemini-key-input" type="password" class="form-input" style="flex:1;"
                            placeholder="Paste Gemini API key…"
                            value="${OCR.hasApiKey() ? '••••••••••••••••' : ''}"
                            autocomplete="off">
                        <button class="btn btn-secondary btn-small" onclick="Screens.saveGeminiKey()">
                            💾 Save
                        </button>
                        ${OCR.hasApiKey() ? `<button class="btn btn-small btn-danger" onclick="Screens.clearGeminiKey()">✕</button>` : ''}
                    </div>
                    <div id="gemini-key-msg" class="form-success hidden" style="margin-top:6px;"></div>
                    ${OCR.hasApiKey() ? '<p style="font-size:12px;color:var(--success);margin-top:6px;">✓ Gemini OCR active</p>' : '<p style="font-size:12px;color:var(--text-light);margin-top:6px;">No key set — using Tesseract fallback</p>'}
                </div>
                <div class="flex-row mt-12">
                    <button class="btn btn-secondary" onclick="Screens.showHome()">🏠 Home</button>
                    <button class="btn btn-danger" onclick="Screens.confirmSignOut()">Sign Out</button>
                </div>
            </div>
        `;
    }

    function saveGeminiKey() {
        const input = document.getElementById('gemini-key-input');
        const msgEl = document.getElementById('gemini-key-msg');
        const val   = input?.value.trim();
        if (!val || val.startsWith('•')) return;
        OCR.setApiKey(val);
        if (msgEl) { msgEl.textContent = '✓ Key saved!'; msgEl.classList.remove('hidden'); }
        setTimeout(() => showProfile(), 1000);
    }

    function clearGeminiKey() {
        OCR.setApiKey('');
        showProfile();
    }

    async function confirmSignOut() {
        if (!confirm('Sign out of SpellQuest?')) return;
        await Auth.signOut();
        Store.reset();
        showSignIn();
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
                    <div class="action-card" onclick="Screens.showSavedLists()">
                        <div class="action-icon">📚</div>
                        <div class="action-text">
                            <h3>Saved Lists</h3>
                            <p>Practice a previous list</p>
                        </div>
                    </div>
                    <div class="action-card" onclick="Screens.showResultsHistory()">
                        <div class="action-icon">📊</div>
                        <div class="action-text">
                            <h3>Results History</h3>
                            <p>See past test scores</p>
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

    // ===== MANUAL INPUT =====

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
        setTimeout(() => document.getElementById('manual-words')?.focus(), 100);
    }

    function processManualInput() {
        const ta = document.getElementById('manual-words');
        if (!ta) return;
        const words = ta.value.split('\n')
            .map(w => w.replace(/^\s*[\d]+[\.\)\-\s]*/g, '').trim().toLowerCase())
            .filter(w => w.length >= 2);
        if (words.length === 0) { alert('Please enter at least one word.'); return; }
        showListReview(words);
    }

    // ===== PHOTO INPUT =====

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
                        <p style="font-size:14px;color:var(--text-light);">Reading your spelling list…</p>
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
            const statusEl   = document.getElementById('ocr-status');
            const progressEl = document.getElementById('ocr-progress');
            if (statusEl) statusEl.style.display = 'block';
            const words = await OCR.recognizeList(imageData, pct => {
                if (progressEl) progressEl.style.width = pct + '%';
            });
            if (words.length === 0) { alert('No words found. Try again with a clearer photo.'); return; }
            showListReview(words);
        } catch (err) {
            console.error('OCR error:', err);
            alert('Could not read the image. Please try again.');
        }
    }

    // ===== LIST REVIEW =====

    function showListReview(words) {
        navigate('list-review');
        window._reviewWords = [...words];
        _activeListId   = null;
        _activeListName = null;
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
                    <div class="word-list">${wordItems}</div>
                    <button class="btn btn-secondary btn-small mt-8" onclick="Screens.addReviewWord()">
                        + Add Word
                    </button>
                </div>
                ${Auth.isSignedIn() ? `
                    <div class="card">
                        <label class="form-label">Save this list as (optional)</label>
                        <div class="flex-row" style="gap:8px;align-items:center;">
                            <input id="list-name-input" class="form-input" style="flex:1;"
                                placeholder="e.g. Week 3 spelling"
                                value="${_activeListName || ''}"
                                autocomplete="off" autocorrect="off">
                            <button class="btn btn-secondary btn-small" onclick="Screens.saveCurrentList()">
                                💾 Save
                            </button>
                        </div>
                        <div id="save-list-msg" class="form-success hidden" style="margin-top:6px;"></div>
                    </div>
                ` : ''}
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
        setTimeout(() => {
            const inputs = document.querySelectorAll('.word-item-input');
            if (inputs.length > 0) inputs[inputs.length - 1].focus();
        }, 50);
    }

    async function saveCurrentList() {
        const nameInput = document.getElementById('list-name-input');
        const msgEl     = document.getElementById('save-list-msg');
        const name = nameInput?.value.trim();
        if (!name) { nameInput?.focus(); return; }
        const words = window._reviewWords.filter(w => w.trim().length > 0);
        const result = await DB.saveList(name, words, _activeListId);
        if (result.success) {
            _activeListName = name;
            if (msgEl) { msgEl.textContent = '✓ Saved!'; msgEl.classList.remove('hidden'); }
            setTimeout(() => msgEl?.classList.add('hidden'), 2000);
        }
    }

    function confirmList() {
        const words = window._reviewWords.filter(w => w.trim().length > 0);
        if (words.length === 0) { alert('Please add at least one word.'); return; }
        window._reviewWords = words;
        showStartScreen(words);
    }

    // ===== SAVED LISTS SCREEN =====

    async function showSavedLists() {
        navigate('saved-lists');
        app.innerHTML = `
            <div class="screen">
                ${renderHeader()}
                <div class="card text-center">
                    <p style="color:var(--text-light);">Loading lists…</p>
                </div>
            </div>
        `;

        if (!Auth.isSignedIn()) {
            app.innerHTML = `
                <div class="screen">
                    ${renderHeader()}
                    <div class="card text-center">
                        <p style="font-size:32px;">📚</p>
                        <p style="margin-top:8px;">Sign in to save and access your word lists.</p>
                        <button class="btn btn-primary mt-12" onclick="Screens.showSignIn()">Sign In</button>
                    </div>
                    <button class="btn btn-secondary mt-12" onclick="Screens.showHome()">← Back</button>
                </div>
            `;
            return;
        }

        const lists = await DB.getLists();

        if (lists.length === 0) {
            app.innerHTML = `
                <div class="screen">
                    ${renderHeader()}
                    <div class="card text-center">
                        <p style="font-size:32px;">📚</p>
                        <h3 style="margin:8px 0;">No saved lists yet</h3>
                        <p style="color:var(--text-light);font-size:13px;">
                            Enter a word list and tap 💾 Save to keep it here.
                        </p>
                        <button class="btn btn-primary mt-12" onclick="Screens.showManualInput()">
                            ✏️ Create a List
                        </button>
                    </div>
                    <button class="btn btn-secondary mt-12" onclick="Screens.showHome()">← Back</button>
                </div>
            `;
            return;
        }

        const listItems = lists.map(list => `
            <div class="saved-list-item">
                <div class="saved-list-info" onclick="Screens.loadSavedList('${list.id}')">
                    <div class="saved-list-name">${_esc(list.name)}</div>
                    <div class="saved-list-meta">
                        ${list.words.length} words &nbsp;·&nbsp;
                        ${_formatDate(list.updated_at)}
                    </div>
                </div>
                <div class="saved-list-actions">
                    <button class="btn btn-small btn-primary"
                        onclick="Screens.loadSavedList('${list.id}')">▶ Start</button>
                    <button class="btn btn-small btn-danger"
                        onclick="Screens.deleteSavedList('${list.id}', this)">🗑</button>
                </div>
            </div>
        `).join('');

        app.innerHTML = `
            <div class="screen">
                ${renderHeader()}
                <div class="card">
                    <h2 style="margin-bottom:12px;">📚 Saved Lists</h2>
                    <div class="saved-lists">${listItems}</div>
                </div>
                <button class="btn btn-secondary mt-12" onclick="Screens.showHome()">← Back</button>
            </div>
        `;
    }

    async function loadSavedList(listId) {
        const lists = await DB.getLists();
        const list  = lists.find(l => l.id === listId);
        if (!list) return;
        _activeListId   = list.id;
        _activeListName = list.name;
        window._reviewWords = [...list.words];
        renderReviewScreen();
    }

    async function deleteSavedList(listId, btn) {
        if (!confirm('Delete this list?')) return;
        btn.disabled = true;
        await DB.deleteList(listId);
        showSavedLists();
    }

    // ===== RESULTS HISTORY SCREEN =====

    async function showResultsHistory() {
        navigate('results-history');
        app.innerHTML = `
            <div class="screen">
                ${renderHeader()}
                <div class="card text-center">
                    <p style="color:var(--text-light);">Loading results…</p>
                </div>
            </div>
        `;

        if (!Auth.isSignedIn()) {
            app.innerHTML = `
                <div class="screen">
                    ${renderHeader()}
                    <div class="card text-center">
                        <p style="font-size:32px;">📊</p>
                        <p style="margin-top:8px;">Sign in to see your results history.</p>
                        <button class="btn btn-primary mt-12" onclick="Screens.showSignIn()">Sign In</button>
                    </div>
                    <button class="btn btn-secondary mt-12" onclick="Screens.showHome()">← Back</button>
                </div>
            `;
            return;
        }

        const results = await DB.getResults({ limit: 50 });

        if (results.length === 0) {
            app.innerHTML = `
                <div class="screen">
                    ${renderHeader()}
                    <div class="card text-center">
                        <p style="font-size:32px;">📊</p>
                        <h3 style="margin:8px 0;">No results yet</h3>
                        <p style="color:var(--text-light);font-size:13px;">
                            Complete a spelling test to see your history here.
                        </p>
                        <button class="btn btn-primary mt-12" onclick="Screens.showHome()">Start Spelling</button>
                    </div>
                    <button class="btn btn-secondary mt-12" onclick="Screens.showHome()">← Back</button>
                </div>
            `;
            return;
        }

        const rows = results.map(r => {
            const pct = r.words_attempted > 0
                ? Math.round((r.words_correct / r.words_attempted) * 100) : 0;
            const medal = pct === 100 ? '🥇' : pct >= 80 ? '🥈' : pct >= 60 ? '🥉' : '📝';
            return `
                <div class="result-row">
                    <div class="result-medal">${medal}</div>
                    <div class="result-info">
                        <div class="result-name">${_esc(r.list_name || 'Spelling Test')}</div>
                        <div class="result-meta">${_formatDate(r.completed_at)}</div>
                    </div>
                    <div class="result-score">
                        <span class="result-fraction">${r.words_correct}/${r.words_attempted}</span>
                        <span class="result-pct">${pct}%</span>
                    </div>
                </div>
            `;
        }).join('');

        app.innerHTML = `
            <div class="screen">
                ${renderHeader()}
                <div class="card">
                    <h2 style="margin-bottom:12px;">📊 Results History</h2>
                    <div class="results-history">${rows}</div>
                </div>
                <button class="btn btn-secondary mt-12" onclick="Screens.showHome()">← Back</button>
            </div>
        `;
    }

    // ===== START SCREEN =====

    function showStartScreen(words) {
        navigate('start');
        app.innerHTML = `
            <div class="screen" style="justify-content:center;align-items:center;">
                ${renderHeader()}
                <div class="card text-center" style="flex:1;display:flex;flex-direction:column;justify-content:center;align-items:center;">
                    <div style="font-size:48px;margin-bottom:16px;">📝</div>
                    <h2 style="margin-bottom:8px;">${_activeListName ? _esc(_activeListName) : 'Ready to Spell!'}</h2>
                    <p style="color:var(--text-light);margin-bottom:4px;">${words.length} words in your list</p>
                    <p style="font-size:12px;color:var(--text-light);margin-bottom:24px;">
                        Each word will be read twice. Listen carefully!
                    </p>
                    <div class="mode-toggle mb-16">
                        <button class="${window._testMode !== 'paper' ? 'active' : ''}"
                            onclick="window._testMode='keyboard';Screens.showStartScreen(window._reviewWords)">
                            ⌨️ Keyboard
                        </button>
                        <button class="${window._testMode === 'paper' ? 'active' : ''}"
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
            words,
            currentIndex: 0,
            results: [],
            mistakes: []
        };
        showTestWord();
    }

    function showTestWord() {
        const { words, currentIndex } = testState;
        const word    = words[currentIndex];
        const total   = words.length;
        const isPaper = window._testMode === 'paper';
        Keyboard.reset();
        app.innerHTML = `
            <div class="screen" style="padding-bottom:0;">
                <div class="test-header">
                    <div class="test-progress">Word ${currentIndex + 1} / ${total}</div>
                    <div class="test-title">SPELLING</div>
                </div>
                <div class="listen-area">
                    <button class="listen-btn" onclick="Screens.listenWord()">🔊 Listen</button>
                    <button class="listen-btn replay" onclick="Screens.replayWord()">🔊 Replay</button>
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

        if (!isPaper) {
            const kbContainer = document.getElementById('keyboard-container');
            Keyboard.setCallbacks(
                val => {
                    const display = document.getElementById('answer-display');
                    if (display) {
                        display.textContent = val || '';
                        display.className   = val ? 'answer-display' : 'answer-display empty';
                        if (!val) display.textContent = 'Type your answer below';
                    }
                },
                val => checkAnswer(val)
            );
            kbContainer.appendChild(Keyboard.render());
        }
        setTimeout(() => Voice.pronounceWord(word), 400);
    }

    function listenWord() { Voice.pronounceWord(testState.words[testState.currentIndex]); }
    function replayWord() { Voice.speak(testState.words[testState.currentIndex]); }

    // ===== PAPER MODE =====

    async function paperCapture() {
        const word = testState.words[testState.currentIndex];
        try {
            const imageData  = await Handwriting.captureAnswer();
            const display    = document.getElementById('answer-display');
            if (display) { display.textContent = 'Reading your handwriting…'; display.className = 'answer-display empty'; }
            const recognized = await Handwriting.recognizeHandwriting(imageData, word);
            showPaperConfirm(recognized, imageData);
        } catch (err) {
            console.error('Paper capture error:', err);
            alert('Could not capture. Please try again.');
        }
    }

    function showPaperConfirm(recognized, imageData) {
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

    function confirmPaperAnswer() { checkAnswer(window._paperRecognized || ''); }

    function editPaperAnswer() {
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
        const val   = input ? input.value.trim() : '';
        document.querySelector('.modal-overlay')?.remove();
        checkAnswer(val);
    }

    // ===== ANSWER CHECKING =====

    function checkAnswer(userAnswer) {
        const word    = testState.words[testState.currentIndex];
        const correct = Checker.check(userAnswer, word);
        testState.results.push({ word, userAnswer: userAnswer.trim().toLowerCase(), correct });
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
                    ` : `<div class="feedback-xp">+10 ⭐ XP  •  +1 🪙</div>`}
                </div>
                <button class="btn btn-primary mt-24" onclick="Screens.nextWord()">
                    ${testState.currentIndex < testState.words.length - 1 ? 'Next Word →' : 'See Results 🏆'}
                </button>
            </div>
        `;
        if (levelResult?.leveledUp) {
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

    async function showResults() {
        navigate('results');
        const { results, mistakes, words } = testState;
        const correctCount = results.filter(r => r.correct).length;
        const total        = words.length;
        const percentage   = Math.round((correctCount / total) * 100);
        const xpEarned     = correctCount * 10;
        const coinsEarned  = correctCount;

        // Persist stats to localStorage
        if (mistakes.length > 0) {
            Store.update(data => {
                const newMistakes = mistakes.filter(m => !data.mistakeHistory.includes(m));
                data.mistakeHistory = [...data.mistakeHistory, ...newMistakes].slice(-50);
            });
        }
        Store.update(data => {
            data.totalWordsCorrect   += correctCount;
            data.totalWordsAttempted += total;
        });

        // Persist result to Supabase (non-blocking)
        if (Auth.isSignedIn()) {
            DB.saveResult({
                listId:          _activeListId,
                listName:        _activeListName || 'Spelling Test',
                wordsAttempted:  total,
                wordsCorrect:    correctCount,
                mistakes
            }).catch(e => console.warn('Failed to save result:', e));
        }

        const mistakeItems = mistakes.map(m =>
            `<div class="mistake-item">❌ ${m}</div>`
        ).join('');

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
                <div class="flex-row mt-12">
                    <button class="btn btn-secondary" onclick="Screens.showHome()">🏠 Home</button>
                    <button class="btn btn-secondary" onclick="Screens.showResultsHistory()">📊 History</button>
                </div>
            </div>
        `;
    }

    function practiceMistakes() {
        if (testState.mistakes.length === 0) return;
        window._reviewWords = [...testState.mistakes];
        showStartScreen(testState.mistakes);
    }

    // ===== HERO SHOP =====

    function showHeroShop() {
        navigate('hero-shop');
        const heroes   = Heroes.getAll();
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
                    <p style="font-size:13px;color:var(--text-light);">You have ${progress.coins} 🪙</p>
                </div>
                <div class="hero-grid">${heroCards}</div>
                <button class="btn btn-secondary mt-12" onclick="Screens.showHome()">🏠 Home</button>
            </div>
        `;
    }

    function buyHero(heroId) {
        const result = Heroes.buy(heroId);
        if (result.success) {
            Heroes.equip(heroId);
            const hero = Heroes.getCatalog().find(h => h.id === heroId);
            app.innerHTML = `
                <div class="screen" style="justify-content:center;align-items:center;">
                    <div class="feedback">
                        <div class="feedback-icon" style="font-size:64px;">${hero.emoji}</div>
                        <div class="feedback-title correct">🎉 ${hero.name} unlocked!</div>
                        <p style="color:var(--text-light);margin-top:8px;">Equipped as your hero</p>
                    </div>
                    <button class="btn btn-primary mt-24" onclick="Screens.showHeroShop()">← Back to Shop</button>
                    <button class="btn btn-secondary mt-8" onclick="Screens.showHome()">🏠 Home</button>
                </div>
            `;
        } else {
            alert(result.reason || 'Cannot buy this hero.');
        }
    }

    function equipHero(heroId) {
        Heroes.equip(heroId);
        showHeroShop();
    }

    // ===== UTILITIES =====

    function _showFormError(el, msg) {
        if (!el) return;
        el.textContent = msg;
        el.classList.remove('hidden');
    }

    function _esc(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function _formatDate(iso) {
        if (!iso) return '';
        const d = new Date(iso);
        return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
    }

    // ===== PUBLIC API =====
    return {
        init,
        showHome,
        showSignIn,
        showSignUp,
        submitSignIn,
        submitSignUp,
        showForgotPassword,
        submitForgotPassword,
        showProfile,
        saveGeminiKey,
        clearGeminiKey,
        confirmSignOut,
        showManualInput,
        processManualInput,
        showListInput,
        captureList,
        showListReview,
        updateReviewWord,
        deleteReviewWord,
        addReviewWord,
        saveCurrentList,
        confirmList,
        showSavedLists,
        loadSavedList,
        deleteSavedList,
        showResultsHistory,
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
