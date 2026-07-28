/* ========================================
   卿卿日常 · 市场行情 (v8 - 静态JSON)
   ======================================== */

const MarketData = {
  cache: {},
  lastFetch: 0,
  cacheDuration: 2 * 60 * 1000,

  init() {
    this.loadCache();
    this.updateUI();
    this.fetchAll();
    setInterval(() => this.fetchAll(), this.cacheDuration);
  },

  loadCache() {
    try {
      const cached = localStorage.getItem('market_data_cache');
      if (cached) {
        const data = JSON.parse(cached);
        if (Date.now() - data.time < this.cacheDuration) {
          this.cache = data.values || {};
          this.lastFetch = data.time;
        }
      }
    } catch (e) {}
  },

  saveCache() {
    try {
      localStorage.setItem('market_data_cache', JSON.stringify({ time: Date.now(), values: this.cache }));
    } catch (e) {}
  },

  async fetchAll() {
    if (this.lastFetch && (Date.now() - this.lastFetch < this.cacheDuration)) {
      this.updateUI();
      return;
    }
    try {
      const resp = await fetch('data/market.json', { cache: 'no-cache' });
      if (!resp.ok) throw new Error('Status ' + resp.status);
      const json = await resp.json();
      if (json.data) {
        const keyMap = { nasdaq: 'nasdaq', hs300: 'hs300', sh: 'sh', hsi: 'hsi' };
        for (const [k, v] of Object.entries(json.data)) {
          if (keyMap[k] && v.price) {
            this.cache[keyMap[k]] = { price: v.price, change: v.change || 0, changePct: v.changePct || 0, time: Date.now() };
          }
        }
        this.lastFetch = Date.now();
        this.saveCache();
      }
    } catch (e) {
      console.warn('Market fetch:', e.message);
    }
    this.updateUI();
  },

  // 个股不再通过API，保留占位
  fetchWatchlistStocks() {},
  updateWatchlistPrices() {},

  formatPrice(val) {
    if (val == null) return '--';
    return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
  },

  formatChange(change, changePct) {
    if (change == null) return { text: '--', cls: 'flat' };
    const sign = change >= 0 ? '+' : '';
    const pctSign = changePct >= 0 ? '+' : '';
    return {
      text: `${sign}${change.toFixed(2)} (${pctSign}${changePct.toFixed(2)}%)`,
      cls: change > 0 ? 'up' : change < 0 ? 'down' : 'flat',
    };
  },

  updateUI() {
    const items = [
      { id: 'shValue', changeId: 'shChange', key: 'sh' },
      { id: 'hs300Value', changeId: 'hs300Change', key: 'hs300' },
      { id: 'hsiValue', changeId: 'hsiChange', key: 'hsi' },
      { id: 'nasdaqValue', changeId: 'nasdaqChange', key: 'nasdaq' },
    ];
    let hasData = false;
    items.forEach(item => {
      const valEl = document.getElementById(item.id);
      const chgEl = document.getElementById(item.changeId);
      if (!valEl || !chgEl) return;
      const data = this.cache[item.key];
      if (data && data.price) {
        valEl.textContent = this.formatPrice(data.price);
        const chg = this.formatChange(data.change, data.changePct);
        chgEl.textContent = chg.text;
        chgEl.className = `market-change ${chg.cls}`;
        hasData = true;
      } else {
        valEl.textContent = '加载中...';
        chgEl.textContent = '--';
        chgEl.className = 'market-change flat';
      }
    });
    const badge = document.getElementById('marketTimeBadge');
    if (badge) {
      badge.textContent = hasData ? '实时' : '--';
      badge.className = 'badge' + (hasData ? ' positive' : '');
    }
  },
};
