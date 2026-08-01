/* ========================================
   卿卿日常 · 市场行情 (v8 - 静态JSON)
   ======================================== */

const MarketData = {
  cache: {},
  stockCache: {},
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
    this.fetchWatchlistStocks();
  },

  // 个股通过新浪 script 标签加载
  fetchWatchlistStocks() {
    const list = Storage.getArray(CONFIG.storageKeys.watchlist);
    if (list.length === 0) return;

    const codes = list.map(item => {
      const sym = item.symbol.toUpperCase();
      if (item.market === 'cn') {
        return sym.startsWith('6') ? 's_sh' + sym.replace(/\.(SH|SZ)/i, '') : 's_sz' + sym.replace(/\.(SH|SZ)/i, '');
      } else if (item.market === 'hk') {
        return 'rt_hk' + sym.replace('.HK', '').padStart(4, '0');
      } else {
        return 'gb_' + sym.toLowerCase().replace(/[^a-z]/g, '');
      }
    });

    const script = document.createElement('script');
    script.src = 'https://hq.sinajs.cn/list=' + codes.join(',') + '?_=' + Date.now();
    script.charset = 'gbk';
    script.onload = () => {
      this.parseStockData(codes);
      this.updateWatchlistPrices();
      script.remove();
    };
    script.onerror = () => { script.remove(); };
    document.head.appendChild(script);
  },

  parseStockData(codes) {
    codes.forEach(code => {
      const raw = window['hq_str_' + code];
      if (!raw || typeof raw !== 'string') return;
      const f = raw.split(',');
      if (f.length < 4) return;
      let price, change, changePct;
      if (code.startsWith('gb_')) { price = parseFloat(f[1]); changePct = parseFloat(f[2]); change = parseFloat(f[4]); }
      else if (code.startsWith('s_')) { price = parseFloat(f[1]); change = parseFloat(f[2]); changePct = parseFloat(f[3]); }
      else if (code.startsWith('rt_hk')) { price = parseFloat(f[2]); const prev = parseFloat(f[3]); change = price - prev; changePct = parseFloat(f[8]) || (prev ? change/prev*100 : 0); }
      if (!isNaN(price)) {
        const sym = code.replace('gb_', '').replace('s_sh', '').replace('s_sz', '').replace('rt_hk', '').toUpperCase();
        this.stockCache[sym] = { price, change: change || 0, changePct: changePct || 0 };
      }
      delete window['hq_str_' + code];
    });
  },

  updateWatchlistPrices() {
    const list = Storage.getArray(CONFIG.storageKeys.watchlist);
    const items = document.querySelectorAll('.watchlist-item');
    items.forEach((item, idx) => {
      const wl = list[idx];
      if (!wl) return;
      const cleanSym = wl.symbol.toUpperCase().replace(/\.(SH|SZ|HK)/i, '').replace(/[^A-Z0-9]/g, '');
      let data = this.stockCache[cleanSym] || this.stockCache[wl.symbol.toUpperCase()];
      if (!data) { for (const [k, v] of Object.entries(this.stockCache)) { if (k === cleanSym || cleanSym.includes(k)) { data = v; break; } } }

      const old = item.querySelector('.wl-price');
      if (old) old.remove();

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

// 暴露到全局
window.MarketData = MarketData;
