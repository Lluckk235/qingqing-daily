/* 表达训练：用户输入的真实选题 + 每周精选灵感。所有生成都由受保护的 Edge Function 完成。 */
const Expression = {
  cards: [],
  weeklyIdeas: [],
  selectedCardId: null,
  esc(value = '') { return String(value).replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c])); },
  weekStart() { const d = new Date(); const day = d.getDay() || 7; d.setDate(d.getDate() - day + 1); return d.toISOString().slice(0, 10); },
  async init() { this.bindEvents(); await this.load(); this.render(); },
  async load() {
    if (!Supabase.isAuthenticated) return;
    try {
      const [cards, ideas] = await Promise.all([
        Supabase.get('expression_cards?select=*&order=updated_at.desc&limit=30'),
        Supabase.get(`expression_weekly_ideas?week_start=eq.${this.weekStart()}&order=sort_order.asc&limit=8`),
      ]);
      this.cards = cards || [];
      this.weeklyIdeas = ideas || this.fallbackIdeas();
      if (!this.selectedCardId && this.cards[0]) this.selectedCardId = this.cards[0].id;
    } catch (error) {
      console.warn('Expression load failed:', error.message);
      this.weeklyIdeas = this.fallbackIdeas();
    }
  },
  fallbackIdeas() { return [
    { id: 'local-1', category: '女性成长', title: '为什么越想成为“情绪稳定的人”，越容易压住真实感受？', source_name: '本周练习', brief: '从一次忍住不说、后来更委屈的具体场景切入。' },
    { id: 'local-2', category: '个人成长', title: '我终于发现：拖延不是不自律，而是任务太模糊', source_name: '本周练习', brief: '讲一个把“做内容”改成下一步动作后开始推进的例子。' },
    { id: 'local-3', category: '女性成长', title: '“我不想麻烦别人”背后，可能不是体贴', source_name: '本周练习', brief: '讨论过度独立、边界与求助之间的关系。' },
    { id: 'local-4', category: '个人成长', title: '输入很多却讲不出来：缺的是一次自己的转述', source_name: '本周练习', brief: '用最近看过的一个观点，讲“转述”怎样变成自己的理解。' },
    { id: 'local-5', category: '女性成长', title: '变自信不是把声音变大，而是把判断说完整', source_name: '本周练习', brief: '从一次不敢表达不同意见的场景，讲清理由和边界。' },
    { id: 'local-6', category: 'AI 工具', title: 'AI 没让我更高效，它先逼我把问题说清楚', source_name: '本周练习', brief: '用一个真实工作场景演示：模糊提问与清晰输入的区别。' },
  ]; },
  bindEvents() {
    document.getElementById('btnGenerateExpression')?.addEventListener('click', () => this.generate());
    document.getElementById('expressionWeeklyIdeas')?.addEventListener('click', e => {
      const button = e.target.closest('[data-expression-idea]');
      if (!button) return;
      const idea = this.weeklyIdeas.find(x => String(x.id) === button.dataset.expressionIdea);
      if (!idea) return;
      document.getElementById('expressionIdeaInput').value = `${idea.title}\n${idea.brief || ''}`;
      document.getElementById('expressionLinkInput').value = idea.source_url || '';
      document.getElementById('expressionIdeaInput').focus();
      document.getElementById('expressionIdeaInput').scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    document.getElementById('expressionCards')?.addEventListener('click', e => {
      const card = e.target.closest('[data-expression-card]');
      if (!card) return;
      this.selectedCardId = card.dataset.expressionCard; this.renderCard(); this.renderHistory();
    });
    document.getElementById('expressionCardArea')?.addEventListener('click', e => {
      const button = e.target.closest('[data-expression-action]');
      if (!button) return;
      this.rewrite(button.dataset.expressionAction, button.dataset.expressionMode || '');
    });
  },
  setStatus(message = '', type = '') { const el = document.getElementById('expressionGenerateStatus'); if (el) { el.textContent = message; el.dataset.state = type; } },
  async generate() {
    const input = document.getElementById('expressionIdeaInput').value.trim();
    const sourceUrl = document.getElementById('expressionLinkInput').value.trim();
    if (!input && !sourceUrl) { this.setStatus('先写下一句想法，或粘贴一个公开链接。', 'error'); return; }
    if (!Supabase.isAuthenticated) return WorkspaceAccess.openAccess();
    const button = document.getElementById('btnGenerateExpression'); button.disabled = true; this.setStatus('正在把想法整理成练习卡…');
    try {
      const result = await Supabase.invokeFunction('expression-card', { action: 'create', input, source_url: sourceUrl });
      this.cards.unshift(result.card); this.selectedCardId = result.card.id; this.render(); this.setStatus('练习卡已生成。', 'success');
    } catch (error) { this.setStatus(error.message, 'error'); } finally { button.disabled = false; }
  },
  async rewrite(action, mode) {
    const card = this.cards.find(x => x.id === this.selectedCardId); if (!card) return;
    const status = document.querySelector('#expressionCardArea .expression-card-status');
    if (status) status.textContent = action === 'enhance' ? '正在增强网感…' : '正在换一种讲法…';
    try {
      const result = await Supabase.invokeFunction('expression-card', { action, card_id: card.id, mode });
      const index = this.cards.findIndex(x => x.id === card.id); this.cards[index] = result.card; this.render();
    } catch (error) { if (status) status.textContent = error.message; }
  },
  render() { this.renderIdeas(); this.renderCard(); this.renderHistory(); },
  renderIdeas() {
    const el = document.getElementById('expressionWeeklyIdeas'); if (!el) return;
    el.innerHTML = this.weeklyIdeas.length ? this.weeklyIdeas.map(idea => `<article class="expression-idea"><span class="expression-category">${this.esc(idea.category)}</span><h3>${this.esc(idea.title)}</h3><p>${this.esc(idea.brief || '')}</p><footer>${this.esc(idea.source_name || '本周练习')}<button class="btn-text" data-expression-idea="${this.esc(idea.id)}">用这个练习 →</button></footer></article>`).join('') : '<div class="empty-hint">本周灵感正在准备中。</div>';
  },
  renderCard() {
    const el = document.getElementById('expressionCardArea'); if (!el) return;
    const row = this.cards.find(x => x.id === this.selectedCardId);
    if (!row) { el.innerHTML = '<div class="expression-empty"><strong>还没有练习卡</strong><span>从上面写下一句你真正想说的话开始。</span></div>'; return; }
    const card = row.card || {}; const variants = row.variants || [];
    const active = variants[variants.length - 1]?.content || card;
    const modes = active.alternative_modes || [];
    el.innerHTML = `<article class="expression-training-card">
      <div class="expression-card-kicker"><span>${this.esc(active.mode || '观点表达')}</span>${row.source_url ? `<a href="${this.esc(row.source_url)}" target="_blank" rel="noopener noreferrer">查看来源 ↗</a>` : ''}</div>
      <h2>${this.esc(active.title || row.title || '我的表达练习')}</h2>
      <p class="expression-core">${this.esc(active.core_sentence || '')}</p>
      <section><h3>开场，任选一句</h3><div class="expression-openers">${(active.openers || []).map(x => `<button class="btn-text">${this.esc(x)}</button>`).join('')}</div></section>
      <section><h3>怎么讲才不跑题</h3><ol class="expression-flow">${(active.flow || []).map(x => `<li><strong>${this.esc(x.label || '')}</strong><span>${this.esc(x.text || '')}</span></li>`).join('')}</ol></section>
      <section class="expression-script-grid"><div><h3>30 秒版本</h3><p>${this.esc(active.script_30 || '')}</p></div><div><h3>1 分钟版本</h3><p>${this.esc(active.script_60 || '')}</p></div></section>
      <section><h3>提词关键词</h3><div class="expression-keywords">${(active.keywords || []).map(x => `<span>${this.esc(x)}</span>`).join('')}</div><p class="expression-broll">辅助画面：${this.esc(active.broll || '用一个真实场景或截图辅助说明。')}</p></section>
      <div class="expression-card-actions"><div><button class="btn-secondary" data-expression-action="alternative" data-expression-mode="">换一种讲法</button>${modes.slice(0, 2).map(x => `<button class="btn-text" data-expression-action="alternative" data-expression-mode="${this.esc(x)}">${this.esc(x)}</button>`).join('')}</div><button class="btn-primary" data-expression-action="enhance">增强网感</button></div>
      <p class="expression-card-status" aria-live="polite">${variants.length > 1 ? `已保留 ${variants.length} 个版本。` : '原版会被保留。'}</p>
    </article>`;
  },
  renderHistory() {
    const el = document.getElementById('expressionCards'); if (!el) return;
    el.innerHTML = this.cards.length ? this.cards.map(row => `<button class="expression-history-card ${row.id === this.selectedCardId ? 'is-active' : ''}" data-expression-card="${this.esc(row.id)}"><span>${this.esc(row.card?.mode || '表达练习')}</span><strong>${this.esc(row.card?.title || row.title || '未命名练习')}</strong><small>${new Date(row.updated_at || Date.now()).toLocaleDateString('zh-CN')}</small></button>`).join('') : '<div class="empty-hint">你的练习卡会在这里同步保存。</div>';
  },
};
