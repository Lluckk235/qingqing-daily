/* ========================================
   卿卿日常 · 打卡签到模块
   数据源: Supabase (跨设备同步), localStorage 缓存兜底
   ======================================== */

const STORAGE_KEY = 'qq_checkins_cache';

const Checkin = {
  checkins: [],
  loaded: false,

  async init() {
    await this.load();
    this.render();
    this.bindEvents();
  },

  async load() {
    if (!Supabase.isAuthenticated) { this.checkins = []; this.loaded = true; return; }
    // 先读本地缓存，立即渲染
    const cached = Storage.get(STORAGE_KEY);
    this.checkins = cached || [];
    this.loaded = !!cached;

    // 异步从 Supabase 拉取最新数据
    try {
      const data = await Supabase.get('checkins?order=date.asc');
      this.checkins = (data || []).map(r => r.date);
      this.loaded = true;
      Storage.set(STORAGE_KEY, this.checkins); // 更新缓存
    } catch (e) {
      console.warn('Checkin: Supabase 读取失败，使用本地缓存', e.message);
    }
  },

  getToday() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  },

  formatDate(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  },

  checkedToday() {
    return this.checkins.includes(this.getToday());
  },

  calculateStreak() {
    if (this.checkins.length === 0) return 0;

    const sorted = [...new Set(this.checkins)].sort();
    const today = this.getToday();
    const last = sorted[sorted.length - 1];

    // 如果最后打卡不在今天也不在昨天，断签
    if (last !== today) {
      const yesterday = this.formatDate(new Date(Date.now() - 86400000));
      if (last !== yesterday) return 0;
    }

    let streak = 1;
    for (let i = sorted.length - 1; i > 0; i--) {
      const curr = new Date(sorted[i] + 'T00:00:00');
      const prev = new Date(sorted[i - 1] + 'T00:00:00');
      if ((curr - prev) / 86400000 === 1) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  },

  getMonthCount() {
    const prefix = this.getToday().slice(0, 7); // YYYY-MM
    return this.checkins.filter(d => d.startsWith(prefix)).length;
  },

  async doCheckin() {
    if (!Supabase.isAuthenticated) return WorkspaceAccess.openAccess(Boolean(WorkspaceAccess.inviteToken));
    const today = this.getToday();
    if (this.checkins.includes(today)) return;

    const record = { date: today, user_id: Supabase.userId };
    this.checkins.push(today);
    Storage.set(STORAGE_KEY, this.checkins);
    this.render();

    try {
      await Supabase.post('checkins', record);
    } catch (e) {
      console.warn('Checkin: Supabase 写入失败，已保存到本地', e.message);
    }
  },

  render() {
    const checked = this.checkedToday();
    const streak = this.calculateStreak();

    const html = checked ? `
      <div class="checkin-done">
        <span class="checkin-icon">✅</span>
        <span class="checkin-label">今日已打卡</span>
      </div>
      <div class="checkin-streak">连续坚持 <strong>${streak}</strong> 天</div>
    ` : `
      <button class="checkin-btn" id="checkinBtn">
        <span class="checkin-btn-icon">☀️</span>
        <span>打卡签到</span>
      </button>
      <div class="checkin-streak">连续坚持 <strong>${streak}</strong> 天</div>
    `;

    const el = document.getElementById('checkinSection');
    if (el) el.innerHTML = html;

    const elMobile = document.getElementById('checkinSectionMobile');
    if (elMobile) elMobile.innerHTML = html;
  },

  bindEvents() {
    // 事件委托 - 同时绑定桌面端和移动端容器
    ['checkinSection', 'checkinSectionMobile'].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('click', (e) => {
        const btn = e.target.closest('#checkinBtn');
        if (btn) {
          btn.disabled = true;
          this.doCheckin().finally(() => {
            document.querySelectorAll('#checkinBtn').forEach(b => b.disabled = false);
          });
        }
      });
    });
  },
};

// 暴露到全局
window.Checkin = Checkin;
