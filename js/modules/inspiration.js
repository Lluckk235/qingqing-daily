/* 灵感集：公开视频参考的后台拆解与参考拍摄稿。 */
const Inspiration = {
  items: [],
  selectedId: '',
  tab: 'overview',
  files: [],
  pollTimer: null,

  async init() {
    this.bindEvents();
    if (!Supabase.isAuthenticated) return;
    await this.load();
    this.render();
    this.pollTimer = window.setInterval(() => this.refreshPending(), 8000);
  },

  async load() {
    try {
      this.items = await Supabase.get('inspiration_items?select=*&order=updated_at.desc&limit=80') || [];
    } catch (error) { console.warn('Inspiration load failed:', error.message); }
  },

  async refreshPending() {
    if (!Supabase.isAuthenticated || !this.items.some(item => item.status === 'processing')) return;
    await this.load(); this.render();
    if (!this.items.some(item => item.status === 'processing')) this.setSaveStatus('');
  },

  bindEvents() {
    document.getElementById('btnOpenInspirationComposer')?.addEventListener('click', () => this.openComposer());
    document.getElementById('btnSaveInspiration')?.addEventListener('click', () => this.submit());
    document.getElementById('inspirationImages')?.addEventListener('change', event => this.setFiles(event.target.files));
    document.getElementById('inspirationList')?.addEventListener('click', event => {
      const card = event.target.closest('[data-inspiration-id]');
      if (!card) return;
      this.selectedId = card.dataset.inspirationId;
      this.tab = 'overview'; this.render();
    });
    document.getElementById('inspirationDetail')?.addEventListener('click', event => {
      const action = event.target.closest('[data-inspiration-action]')?.dataset.inspirationAction;
      if (action === 'back') { this.selectedId = ''; this.tab = 'overview'; this.render(); }
      if (action === 'overview' || action === 'analysis' || action === 'script') { this.tab = action; this.renderDetail(); }
      if (action === 'retry') this.retry();
      if (action === 'copy') this.copyScript();
    });
    document.getElementById('inspirationComposerModal')?.addEventListener('click', event => {
      if (event.target === event.currentTarget || event.target.closest('[data-inspiration-action="close-composer"]')) this.closeComposer();
    });
  },

  openComposer() {
    const modal = document.getElementById('inspirationComposerModal');
    if (modal) { modal.classList.add('is-open'); modal.setAttribute('aria-hidden', 'false'); }
  },

  closeComposer() {
    const modal = document.getElementById('inspirationComposerModal');
    if (modal) { modal.classList.remove('is-open'); modal.setAttribute('aria-hidden', 'true'); }
  },

  setFiles(fileList) {
    const candidates = [...(fileList || [])];
    if (candidates.some(file => !/^image\/(jpeg|png|webp)$/.test(file.type))) return this.setImageStatus('只支持 JPG、PNG 或 WebP 图片。', 'error');
    if (candidates.length > 8) return this.setImageStatus('一次最多添加 8 张关键帧。', 'error');
    if (candidates.some(file => file.size > 12 * 1024 * 1024)) return this.setImageStatus('单张图片请小于 12MB。', 'error');
    this.files = candidates;
    this.setImageStatus(this.files.length ? `已选择 ${this.files.length} 张关键帧` : '');
  },

  setImageStatus(message = '', state = '') {
    const el = document.getElementById('inspirationImageStatus');
    if (el) { el.textContent = message; el.dataset.state = state; }
  },

  setSaveStatus(message = '', state = '') {
    const el = document.getElementById('inspirationSaveStatus');
    if (el) { el.textContent = message; el.dataset.state = state; }
  },

  parseInput(raw) {
    const value = String(raw || '').trim();
    const match = value.match(/https:\/\/[^\s]+/i);
    const sourceUrl = match ? match[0].replace(/[，。；、）】》〉]+$/, '') : '';
    return { sourceUrl, transcript: value.replace(/https:\/\/[^\s]+/ig, '').trim() };
  },

  async compressImage(file) {
    if (!file.type.startsWith('image/') || file.size < 900 * 1024) return file;
    const objectUrl = URL.createObjectURL(file);
    try {
      const image = await new Promise((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = objectUrl; });
      const scale = Math.min(1, 1600 / Math.max(image.width, image.height));
      const canvas = document.createElement('canvas'); canvas.width = Math.round(image.width * scale); canvas.height = Math.round(image.height * scale);
      canvas.getContext('2d', { alpha: false }).drawImage(image, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.84));
      return blob || file;
    } finally { URL.revokeObjectURL(objectUrl); }
  },

  async uploadImages() {
    const folder = `${Supabase.userId}/${crypto.randomUUID()}`;
    const paths = [];
    for (let index = 0; index < this.files.length; index += 1) {
      this.setSaveStatus(`正在上传关键帧 ${index + 1}/${this.files.length}…`);
      const compressed = await this.compressImage(this.files[index]);
      const path = `${folder}/${index + 1}.jpg`;
      await Supabase.uploadPrivateFile('inspiration-assets', path, compressed);
      paths.push(path);
    }
    return paths;
  },

  async submit() {
    if (!Supabase.isAuthenticated) return WorkspaceAccess.openAccess(Boolean(WorkspaceAccess.inviteToken));
    const input = this.parseInput(document.getElementById('inspirationInput')?.value);
    if (input.transcript.length < 30) return this.setSaveStatus('请粘贴至少一句转录文案。', 'error');
    const button = document.getElementById('btnSaveInspiration'); button.disabled = true;
    try {
      const imagePaths = await this.uploadImages();
      this.setSaveStatus('已收录，后台拆解中…');
      const result = await Supabase.invokeFunction('inspiration-analyze', { action: 'create', source_url: input.sourceUrl, transcript: input.transcript, image_paths: imagePaths });
      this.items.unshift(result.item); this.selectedId = result.item.id; this.tab = 'overview';
      document.getElementById('inspirationInput').value = '';
      document.getElementById('inspirationImages').value = '';
      this.files = []; this.setImageStatus(''); this.setSaveStatus(''); this.closeComposer(); this.render();
    } catch (error) { this.setSaveStatus(error.message || '收录失败，请稍后重试。', 'error'); }
    finally { button.disabled = false; }
  },

  async retry() {
    const item = this.selected(); if (!item) return;
    try {
      const result = await Supabase.invokeFunction('inspiration-analyze', { action: 'retry', item_id: item.id });
      this.items = this.items.map(row => row.id === item.id ? result.item : row); this.render();
    } catch (error) { Helpers.showToast(error.message || '重试失败', 'error'); }
  },

  selected() { return this.items.find(item => item.id === this.selectedId) || null; },
  esc(value) { const el = document.createElement('div'); el.textContent = String(value || ''); return el.innerHTML; },
  date(value) { return new Date(value || Date.now()).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' }); },
  status(item) { return item.status === 'ready' ? '完成' : item.status === 'failed' ? '拆解失败' : '拆解中'; },

  render() { this.renderList(); this.renderDetail(); },

  renderList() {
    const el = document.getElementById('inspirationList'); if (!el) return;
    const count = document.getElementById('inspirationCount'); if (count) count.textContent = this.items.length ? `${this.items.length} 条` : '';
    if (!this.items.length) { el.innerHTML = '<div class="inspiration-empty"><strong>还没有视频参考</strong><span>刷到真正想学的视频，再收进来。</span></div>'; return; }
    el.innerHTML = this.items.map(item => `<button class="inspiration-item ${item.id === this.selectedId ? 'is-selected' : ''}" data-inspiration-id="${this.esc(item.id)}">
      <span class="inspiration-list-thumb" data-inspiration-thumb="${this.esc(item.id)}"><span>💡</span></span><span class="inspiration-item-copy"><strong>${this.esc(item.title || '待拆视频')}</strong><small><i class="inspiration-state is-${this.esc(item.status)}"></i>${this.status(item)} · ${this.date(item.updated_at)}</small></span><span class="inspiration-arrow">›</span>
    </button>`).join('');
    this.loadListThumbs();
  },

  renderDetail() {
    const el = document.getElementById('inspirationDetail'); if (!el) return;
    const item = this.selected();
    el.classList.toggle('is-open', Boolean(item));
    if (!item) { el.innerHTML = `<article class="inspiration-detail-empty"><span>💡</span><strong>选一条视频参考</strong><p>先看它为什么有效，再决定要学哪一部分。</p></article>`; return; }
    if (item.status === 'processing') { el.innerHTML = `<article class="inspiration-pending"><button class="btn-text inspiration-mobile-back" data-inspiration-action="back">← 返回灵感集</button><strong>正在后台拆解</strong><p>这条已经收进素材库；你可以先看别的内容。</p></article>`; return; }
    if (item.status === 'failed') { el.innerHTML = `<article class="inspiration-pending is-failed"><button class="btn-text inspiration-mobile-back" data-inspiration-action="back">← 返回灵感集</button><strong>这条暂时没拆成功</strong><p>${this.esc(item.error_message || '请稍后重试。')}</p><button class="btn-primary" data-inspiration-action="retry">重新拆解</button></article>`; return; }
    const analysis = item.analysis || {}; const script = item.shooting_script || {};
    const tabButtons = `<div class="inspiration-tabs"><button class="btn-text ${this.tab === 'overview' ? 'is-selected' : ''}" data-inspiration-action="overview">速览</button><button class="btn-text ${this.tab === 'analysis' ? 'is-selected' : ''}" data-inspiration-action="analysis">原片拆解</button><button class="btn-text ${this.tab === 'script' ? 'is-selected' : ''}" data-inspiration-action="script">参考拍摄稿</button></div>`;
    const body = this.tab === 'overview' ? this.overviewHtml(analysis, script, item) : this.tab === 'analysis' ? this.analysisHtml(analysis) : this.scriptHtml(script);
    el.innerHTML = `<article class="inspiration-result"><div class="inspiration-detail-nav"><button class="btn-text inspiration-mobile-back" data-inspiration-action="back">← 返回灵感集</button>${item.source_url ? `<a href="${this.esc(item.source_url)}" target="_blank" rel="noopener noreferrer">查看来源 ↗</a>` : ''}</div><div class="inspiration-result-head"><div class="inspiration-detail-cover" id="inspirationDetailCover"><span>💡</span></div><div><h2>${this.esc(item.title || '视频参考')}</h2><p>${this.esc(analysis.one_line || '这条正在等待拆解结果。')}</p></div></div>${tabButtons}${body}</article>`;
    this.loadImages(item);
  },

  overviewHtml(analysis, script, item) {
    const hook = analysis.hook || {}; const structure = Array.isArray(analysis.structure) ? analysis.structure : []; const mechanisms = Array.isArray(analysis.mechanisms) ? analysis.mechanisms.slice(0, 3) : [];
    const visual = analysis.visual?.summary || (Array.isArray(item.image_paths) && item.image_paths.length ? '已上传关键帧，点击原片拆解看画面细节。' : '没有关键帧时，先从文案与结构学习。');
    return `<div class="inspiration-overview"><section class="inspiration-overview-takeaway"><span>这条最值得学</span><strong>${this.esc(analysis.one_line || '等待拆解完成')}</strong></section><div class="inspiration-quick-grid"><article><small>开头</small><strong>${this.esc(hook.what || '—')}</strong></article><article><small>结构</small><strong>${this.esc(structure.map(row => row.segment).slice(0, 3).join(' → ') || '—')}</strong></article><article><small>画面</small><strong>${this.esc(visual)}</strong></article><article><small>可复用机制</small><strong>${this.esc(mechanisms.join(' · ') || '—')}</strong></article></div><section class="inspiration-timeline"><h3>结构推进</h3><ol>${structure.map(row => `<li><strong>${this.esc(row.segment)}</strong><span>${this.esc(row.purpose)}</span></li>`).join('') || '<li><span>暂未生成</span></li>'}</ol></section><section class="inspiration-overview-actions"><button class="btn-secondary" data-inspiration-action="analysis">看原片拆解</button><button class="btn-primary" data-inspiration-action="script">看参考拍摄稿</button></section></div>`;
  },

  analysisHtml(analysis) {
    const hook = analysis.hook || {}; const sharpness = analysis.sharpness || {}; const visual = analysis.visual;
    const list = (items, renderer) => Array.isArray(items) && items.length ? items.map(renderer).join('') : '<p class="inspiration-muted">暂未生成</p>';
    return `<div class="inspiration-sections">
      <section><h3>一句话判断</h3><p class="inspiration-lead">${this.esc(analysis.one_line)}</p></section>
      <section><h3>开头为什么抓人</h3><dl class="inspiration-dl"><div><dt>前 5 秒</dt><dd>${this.esc(hook.what)}</dd></div><div><dt>承诺或反差</dt><dd>${this.esc(hook.promise)}</dd></div><div><dt>继续看的原因</dt><dd>${this.esc(hook.why)}</dd></div></dl></section>
      <section><h3>内容结构</h3><ol class="inspiration-structure">${list(analysis.structure, row => `<li><strong>${this.esc(row.segment)}</strong><span>${this.esc(row.content)}</span><small>${this.esc(row.purpose)} · ${this.esc(row.effect)}</small></li>`)}</ol></section>
      <section><h3>文案为什么有力量</h3><div class="inspiration-moves">${list(analysis.writing, row => `<article><strong>${this.esc(row.move)}</strong><em>${this.esc(row.example)}</em><p>${this.esc(row.why)}</p></article>`)}</div></section>
      <section><h3>观点的锋利</h3><dl class="inspiration-dl"><div><dt>立场</dt><dd>${this.esc(sharpness.claim)}</dd></div><div><dt>冲突</dt><dd>${this.esc(sharpness.tension)}</dd></div><div><dt>怎么撑住</dt><dd>${this.esc(sharpness.support)}</dd></div></dl></section>
      ${visual ? this.visualHtml(visual) : '<section><h3>画面与节奏</h3><p class="inspiration-muted">没有关键帧时，先专注文案与结构拆解。</p></section>'}
      <section><h3>它真正厉害的机制</h3><ul class="inspiration-bullets">${list(analysis.mechanisms, item => `<li>${this.esc(item)}</li>`)}</ul></section>
      <section><h3>我学到的新观察</h3><ul class="inspiration-bullets">${list(analysis.observations, item => `<li>${this.esc(item)}</li>`)}</ul></section>
      <div class="inspiration-images" id="inspirationImagesView"></div>
    </div>`;
  },

  visualHtml(visual) {
    if (visual.unavailable) return `<section><h3>画面与节奏</h3><p class="inspiration-muted">${this.esc(visual.summary)}</p></section>`;
    const list = (items, renderer) => Array.isArray(items) && items.length ? items.map(renderer).join('') : '<p class="inspiration-muted">暂未生成</p>';
    return `<section><h3>画面、文字与节奏</h3><p class="inspiration-lead">${this.esc(visual.summary)}</p><div class="inspiration-visual-map">${list(visual.mapping, row => `<article><strong>${this.esc(row.content_node)}</strong><span>${this.esc(row.visible)}</span><small>${this.esc(row.function)}</small></article>`)}</div><h4>重点文字</h4><ul class="inspiration-bullets">${list(visual.text_design, item => `<li>${this.esc(item)}</li>`)}</ul><h4>节奏</h4><ul class="inspiration-bullets">${list(visual.rhythm, item => `<li>${this.esc(item)}</li>`)}</ul><p class="inspiration-sound">声音：${this.esc(visual.sound)}</p></section>`;
  },

  scriptHtml(script) {
    const beats = Array.isArray(script.beats) ? script.beats : [];
    return `<div class="inspiration-sections inspiration-script"><section><h3>核心句</h3><p class="inspiration-lead">${this.esc(script.core)}</p></section><section><h3>可直接拍的参考稿</h3><p class="inspiration-script-copy">${this.esc(script.script)}</p><button class="btn-secondary" data-inspiration-action="copy">复制参考稿</button></section><section><h3>逐段画面提示</h3><ol class="inspiration-structure">${beats.map(row => `<li><strong>${this.esc(row.segment)}</strong><span>${this.esc(row.spoken)}</span><small>画面：${this.esc(row.visual)}<br>文字：${this.esc(row.text)}<br>声音：${this.esc(row.sound)}</small></li>`).join('') || '<p class="inspiration-muted">暂未生成</p>'}</ol></section><section><h3>拍摄提醒</h3><ul class="inspiration-bullets">${(script.notes || []).map(note => `<li>${this.esc(note)}</li>`).join('')}</ul></section></div>`;
  },

  async loadListThumbs() {
    const visibleItems = this.items.slice(0, 60);
    await Promise.all(visibleItems.map(async item => {
      const path = Array.isArray(item.image_paths) ? item.image_paths[0] : '';
      if (!path) return;
      try {
        const url = await Supabase.privateFileUrl('inspiration-assets', path);
        const target = document.querySelector(`[data-inspiration-thumb="${item.id}"]`);
        if (url && target) target.innerHTML = `<img src="${this.esc(url)}" alt="">`;
      } catch (_) { /* 没有缩略图不影响素材浏览 */ }
    }));
  },

  async loadImages(item) {
    const paths = Array.isArray(item.image_paths) ? item.image_paths : [];
    if (!paths.length) return;
    try {
      const urls = await Promise.all(paths.map(path => Supabase.privateFileUrl('inspiration-assets', path)));
      if (this.selectedId !== item.id) return;
      const validUrls = urls.filter(Boolean);
      const cover = document.getElementById('inspirationDetailCover');
      if (cover && validUrls[0]) cover.innerHTML = `<img src="${this.esc(validUrls[0])}" alt="关键帧">`;
      const frames = document.getElementById('inspirationImagesView');
      if (frames) frames.innerHTML = validUrls.map((url, index) => `<img src="${this.esc(url)}" alt="关键帧 ${index + 1}">`).join('');
    } catch (_) { /* 截图加载失败不影响文字拆解 */ }
  },

  async copyScript() {
    const script = this.selected()?.shooting_script?.script || '';
    if (!script) return;
    try { await navigator.clipboard.writeText(script); Helpers.showToast('参考稿已复制', 'success'); }
    catch (_) { Helpers.showToast('复制失败，请长按文本复制', 'error'); }
  },
};

window.Inspiration = Inspiration;
