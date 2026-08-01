/* ========================================
   卿卿日常 · 应用主入口
   ======================================== */

const App = {
  currentPanel: 'dashboard',
  sidebarOpen: false,

  async init() {
    // 先从云端同步数据（解决跨设备数据不一致问题）
    await Promise.race([
      Storage.syncFromCloud(),
      new Promise(r => setTimeout(r, 3000))
    ]);

    // 恢复上次面板
    const savedPanel = Storage.get(CONFIG.storageKeys.currentPanel);
    if (savedPanel && ['dashboard', 'berkshire', 'gex', 'challenges', 'notes', 'expression', 'mood'].includes(savedPanel)) {
      this.currentPanel = savedPanel;
    }

    // 初始化所有模块
    MarketStatus.start();
    MarketData.init();
    Dashboard.init();
    Berkshire.init();
    GexAnalyzer.init();
    Challenges.init();
    Notes.init();
    Expression.init();
    DailyNews.init();
    Checkin.init();
    DailyQuote.init();
    MoodCalendar.init();
    GoalProgress.init();

    // 导航绑定
    this.bindNavigation();

    // 底部 Tab 栏导航 (移动端)
    document.querySelectorAll('.tab-item').forEach(item => {
      item.addEventListener('click', () => {
        const panel = item.dataset.panel;
        this.navigateTo(panel);
      });
    });

    // 刷新按钮
    document.getElementById('btnRefresh').addEventListener('click', () => {
      MarketStatus.updateUI();
      MarketData.fetchAll();
      Helpers.showToast('已刷新', 'info');
    });

    // Logo 点击打开/关闭侧边栏（手机端抽屉菜单）
    document.getElementById('logoClick').addEventListener('click', () => {
      this.toggleSidebar();
    });

    // 汉堡按钮打开侧边栏（手机端抽屉菜单）
    const hb = document.getElementById('hamburger');
    if (hb) hb.addEventListener('click', () => this.openSidebar());

    // 点击遮罩关闭侧边栏
    document.getElementById('sidebarOverlay').addEventListener('click', () => {
      this.closeSidebar();
    });

    // 显示初始面板
    this.navigateTo(this.currentPanel, false);
  },

  bindNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => {
        const panel = item.dataset.panel;
        this.navigateTo(panel);
        this.closeSidebar();
      });
    });
  },

  toggleSidebar() {
    this.sidebarOpen = !this.sidebarOpen;
    this.updateSidebarState();
  },

  openSidebar() {
    this.sidebarOpen = true;
    this.updateSidebarState();
  },

  closeSidebar() {
    this.sidebarOpen = false;
    this.updateSidebarState();
  },

  updateSidebarState() {
    document.getElementById('sidebar').classList.toggle('sidebar-open', this.sidebarOpen);
    document.getElementById('sidebarOverlay').classList.toggle('active', this.sidebarOpen);
  },

  navigateTo(panel, save = true) {
    // 更新侧边栏导航高亮
    document.querySelectorAll('.nav-item').forEach(n => {
      n.classList.toggle('active', n.dataset.panel === panel);
    });

    // 更新底部 Tab 栏高亮
    document.querySelectorAll('.tab-item').forEach(t => {
      t.classList.toggle('active', t.dataset.panel === panel);
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

// 暴露到全局
window.App = App;
