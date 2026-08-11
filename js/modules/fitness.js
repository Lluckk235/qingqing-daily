/* ========================================
   卿卿日常 · 私人健身素材库与周计划
   视频只保留外部链接；数据由 Supabase RLS 按匿名身份隔离。
   ======================================== */

const Fitness = {
  exercises: [], plan: null, items: [], checkins: [],

  esc(value = '') {
    return String(value).replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
  },

  weekStart() {
    const date = new Date();
    const day = date.getDay() || 7;
    date.setDate(date.getDate() - day + 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  },

  async init() {
    this.bindEvents();
    await this.load();
    this.render();
  },

  async load() {
    if (!Supabase.isAuthenticated) return;
    try {
      const [exercises, plans] = await Promise.all([
        Supabase.get('fitness_exercises?is_archived=eq.false&order=created_at.desc'),
        Supabase.get(`fitness_weekly_plans?week_start=eq.${this.weekStart()}&limit=1`),
      ]);
      this.exercises = exercises || [];
      this.plan = plans?.[0] || null;
      if (!this.plan) { this.items = []; this.checkins = []; return; }
      const [items, checkins] = await Promise.all([
        Supabase.get(`fitness_plan_items?plan_id=eq.${this.plan.id}&order=sort_order.asc`),
        Supabase.get(`fitness_checkins?plan_id=eq.${this.plan.id}`),
      ]);
      this.items = items || [];
      this.checkins = checkins || [];
    } catch (error) {
      console.warn('Fitness load failed:', error.message);
      Helpers.showToast('健身数据加载失败，请确认隐私迁移已执行', 'error');
    }
  },

  bindEvents() {
    document.getElementById('btnNewWeekPlan')?.addEventListener('click', () => this.createPlan());
    document.getElementById('btnAddExercise')?.addEventListener('click', () => this.openExerciseForm());
    document.getElementById('btnFitnessRecovery')?.addEventListener('click', () => this.bindRecoveryEmail());
    ['fitnessSearch', 'fitnessPlatform', 'fitnessType', 'fitnessIntensity', 'fitnessBody', 'fitnessCreator'].forEach(id => {
      document.getElementById(id)?.addEventListener('input', () => this.renderLibrary());
      document.getElementById(id)?.addEventListener('change', () => this.renderLibrary());
    });
    document.getElementById('fitnessLibrary')?.addEventListener('click', event => {
      const add = event.target.closest('[data-add-exercise]');
      const edit = event.target.closest('[data-edit-exercise]');
      if (add) this.addToPlan(add.dataset.addExercise);
      if (edit) this.openExerciseForm(this.exercises.find(x => x.id === edit.dataset.editExercise));
    });
    document.getElementById('fitnessPlanList')?.addEventListener('click', event => {
      const checkin = event.target.closest('[data-checkin]');
      const move = event.target.closest('[data-move]');
      const remove = event.target.closest('[data-remove-item]');
      if (checkin) this.openCheckin(checkin.dataset.checkin);
      if (move) this.moveItem(move.dataset.move, Number(move.dataset.direction));
      if (remove) this.removeItem(remove.dataset.removeItem);
    });
  },

  render() {
    this.renderSummary();
    this.renderPlan();
    this.renderLibrary();
  },

  renderSummary() {
    const complete = this.checkins.length;
    const minutes = this.checkins.reduce((sum, item) => sum + (item.duration_minutes || 0), 0);
    const target = this.items.length;
    document.getElementById('fitnessSummary').innerHTML = `
      <div class="fitness-stat"><strong>${complete}/${target}</strong><span>本周已完成</span></div>
      <div class="fitness-stat"><strong>${minutes}</strong><span>训练分钟</span></div>
      <div class="fitness-stat"><strong>${this.exercises.length}</strong><span>动作素材</span></div>`;
  },

  renderPlan() {
    const container = document.getElementById('fitnessPlanList');
    if (!this.plan) {
      container.innerHTML = '<div class="empty-hint">本周还没有计划。先从动作库挑选训练内容。</div>';
      return;
    }
    if (!this.items.length) {
      container.innerHTML = '<div class="empty-hint">计划已创建，从下方动作库添加训练吧。</div>';
      return;
    }
    const byId = new Map(this.exercises.map(item => [item.id, item]));
    container.innerHTML = this.items.map((item, index) => {
      const exercise = byId.get(item.exercise_id);
      if (!exercise) return '';
      const checkin = this.checkins.find(c => c.plan_item_id === item.id);
      return `<article class="fitness-plan-item ${checkin ? 'is-done' : ''}">
        <div class="fitness-plan-cover">${this.cover(exercise)}</div>
        <div class="fitness-plan-copy"><strong>${this.esc(exercise.title)}</strong><span>${this.esc(exercise.creator || exercise.platform)} · ${this.esc(exercise.training_type || '未分类')}</span>${this.chips(exercise)}</div>
        <div class="fitness-plan-actions">
          <button class="btn-text" data-move="${item.id}" data-direction="-1" ${index === 0 ? 'disabled' : ''}>↑</button>
          <button class="btn-text" data-move="${item.id}" data-direction="1" ${index === this.items.length - 1 ? 'disabled' : ''}>↓</button>
          <button class="btn-text" data-remove-item="${item.id}">移除</button>
          <button class="${checkin ? 'btn-secondary' : 'btn-primary'}" data-checkin="${item.id}">${checkin ? '已打卡' : '完成打卡'}</button>
        </div>
      </article>`;
    }).join('');
  },

  filters() {
    return {
      keyword: (document.getElementById('fitnessSearch')?.value || '').trim().toLowerCase(),
      platform: document.getElementById('fitnessPlatform')?.value || '',
      type: document.getElementById('fitnessType')?.value || '',
      intensity: document.getElementById('fitnessIntensity')?.value || '',
      body: document.getElementById('fitnessBody')?.value || '',
      creator: (document.getElementById('fitnessCreator')?.value || '').trim().toLowerCase(),
    };
  },

  renderLibrary() {
    const container = document.getElementById('fitnessLibrary');
    if (!container) return;
    const filter = this.filters();
    const list = this.exercises.filter(item => {
      const haystack = [item.title, item.creator, ...(item.tags || []), ...(item.body_parts || [])].join(' ').toLowerCase();
      return (!filter.keyword || haystack.includes(filter.keyword))
        && (!filter.platform || item.platform === filter.platform)
        && (!filter.type || item.training_type === filter.type)
        && (!filter.intensity || String(item.intensity) === filter.intensity)
        && (!filter.body || (item.body_parts || []).includes(filter.body))
        && (!filter.creator || (item.creator || '').toLowerCase().includes(filter.creator));
    });
    container.innerHTML = list.length ? list.map(item => `<article class="fitness-card">
      <a class="fitness-cover" href="${this.esc(item.source_url)}" target="_blank" rel="noopener noreferrer">${this.cover(item)}</a>
      <div class="fitness-card-body"><h3>${this.esc(item.title)}</h3><p>${this.esc(item.creator || '未知博主')} · ${item.platform === 'douyin' ? '抖音' : '哔哩哔哩'}</p>${this.chips(item)}</div>
      <div class="fitness-card-actions"><button class="btn-secondary" data-edit-exercise="${item.id}">编辑</button><button class="btn-primary" data-add-exercise="${item.id}">加入本周</button></div>
    </article>`).join('') : '<div class="empty-hint">没有匹配动作。可以调整筛选或添加视频。</div>';
  },

  cover(exercise) {
    const title = this.esc(exercise.title || '健身视频');
    return exercise.cover_url
      ? `<img src="${this.esc(exercise.cover_url)}" alt="${title}" loading="lazy" referrerpolicy="no-referrer" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'fitness-cover-fallback',textContent:'🏋️'}))">`
      : '<span class="fitness-cover-fallback">🏋️</span>';
  },

  chips(exercise) {
    const values = [exercise.training_type, ...(exercise.body_parts || []), exercise.intensity ? `强度 ${exercise.intensity}` : '', ...(exercise.tags || [])].filter(Boolean);
    return values.length ? `<div class="fitness-chips">${values.map(value => `<span>${this.esc(value)}</span>`).join('')}</div>` : '';
  },

  async createPlan() {
    if (this.plan) { Helpers.showToast('本周计划已经创建', 'info'); return; }
    try {
      await Supabase.post('fitness_weekly_plans', { user_id: Supabase.userId, week_start: this.weekStart() });
      await this.load(); this.render();
      Helpers.showToast('本周计划已创建', 'success');
    } catch (error) { Helpers.showToast(error.message, 'error'); }
  },

  async addToPlan(exerciseId) {
    if (!this.plan) await this.createPlan();
    if (!this.plan) return;
    if (this.items.some(item => item.exercise_id === exerciseId)) { Helpers.showToast('已经在本周清单中', 'info'); return; }
    try {
      await Supabase.post('fitness_plan_items', { user_id: Supabase.userId, plan_id: this.plan.id, exercise_id: exerciseId, sort_order: this.items.length });
      await this.load(); this.render(); Helpers.showToast('已加入本周训练', 'success');
    } catch (error) { Helpers.showToast(error.message, 'error'); }
  },

  async moveItem(id, direction) {
    const index = this.items.findIndex(item => item.id === id);
    const next = index + direction;
    if (index < 0 || next < 0 || next >= this.items.length) return;
    const current = this.items[index], target = this.items[next];
    try {
      await Promise.all([
        Supabase.patch(`fitness_plan_items?id=eq.${current.id}`, { sort_order: target.sort_order }),
        Supabase.patch(`fitness_plan_items?id=eq.${target.id}`, { sort_order: current.sort_order }),
      ]);
      await this.load(); this.render();
    } catch (error) { Helpers.showToast(error.message, 'error'); }
  },

  async removeItem(id) {
    if (!confirm('从本周训练清单移除这项内容？')) return;
    try { await Supabase.delete(`fitness_plan_items?id=eq.${id}`); await this.load(); this.render(); } catch (error) { Helpers.showToast(error.message, 'error'); }
  },

  openExerciseForm(existing = null) {
    const modal = this.modal('fitnessExerciseModal', existing ? '编辑动作素材' : '添加健身视频', `
      <label>抖音/B站链接<input class="input" id="fitnessSourceUrl" value="${this.esc(existing?.source_url || '')}" placeholder="粘贴视频分享链接"></label>
      <button class="btn-secondary" id="btnReadVideoMeta">自动读取标题和封面</button>
      <label>视频标题<input class="input" id="fitnessTitle" value="${this.esc(existing?.title || '')}" required></label>
      <label>封面链接<input class="input" id="fitnessCoverUrl" value="${this.esc(existing?.cover_url || '')}"></label>
      <label>博主<input class="input" id="fitnessCreator" value="${this.esc(existing?.creator || '')}"></label>
      <div class="fitness-form-grid"><label>训练类型<select class="input" id="fitnessTrainingType"><option value="力量">力量</option><option value="有氧">有氧</option><option value="拉伸">拉伸</option><option value="瑜伽/普拉提">瑜伽/普拉提</option><option value="HIIT">HIIT</option></select></label><label>强度 1-5<input class="input" id="fitnessExerciseIntensity" type="number" min="1" max="5" value="${existing?.intensity || 3}"></label><label>时长（分钟）<input class="input" id="fitnessDuration" type="number" min="1" value="${existing?.duration_minutes || ''}"></label></div>
      <label>练习部位（逗号分隔）<input class="input" id="fitnessBodyParts" value="${this.esc((existing?.body_parts || []).join('、'))}" placeholder="臀腿、核心、肩背"></label>
      <label>标签（逗号分隔）<input class="input" id="fitnessTags" value="${this.esc((existing?.tags || []).join('、'))}" placeholder="居家、无器械"></label>
      <label>备注<textarea class="input" id="fitnessNote" rows="2">${this.esc(existing?.notes || '')}</textarea></label>`, '保存');
    modal.querySelector('#fitnessTrainingType').value = existing?.training_type || '力量';
    modal.querySelector('#btnReadVideoMeta').addEventListener('click', () => this.readVideoMeta(modal));
    modal.querySelector('[data-modal-save]').addEventListener('click', () => this.saveExercise(existing?.id, modal));
  },

  async readVideoMeta(modal) {
    const url = modal.querySelector('#fitnessSourceUrl').value.trim();
    if (!url) { Helpers.showToast('先粘贴视频链接', 'error'); return; }
    try {
      const metadata = await Supabase.invokeFunction('video-metadata', { url });
      modal.querySelector('#fitnessTitle').value = metadata.title || '';
      modal.querySelector('#fitnessCoverUrl').value = metadata.cover_url || '';
      modal.querySelector('#fitnessCreator').value = metadata.creator || '';
      Helpers.showToast('已读取公开视频信息，请检查后保存', 'success');
    } catch (error) { Helpers.showToast('自动读取失败，可手动填写后保存', 'info'); }
  },

  async saveExercise(id, modal) {
    const sourceUrl = modal.querySelector('#fitnessSourceUrl').value.trim();
    const title = modal.querySelector('#fitnessTitle').value.trim();
    if (!sourceUrl || !title) { Helpers.showToast('请填写视频链接和标题', 'error'); return; }
    let host;
    try { host = new URL(sourceUrl).hostname.toLowerCase(); } catch (_) { Helpers.showToast('视频链接格式不正确', 'error'); return; }
    const platform = host.includes('douyin') ? 'douyin' : (host.includes('bilibili') || host === 'b23.tv' ? 'bilibili' : '');
    if (!platform) { Helpers.showToast('目前仅支持抖音和哔哩哔哩链接', 'error'); return; }
    const split = id => modal.querySelector(id).value.split(/[、,，]/).map(v => v.trim()).filter(Boolean);
    const payload = {
      user_id: Supabase.userId, source_url: sourceUrl, platform, title,
      cover_url: modal.querySelector('#fitnessCoverUrl').value.trim() || null,
      creator: modal.querySelector('#fitnessCreator').value.trim() || null,
      training_type: modal.querySelector('#fitnessTrainingType').value,
      intensity: Number(modal.querySelector('#fitnessExerciseIntensity').value) || 3,
      duration_minutes: Number(modal.querySelector('#fitnessDuration').value) || null,
      body_parts: split('#fitnessBodyParts'), tags: split('#fitnessTags'), notes: modal.querySelector('#fitnessNote').value.trim() || null,
      metadata_status: modal.querySelector('#fitnessCoverUrl').value ? 'ready' : 'manual',
    };
    try {
      if (id) await Supabase.patch(`fitness_exercises?id=eq.${id}`, payload); else await Supabase.post('fitness_exercises', payload);
      modal.remove(); await this.load(); this.render(); Helpers.showToast('动作素材已保存', 'success');
    } catch (error) { Helpers.showToast(error.message, 'error'); }
  },

  openCheckin(itemId) {
    const item = this.items.find(x => x.id === itemId);
    const existing = this.checkins.find(x => x.plan_item_id === itemId);
    const modal = this.modal('fitnessCheckinModal', existing ? '修改训练打卡' : '完成训练打卡', `
      <label>训练时长（分钟）<input class="input" id="checkinDuration" type="number" min="1" value="${existing?.duration_minutes || ''}"></label>
      <label>主观强度 1-5<input class="input" id="checkinEffort" type="number" min="1" max="5" value="${existing?.perceived_exertion || 3}"></label>
      <label>备注<textarea class="input" id="checkinNote" rows="3">${this.esc(existing?.note || '')}</textarea></label>`, existing ? '更新打卡' : '完成打卡');
    modal.querySelector('[data-modal-save]').addEventListener('click', async () => {
      const payload = { user_id: Supabase.userId, plan_id: this.plan.id, plan_item_id: item.id, duration_minutes: Number(modal.querySelector('#checkinDuration').value) || null, perceived_exertion: Number(modal.querySelector('#checkinEffort').value) || 3, note: modal.querySelector('#checkinNote').value.trim() || null, completed_at: new Date().toISOString() };
      try {
        if (existing) await Supabase.patch(`fitness_checkins?id=eq.${existing.id}`, payload); else await Supabase.post('fitness_checkins', payload);
        modal.remove(); await this.load(); this.render(); Helpers.showToast('训练已打卡', 'success');
      } catch (error) { Helpers.showToast(error.message, 'error'); }
    });
  },

  async bindRecoveryEmail() {
    const email = prompt('绑定恢复邮箱（仅用于换设备后找回数据）：');
    if (!email) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { Helpers.showToast('邮箱格式不正确', 'error'); return; }
    try { await Supabase.linkRecoveryEmail(email); Helpers.showToast('确认邮件已发送，请在邮箱中完成验证', 'success'); } catch (error) { Helpers.showToast(error.message, 'error'); }
  },

  modal(id, title, body, saveText) {
    document.getElementById(id)?.remove();
    const overlay = document.createElement('div');
    overlay.id = id; overlay.className = 'modal-overlay';
    overlay.innerHTML = `<div class="modal fitness-modal"><div class="modal-header"><h3>${title}</h3><button class="btn-icon" data-modal-close>×</button></div><div class="modal-body fitness-form">${body}</div><div class="modal-footer"><button class="btn-secondary" data-modal-close>取消</button><button class="btn-primary" data-modal-save>${saveText}</button></div></div>`;
    document.body.appendChild(overlay);
    overlay.querySelectorAll('[data-modal-close]').forEach(button => button.addEventListener('click', () => overlay.remove()));
    overlay.addEventListener('click', event => { if (event.target === overlay) overlay.remove(); });
    return overlay;
  },
};

window.Fitness = Fitness;
