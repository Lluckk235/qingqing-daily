/* ========================================
   卿卿日常 · 市场行情模块 (v7 - 同域代理)
   ======================================== */

const MarketData = {
  cache: {},
  stockCache: {},
  lastFetch: 0,
  stockLastFetch: 0,
  cacheDuration: 3 * 60 * 1000,

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

  fetchAll() {
    this.fetchIndexes();
    this.fetchStocks();
  },

  async fetchIndexes() {
    try {
      const resp = await fetch('/api/market');
      if (!resp.ok) throw new Error('Status ' + resp.status);
      const data = await resp.json();
      const keyMap = { nasdaq: 'nasdaq', hs300: 'hs300', sh: 'sh', hsi: 'hsi' };
      for (const [k, v] of Object.entries(data)) {
        if (keyMap[k] && v.price) {
          this.cache[keyMap[k]] = { price: v.price, change: v.change || 0, changePct: v.changePct || 0, time: Date.now() };
        }
      }
      this.lastFetch = Date.now();
      this.saveCache();
    } catch (e) {
      console.warn('Index fetch:', e.message);
    }
    this.updateUI();
  },

  async fetchStocks() {
    const list = Storage.getArray(CONFIG.storageKeys.watchlist);
    if (list.length === 0) return;

    const codes = list.map(item => {
      const sym = item.symbol.toUpperCase();
      if (item.market === 'cn') {
        if (sym.startsWith('6')) return 's_sh' + sym.replace(/\.(SH|SZ)/i, '');
        return 's_sz' + sym.replace(/\.(SH|SZ)/i, '');
      } else if (item.market === 'hk') {
        return 'rt_hk' + sym.replace('.HK', '').padStart(4, '0');
      } else {
        return 'gb_' + sym.toLowerCase().replace(/[^a-z]/g, '');
      }
    });

    try {
      const resp = await fetch('/api/stock?codes=' + encodeURIComponent(codes.join(',')));
      if (!resp.ok) throw new Error('Stock proxy error');
      const data = await resp.json();
      this.stockCache = data;
      this.stockLastFetch = Date.now();
    } catch (e) {
      console.warn('Stock fetch:', e.message);
    }
    this.updateWatchlistPrices();
  },

  updateWatchlistPrices() {
    const list = Storage.getArray(CONFIG.storageKeys.watchlist);
    const items = document.querySelectorAll('.watchlist-item');
    if (items.length === 0) return;

    items.forEach((item, idx) => {
      const wl = list[idx];
      if (!wl) return;
      const sym = wl.symbol.toUpperCase();
      const cleanSym = sym.replace(/\.(SH|SZ|HK)/i, '').replace(/[^A-Z0-9]/g, '');
      let data = this.stockCache[cleanSym] || this.stockCache[sym];
      if (!data) {
        for (const [k, v] of Object.entries(this.stockCache)) {
          if (k === cleanSym || cleanSym.includes(k) || k.includes(cleanSym)) { data = v; break; }
        }
      }

      const oldPrice = item.querySelector('.wl-price');
      if (oldPrice) oldPrice.remove();

      if (data && data.price) {
        const span = document.createElement('span');
        span.className = 'wl-price ' + (data.change >= 0 ? 'up' : 'down');
        span.textContent = data.price.toFixed(2);
        const right = item.querySelector('.wl-right');
        if (right) right.prepend(span);
      }
    });
  },

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
