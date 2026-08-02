/* ========================================
   卿卿日常 · 每日开屏启动页
   每台设备每天显示一次，仅使用 localStorage
   ======================================== */

const Splash = {
  storageKey: 'qq_splash_seen_date',
  timer: null,

  init() {
    this.screen = document.getElementById('splashScreen');
    this.meta = document.getElementById('splashMeta');
    this.startBtn = document.getElementById('splashStartBtn');
    if (!this.screen || !this.startBtn) return;

    this.renderMeta();
    this.timer = setInterval(() => this.renderMeta(), 30000);

    if (this.hasSeenToday()) {
      this.hide(true);
      return;
    }

    this.show();
    this.startBtn.addEventListener('click', () => {
      this.markSeenToday();
      this.hide();
    });
  },

  todayKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  formatMeta(date = new Date()) {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    return `${hours}:${minutes} · ${date.getMonth() + 1}月${date.getDate()}日 ${weekdays[date.getDay()]}`;
  },

  renderMeta() {
    if (this.meta) this.meta.textContent = this.formatMeta();
  },

  hasSeenToday() {
    try {
      return localStorage.getItem(this.storageKey) === this.todayKey();
    } catch (e) {
      return false;
    }
  },

  markSeenToday() {
    try {
      localStorage.setItem(this.storageKey, this.todayKey());
    } catch (e) {
      console.warn('[Splash] localStorage unavailable:', e.message);
    }
  },

  show() {
    this.screen.setAttribute('aria-hidden', 'false');
    requestAnimationFrame(() => {
      this.screen.classList.add('is-visible');
    });
  },

  hide(immediate = false) {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    if (immediate) {
      this.screen.classList.remove('is-visible');
      this.screen.setAttribute('aria-hidden', 'true');
      return;
    }

    this.screen.classList.add('is-leaving');
    this.screen.classList.remove('is-visible');
    window.setTimeout(() => {
      this.screen.classList.remove('is-leaving');
      this.screen.setAttribute('aria-hidden', 'true');
    }, 260);
  },
};

window.Splash = Splash;

document.addEventListener('DOMContentLoaded', () => {
  Splash.init();
});
