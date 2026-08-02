/* ========================================
   卿卿日常 · 目标进度总览模块
   首页展示重点目标卡片 + 圆环进度
   数据直接读取 challenges_v2（Storage + Supabase 同步）
   ======================================== */

const GoalProgress = {
  // pastel 圆环颜色（按卡片索引循环）
  COLORS: [
    '#F6A8D0', // 浅粉
    '#D3E99A', // 浅绿
    '#F7D96B', // 奶油黄
    '#D8D0FF', // 淡紫
    '#BFD8F7', // 浅蓝灰
  ],

  get goals() {
    return Storage.getArray('challenges_v2');
  },

  save(list) {
    Storage.set('challenges_v2', list);
  },

  init() {
    this.container = document.getElementById('goalProgressSection');
    if (!this.container) return;
    this.render();
  },

  // 首页按目标管理中的手动顺序展示
  sortedGoals(list) {
    return [...list];
  },

  percent(item) {
    const total = item.total || 1;
    const done = Math.min(item.done || 0, total);
    return Math.round((done / total) * 100);
  },

  render() {
    const list = this.goals;
    const sorted = this.sortedGoals(list);
    const top = sorted.slice(0, 3);
    const hasMore = sorted.length > 3;

    if (top.length === 0) {
      this.container.innerHTML = `
        <div class="goal-progress-section">
          <div class="goal-progress-header">
            <h2>目标进度</h2>
          </div>
          <div class="goal-empty-card">
            <p>还没有目标，去目标管理添加一个吧</p>
            <button class="btn-primary goal-empty-btn" data-goto="challenges">去添加</button>
          </div>
        </div>
      `;
      this.bindEmpty();
      return;
    }

    let html = `
      <div class="goal-progress-section">
        <div class="goal-progress-header">
          <h2>目标进度</h2>
          ${hasMore ? `<button class="btn-text goal-view-all" data-goto="challenges">查看全部</button>` : ''}
        </div>
        <div class="goal-progress-grid">
    `;

    top.forEach((item, idx) => {
      const pct = this.percent(item);
      const color = this.COLORS[idx % this.COLORS.length];
      const done = item.done || 0;
      const total = item.total || 0;
      const unit = item.unit || '次';
      const completed = done >= total;
      const circumference = 113.1;
      const offset = circumference * (1 - pct / 100);

      html += `
        <div class="goal-card ${completed ? 'completed' : ''}" data-id="${item.id}">
          <div class="goal-ring-wrap">
            <svg class="goal-ring" viewBox="0 0 44 44">
              <circle class="goal-ring-bg" cx="22" cy="22" r="18"/>
              <circle class="goal-ring-fill" cx="22" cy="22" r="18"
                style="stroke:${color}; stroke-dashoffset:${offset}"/>
            </svg>
            <span class="goal-percent">${pct}%</span>
          </div>
          <div class="goal-info">
            <div class="goal-name">${Dashboard.escapeHtml(item.text)}</div>
            <div class="goal-meta">${done} / ${total} ${Dashboard.escapeHtml(unit)}</div>
            ${completed ? '<span class="goal-completed-badge">已完成</span>' : ''}
          </div>
        </div>
      `;
    });

    html += `</div></div>`;
    this.container.innerHTML = html;
    this.bindEvents();
  },

  bindEvents() {
    this.container.querySelectorAll('.goal-card').forEach(card => {
      card.addEventListener('click', () => this.openDetail(card.dataset.id));
    });
    this.container.querySelectorAll('[data-goto]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        App.navigateTo(el.dataset.goto);
      });
    });
  },

  bindEmpty() {
    const btn = this.container.querySelector('[data-goto]');
    if (btn) {
      btn.addEventListener('click', () => App.navigateTo(btn.dataset.goto));
    }
  },

  showCompletion(item) {
    let overlay = document.getElementById('goalCompleteOverlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'modal-overlay hidden';
      overlay.id = 'goalCompleteOverlay';
      document.body.appendChild(overlay);
    }

    const unit = item.unit || '次';
    const total = item.total || 1;
    const done = Math.min(item.done || 0, total);
    const reward = (item.reward || '').trim();
    const rewardHtml = reward ? `
      <div class="goal-complete-reward">
        <span class="goal-complete-reward-label">你的奖励</span>
        <strong>${Dashboard.escapeHtml(reward)}</strong>
      </div>
    ` : `
      <div class="goal-complete-reward muted">
        <span class="goal-complete-reward-label">给自己的奖励</span>
        <strong>认真认可这一次完成</strong>
      </div>
    `;

    overlay.innerHTML = `
      <div class="modal goal-complete-modal">
        <div class="goal-complete-body">
          <div class="goal-complete-hero" aria-hidden="true">
            <span class="goal-complete-glow"></span>
            <img class="goal-complete-emoji" src="assets/rewards/goal-complete-cheer.png" alt="">
          </div>
          <h3>你太棒啦！</h3>
          <p class="goal-complete-target">完成「${Dashboard.escapeHtml(item.text)}」</p>
          <p class="goal-complete-meta">${done} ${Dashboard.escapeHtml(unit)}</p>
          ${rewardHtml}
          <button class="btn-primary goal-complete-close">收下奖励</button>
        </div>
      </div>
    `;

    overlay.classList.remove('hidden');

    const close = () => overlay.classList.add('hidden');
    overlay.querySelector('.goal-complete-close').addEventListener('click', close);
    overlay.onclick = (e) => { if (e.target === overlay) close(); };
  },

  openDetail(id) {
    const list = this.goals;
    const idx = list.findIndex(i => i.id === id);
    if (idx === -1) return;
    const item = list[idx];

    // 复用/创建弹层
    let overlay = document.getElementById('goalDetailOverlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      overlay.id = 'goalDetailOverlay';
      document.body.appendChild(overlay);
    }

    const completed = (item.done || 0) >= (item.total || 1);
    const pct = this.percent(item);
    const color = this.COLORS[idx % this.COLORS.length];

    overlay.innerHTML = `
      <div class="modal goal-detail-modal">
        <div class="modal-header">
          <h3>目标详情</h3>
          <button class="btn-icon goal-detail-close" aria-label="关闭">✕</button>
        </div>
        <div class="modal-body">
          <div class="goal-detail-top">
            <div class="goal-ring-wrap goal-ring-wrap-lg">
              <svg class="goal-ring" viewBox="0 0 44 44">
                <circle class="goal-ring-bg" cx="22" cy="22" r="18"/>
                <circle class="goal-ring-fill" cx="22" cy="22" r="18"
                  style="stroke:${color}; stroke-dashoffset:${113.1 * (1 - pct / 100)}"/>
              </svg>
              <span class="goal-percent">${pct}%</span>
            </div>
            <div class="goal-detail-title">
              <input type="text" class="input-lg" id="goalDetailName" value="${Dashboard.escapeHtml(item.text)}" placeholder="目标名称">
              ${completed ? '<span class="goal-completed-badge">已完成</span>' : ''}
            </div>
          </div>

          <div class="goal-detail-row">
            <div class="goal-detail-field">
              <label>目标总量</label>
              <input type="number" class="input" id="goalDetailTotal" value="${item.total || 30}" min="1">
            </div>
            <div class="goal-detail-field">
              <label>单位</label>
              <input type="text" class="input" id="goalDetailUnit" list="goalDetailUnitOptions" value="${Dashboard.escapeHtml(item.unit || '次')}" placeholder="次 / 天 / 小时">
              <datalist id="goalDetailUnitOptions">
                <option value="次"></option>
                <option value="天"></option>
                <option value="小时"></option>
              </datalist>
            </div>
          </div>

          <div class="goal-detail-row">
            <div class="goal-detail-field">
              <label>当前进度</label>
              <input type="number" class="input" id="goalDetailDone" value="${item.done || 0}" min="0">
            </div>
            <div class="goal-detail-field">
              <label>截止日期</label>
              <input type="date" class="input" id="goalDetailDeadline" value="${item.deadline || ''}">
            </div>
          </div>

          <div class="goal-detail-field">
            <label>完成奖励</label>
            <input type="text" class="input-lg" id="goalDetailReward" value="${Dashboard.escapeHtml(item.reward || '')}" placeholder="例如：买一杯咖啡">
          </div>
        </div>
        <div class="modal-footer goal-detail-footer">
          <button class="btn-text goal-detail-delete" style="color:var(--accent-negative)">删除</button>
          <div class="goal-detail-actions">
            <button class="btn-secondary goal-detail-close-btn">取消</button>
            <button class="btn-primary goal-detail-save">保存</button>
          </div>
        </div>
      </div>
    `;

    overlay.classList.remove('hidden');

    const close = () => overlay.classList.add('hidden');

    // 关闭
    overlay.querySelectorAll('.goal-detail-close, .goal-detail-close-btn').forEach(btn => {
      btn.addEventListener('click', close);
    });
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

    // 进度校验
    const doneInput = overlay.querySelector('#goalDetailDone');
    const totalInput = overlay.querySelector('#goalDetailTotal');
    const clamp = () => {
      const total = parseInt(totalInput.value, 10) || 1;
      let done = parseInt(doneInput.value, 10) || 0;
      if (done < 0) done = 0;
      if (done > total) done = total;
      doneInput.value = done;
      totalInput.value = total;
    };
    doneInput.addEventListener('change', clamp);
    totalInput.addEventListener('change', clamp);

    // 保存
    overlay.querySelector('.goal-detail-save').addEventListener('click', () => {
      const total = parseInt(totalInput.value, 10) || 1;
      let done = parseInt(doneInput.value, 10) || 0;
      if (done < 0) done = 0;
      if (done > total) done = total;

      list[idx] = {
        ...item,
        text: overlay.querySelector('#goalDetailName').value.trim() || item.text,
        unit: overlay.querySelector('#goalDetailUnit').value.trim() || '次',
        total,
        done,
        deadline: overlay.querySelector('#goalDetailDeadline').value,
        reward: overlay.querySelector('#goalDetailReward').value.trim(),
        updatedAt: Date.now(),
      };

      const justCompleted = done >= total && (item.done || 0) < total;
      this.save(list);
      this.render();
      if (typeof Challenges !== 'undefined') Challenges.render();
      close();
      if (justCompleted) {
        this.showCompletion(list[idx]);
      }
    });

    // 删除
    overlay.querySelector('.goal-detail-delete').addEventListener('click', () => {
      if (confirm('确定删除这个目标？')) {
        list.splice(idx, 1);
        this.save(list);
        this.render();
        if (typeof Challenges !== 'undefined') Challenges.render();
        close();
      }
    });
  },
};

// 暴露到全局
window.GoalProgress = GoalProgress;
