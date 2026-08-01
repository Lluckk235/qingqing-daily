/* ========================================
   卿卿日常 · 心情日历模块
   月历展示（参考 DailyBean 布局）+ Pastel 心情
   数据走 Storage（自动 localStorage + Supabase 同步）
   ======================================== */

const MoodCalendar = {
  // 心情定义：使用自定义 3x3 pastel 表情图，避免系统 emoji 风格割裂。
  MOODS: [
    { key: 'happy',     label: '开心的一天',     color: '#F6A8D0', x: '0%',   y: '0%',   aliases: ['joy'] },
    { key: 'calm',      label: '平静的一天',     color: '#DDF3D5', x: '50%',  y: '0%' },
    { key: 'fulfilled', label: '充实的一天',     color: '#F7D96B', x: '100%', y: '0%',   aliases: ['energy'] },
    { key: 'normal',    label: '普通的一天',     color: '#F3E4C8', x: '0%',   y: '50%' },
    { key: 'tired',     label: '疲惫的一天',     color: '#D8D0FF', x: '50%',  y: '50%' },
    { key: 'sad',       label: '低落的一天',     color: '#BFD8F7', x: '100%', y: '50%' },
    { key: 'anxious',   label: '焦虑的一天',     color: '#F5C99B', x: '0%',   y: '100%' },
    { key: 'angry',     label: '生气的一天',     color: '#F58D85', x: '50%',  y: '100%' },
    { key: 'unexpected',label: '意想不到的一天', color: '#CFEDEA', x: '100%', y: '100%' },
  ],

  // 当前展示的年/月
  viewYear: new Date().getFullYear(),
  viewMonth: new Date().getMonth(),

  // 选中日期（用于弹层）
  selectedDate: null,

  get data() {
    return Storage.get(CONFIG.storageKeys.moodCalendar, {});
  },

  set data(val) {
    Storage.set(CONFIG.storageKeys.moodCalendar, val);
  },

  moodByKey(key) {
    return this.MOODS.find(m => m.key === key || (m.aliases || []).includes(key)) || null;
  },

  moodIcon(mood, className) {
    if (!mood) return '';
    return `<span class="${className} mood-icon" aria-label="${mood.label}"
      style="--mood-x:${mood.x};--mood-y:${mood.y};--mood-color:${mood.color}"></span>`;
  },

  // YYYY-MM-DD
  dateKey(y, m, d) {
    const mm = String(m + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    return `${y}-${mm}-${dd}`;
  },

  init() {
    this.container = document.getElementById('moodCalendarContainer');
    if (!this.container) return;
    this.render();
    this.bindEvents();
  },

  render() {
    const y = this.viewYear;
    const m = this.viewMonth;
    const firstDay = new Date(y, m, 1).getDay(); // 0=周日
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const data = this.data;

    // 上个月的补位天数（用于填满首行）
    const prevDays = firstDay;
    const cells = [];

    // 头部
    const monthLabel = `${y}年${m + 1}月`;

    let html = `
      <div class="mood-cal-card">
        <div class="mood-cal-header">
          <button class="mood-cal-nav btn-icon" id="moodPrevMonth" aria-label="上个月">‹</button>
          <span class="mood-cal-title">${y}年${m + 1}月</span>
          <button class="mood-cal-nav btn-icon" id="moodNextMonth" aria-label="下个月">›</button>
        </div>
        <div class="mood-cal-weekdays">
          ${['日', '一', '二', '三', '四', '五', '六'].map(w => `<span>${w}</span>`).join('')}
        </div>
        <div class="mood-cal-grid">
    `;

    // 前置空格
    for (let i = 0; i < prevDays; i++) {
      html += `<div class="mood-cal-cell empty"></div>`;
    }

    // 日期格
    for (let d = 1; d <= daysInMonth; d++) {
      const key = this.dateKey(y, m, d);
      const entry = data[key];
      const mood = entry ? this.moodByKey(entry.mood) : null;
      const isToday = key === this.dateKey(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
      const cls = ['mood-cal-cell'];
      if (isToday) cls.push('today');
      if (mood) cls.push('has-mood');
      html += `
        <div class="${cls.join(' ')}" data-date="${key}">
          <span class="mood-cal-day">${d}</span>
          ${mood ? this.moodIcon(mood, 'mood-cal-emoji') : ''}
        </div>
      `;
    }

    html += `</div></div>`;
    this.container.innerHTML = html;
  },

  bindEvents() {
    // 月份切换
    const prev = document.getElementById('moodPrevMonth');
    const next = document.getElementById('moodNextMonth');
    if (this._bound) return; // 防止重复绑定
    this._bound = true;

    if (this.container) {
      this.container.addEventListener('click', (e) => {
        if (e.target.closest('#moodPrevMonth')) {
          this.shiftMonth(-1);
        } else if (e.target.closest('#moodNextMonth')) {
          this.shiftMonth(1);
        } else {
          const cell = e.target.closest('.mood-cal-cell[data-date]');
          if (cell) this.openPicker(cell.dataset.date);
        }
      });
    }
  },

  shiftMonth(delta) {
    let m = this.viewMonth + delta;
    let y = this.viewYear;
    if (m < 0) { m = 11; y--; }
    if (m > 11) { m = 0; y++; }
    this.viewMonth = m;
    this.viewYear = y;
    this.render();
    this.bindEvents();
  },

  openPicker(dateKey) {
    const data = this.data;
    const entry = data[dateKey] || {};
    const mood = this.moodByKey(entry.mood);

    // 创建/复用弹层
    let sheet = document.getElementById('moodPickerSheet');
    if (!sheet) {
      sheet = document.createElement('div');
      sheet.className = 'mood-picker-overlay hidden';
      sheet.id = 'moodPickerSheet';
      document.body.appendChild(sheet);
      // 点击遮罩关闭（只绑定一次）
      sheet.addEventListener('click', (e) => { if (e.target === sheet) sheet.classList.add('hidden'); });
    }

    const selectedMood = this.moodByKey(entry.mood);
    const moodsHtml = this.MOODS.map(m =>
      `<button class="mood-picker-option ${selectedMood && selectedMood.key === m.key ? 'selected' : ''}"
        data-mood="${m.key}" style="--mood-color:${m.color}">
        ${this.moodIcon(m, 'mood-picker-emoji')}
        <span class="mood-picker-label">${m.label}</span>
      </button>`
    ).join('');

    sheet.innerHTML = `
      <div class="mood-picker-sheet">
        <div class="mood-picker-handle"></div>
        <div class="mood-picker-title">${dateKey} 的心情</div>
        <div class="mood-picker-options">${moodsHtml}</div>
        <textarea class="mood-picker-note input-lg" id="moodPickerNote"
          placeholder="写点什么…（可选）" rows="2">${entry.note ? Dashboard.escapeHtml(entry.note) : ''}</textarea>
        <div class="mood-picker-actions">
          ${entry.mood ? `<button class="btn-text mood-picker-clear" id="moodPickerClear">清除</button>` : ''}
          <button class="btn-primary mood-picker-save" id="moodPickerSave">保存</button>
        </div>
      </div>
    `;

    sheet.classList.remove('hidden');

    // 绑定事件（每次重新创建，故直接绑定）
    sheet.querySelector('.mood-picker-options').addEventListener('click', (e) => {
      const opt = e.target.closest('.mood-picker-option');
      if (!opt) return;
      sheet.querySelectorAll('.mood-picker-option').forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
    });

    const close = () => sheet.classList.add('hidden');

    const save = () => {
      const sel = sheet.querySelector('.mood-picker-option.selected');
      const note = sheet.querySelector('#moodPickerNote').value.trim();
      const cur = this.data;
      if (sel) {
        cur[dateKey] = { mood: sel.dataset.mood, note };
      } else if (note) {
        cur[dateKey] = { mood: entry.mood || '', note };
      } else {
        delete cur[dateKey];
      }
      this.data = cur;
      this.render();
      this.bindEvents();
      close();
      Helpers.showToast('已保存心情', 'success');
    };
    sheet.querySelector('#moodPickerSave').addEventListener('click', save);

    const clear = sheet.querySelector('#moodPickerClear');
    if (clear) {
      clear.addEventListener('click', () => {
        const cur = this.data;
        delete cur[dateKey];
        this.data = cur;
        this.render();
        this.bindEvents();
        close();
      });
    }
  },
};

// 暴露到全局，确保 app.js 能访问
window.MoodCalendar = MoodCalendar;
