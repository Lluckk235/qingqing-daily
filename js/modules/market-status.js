/* ========================================
   卿卿日常 · 市场状态模块
   ======================================== */

const MarketStatus = {
  // 美股交易时间（美东 9:30-16:00，对应北京时间）
  // 夏令时：21:30-04:00，冬令时：22:30-05:00
  isUSMarketOpen() {
    const now = new Date();
    const day = now.getUTCDay();
    if (day === 0 || day === 6) return 'closed'; // 周末

    // 简化判断：北京时间 21:30 - 次日 04:00（夏令时）
    const hours = now.getUTCHours() + 8; // 转北京时间
    const minutes = now.getUTCMinutes();
    const totalMinutes = hours * 60 + minutes;

    // 美股盘前 17:00-21:30（北京时间）
    if (totalMinutes >= 1020 && totalMinutes < 1290) return 'pre';
    // 美股盘中 21:30-04:00
    if (totalMinutes >= 1290 || totalMinutes < 240) return 'open';
    // 美股盘后 04:00-08:00
    if (totalMinutes >= 240 && totalMinutes < 480) return 'after';
    return 'closed';
  },

  // A股交易时间（北京时间 9:30-15:00）
  isCNMarketOpen() {
    const now = new Date();
    const day = now.getUTCDay();
    if (day === 0 || day === 6) return 'closed';

    const hours = now.getUTCHours() + 8;
    const minutes = now.getUTCMinutes();
    const totalMinutes = hours * 60 + minutes;

    // 集合竞价 9:15-9:25
    if (totalMinutes >= 555 && totalMinutes < 570) return 'pre';
    // 盘中 9:30-11:30, 13:00-15:00
    if ((totalMinutes >= 570 && totalMinutes < 690) ||
        (totalMinutes >= 780 && totalMinutes < 900)) return 'open';
    // 午休
    if (totalMinutes >= 690 && totalMinutes < 780) return 'closed';
    return 'closed';
  },

  getStatusText(status) {
    const map = {
      open: '交易中',
      closed: '休市',
      pre: '盘前',
      after: '盘后',
      loading: '加载中',
    };
    return map[status] || '--';
  },

  updateUI() {
    const usStatus = this.isUSMarketOpen();
    const cnStatus = this.isCNMarketOpen();

    const usDot = document.getElementById('usMarketDot');
    const usLabel = document.getElementById('usMarketStatus');
    const cnDot = document.getElementById('cnMarketDot');
    const cnLabel = document.getElementById('cnMarketStatus');

    usDot.className = `market-dot ${usStatus}`;
    usLabel.textContent = this.getStatusText(usStatus);

    cnDot.className = `market-dot ${cnStatus}`;
    cnLabel.textContent = this.getStatusText(cnStatus);

    const badge = document.getElementById('marketTimeBadge');
    if (usStatus === 'open') {
      badge.textContent = '美股交易中';
      badge.className = 'badge positive';
    } else if (cnStatus === 'open') {
      badge.textContent = 'A股交易中';
      badge.className = 'badge warm';
    } else if (usStatus === 'pre' || cnStatus === 'pre') {
      badge.textContent = '盘前准备';
      badge.className = 'badge info';
    } else {
      badge.textContent = '市场休市';
      badge.className = 'badge';
    }
  },

  start() {
    this.updateUI();
    setInterval(() => this.updateUI(), 60000); // 每分钟更新
  },
};
