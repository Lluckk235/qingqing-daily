/* ========================================
   卿卿日常 · 30 Challenges 模块
   ======================================== */

const Challenges = {
  init() {
    this.render();
    document.getElementById('btnAddChallenge').addEventListener('click', () => this.add());
    document.getElementById('challengeInput').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.add();
    });
  },

  getList() {
    return Storage.getArray('challenges_v2');
  },

  saveList(list) {
    Storage.set('challenges_v2', list);
  },

  add() {
    const input = document.getElementById('challengeInput');
    const text = input.value.trim();
    if (!text) return;

    const list = this.getList();
    list.push({
      id: Helpers.uid(),
      text,
      done: 0,       // 已打卡次数
      total: 30,     // 总共30次
      unit: '次',    // 单位
      type: 'short', // 长期/短期
      deadline: '',  // 截止日期
      reward: '',    // 完成奖励
      pinned: false, // 是否置顶
      updatedAt: Date.now(),
      time: Date.now(),
    });
    this.saveList(list);
    input.value = '';
    this.render();
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
        if (item.reward) {
          Helpers.showToast(`🎉「${item.text}」完成！奖励：${item.reward}`, 'success', 4000);
        } else {
          Helpers.showToast(`🎉「${item.text}」挑战成功！30天完成！`, 'success', 4000);
        }
      }
    }
    item.updatedAt = Date.now();
    this.saveList(list);
    this.render();
  },

  remove(id) {
    const list = this.getList().filter(i => i.id !== id);
    this.saveList(list);
    this.render();
  },

  render() {
    const grid = document.getElementById('challengesGrid');
    const list = this.getList();

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
      html += `<div class="challenge-module">
        <div class="challenge-module-header">
          <span class="challenge-module-title">${Dashboard.escapeHtml(item.text)}</span>
          <span class="challenge-module-count">${item.done}/${item.total}</span>
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
  },
};

// 暴露到全局
window.Challenges = Challenges;
