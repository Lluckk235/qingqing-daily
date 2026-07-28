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
    return Storage.getArray('challenges_list');
  },

  saveList(list) {
    Storage.set('challenges_list', list);
  },

  add() {
    const input = document.getElementById('challengeInput');
    const text = input.value.trim();
    if (!text) return;

    const list = this.getList();
    if (list.length >= 30) {
      Helpers.showToast('最多30个目标', 'error');
      return;
    }

    list.push({ id: Helpers.uid(), text, done: false, time: Date.now() });
    this.saveList(list);
    input.value = '';
    this.render();
  },

  toggle(id) {
    const list = this.getList();
    const item = list.find(i => i.id === id);
    if (item) item.done = !item.done;
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

    // 生成30个格子
    let html = '';
    const colors = ['#FF6B6B','#FF8E53','#FFD93D','#6BCB77','#4D96FF','#9B59B6',
                    '#FF6B8A','#FFA07A','#FFE066','#69DB7C','#74C0FC','#DA77F2',
                    '#F06595','#FF922B','#FCC419','#51CF66','#339AF0','#CC5DE8',
                    '#E64980','#FD7E14','#FAB005','#40C057','#228BE6','#BE4BDB',
                    '#D6336C','#E8590C','#F08C00','#2F9E44','#1C7ED6','#9C36B5'];

    for (let i = 0; i < 30; i++) {
      const item = list[i];
      const color = colors[i];
      if (item) {
        html += `<div class="challenge-dot-wrapper" title="${Dashboard.escapeHtml(item.text)}">
          <div class="challenge-dot ${item.done ? 'done' : ''}" style="--dot-color:${color}" data-id="${item.id}">
            <span class="challenge-num">${i+1}</span>
          </div>
          <span class="challenge-label">${Dashboard.escapeHtml(item.text.length > 6 ? item.text.slice(0,6)+'..' : item.text)}</span>
          <span class="challenge-del" data-del="${item.id}">×</span>
        </div>`;
      } else {
        html += `<div class="challenge-dot-wrapper empty">
          <div class="challenge-dot empty-dot">
            <span class="challenge-num">${i+1}</span>
          </div>
        </div>`;
      }
    }

    grid.innerHTML = html;

    // 点击切换完成状态
    grid.querySelectorAll('.challenge-dot:not(.empty-dot)').forEach(dot => {
      dot.addEventListener('click', () => this.toggle(dot.dataset.id));
    });

    // 删除
    grid.querySelectorAll('.challenge-del').forEach(del => {
      del.addEventListener('click', (e) => {
        e.stopPropagation();
        this.remove(del.dataset.del);
      });
    });
  },
};
