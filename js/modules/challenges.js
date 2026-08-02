/* ========================================
   卿卿日常 · 30 Challenges 模块
   ======================================== */

const Challenges = {
  init() {
    this.render();
    document.getElementById('btnAddChallenge').addEventListener('click', () => this.add());
  },

  getList() {
    return Storage.getArray('challenges_v2');
  },

  saveList(list) {
    Storage.set('challenges_v2', list);
  },

  canDragSort() {
    return window.matchMedia('(min-width: 769px) and (pointer: fine)').matches;
  },

  add() {
    this.openCreateModal('');
  },

  openCreateModal(text) {
    let overlay = document.getElementById('challengeCreateOverlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'modal-overlay hidden';
      overlay.id = 'challengeCreateOverlay';
      document.body.appendChild(overlay);
    }

    overlay.innerHTML = `
      <div class="modal goal-detail-modal challenge-create-modal">
        <div class="modal-header">
          <h3>设置新目标</h3>
          <button class="btn-icon challenge-create-close" aria-label="关闭">✕</button>
        </div>
        <div class="modal-body">
          <div class="goal-detail-field">
            <label>目标名称</label>
            <input type="text" class="input-lg" id="challengeCreateName"
              value="${Dashboard.escapeHtml(text)}" maxlength="50" placeholder="例如：阅读、早睡、跑步">
          </div>

          <div class="goal-detail-row">
            <div class="goal-detail-field">
              <label>目标类型</label>
              <select class="input" id="challengeCreateType">
                <option value="short" selected>短期目标</option>
                <option value="long">长期目标</option>
              </select>
            </div>
            <div class="goal-detail-field">
              <label>目标总量</label>
              <input type="number" class="input" id="challengeCreateTotal" value="50" min="1">
            </div>
          </div>

          <div class="goal-detail-row">
            <div class="goal-detail-field">
              <label>单位（可不填）</label>
              <input type="text" class="input" id="challengeCreateUnit" list="challengeUnitOptions"
                value="次" placeholder="次 / 天 / 小时 / 个">
              <datalist id="challengeUnitOptions">
                <option value="次"></option>
                <option value="天"></option>
                <option value="小时"></option>
                <option value="个"></option>
              </datalist>
            </div>
            <div class="goal-detail-field">
              <label>截止日期（可不填）</label>
              <input type="date" class="input" id="challengeCreateDeadline">
            </div>
          </div>

          <div class="goal-detail-field">
            <label>完成奖励（可不填）</label>
            <input type="text" class="input-lg" id="challengeCreateReward"
              placeholder="例如：给自己买一杯咖啡">
          </div>
        </div>
        <div class="modal-footer goal-detail-footer">
          <button class="btn-secondary challenge-create-cancel">取消</button>
          <button class="btn-primary challenge-create-save">保存目标</button>
        </div>
      </div>
    `;

    overlay.classList.remove('hidden');

    const close = () => overlay.classList.add('hidden');
    overlay.querySelectorAll('.challenge-create-close, .challenge-create-cancel').forEach(btn => {
      btn.addEventListener('click', close);
    });
    overlay.onclick = (e) => { if (e.target === overlay) close(); };

    const nameInput = overlay.querySelector('#challengeCreateName');
    const save = () => {
      const name = nameInput.value.trim();
      if (!name) {
        Helpers.showToast('请输入目标名称', 'error');
        nameInput.focus();
        return;
      }

      const totalInput = overlay.querySelector('#challengeCreateTotal');
      const total = Math.max(1, parseInt(totalInput.value, 10) || 50);
      const unit = overlay.querySelector('#challengeCreateUnit').value.trim();

      const list = this.getList();
      list.push({
        id: Helpers.uid(),
        text: name,
        done: 0,
        total,
        unit,
        type: overlay.querySelector('#challengeCreateType').value,
        deadline: overlay.querySelector('#challengeCreateDeadline').value,
        reward: overlay.querySelector('#challengeCreateReward').value.trim(),
        pinned: false,
        updatedAt: Date.now(),
        time: Date.now(),
      });

      this.saveList(list);
      this.render();
      if (typeof GoalProgress !== 'undefined') GoalProgress.render();
      close();
      Helpers.showToast('目标已添加', 'success');
    };

    overlay.querySelector('.challenge-create-save').addEventListener('click', save);
    overlay.querySelector('.challenge-create-modal').addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') save();
      if (e.key === 'Escape') close();
    });
    nameInput.focus();
  },

  toggle(id, idx) {
    const list = this.getList();
    const item = list.find(i => i.id === id);
    if (!item) return;
    const targetDay = parseInt(idx) + 1;

    if (item.done >= targetDay) {
      item.done = targetDay - 1;
    } else if (item.done === targetDay - 1) {
      item.done = targetDay;
      if (item.done >= item.total) {
        if (typeof GoalProgress !== 'undefined' && GoalProgress.showCompletion) {
          GoalProgress.showCompletion(item);
        } else {
          Helpers.showToast(`🎉「${item.text}」已完成！`, 'success', 4000);
        }
      }
    }
    item.updatedAt = Date.now();
    this.saveList(list);
    this.render();
    if (typeof GoalProgress !== 'undefined') GoalProgress.render();
  },

  remove(id) {
    const list = this.getList().filter(i => i.id !== id);
    this.saveList(list);
    this.render();
  },

  render() {
    const grid = document.getElementById('challengesGrid');
    const list = this.getList();
    const canDrag = this.canDragSort();

    if (list.length === 0) {
      grid.innerHTML = '<div class="empty-hint">添加一个目标，开始 30 天挑战</div>';
      return;
    }

    // 莫兰迪色系
    const colors = ['#8B9D83','#7B9EA8','#C4826C','#D4B896','#9B8E83','#8A9B8F',
                    '#A4B0A0','#B8956E','#6B8F9B','#C8A882','#95A8A0','#BFB5AB'];

    let html = '';
    list.forEach((item, idx) => {
      const color = colors[idx % colors.length];
      html += `<div class="challenge-module" data-id="${item.id}" ${canDrag ? 'draggable="true"' : ''}>
        <div class="challenge-module-header">
          <span class="challenge-drag-handle" title="拖拽排序" aria-label="拖拽排序">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <circle cx="9" cy="5" r="1.5"/><circle cx="15" cy="5" r="1.5"/>
              <circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/>
              <circle cx="9" cy="19" r="1.5"/><circle cx="15" cy="19" r="1.5"/>
            </svg>
          </span>
          <span class="challenge-module-title">${Dashboard.escapeHtml(item.text)}</span>
          <span class="challenge-module-count">${item.done}/${item.total}</span>
          <div class="challenge-module-actions">
            <span class="challenge-module-edit" data-edit="${item.id}" title="编辑">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </span>
            <span class="challenge-module-del" data-del="${item.id}">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </span>
          </div>
        </div>
        <div class="challenge-dots">`;

      for (let i = 0; i < item.total; i++) {
        const filled = i < item.done;
        html += `<div class="challenge-dot ${filled ? 'done' : ''}" 
          style="--dot-color:${color}" data-id="${item.id}" data-idx="${i}" title="第${i+1}天">
          <span class="challenge-num">${i+1}</span>
        </div>`;
      }

      html += `</div></div>`;
    });

    grid.innerHTML = html;

    // 点击打卡
    grid.querySelectorAll('.challenge-dot').forEach(dot => {
      dot.addEventListener('click', () => this.toggle(dot.dataset.id, dot.dataset.idx));
    });

    // 编辑模块
    grid.querySelectorAll('.challenge-module-edit').forEach(edit => {
      edit.addEventListener('click', (e) => {
        e.stopPropagation();
        if (typeof GoalProgress !== 'undefined') {
          GoalProgress.openDetail(edit.dataset.edit);
        }
      });
    });

    // 删除模块
    grid.querySelectorAll('.challenge-module-del').forEach(del => {
      del.addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm('删除这个挑战？')) {
          this.remove(del.dataset.del);
        }
      });
    });

    this.bindDragSort(grid);
  },

  bindDragSort(grid) {
    if (!this.canDragSort()) return;

    let draggingId = null;

    grid.querySelectorAll('.challenge-drag-handle').forEach(handle => {
      handle.addEventListener('mousedown', () => {
        const module = handle.closest('.challenge-module');
        if (module) module.dataset.dragReady = 'true';
      });
      handle.addEventListener('mouseup', () => {
        const module = handle.closest('.challenge-module');
        if (module) delete module.dataset.dragReady;
      });
    });

    grid.querySelectorAll('.challenge-module').forEach(module => {
      module.addEventListener('dragstart', (e) => {
        if (module.dataset.dragReady !== 'true') {
          e.preventDefault();
          return;
        }
        draggingId = module.dataset.id;
        module.classList.add('is-dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', draggingId);
      });

      module.addEventListener('dragend', () => {
        module.classList.remove('is-dragging');
        delete module.dataset.dragReady;
        draggingId = null;
        grid.querySelectorAll('.challenge-module').forEach(el => el.classList.remove('is-drag-over'));
      });

      module.addEventListener('dragover', (e) => {
        if (!draggingId || module.dataset.id === draggingId) return;
        e.preventDefault();
        module.classList.add('is-drag-over');
      });

      module.addEventListener('dragleave', () => {
        module.classList.remove('is-drag-over');
      });

      module.addEventListener('drop', (e) => {
        e.preventDefault();
        module.classList.remove('is-drag-over');
        const sourceId = e.dataTransfer.getData('text/plain') || draggingId;
        const targetId = module.dataset.id;
        if (!sourceId || sourceId === targetId) return;
        const rect = module.getBoundingClientRect();
        const position = e.clientY > rect.top + rect.height / 2 ? 'after' : 'before';
        this.moveTo(sourceId, targetId, position);
      });
    });
  },

  moveTo(sourceId, targetId, position = 'before') {
    const list = this.getList();
    const from = list.findIndex(item => item.id === sourceId);
    const to = list.findIndex(item => item.id === targetId);
    if (from === -1 || to === -1 || from === to) return;

    const [moved] = list.splice(from, 1);
    const targetIndex = list.findIndex(item => item.id === targetId);
    const insertIndex = position === 'after' ? targetIndex + 1 : targetIndex;
    list.splice(insertIndex, 0, moved);
    moved.updatedAt = Date.now();

    this.saveList(list);
    this.render();
    if (typeof GoalProgress !== 'undefined') GoalProgress.render();
    Helpers.showToast('目标排序已更新', 'success', 1600);
  },
};

// 暴露到全局
window.Challenges = Challenges;
