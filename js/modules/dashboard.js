/* ========================================
   卿卿日常 · Dashboard 模块
   ======================================== */

const Dashboard = {
  init() {
    this.renderWatchlist();
    this.updateDate();
    this.showRandomQuote();

    document.getElementById('btnAddWatch').addEventListener('click', () => this.showAddModal());
    document.getElementById('btnConfirmAdd').addEventListener('click', () => this.addWatchItem());
    document.getElementById('btnCancelModal').addEventListener('click', () => this.hideAddModal());
    document.getElementById('btnCloseModal').addEventListener('click', () => this.hideAddModal());
    document.getElementById('modalOverlay').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) this.hideAddModal();
    });

    document.querySelectorAll('.action-card[data-goto]').forEach(card => {
      card.addEventListener('click', () => {
        App.navigateTo(card.dataset.goto);
      });
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.hideAddModal();
    });
  },

  updateDate() {
    document.getElementById('dateDisplay').textContent = Helpers.formatDate();
    setInterval(() => {
      document.getElementById('dateDisplay').textContent = Helpers.formatDate();
    }, 60000);
  },

  showRandomQuote() {
    const quote = Helpers.randomPick(CONFIG.quotes);
    document.getElementById('sidebarQuote').textContent = `"${quote}"`;
  },

  // --- 关注列表 ---
  renderWatchlist() {
    const container = document.getElementById('watchlistContainer');
    const list = Storage.getArray(CONFIG.storageKeys.watchlist);

    if (list.length === 0) {
      container.innerHTML = '<div class="empty-hint">点击 "+ 添加" 添加关注的公司</div>';
      return;
    }

    container.innerHTML = list.map((item, idx) => `
      <div class="watchlist-item">
        <div class="wl-info" data-idx="${idx}">
          <span class="wl-symbol">${this.escapeHtml(item.symbol)}</span>
          <span class="wl-name">${this.escapeHtml(item.name || '')}</span>
          <span class="wl-market">${Helpers.getMarketName(item.market)}</span>
        </div>
        <div class="wl-right">
          <span class="wl-price loading">--</span>
          <span class="wl-remove" data-idx="${idx}" title="移除">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </span>
        </div>
      </div>
    `).join('');

    // 移除按钮
    container.querySelectorAll('.wl-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.idx);
        this.removeWatchItem(idx);
      });
    });

    // 刷新股价
    setTimeout(() => MarketData.fetchWatchlistStocks(), 500);

    // 点击跳转研究
    container.querySelectorAll('.wl-info').forEach(info => {
      info.addEventListener('click', (e) => {
        const idx = parseInt(info.dataset.idx);
        const wl = list[idx];
        if (wl) {
          document.getElementById('companyInput').value = wl.symbol;
          App.navigateTo('berkshire');
        }
      });
    });
  },

  showAddModal() {
    document.getElementById('modalOverlay').classList.remove('hidden');
    document.getElementById('watchSymbol').focus();
  },

  hideAddModal() {
    document.getElementById('modalOverlay').classList.add('hidden');
    document.getElementById('watchSymbol').value = '';
    document.getElementById('watchName').value = '';
  },

  addWatchItem() {
    const symbol = document.getElementById('watchSymbol').value.trim();
    const name = document.getElementById('watchName').value.trim();
    const market = document.getElementById('watchMarket').value;

    if (!symbol) {
      Helpers.showToast('请输入公司代码', 'error');
      return;
    }

    const list = Storage.getArray(CONFIG.storageKeys.watchlist);
    if (list.some(item => item.symbol.toUpperCase() === symbol.toUpperCase())) {
      Helpers.showToast('该公司已在关注列表中', 'info');
      return;
    }

    Storage.pushArray(CONFIG.storageKeys.watchlist, { symbol: symbol.toUpperCase(), name, market });
    this.renderWatchlist();
    this.hideAddModal();
    Helpers.showToast('已添加', 'success');
  },

  removeWatchItem(idx) {
    Storage.removeArray(CONFIG.storageKeys.watchlist, (_, i) => i === idx);
    this.renderWatchlist();
  },

  addActivity(type, message) {
    // 保留接口，但不再渲染活动面板
    Storage.pushArray(CONFIG.storageKeys.activity, { type, message, time: Date.now() });
  },

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },
};
