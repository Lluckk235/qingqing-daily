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
      time: Date.now(),
    });
    this.saveList(list);
    input.value = '';
    this.render();
  },

  toggle(id) {
    const list = this.getList();
    const item = list.find(i => i.id === id);
    if (item) {
      if (item.done < item.total) {
        item.done++;
      } else {
        item.done = 0; // 满了重置
      }
    }
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

    const colors = ['#FF6B6B','#FF8E53','#FFD93D','#6BCB77','#4D96FF','#9B59B6',
                    '#FF6B8A','#FFA07A','#FFE066','#69DB7C','#74C0FC','#DA77F2'];

    let html = '';
    list.forEach((item, idx) => {
      const color = colors[idx % colors.length];
      html += `<div class="challenge-module">
        <div class="challenge-module-header">
          <span class="challenge-module-title">${Dashboard.escapeHtml(item.text)}</span>
          <span class="challenge-module-count">${item.done}/${item.total}</span>
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
      dot.addEventListener('click', () => this.toggle(dot.dataset.id));
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
