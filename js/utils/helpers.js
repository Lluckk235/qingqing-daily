/* ========================================
   卿卿日常 · 工具函数
   ======================================== */

const Helpers = {
  // 格式化日期
  formatDate(date = new Date()) {
    const d = date instanceof Date ? date : new Date(date);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const w = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()];
    return `${y}年${m}月${day}日 星期${w}`;
  },

  // 格式化时间
  formatTime(date = new Date()) {
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  },

  // 格式化时间戳
  formatTimestamp(ts) {
    const d = new Date(ts);
    const now = new Date();
    const diff = now - d;
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
    return this.formatDate(d);
  },

  // 生成唯一ID
  uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  },

  // 防抖
  debounce(fn, delay = 300) {
    let timer;
    return function(...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  },

  // 节流
  throttle(fn, delay = 300) {
    let last = 0;
    return function(...args) {
      const now = Date.now();
      if (now - last >= delay) {
        last = now;
        fn.apply(this, args);
      }
    };
  },

  // 获取市场中文名
  getMarketName(market) {
    const map = { us: '美股', cn: 'A股', hk: '港股' };
    return map[market] || market;
  },

  // 获取市场标签颜色
  getMarketColor(market) {
    const map = { us: 'info', cn: 'warm', hk: 'positive' };
    return map[market] || 'info';
  },

  // Toast 通知
  showToast(message, type = 'info', duration = 2500) {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(20px)';
      toast.style.transition = 'all 0.25s ease';
      setTimeout(() => toast.remove(), 250);
    }, duration);
  },

  // 复制到剪贴板
  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      this.showToast('已复制到剪贴板', 'success');
    } catch {
      this.showToast('复制失败', 'error');
    }
  },

  // 随机选择
  randomPick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  },
};
