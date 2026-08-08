/* ===== SpellQuest Screens ===== */

const Screens = (() => {
    let app = null;
    let testState = null;
    let _activeListId   = null;
    let _activeListName = null;
    let _homeTab        = 'practice'; // 'practice' | 'manage'

    function init(appEl) { app = appEl; showHome(); }

    // ── Utilities ─────────────────────────────────────────────────────────────
    function _esc(s) {
        return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;')
            .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }
    function _formatDate(iso) {
        if (!iso) return '';
        return new Date(iso).toLocaleDateString(undefined,
            { day:'numeric', month:'short', year:'numeric' });
    }
    function _formatShortDate(iso) {
        if (!iso) return '';
        return new Date(iso).toLocaleDateString(undefined,
            { day:'numeric', month:'short' });
    }
    function _pct(c, a) { return a > 0 ? Math.round((c/a)*100) : 0; }
    function _scoreColor(p) {
        return p===100 ? 'var(--success)' : p>=70 ? 'var(--warning)' : 'var(--error)';
    }
    function _showErr(el, msg) {
        if (!el) return;
        el.textContent = msg;
        el.classList.remove('hidden');
    }
    function _daysUntil(dateStr) {
        if (!dateStr) return null;
        const diff = new Date(dateStr) - new Date();
        return Math.ceil(diff / 86400000);
    }

    // ── Header (compact, used inside non-home screens) ────────────────────────
    function _header(backFn) {
        const user = Auth.getUser();
        return `
        <div class="header">
            <div class="header-left">
                ${backFn
                    ? `<button class="btn-back" onclick="${backFn}">‹</button>`
                    : `<span class="header-hero">${Heroes.getSelected().emoji}</span>`}
                <span class="header-title">SpellQuest</span>
            </div>
            <div class="header-right">
                <span class="header-coins">🪙 ${Progression.getProgress().coins}</span>
                ${user ? `<button class="btn-icon" onclick="Screens.showProfile()">👤</button>` : ''}
            </div>
        </div>`;
    }

    // ── Auth screens ──────────────────────────────────────────────────────────
    function showSignIn(msg='') {
        app.innerHTML = `
        <div class="screen auth-screen">
            <div class="auth-logo">
                <div class="auth-logo-emoji">🤖</div>
                <h1 class="auth-title">SpellQuest</h1>
                <p class="auth-subtitle">Spelling practice that's actually fun</p>
            </div>
            ${msg ? `<div class="auth-message">${_esc(msg)}</div>` : ''}
            <div class="card">
                <h2 class="card-title">Sign In</h2>
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
                <button id="si-btn" class="btn btn-primary btn-full mt-16"
                    onclick="Screens.submitSignIn()">Sign In</button>
                <button class="btn-text mt-12"
                    onclick="Screens.showForgotPassword()">Forgot password?</button>
            </div>
            <div class="auth-switch">
                <span>No account yet?</span>
                <button class="btn btn-secondary" onclick="Screens.showSignUp()">Create Account</button>
            </div>
        </div>`;
        document.getElementById('si-email')?.addEventListener('keydown', e => {
            if (e.key==='Enter') document.getElementById('si-password')?.focus();
        });
        document.getElementById('si-password')?.addEventListener('keydown', e => {
            if (e.key==='Enter') Screens.submitSignIn();
        });
    }

    async function submitSignIn() {
        const email = document.getElementById('si-email')?.value.trim();
        const pass  = document.getElementById('si-password')?.value;
        const errEl = document.getElementById('si-error');
        const btn   = document.getElementById('si-btn');
        if (!email||!pass) { _showErr(errEl,'Please enter your email and password.'); return; }
        btn.disabled=true; btn.textContent='Signing in…';
        const r = await Auth.signIn(email, pass);
        if (!r.success) { btn.disabled=false; btn.textContent='Sign In'; _showErr(errEl,r.message); }
    }

    function showSignUp() {
        app.innerHTML = `
        <div class="screen auth-screen">
            <div class="auth-logo">
                <div class="auth-logo-emoji">🤖</div>
                <h1 class="auth-title">SpellQuest</h1>
            </div>
            <div class="card">
                <h2 class="card-title">Create Account</h2>
                <div class="form-group">
                    <label class="form-label">Child's name</label>
                    <input id="su-name" type="text" class="form-input"
                        placeholder="e.g. Emma" autocomplete="off" autocapitalize="words">
                </div>
                <div class="form-group">
                    <label class="form-label">Parent's email</label>
                    <input id="su-email" type="email" class="form-input"
                        placeholder="parent@example.com"
                        autocomplete="email" autocapitalize="off">
                </div>
                <div class="form-group">
                    <label class="form-label">Password (min 6 characters)</label>
                    <input id="su-pass" type="password" class="form-input"
                        placeholder="••••••••" autocomplete="new-password">
                </div>
                <div id="su-error" class="form-error hidden"></div>
                <button id="su-btn" class="btn btn-primary btn-full mt-16"
                    onclick="Screens.submitSignUp()">Create Account</button>
            </div>
            <div class="auth-switch">
                <span>Already have an account?</span>
                <button class="btn btn-secondary" onclick="Screens.showSignIn()">Sign In</button>
            </div>
        </div>`;
    }

    async function submitSignUp() {
        const name  = document.getElementById('su-name')?.value.trim();
        const email = document.getElementById('su-email')?.value.trim();
        const pass  = document.getElementById('su-pass')?.value;
        const errEl = document.getElementById('su-error');
        const btn   = document.getElementById('su-btn');
        if (!name)              { _showErr(errEl,'Please enter a display name.'); return; }
        if (!email)             { _showErr(errEl,'Please enter an email address.'); return; }
        if (!pass||pass.length<6) { _showErr(errEl,'Password must be at least 6 characters.'); return; }
        btn.disabled=true; btn.textContent='Creating account…';
        const r = await Auth.signUp(email, pass, name);
        if (!r.success) { btn.disabled=false; btn.textContent='Create Account'; _showErr(errEl,r.message); return; }
        if (r.needsConfirmation) showSignIn('Account created! Check your email to confirm.');
    }

    function showForgotPassword() {
        app.innerHTML = `
        <div class="screen auth-screen">
            <div class="auth-logo">
                <div class="auth-logo-emoji">🔑</div>
                <h1 class="auth-title">Reset Password</h1>
            </div>
            <div class="card">
                <div class="form-group">
                    <label class="form-label">Email</label>
                    <input id="fp-email" type="email" class="form-input"
                        placeholder="parent@example.com"
                        autocomplete="email" autocapitalize="off">
                </div>
                <div id="fp-error" class="form-error hidden"></div>
                <div id="fp-ok" class="form-success hidden"></div>
                <button id="fp-btn" class="btn btn-primary btn-full mt-16"
                    onclick="Screens.submitForgotPassword()">Send Reset Link</button>
            </div>
            <button class="btn btn-secondary mt-8"
                onclick="Screens.showSignIn()">← Back to Sign In</button>
        </div>`;
    }

    async function submitForgotPassword() {
        const email = document.getElementById('fp-email')?.value.trim();
        const errEl = document.getElementById('fp-error');
        const okEl  = document.getElementById('fp-ok');
        const btn   = document.getElementById('fp-btn');
        if (!email) { _showErr(errEl,'Please enter your email.'); return; }
        btn.disabled=true; btn.textContent='Sending…';
        const r = await Auth.sendPasswordReset(email);
        if (!r.success) { btn.disabled=false; btn.textContent='Send Reset Link'; _showErr(errEl,r.message); return; }
        errEl.classList.add('hidden');
        okEl.textContent='Reset link sent! Check your inbox.'; okEl.classList.remove('hidden');
        btn.textContent='Sent ✓';
    }

    // ── Home screen ───────────────────────────────────────────────────────────

    async function showHome(tab) {
        if (tab) _homeTab = tab;
        const hero     = Heroes.getSelected();
        const progress = Progression.getProgress();
        const profile  = await DB.getProfile();
        const name     = profile?.username || Auth.getUser()?.email?.split('@')[0] || 'Speller';
        const paused   = TestPause.load();

        app.innerHTML = `
        <div class="screen home-screen">
            <div class="home-header">
                <div class="home-hero-row">
                    <span class="home-hero">${hero.emoji}</span>
                    <div class="home-greeting">
                        <div class="home-name">Hi, ${_esc(name)}!</div>
                        <div class="home-level">Level ${progress.level} · 🪙 ${progress.coins}</div>
                    </div>
                    <button class="btn-icon home-profile-btn"
                        onclick="Screens.showProfile()">👤</button>
                </div>
                <div class="xp-bar-slim">
                    <div class="xp-bar-slim-fill" style="width:${progress.xpPercentage}%"></div>
                </div>
                <div class="xp-bar-label">
                    ${progress.xpRequired - progress.xp} XP to Level ${progress.level+1}
                </div>
            </div>

            ${paused ? `
            <div class="resume-banner" onclick="Screens.resumeTest()">
                <span class="resume-icon">⏸</span>
                <div class="resume-text">
                    <div class="resume-title">Resume: ${_esc(paused.listName||'Test')}</div>
                    <div class="resume-sub">
                        Word ${paused.currentIndex+1} of ${paused.words.length}
                    </div>
                </div>
                <span class="resume-arrow">▶</span>
            </div>` : ''}

            <div class="home-tabs">
                <button class="home-tab ${_homeTab==='practice'?'home-tab-active':''}"
                    onclick="Screens.showHome('practice')">Practice</button>
                <button class="home-tab ${_homeTab==='manage'?'home-tab-active':''}"
                    onclick="Screens.showHome('manage')">Manage Lists</button>
            </div>

            <div id="tab-content" class="tab-content">
                <div class="section-loading">Loading…</div>
            </div>
        </div>`;

        _renderTabContent();
    }

    async function _renderTabContent() {
        const el = document.getElementById('tab-content');
        if (!el) return;

        if (_homeTab === 'practice') {
            const [lists, lastResults] = await Promise.all([
                DB.getLists({ status: 'active' }),
                DB.getLastResultPerList()
            ]);

            if (lists.length === 0) {
                el.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📋</div>
                    <h3>No active spelling lists</h3>
                    <p>Go to <strong>Manage Lists</strong> to add your first list.</p>
                    <button class="btn btn-primary mt-16"
                        onclick="Screens.showHome('manage')">
                        Go to Manage Lists
                    </button>
                </div>`;
                return;
            }

            el.innerHTML = lists.map(l => _practiceCard(l, lastResults[l.id])).join('');
        } else {
            // Manage tab
            const [active, archived] = await Promise.all([
                DB.getLists({ status: 'active' }),
                DB.getLists({ status: 'archived' })
            ]);

            el.innerHTML = `
            <div class="manage-add-row">
                <button class="btn-add-list" onclick="Screens.showAddList()">
                    <span>＋</span> Add New Spelling List
                </button>
            </div>
            ${active.length === 0 && archived.length === 0 ? `
                <div class="empty-state">
                    <div class="empty-icon">📋</div>
                    <h3>No lists yet</h3>
                    <p>Tap above to add your first spelling list.</p>
                </div>` : ''}
            ${active.length > 0 ? `
                <div class="manage-section-title">Active</div>
                ${active.map(l => _manageCard(l)).join('')}` : ''}
            ${archived.length > 0 ? `
                <div class="manage-section-title manage-section-archived">Archived</div>
                ${archived.map(l => _manageCard(l, true)).join('')}` : ''}`;
        }
    }

    function _practiceCard(list, last) {
        const pct     = last ? _pct(last.words_correct, last.words_attempted) : null;
        const days    = _daysUntil(list.test_date);
        const urgency = days !== null && days <= 3 ? 'urgent' : days !== null && days <= 7 ? 'soon' : '';

        const dateTag = list.test_date ? `
            <span class="test-date-tag ${urgency}">
                📅 ${days !== null && days >= 0
                    ? (days === 0 ? 'Test today!' : days === 1 ? 'Test tomorrow!' : `Test in ${days} days`)
                    : _formatShortDate(list.test_date)}
            </span>` : '';

        const scoreTag = pct !== null
            ? `<span class="last-score" style="color:${_scoreColor(pct)}">${pct}%</span>`
            : `<span class="last-score-none">Not practiced</span>`;

        return `
        <div class="practice-card" onclick="Screens.startListDirect('${list.id}')">
            <div class="practice-card-top">
                <div class="practice-card-info">
                    <div class="practice-card-name">${_esc(list.name)}</div>
                    <div class="practice-card-meta">${list.words.length} words</div>
                    ${dateTag}
                </div>
                <div class="practice-card-right">
                    ${scoreTag}
                    <div class="practice-play-btn">▶</div>
                </div>
            </div>
        </div>`;
    }

    function _manageCard(list, isArchived=false) {
        const days    = _daysUntil(list.test_date);
        const dateStr = list.test_date
            ? `📅 ${_formatShortDate(list.test_date)}`
            : 'No test date';

        return `
        <div class="manage-card">
            <div class="manage-card-info">
                <div class="manage-card-name">${_esc(list.name)}</div>
                <div class="manage-card-meta">${list.words.length} words · ${dateStr}</div>
            </div>
            <div class="manage-card-actions">
                <button class="manage-btn" onclick="Screens.editList('${list.id}')">✏️</button>
                ${isArchived
                    ? `<button class="manage-btn" onclick="Screens.unarchiveList('${list.id}')">♻️</button>`
                    : `<button class="manage-btn" onclick="Screens.archiveList('${list.id}')">📦 Archive</button>`}
                <button class="manage-btn manage-btn-delete"
                    onclick="Screens.deleteList('${list.id}', this)">🗑</button>
            </div>
        </div>`;
    }

    // ── List actions from home ────────────────────────────────────────────────
    async function startListDirect(listId) {
        const lists = await DB.getLists({ status: 'all' });
        const list  = lists.find(l => l.id === listId);
        if (!list) return;
        _activeListId   = list.id;
        _activeListName = list.name;
        window._reviewWords     = [...list.words];
        window._reviewSentences = [...(list.sentences || [])];
        showStartScreen(list.words, list.sentences || []);
    }

    async function editList(listId) {
        const lists = await DB.getLists({ status: 'all' });
        const list  = lists.find(l => l.id === listId);
        if (!list) return;
        _activeListId   = list.id;
        _activeListName = list.name;
        window._reviewWords     = [...list.words];
        window._reviewSentences = [...(list.sentences || [])];
        window._editTestDate = list.test_date || '';
        _showReviewScreen();
    }

    async function archiveList(listId) {
        await DB.archiveList(listId);
        showHome('manage');
    }

    async function unarchiveList(listId) {
        await DB.unarchiveList(listId);
        showHome('manage');
    }

    async function deleteList(listId, btn) {
        if (!confirm('Delete this list? This cannot be undone.')) return;
        btn.disabled = true;
        await DB.deleteList(listId);
        showHome(_homeTab);
    }

    // ── Add list flow ─────────────────────────────────────────────────────────

    function showAddList() {
        app.innerHTML = `
        <div class="screen">
            ${_header('Screens.showHome(\'manage\')')}
            <h2 class="screen-title">Add Spelling List</h2>
            <div class="add-options">
                <div class="add-option" onclick="Screens.showPhotoCapture()">
                    <div class="add-option-icon">📸</div>
                    <div class="add-option-title">Photo</div>
                    <div class="add-option-sub">Take a photo of your spelling sheet</div>
                </div>
                <div class="add-option" onclick="Screens.showTypeWords()">
                    <div class="add-option-icon">✏️</div>
                    <div class="add-option-title">Type</div>
                    <div class="add-option-sub">Enter words manually</div>
                </div>
            </div>
        </div>`;
    }

    function showPhotoCapture() {
        app.innerHTML = `
        <div class="screen">
            ${_header('Screens.showAddList()')}
            <div class="capture-body">
                <div class="capture-icon">📸</div>
                <h2>Photo your spelling sheet</h2>
                <p>Works with multiple lists on one page</p>
                <button class="btn btn-primary capture-btn camera-only-btn"
                    onclick="Screens.captureAndProcess('camera')">
                    📷 Take Photo
                </button>
                <button class="btn btn-primary capture-btn"
                    onclick="Screens.captureAndProcess('gallery')"
                    style="margin-top:10px;">
                    🖼️ Choose Picture
                </button>
                <div id="ocr-status" style="display:none;width:100%;margin-top:20px;">
                    <p class="ocr-reading-text">Reading your spelling list…</p>
                    <div class="xp-bar">
                        <div class="xp-bar-fill" id="ocr-progress" style="width:0%"></div>
                    </div>
                </div>
            </div>
        </div>`;
    }

    async function captureAndProcess(source) {
        try {
            const imageData = await OCR.captureImage(source);
            document.getElementById('ocr-status').style.display = 'block';
            const lists = await OCR.recognizeMultipleLists(imageData, pct => {
                const el = document.getElementById('ocr-progress');
                if (el) el.style.width = pct + '%';
            });
            if (lists.length === 0) { alert('No words found. Try a clearer photo.'); return; }
            if (lists.length === 1) {
                _activeListId   = null;
                _activeListName = lists[0].name;
                window._reviewWords     = [...lists[0].words];
                window._reviewSentences = [...(lists[0].sentences || [])];
                window._editTestDate = '';
                _showReviewScreen();
            } else {
                _showMultiPicker(lists);
            }
        } catch (err) {
            console.error('OCR error:', err);
            alert('Could not read the image. Please try again.');
        }
    }

    function _showMultiPicker(lists) {
        window._ocrLists = lists;
        const cards = lists.map((l, i) => {
            const sentCount = (l.sentences || []).length;
            const edited = l._edited ? ' ✓' : '';
            return `
            <div class="multi-list-card" onclick="Screens.editOcrList(${i})">
                <div class="multi-list-header">
                    <span class="multi-list-icon">📋</span>
                    <span class="multi-list-name">${_esc(l.name)}${edited}</span>
                </div>
                <div class="multi-list-words">
                    ${l.words.slice(0, 5).map(w =>
                        `<span class="word-chip">${_esc(w)}</span>`).join('')}
                    ${l.words.length > 5
                        ? `<span class="word-chip word-chip-more">+${l.words.length - 5}</span>`
                        : ''}
                </div>
                <div class="multi-list-count">
                    ${l.words.length} words${sentCount > 0 ? ` · ${sentCount} sentences` : ''}
                </div>
            </div>`;
        }).join('');

        app.innerHTML = `
        <div class="screen">
            ${_header('Screens.showPhotoCapture()')}
            <h2 class="screen-title">Found ${lists.length} lists</h2>
            <p class="screen-sub">Tap a list to review/edit, then save all when done</p>
            <div class="multi-list-grid">${cards}</div>
            <button class="btn btn-primary mt-16"
                onclick="Screens.saveAllAndGoHome()">
                💾 Save All &amp; Done
            </button>
        </div>`;
    }

    // Edit a single OCR list — then return to picker
    function editOcrList(i) {
        const list = window._ocrLists?.[i];
        if (!list) return;
        window._editingOcrIndex = i;
        _activeListId   = null;
        _activeListName = list.name;
        window._reviewWords     = [...list.words];
        window._reviewSentences = [...(list.sentences || [])];
        window._editTestDate    = '';
        _showReviewScreen('ocr-edit'); // pass mode flag
    }

    // Called when saving from review in ocr-edit mode — updates the list in _ocrLists and returns to picker
    function _saveOcrEditAndReturn() {
        const i    = window._editingOcrIndex;
        const name = document.getElementById('list-name')?.value.trim() || _activeListName;
        const date = document.getElementById('test-date')?.value || null;
        const words = window._reviewWords.filter(w => w.trim().length > 0);
        const sents = (window._reviewSentences || []).filter(s => s.trim().length > 0);

        if (window._ocrLists && window._ocrLists[i]) {
            window._ocrLists[i].name      = name;
            window._ocrLists[i].words     = words;
            window._ocrLists[i].sentences = sents;
            window._ocrLists[i].testDate  = date;
            window._ocrLists[i]._edited   = true;
        }
        _showMultiPicker(window._ocrLists);
    }

    function _backToMultiPicker() {
        _showMultiPicker(window._ocrLists || []);
    }

    async function saveAllAndGoHome() {
        const lists = window._ocrLists || [];
        if (lists.length === 0) { showHome('manage'); return; }

        const btn = document.querySelector('.btn-primary');
        if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }

        // Check for duplicates by name
        const existing = await DB.getLists({ status: 'all' });
        const existingNames = new Set(existing.map(l => l.name.toLowerCase()));

        const newLists   = lists.filter(l => !existingNames.has(l.name.toLowerCase()));
        const skipped    = lists.length - newLists.length;

        if (newLists.length > 0) {
            await DB.saveAllLists(newLists);
        }

        if (skipped > 0 && newLists.length > 0) {
            alert(`Saved ${newLists.length} new list${newLists.length>1?'s':''}. ${skipped} already existed and ${skipped>1?'were':'was'} skipped.`);
        } else if (skipped > 0 && newLists.length === 0) {
            alert(`All ${skipped} list${skipped>1?'s':''} already exist. Nothing new to save.`);
        }

        showHome('practice');
    }

    function showTypeWords() {
        app.innerHTML = `
        <div class="screen">
            ${_header('Screens.showAddList()')}
            <div class="card mt-16">
                <h2 class="card-title">Type your words</h2>
                <p class="card-sub">One word per line</p>
                <textarea id="manual-words" rows="12" class="form-textarea"
                    placeholder="beautiful&#10;necessary&#10;environment"></textarea>
            </div>
            <button class="btn btn-primary mt-12"
                onclick="Screens.processTypeWords()">Next →</button>
        </div>`;
        setTimeout(() => document.getElementById('manual-words')?.focus(), 100);
    }

    function processTypeWords() {
        const ta = document.getElementById('manual-words');
        if (!ta) return;
        const words = ta.value.split('\n')
            .map(w => w.replace(/^\s*[\d]+[\.\)\-\s]*/g,'').trim().toLowerCase())
            .filter(w => w.length >= 2);
        if (words.length === 0) { alert('Please enter at least one word.'); return; }
        _activeListId   = null;
        _activeListName = '';
        window._reviewWords  = words;
        window._editTestDate = '';
        _showReviewScreen();
    }

    // ── Review screen ─────────────────────────────────────────────────────────

    function _showReviewScreen(mode) {
        // mode: undefined = normal (save & start), 'ocr-edit' = save & back to picker
        const words     = window._reviewWords;
        const sentences = window._reviewSentences || [];
        const isNew     = !_activeListId;
        const isOcrEdit = mode === 'ocr-edit';
        window._reviewMode = mode;
        const items = words.map((w,i) => `
            <div class="word-item">
                <span class="word-item-num">${i+1}.</span>
                <input class="word-item-input" value="${_esc(w)}"
                    onchange="Screens._wordChange(${i},this.value)"
                    autocomplete="off" autocorrect="off"
                    autocapitalize="off" spellcheck="false">
                <button class="word-item-del"
                    onclick="Screens._wordDel(${i})">✕</button>
            </div>`).join('');

        const sentItems = sentences.map((s,i) => `
            <div class="word-item">
                <span class="word-item-num">${i+1}.</span>
                <input class="word-item-input" value="${_esc(s)}"
                    onchange="Screens._sentChange(${i},this.value)"
                    autocomplete="off" autocorrect="off"
                    autocapitalize="off" spellcheck="false">
                <button class="word-item-del"
                    onclick="Screens._sentDel(${i})">✕</button>
            </div>`).join('');

        app.innerHTML = `
        <div class="screen">
            ${_header(isOcrEdit
                ? 'Screens._backToMultiPicker()'
                : isNew ? 'Screens.showAddList()' : 'Screens.showHome(\'manage\')')}
            <div class="card mt-12">
                <label class="form-label">List name *</label>
                <input id="list-name" class="form-input"
                    placeholder="e.g. Week 3 – Stop Thief"
                    value="${_esc(_activeListName||'')}"
                    autocomplete="off" autocorrect="off">
                <div id="name-err" class="form-error hidden mt-8">
                    Please enter a list name.
                </div>
                <label class="form-label mt-16">School test date (optional)</label>
                <input id="test-date" type="date" class="form-input"
                    value="${window._editTestDate||''}">
            </div>
            <div class="card">
                <div class="review-header">
                    <span class="form-label" style="margin:0">
                        Words (${words.length})
                    </span>
                    <button class="btn btn-secondary btn-small"
                        onclick="Screens._wordAdd()">+ Add</button>
                </div>
                <div id="word-list">${items}</div>
            </div>
            ${sentences.length > 0 || !isNew ? `
            <div class="card">
                <div class="review-header">
                    <span class="form-label" style="margin:0">
                        📝 Sentences (${sentences.length})
                    </span>
                    <button class="btn btn-secondary btn-small"
                        onclick="Screens._sentAdd()">+ Add</button>
                </div>
                <div id="sent-list">${sentItems || '<p style="color:var(--text-light);font-size:13px;">No dictation sentences</p>'}</div>
            </div>` : ''}
            <button class="btn btn-primary btn-full mt-12"
                onclick="Screens.confirmAndSave()">
                ${isOcrEdit
                    ? '✓ Done'
                    : isNew
                        ? '💾 Save &amp; Start Spelling'
                        : '✓ Save Changes &amp; Start Spelling'}
            </button>
        </div>`;
    }

    function _wordChange(i,v) { window._reviewWords[i] = v.trim().toLowerCase(); }
    function _wordDel(i)    { window._reviewWords.splice(i,1); _showReviewScreen(); }
    function _wordAdd()     {
        window._reviewWords.push('');
        _showReviewScreen();
        setTimeout(() => {
            const inputs = document.querySelectorAll('#word-list .word-item-input');
            inputs[inputs.length-1]?.focus();
        }, 50);
    }

    function _sentChange(i,v) {
        if (!window._reviewSentences) window._reviewSentences = [];
        window._reviewSentences[i] = v.trim();
    }
    function _sentDel(i) {
        (window._reviewSentences || []).splice(i,1);
        _showReviewScreen();
    }
    function _sentAdd() {
        if (!window._reviewSentences) window._reviewSentences = [];
        window._reviewSentences.push('');
        _showReviewScreen();
        setTimeout(() => {
            const inputs = document.querySelectorAll('#sent-list .word-item-input');
            inputs[inputs.length-1]?.focus();
        }, 50);
    }

    async function confirmAndSave() {
        const name     = document.getElementById('list-name')?.value.trim();
        const testDate = document.getElementById('test-date')?.value || null;
        const nameErr  = document.getElementById('name-err');
        if (!name) { nameErr?.classList.remove('hidden'); document.getElementById('list-name')?.focus(); return; }
        nameErr?.classList.add('hidden');

        const words = window._reviewWords.filter(w => w.trim().length > 0);
        if (words.length === 0) { alert('Please add at least one word.'); return; }

        // Profanity check on all submitted words
        for (const w of words) {
            if (ProfanityGuard.check(w)) {
                ProfanityGuard.showLockoutScreen();
                return;
            }
        }

        _activeListName = name;
        window._reviewWords = words;

        // In ocr-edit mode: only save to memory, DB write happens in "Save All & Done"
        if (window._reviewMode === 'ocr-edit') {
            _saveOcrEditAndReturn();
            return;
        }

        if (Auth.isSignedIn()) {
            // Check for duplicate name (skip check if we're editing an existing list)
            if (!_activeListId) {
                const existing = await DB.getLists({ status: 'all' });
                const dup = existing.find(l => l.name.toLowerCase() === name.toLowerCase());
                if (dup) {
                    const action = await _showDuplicateModal(name);
                    if (action === 'update') {
                        _activeListId = dup.id;
                    } else if (action === 'skip') {
                        _activeListId   = dup.id;
                        _activeListName = dup.name;
                        showStartScreen(words, window._reviewSentences || []);
                        return;
                    } else {
                        return; // cancelled
                    }
                }
            }

            const sents = window._reviewSentences || [];
            const result = await DB.saveList(name, words, _activeListId||null, { sentences: sents, testDate });
            if (result.success && !_activeListId) {
                _activeListId = result.id;
            }
        }

        showStartScreen(words, window._reviewSentences || []);
    }

    // Shows a modal asking what to do with a duplicate list name.
    // Returns a promise that resolves to 'update', 'skip', or 'cancel'.
    function _showDuplicateModal(name) {
        return new Promise(resolve => {
            const m = document.createElement('div');
            m.className = 'modal-overlay';
            m.innerHTML = `
                <div class="modal exit-modal">
                    <div class="exit-modal-title">List already exists</div>
                    <div class="exit-modal-sub">
                        You already have a list called<br>
                        <strong>"${_esc(name)}"</strong>
                    </div>
                    <button class="btn btn-primary mt-16" id="dup-update">
                        ✓ Update existing list
                    </button>
                    <button class="btn btn-secondary mt-8" id="dup-skip">
                        ▶ Just practice (don't save)
                    </button>
                    <button class="btn-text mt-12" id="dup-cancel">Cancel</button>
                </div>`;
            document.body.appendChild(m);
            document.getElementById('dup-update').onclick = () => { m.remove(); resolve('update'); };
            document.getElementById('dup-skip').onclick   = () => { m.remove(); resolve('skip'); };
            document.getElementById('dup-cancel').onclick = () => { m.remove(); resolve('cancel'); };
        });
    }

    // ── Start screen ──────────────────────────────────────────────────────────

    function showStartScreen(words, sentences) {
        const sents = sentences || window._reviewSentences || [];
        // Stash for use by startTest
        window._startWords = words;
        window._startSentences = sents;
        const totalItems = words.length + sents.length;
        const metaText = sents.length > 0
            ? `${words.length} words + ${sents.length} sentences`
            : `${words.length} words`;

        app.innerHTML = `
        <div class="screen start-screen">
            ${_header('Screens.showHome()')}
            <div class="start-body">
                <div class="start-hero">${Heroes.getSelected().emoji}</div>
                <h2 class="start-name">${_esc(_activeListName||'Spelling Test')}</h2>
                <p class="start-meta">${metaText} · listen carefully!</p>
                <div class="mode-toggle">
                    <button id="mode-kb"
                        class="${window._testMode!=='paper'?'active':''}"
                        onclick="window._testMode='keyboard';
                            document.getElementById('mode-kb').classList.add('active');
                            document.getElementById('mode-pa').classList.remove('active');">
                        ⌨️ Keyboard
                    </button>
                    <button id="mode-pa"
                        class="${window._testMode==='paper'?'active':''}"
                        onclick="window._testMode='paper';
                            document.getElementById('mode-pa').classList.add('active');
                            document.getElementById('mode-kb').classList.remove('active');">
                        ✍️ Paper
                    </button>
                </div>
                <button class="btn btn-primary start-btn"
                    onclick="Screens.startTest()">
                    ▶ Start Spelling
                </button>
            </div>
        </div>`;
    }

    // ── Test ──────────────────────────────────────────────────────────────────

    function startTest() {
        const words     = window._startWords || window._reviewWords || [];
        const sentences = window._startSentences || window._reviewSentences || [];
        testState = {
            words,
            sentences,
            currentIndex: 0,
            phase: 'words',  // 'words' | 'sentences'
            results: [],     // { item, userAnswer, correct, type:'word'|'sentence' }
            mistakes: [],
            skipped: []
        };
        if (window._testMode === 'paper') {
            _showPaperDictation();
        } else {
            _showTestWord();
        }
    }

    // ── Paper mode: dictation then single photo ───────────────────────────────

    function _showPaperDictation() {
        const { phase, currentIndex } = testState;
        const items = phase === 'words' ? testState.words : testState.sentences;
        const item  = items[currentIndex];
        const totalAll = testState.words.length + testState.sentences.length;
        const globalIdx = phase === 'words'
            ? currentIndex
            : testState.words.length + currentIndex;
        const isPhrase = item.split(/\s+/).length >= 3;
        const isSentence = phase === 'sentences';

        app.innerHTML = `
        <div class="screen test-screen">
            <div class="test-topbar">
                <button class="test-exit-btn" onclick="Screens.exitTest()">✕</button>
                <div class="test-list-name">${_esc(_activeListName||'Spelling')}</div>
                <div class="test-counter">${globalIdx+1}/${totalAll}</div>
            </div>
            <div class="test-prog-bar">
                <div class="test-prog-fill"
                    style="width:${Math.round((globalIdx/totalAll)*100)}%"></div>
            </div>
            <div class="paper-dictation">
                <div class="paper-icon">✍️</div>
                ${isSentence
                    ? `<div class="sentence-badge">📝 Dictation Sentence</div>`
                    : ''}
                <div class="paper-instruction">
                    Write ${isSentence ? 'sentence' : 'word'} ${globalIdx+1} on your paper
                </div>
                <div class="paper-word-num">#${globalIdx+1}</div>
                <div class="listen-area">
                    <button class="listen-btn" onclick="Screens.listenWord()">🔊 Listen</button>
                    ${isPhrase || isSentence ? `<button class="listen-btn listen-sm" onclick="Screens.stopSpeech()">⏹ Stop</button>` : ''}
                </div>
                <button class="btn btn-primary paper-next-btn"
                    onclick="Screens.paperNextWord()">
                    ${globalIdx < totalAll - 1 ? 'Next →' : '📸 Done — Take Photo'}
                </button>
            </div>
        </div>`;

        setTimeout(() => Voice.pronounceWord(item), 400);
    }

    function paperNextWord() {
        testState.currentIndex++;
        const items = testState.phase === 'words' ? testState.words : testState.sentences;

        if (testState.currentIndex >= items.length) {
            if (testState.phase === 'words' && testState.sentences.length > 0) {
                testState.phase = 'sentences';
                testState.currentIndex = 0;
                _showPaperDictation();
            } else {
                _showPaperCapture();
            }
        } else {
            _showPaperDictation();
        }
    }

    function _showPaperCapture() {
        const total = testState.words.length + testState.sentences.length;
        app.innerHTML = `
        <div class="screen test-screen">
            <div class="test-topbar">
                <button class="test-exit-btn" onclick="Screens.exitTest()">✕</button>
                <div class="test-list-name">${_esc(_activeListName||'Spelling')}</div>
                <div class="test-counter">${total} items</div>
            </div>
            <div class="paper-capture-body">
                <div class="paper-capture-icon">📸</div>
                <h2>Take a photo of your answers</h2>
                <p>Make sure all ${total} answers are visible
                    ${testState.sentences.length > 0 ? '(words and sentences)' : ''}</p>
                <button class="btn btn-primary capture-btn camera-only-btn"
                    onclick="Screens.submitPaperPhoto('camera')">
                    📷 Take Photo
                </button>
                <button class="btn btn-primary capture-btn"
                    onclick="Screens.submitPaperPhoto('gallery')"
                    style="margin-top:10px;">
                    🖼️ Choose Picture
                </button>
                <p class="paper-hint">✏️ If you made a mistake, colour over it completely so it won't be read as a word.</p>
                <div id="paper-check-status" style="display:none;">
                    <p class="ocr-reading-text">Reading your handwriting…</p>
                    <div class="xp-bar">
                        <div class="xp-bar-fill" id="paper-progress" style="width:0%"></div>
                    </div>
                </div>
            </div>
        </div>`;
    }

    async function submitPaperPhoto(source) {
        try {
            const imageData = await OCR.captureImage(source);
            document.getElementById('paper-check-status').style.display = 'block';

            const el = document.getElementById('paper-progress');
            if (el) el.style.width = '30%';

            const { data: { session } } = await SupabaseClient.get().auth.getSession();
            const [meta, base64] = imageData.split(',');
            const mimeType = meta.match(/:(.*?);/)[1];

            if (el) el.style.width = '50%';

            const allItems = [...testState.words, ...testState.sentences];
            const totalCount = allItems.length;

            const response = await fetch(
                SupabaseClient.get().supabaseUrl + '/functions/v1/check-handwriting',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': SupabaseClient.get().supabaseKey,
                        'Authorization': `Bearer ${session?.access_token || ''}`
                    },
                    body: JSON.stringify({
                        imageBase64: base64,
                        mimeType,
                        wordCount: totalCount
                    })
                }
            );

            if (el) el.style.width = '85%';

            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err?.error || 'Failed to read handwriting');
            }

            const result = await response.json();
            const userAnswers = result.words || [];

            if (el) el.style.width = '100%';

            // Check for profanity in any of the submitted answers
            for (const answer of userAnswers) {
                if (ProfanityGuard.check(answer)) {
                    ProfanityGuard.showLockoutScreen();
                    return;
                }
            }

            // Compare each answer to the expected item
            testState.results = [];
            testState.mistakes = [];

            for (let i = 0; i < totalCount; i++) {
                const expected = allItems[i];
                const answer   = userAnswers[i] || '';
                const correct  = Checker.check(answer, expected);
                const type     = i < testState.words.length ? 'word' : 'sentence';
                testState.results.push({ item: expected, userAnswer: answer, correct, type });
                if (!correct) testState.mistakes.push(expected);
                if (correct) {
                    Progression.addXP(10);
                    Progression.addCoins(1);
                }
            }

            _showPaperReview(imageData, userAnswers, allItems);

        } catch (err) {
            console.error('Paper check error:', err);
            alert('Could not read your handwriting. Please try again with a clearer photo.');
            _showPaperCapture();
        }
    }

    function _showPaperReview(imageData, userAnswers, allItems) {
        const rows = allItems.map((item, i) => {
            const answer  = userAnswers[i] || '';
            const correct = Checker.check(answer, item);
            const type    = i < testState.words.length ? 'word' : 'sentence';
            return `
            <div class="paper-review-row ${correct ? 'paper-correct' : 'paper-wrong'}">
                <span class="paper-review-num">${i+1}.</span>
                <span class="paper-review-icon">${correct ? '✓' : '✕'}</span>
                <div class="paper-review-content">
                    <span class="paper-review-answer">${_esc(answer || '—')}</span>
                    ${!correct ? `<span class="paper-review-expected">→ ${_esc(item)}</span>` : ''}
                    ${type === 'sentence' ? '<span class="paper-review-type">sentence</span>' : ''}
                </div>
            </div>`;
        }).join('');

        const correct = testState.results.filter(r => r.correct).length;
        const total   = allItems.length;

        app.innerHTML = `
        <div class="screen">
            <div class="test-topbar">
                <div class="test-list-name">${_esc(_activeListName||'Spelling')}</div>
                <div class="test-counter">${correct}/${total} correct</div>
            </div>
            <div class="paper-review-body">
                <img src="${imageData}" class="camera-preview" alt="Your answers">
                <div class="card">
                    <h3 class="card-title">Results</h3>
                    <div class="paper-review-list">${rows}</div>
                </div>
                <button class="btn btn-primary"
                    onclick="Screens.showResults()">See Full Results 🏆</button>
            </div>
        </div>`;
    }

    function resumeTest() {
        const p = TestPause.load();
        if (!p) { showHome(); return; }
        _activeListId   = p.listId;
        _activeListName = p.listName;
        testState = {
            words:        p.words,
            currentIndex: p.currentIndex,
            results:      p.results,
            mistakes:     p.mistakes
        };
        TestPause.clear();
        _showTestWord();
    }

    function _showTestWord() {
        const { phase, currentIndex } = testState;
        const items = phase === 'words' ? testState.words : testState.sentences;
        const item  = items[currentIndex];
        const isPhrase = item.split(/\s+/).length >= 3;
        const isSentence = phase === 'sentences';
        const totalAll = testState.words.length + testState.sentences.length;
        const globalIdx = phase === 'words'
            ? currentIndex
            : testState.words.length + currentIndex;
        Keyboard.reset();

        app.innerHTML = `
        <div class="screen test-screen">
            <div class="test-topbar">
                <button class="test-exit-btn" onclick="Screens.exitTest()">✕</button>
                <div class="test-list-name">${_esc(_activeListName||'Spelling')}</div>
                <div class="test-counter">${globalIdx+1}/${totalAll}</div>
            </div>
            <div class="test-prog-bar">
                <div class="test-prog-fill"
                    style="width:${Math.round((globalIdx/totalAll)*100)}%">
                </div>
            </div>
            ${isSentence ? `<div class="sentence-badge">📝 Dictation Sentence</div>` : ''}
            <div class="listen-area">
                <button class="listen-btn" onclick="Screens.listenWord()">🔊 Listen</button>
                ${isPhrase || isSentence ? `<button class="listen-btn listen-sm" onclick="Screens.stopSpeech()">⏹ Stop</button>` : ''}
            </div>
            <div class="answer-display" id="answer-display">
                ${isSentence ? 'Type the full sentence below' : 'Type your answer below'}
            </div>
            <button class="btn-text skip-btn" onclick="Screens.skipWord()">Skip ⏭</button>
            <div id="keyboard-container"></div>
        </div>`;

        Keyboard.setCallbacks(
            val => {
                const d = document.getElementById('answer-display');
                if (d) {
                    d.textContent = val || (isSentence ? 'Type the full sentence below' : 'Type your answer below');
                    d.className = val ? 'answer-display answer-filled' : 'answer-display';
                }
            },
            val => _checkAnswer(val)
        );
        document.getElementById('keyboard-container')
            .appendChild(Keyboard.render());

        setTimeout(() => Voice.pronounceWord(item), 400);
    }

    function _getCurrentItem() {
        const { phase, currentIndex } = testState;
        const items = phase === 'words' ? testState.words : testState.sentences;
        return items[currentIndex];
    }

    function exitTest() {
        // Pause modal
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal exit-modal">
                <div class="exit-modal-title">Exit Test?</div>
                <div class="exit-modal-sub">
                    Word ${testState.currentIndex+1} of ${testState.words.length}
                </div>
                <button class="btn btn-primary mt-16"
                    onclick="Screens.pauseTest()">
                    ⏸ Pause &amp; Resume Later
                </button>
                <button class="btn btn-secondary mt-8"
                    onclick="Screens.abandonTest()">
                    ✕ Abandon Test
                </button>
                <button class="btn-text mt-12"
                    onclick="document.querySelector('.modal-overlay').remove()">
                    Keep Going
                </button>
            </div>`;
        document.body.appendChild(modal);
    }

    function pauseTest() {
        document.querySelector('.modal-overlay')?.remove();
        TestPause.save({
            words:        testState.words,
            currentIndex: testState.currentIndex,
            results:      testState.results,
            mistakes:     testState.mistakes,
            listId:       _activeListId,
            listName:     _activeListName
        });
        showHome();
    }

    function abandonTest() {
        document.querySelector('.modal-overlay')?.remove();
        TestPause.clear();
        showHome();
    }

    function listenWord() { Voice.pronounceWord(_getCurrentItem()); }
    function stopSpeech() { window.speechSynthesis.cancel(); }

    async function paperCapture(source) {
        const word = testState.words[testState.currentIndex];
        try {
            const img  = await Handwriting.captureAnswer(source);
            const text = await Handwriting.recognizeHandwriting(img, word);
            _showPaperConfirm(text, img);
        } catch (err) {
            console.error('Paper capture:', err);
            alert('Could not capture. Please try again.');
        }
    }

    function _showPaperConfirm(recognized, img) {
        app.innerHTML = `
        <div class="screen">
            <div class="test-topbar">
                <button class="test-exit-btn" onclick="Screens.exitTest()">✕</button>
                <div class="test-list-name">${_esc(_activeListName||'Spelling')}</div>
                <div class="test-counter">
                    ${testState.currentIndex+1}/${testState.words.length}
                </div>
            </div>
            <img src="${img}" class="camera-preview" alt="Your handwriting">
            <div class="ocr-confirm">
                <p class="ocr-confirm-label">I read:</p>
                <div class="ocr-result">${_esc(recognized||'(nothing detected)')}</div>
                <p class="ocr-confirm-sub">Is this what you wrote?</p>
                <div class="flex-row">
                    <button class="btn btn-success"
                        onclick="Screens.confirmPaper()">✓ Yes</button>
                    <button class="btn btn-secondary"
                        onclick="Screens.editPaper()">✏️ Edit</button>
                </div>
            </div>
        </div>`;
        window._paperRecognized = recognized;
    }

    function confirmPaper() { _checkAnswer(window._paperRecognized||''); }

    function editPaper() {
        const m = document.createElement('div');
        m.className = 'modal-overlay';
        m.innerHTML = `
            <div class="modal">
                <h3>Correct your answer</h3>
                <input type="text" id="paper-edit" class="form-input mt-12"
                    value="${_esc(window._paperRecognized||'')}"
                    autocomplete="off" autocorrect="off"
                    autocapitalize="off" spellcheck="false">
                <button class="btn btn-primary mt-12"
                    onclick="Screens.submitPaperEdit()">✓ Confirm</button>
            </div>`;
        document.body.appendChild(m);
        setTimeout(() => document.getElementById('paper-edit')?.focus(), 100);
    }

    function submitPaperEdit() {
        const val = document.getElementById('paper-edit')?.value.trim()||'';
        document.querySelector('.modal-overlay')?.remove();
        _checkAnswer(val);
    }

    function _checkAnswer(userAnswer) {
        // Profanity check
        if (ProfanityGuard.check(userAnswer)) {
            ProfanityGuard.showLockoutScreen();
            return;
        }
        const item    = _getCurrentItem();
        const correct = Checker.check(userAnswer, item);
        const type    = testState.phase === 'words' ? 'word' : 'sentence';
        testState.results.push({ item, userAnswer: userAnswer.trim().toLowerCase(), correct, type });
        if (!correct) testState.mistakes.push(item);
        let lvl = null;
        if (correct) { lvl = Progression.addXP(10); Progression.addCoins(1); }
        _showFeedback(correct, item, userAnswer, lvl);
    }

    function skipWord() {
        const item = _getCurrentItem();
        testState.skipped.push(item);
        testState.currentIndex++;
        const items = testState.phase === 'words' ? testState.words : testState.sentences;

        if (testState.currentIndex >= items.length) {
            if (testState.phase === 'words' && testState.sentences.length > 0) {
                testState.phase = 'sentences';
                testState.currentIndex = 0;
                _showTestWord();
            } else {
                showResults();
            }
        } else {
            _showTestWord();
        }
    }

    function _showFeedback(correct, item, userAnswer, lvl) {
        const totalAll = testState.words.length + testState.sentences.length;
        const globalIdx = testState.phase === 'words'
            ? testState.currentIndex
            : testState.words.length + testState.currentIndex;
        const isLast = (testState.phase === 'sentences'
            ? testState.currentIndex >= testState.sentences.length - 1
            : testState.currentIndex >= testState.words.length - 1 && testState.sentences.length === 0);

        app.innerHTML = `
        <div class="screen feedback-screen">
            <div class="test-topbar">
                <button class="test-exit-btn" onclick="Screens.exitTest()">✕</button>
                <div class="test-list-name">${_esc(_activeListName||'Spelling')}</div>
                <div class="test-counter">
                    ${globalIdx+1}/${totalAll}
                </div>
            </div>
            <div class="feedback-body">
                <div class="fb-icon">${correct?'🎉':'❌'}</div>
                <div class="fb-title ${correct?'fb-correct':'fb-wrong'}">
                    ${correct?'Correct!':'Not quite'}
                </div>
                ${correct
                    ? `<div class="fb-xp">+10 ⭐ &nbsp; +1 🪙</div>`
                    : `<div class="fb-detail">
                           <div class="fb-row">
                               <span class="fb-lbl">You wrote:</span>
                               <span class="fb-word-wrong">${_esc(userAnswer||'(empty)')}</span>
                           </div>
                           <div class="fb-row mt-8">
                               <span class="fb-lbl">Correct:</span>
                               <span class="fb-word-right">${_esc(item)}</span>
                           </div>
                       </div>`}
            </div>
            <button class="btn btn-primary feedback-next"
                onclick="Screens.nextWord()">
                ${isLast ? 'See Results 🏆' : 'Next →'}
            </button>
        </div>`;
        if (lvl?.leveledUp) setTimeout(() => Animations.showLevelUp(lvl.newLevel, lvl.bonusCoins), 500);
    }

    function nextWord() {
        testState.currentIndex++;
        const items = testState.phase === 'words' ? testState.words : testState.sentences;

        if (testState.currentIndex >= items.length) {
            // Current phase done — transition or finish
            if (testState.phase === 'words' && testState.sentences.length > 0) {
                // Move to sentences phase
                testState.phase = 'sentences';
                testState.currentIndex = 0;
                _showTestWord();
            } else {
                // All done
                showResults();
            }
        } else {
            _showTestWord();
        }
    }

    // ── Results ───────────────────────────────────────────────────────────────

    async function showResults() {
        TestPause.clear();
        const { results, mistakes, words, sentences } = testState;
        const correct = results.filter(r=>r.correct).length;
        const total   = results.length;
        const pct     = _pct(correct, total);
        const medal   = pct===100?'🥇':pct>=80?'🥈':pct>=60?'🥉':'📝';

        Store.update(d => {
            d.totalWordsCorrect   += correct;
            d.totalWordsAttempted += total;
            if (mistakes.length>0) {
                const newM = mistakes.filter(m=>!d.mistakeHistory.includes(m));
                d.mistakeHistory = [...d.mistakeHistory,...newM].slice(-50);
            }
        });

        if (Auth.isSignedIn()) {
            DB.saveResult({
                listId:         _activeListId,
                listName:       _activeListName||'Spelling Test',
                wordsAttempted: total,
                wordsCorrect:   correct,
                mistakes
            }).catch(e=>console.warn('saveResult:',e));
        }

        app.innerHTML = `
        <div class="screen results-screen">
            <div class="results-hero-card">
                <div class="results-medal">${medal}</div>
                <div class="results-list-name">${_esc(_activeListName||'Spelling Test')}</div>
                <div class="results-score" style="color:${_scoreColor(pct)}">${pct}%</div>
                <div class="results-fraction">${correct} / ${total} words</div>
                <div class="results-rewards">+${correct*10} ⭐ &nbsp; +${correct} 🪙</div>
            </div>

            ${mistakes.length>0 ? `
            <div class="card">
                <h3 class="card-title">Practice these 🔁</h3>
                <div class="mistakes-list">
                    ${mistakes.map(m=>`<div class="mistake-item">❌ ${_esc(m)}</div>`).join('')}
                </div>
                <button class="btn btn-primary btn-full mt-12"
                    onclick="Screens.practiceMistakes()">
                    🔁 Practice Mistakes Only
                </button>
            </div>` : `
            <div class="card text-center">
                <p style="font-size:22px;">🌟 Perfect score!</p>
            </div>`}

            ${testState.skipped.length > 0 ? `
            <div class="card skipped-card">
                <h3 class="card-title">⏭ Unfinished — ${_pct(testState.skipped.length, testState.words.length + testState.sentences.length)}% skipped</h3>
                <div class="mistakes-list">
                    ${testState.skipped.map(s=>`<div class="skipped-item">⏭ ${_esc(s)}</div>`).join('')}
                </div>
                <button class="btn btn-primary btn-full mt-12"
                    onclick="Screens.practiceSkipped()">
                    ▶ Go to Unfinished
                </button>
            </div>` : ''}

            <div class="results-actions">
                <button class="btn btn-primary" onclick="Screens.practiceAgain()">
                    ▶ Practice Again
                </button>
                <button class="btn btn-secondary" onclick="Screens.showHome()">
                    🏠 Home
                </button>
            </div>
        </div>`;
    }

    function practiceMistakes() {
        if (!testState.mistakes.length) return;
        // Split mistakes back into words and sentences
        const mistakeWords = testState.mistakes.filter(m => testState.words.includes(m));
        const mistakeSents = testState.mistakes.filter(m => testState.sentences.includes(m));
        window._startWords     = mistakeWords;
        window._startSentences = mistakeSents;
        window._reviewWords    = mistakeWords;
        window._reviewSentences = mistakeSents;
        showStartScreen(mistakeWords, mistakeSents);
    }

    function practiceSkipped() {
        if (!testState.skipped.length) return;
        const skippedWords = testState.skipped.filter(s => testState.words.includes(s));
        const skippedSents = testState.skipped.filter(s => testState.sentences.includes(s));
        window._startWords     = skippedWords;
        window._startSentences = skippedSents;
        window._reviewWords    = skippedWords;
        window._reviewSentences = skippedSents;
        showStartScreen(skippedWords, skippedSents);
    }

    function practiceAgain() {
        window._startWords     = [...testState.words];
        window._startSentences = [...testState.sentences];
        window._reviewWords    = [...testState.words];
        window._reviewSentences = [...testState.sentences];
        showStartScreen(testState.words, testState.sentences);
    }

    // ── Results history ───────────────────────────────────────────────────────

    async function showResultsHistory() {
        app.innerHTML = `
        <div class="screen">
            ${_header('Screens.showHome()')}
            <div class="card mt-12 text-center">
                <p style="color:var(--text-light)">Loading…</p>
            </div>
        </div>`;

        const results = await DB.getResults({ limit:50 });

        if (results.length===0) {
            app.innerHTML = `
            <div class="screen">
                ${_header('Screens.showHome()')}
                <div class="empty-state mt-24">
                    <div class="empty-icon">📊</div>
                    <h3>No results yet</h3>
                    <p>Complete a spelling test to see your history here.</p>
                </div>
            </div>`;
            return;
        }

        app.innerHTML = `
        <div class="screen">
            ${_header('Screens.showHome()')}
            <div class="card mt-12">
                <h2 class="card-title">📊 Results History</h2>
                <div class="results-history">
                    ${results.map(r => {
                        const p = _pct(r.words_correct, r.words_attempted);
                        const m = p===100?'🥇':p>=80?'🥈':p>=60?'🥉':'📝';
                        return `
                        <div class="result-row">
                            <div class="result-medal">${m}</div>
                            <div class="result-info">
                                <div class="result-name">
                                    ${_esc(r.list_name||'Spelling Test')}
                                </div>
                                <div class="result-meta">${_formatDate(r.completed_at)}</div>
                            </div>
                            <div class="result-score-col">
                                <span class="result-frac">
                                    ${r.words_correct}/${r.words_attempted}
                                </span>
                                <span class="result-pct"
                                    style="color:${_scoreColor(p)}">${p}%</span>
                            </div>
                        </div>`;
                    }).join('')}
                </div>
            </div>
        </div>`;
    }

    // ── Profile ───────────────────────────────────────────────────────────────

    async function showProfile() {
        app.innerHTML = `
        <div class="screen">
            ${_header('Screens.showHome()')}
            <div class="card text-center mt-12">
                <p style="color:var(--text-light)">Loading…</p>
            </div>
        </div>`;

        const [profile, stats] = await Promise.all([DB.getProfile(), DB.getStats()]);
        const user = Auth.getUser();

        app.innerHTML = `
        <div class="screen">
            ${_header('Screens.showHome()')}
            <div class="card text-center mt-12">
                <div style="font-size:48px;margin-bottom:8px;">
                    ${Heroes.getSelected().emoji}
                </div>
                <h2>${_esc(profile?.username||user?.email||'Speller')}</h2>
                <p style="color:var(--text-light);font-size:13px;">${user?.email||''}</p>
            </div>
            <div class="card">
                <h3 class="card-title">📊 Stats</h3>
                <div class="stats-grid">
                    <div class="stat-item">
                        <div class="stat-value">${stats.totalTests}</div>
                        <div class="stat-label">Tests</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">${stats.totalCorrect}</div>
                        <div class="stat-label">Correct</div>
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
            ${stats.commonMistakes.length>0?`
            <div class="card">
                <h3 class="card-title">🔁 Most missed</h3>
                <div class="mistakes-list">
                    ${stats.commonMistakes.map(m=>`
                    <div class="mistake-item">❌ ${_esc(m.word)}
                        <span style="color:var(--text-light);font-size:12px;">(${m.count}×)</span>
                    </div>`).join('')}
                </div>
            </div>`:''}
            <div class="card">
                <button class="btn btn-secondary btn-full"
                    onclick="Screens.showHeroShop()">🏪 Hero Shop</button>
                <button class="btn btn-secondary btn-full mt-8"
                    onclick="Screens.showResultsHistory()">📊 Results History</button>
            </div>
            <div style="padding:0 20px 24px;">
                <button class="btn btn-danger"
                    onclick="Screens.confirmSignOut()">Sign Out</button>
            </div>
        </div>`;
    }

    async function confirmSignOut() {
        if (!confirm('Sign out of SpellQuest?')) return;
        await Auth.signOut();
        Store.reset();
        showSignIn();
    }

    // ── Hero shop ─────────────────────────────────────────────────────────────

    function showHeroShop() {
        const heroes   = Heroes.getAll();
        const progress = Progression.getProgress();
        const discount = Math.min(progress.level * 2, 50);
        app.innerHTML = `
        <div class="screen">
            ${_header('Screens.showHome()')}
            <div class="card mt-12">
                <h2 class="card-title">🏪 Hero Shop</h2>
                <p style="font-size:13px;color:var(--text-light);">
                    You have ${progress.coins} 🪙
                    ${discount > 0 ? ` &nbsp;·&nbsp; <span style="color:var(--success);font-weight:700;">${discount}% off</span> (Level ${progress.level} discount)` : ''}
                </p>
            </div>
            <div class="hero-grid">
                ${heroes.map(h => {
                    let status='', action='';
                    if (h.selected) status='<span class="hero-status hero-equipped">✓ Equipped</span>';
                    else if (h.unlocked) {
                        status='<span class="hero-status hero-owned">Owned</span>';
                        action=`<button class="btn btn-small btn-primary mt-8"
                            onclick="Screens.equipHero('${h.id}')">⭐ Equip</button>`;
                    } else if (progress.coins>=h.price) {
                        const priceTag = h.basePrice !== h.price
                            ? `<s style="opacity:0.5;">${h.basePrice}</s> ${h.price} 🪙`
                            : `${h.price} 🪙`;
                        action=`<button class="btn btn-small btn-primary mt-8"
                            onclick="Screens.buyHero('${h.id}')">Buy ${priceTag}</button>`;
                    } else {
                        const priceTag = h.basePrice !== h.price
                            ? `<s style="opacity:0.5;">${h.basePrice}</s> ${h.price} 🪙`
                            : `${h.price} 🪙`;
                        status=`<span class="hero-status">${priceTag}</span>`;
                    }
                    return `
                    <div class="hero-card ${h.selected?'hero-selected':''} ${!h.unlocked?'hero-locked':''}">
                        <div class="hero-emoji">${h.emoji}</div>
                        <div class="hero-name">${h.name}</div>
                        ${status}${action}
                    </div>`;
                }).join('')}
            </div>
        </div>`;
    }

    function buyHero(id) {
        const r = Heroes.buy(id);
        if (r.success) { Heroes.equip(id); showHeroShop(); }
        else alert(r.reason||'Cannot buy this hero.');
    }

    function equipHero(id) { Heroes.equip(id); showHeroShop(); }

    // ── Public API ────────────────────────────────────────────────────────────
    return {
        init,
        showSignIn, submitSignIn,
        showSignUp, submitSignUp,
        showForgotPassword, submitForgotPassword,
        showHome, resumeTest,
        startListDirect, editList,
        archiveList, unarchiveList, deleteList,
        showAddList,
        showPhotoCapture, captureAndProcess,
        editOcrList, saveAllAndGoHome, _backToMultiPicker,
        showTypeWords, processTypeWords,
        _showReviewScreen, _wordChange, _wordDel, _wordAdd,
        _sentChange, _sentDel, _sentAdd,
        confirmAndSave,
        showStartScreen, startTest,
        exitTest, pauseTest, abandonTest,
        listenWord, stopSpeech, skipWord,
        paperNextWord, submitPaperPhoto,
        paperCapture, confirmPaper, editPaper, submitPaperEdit,
        nextWord,
        showResults, practiceMistakes, practiceSkipped, practiceAgain,
        showResultsHistory,
        showProfile, confirmSignOut,
        showHeroShop, buyHero, equipHero
    };
})();
