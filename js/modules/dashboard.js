/* ========================================
   卿卿日常 · Dashboard 模块
   ======================================== */

const Dashboard = {
  init() {
    this.updateDate();
    DailyQuote.init();

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

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },
};
