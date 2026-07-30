/* ========================================
   卿卿日常 · Dashboard 模块
   ======================================== */

const Dashboard = {
  init() {
    this.updateDate();
    this.showRandomQuote();

    document.querySelectorAll('.action-card[data-goto]').forEach(card => {
      card.addEventListener('click', () => {
        App.navigateTo(card.dataset.goto);
      });
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

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },
};
