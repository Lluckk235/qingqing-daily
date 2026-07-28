/* ========================================
   卿卿日常 · 应用主入口
   ======================================== */

const App = {
  currentPanel: 'dashboard',

  init() {
    // 恢复上次面板
    const savedPanel = Storage.get(CONFIG.storageKeys.currentPanel);
    if (savedPanel && ['dashboard', 'berkshire', 'gex', 'notes'].includes(savedPanel)) {
      this.currentPanel = savedPanel;
    }

    // 初始化所有模块
    MarketStatus.start();
    MarketData.init();
    Dashboard.init();
    Berkshire.init();
    GexAnalyzer.init();
    Notes.init();

    // 导航绑定
    this.bindNavigation();

    // 刷新按钮
    document.getElementById('btnRefresh').addEventListener('click', () => {
      MarketStatus.updateUI();
      MarketData.fetchAll();
      Dashboard.showRandomQuote();
      Helpers.showToast('已刷新', 'info');
    });

    // Logo 点击切换侧边栏（手机端）
    document.getElementById('logoClick').addEventListener('click', () => {
      document.getElementById('sidebar').classList.toggle('sidebar-open');
    });

    // 显示初始面板
    this.navigateTo(this.currentPanel, false);
  },

  bindNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => {
        const panel = item.dataset.panel;
        this.navigateTo(panel);
      });
    });
    // 移动端底部导航
    document.querySelectorAll('.mobile-nav a').forEach(a => {
      a.addEventListener('click', () => {
        const panel = a.dataset.panel;
        this.navigateTo(panel);
      });
    });
  },

  navigateTo(panel, save = true) {
    // 更新导航高亮
    document.querySelectorAll('.nav-item').forEach(n => {
      n.classList.toggle('active', n.dataset.panel === panel);
    });
    document.querySelectorAll('.mobile-nav a').forEach(a => {
      a.classList.toggle('active', a.dataset.panel === panel);
    });

    // 更新面板显示
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    const targetPanel = document.getElementById(`panel-${panel}`);
    if (targetPanel) {
      targetPanel.classList.add('active');
    }

    this.currentPanel = panel;
    if (save) {
      Storage.set(CONFIG.storageKeys.currentPanel, panel);
    }
  },
};

// 启动应用
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
