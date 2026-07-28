/* ========================================
   卿卿日常 · AI Berkshire 集成模块
   ======================================== */

const Berkshire = {
  init() {
    this.renderSkills();
    this.renderHistory();
    this.bindEvents();
  },

  bindEvents() {
    const companyInput = document.getElementById('companyInput');
    const searchHints = document.getElementById('searchHints');

    // 搜索提示
    companyInput.addEventListener('input', Helpers.debounce((e) => {
      this.showSearchHints(e.target.value);
    }, 200));

    companyInput.addEventListener('focus', () => {
      if (companyInput.value.trim()) {
        this.showSearchHints(companyInput.value);
      }
    });

    // 点击外部关闭提示
    document.addEventListener('click', (e) => {
      if (!e.target.closest('#companyInput') && !e.target.closest('#searchHints')) {
        searchHints.classList.remove('visible');
      }
    });

    // 回车启动研究
    companyInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.startResearch();
      }
    });

    // 开始研究按钮
    document.getElementById('btnStartResearch').addEventListener('click', () => this.startResearch());

    // 清空历史
    document.getElementById('btnClearHistory').addEventListener('click', () => {
      Storage.remove(CONFIG.storageKeys.researchHistory);
      this.renderHistory();
      Helpers.showToast('研究历史已清空', 'info');
    });
  },

  showSearchHints(query) {
    const hints = document.getElementById('searchHints');
    if (!query || query.length < 1) {
      hints.classList.remove('visible');
      return;
    }

    const q = query.toLowerCase();
    const matches = CONFIG.companies.filter(c =>
      c.code.toLowerCase().includes(q) ||
      c.name.toLowerCase().includes(q)
    ).slice(0, 8);

    if (matches.length === 0) {
      hints.classList.remove('visible');
      return;
    }

    hints.innerHTML = matches.map(c => `
      <div class="search-hint-item" data-code="${c.code}" data-market="${c.market}">
        <span class="hint-code">${c.code}</span>
        <span class="hint-name">${c.name}</span>
        <span class="hint-market">${Helpers.getMarketName(c.market)}</span>
      </div>
    `).join('');

    hints.classList.add('visible');

    // 点击提示
    hints.querySelectorAll('.search-hint-item').forEach(item => {
      item.addEventListener('click', () => {
        document.getElementById('companyInput').value = item.dataset.code;
        hints.classList.remove('visible');
        this.startResearch();
      });
    });
  },

  startResearch() {
    const company = document.getElementById('companyInput').value.trim();
    if (!company) {
      Helpers.showToast('请输入公司名称或代码', 'error');
      return;
    }

    const researchType = document.getElementById('researchType').value;
    const typeName = document.getElementById('researchType').selectedOptions[0].textContent;

    // 记录到历史
    Storage.pushArray(CONFIG.storageKeys.researchHistory, {
      company,
      type: researchType,
      typeName,
      time: Date.now(),
    });

    // 记录活动
    Dashboard.addActivity('research', `研究：${company} (${typeName})`);

    // 构建 slash command
    const command = `/${researchType} ${company}`;

    // 复制命令到剪贴板
    Helpers.copyToClipboard(command);

    // 提示用户
    this.showResearchPrompt(company, typeName, command);
    this.renderHistory();
  },

  showResearchPrompt(company, typeName, command) {
    // 使用 toast 通知
    Helpers.showToast(`研究命令已就绪：${command}`, 'success', 4000);
  },

  // --- 可用 Skills ---
  renderSkills() {
    const grid = document.getElementById('skillsGrid');
    const categories = CONFIG.berkshire.categories;
    let html = '';

    for (const [category, skills] of Object.entries(categories)) {
      html += `<div style="grid-column:1/-1;font-size:0.8rem;color:var(--text-muted);font-weight:600;margin-top:4px;">${category}</div>`;
      skills.forEach(skill => {
        html += `
          <div class="skill-tag" data-skill="${skill.id}" data-name="${skill.name}" title="${skill.desc}">
            <span class="skill-category">/${skill.id}</span>
            <span>${skill.name}</span>
          </div>
        `;
      });
    }

    grid.innerHTML = html;

    // 点击 skill 快速填入研究类型
    grid.querySelectorAll('.skill-tag').forEach(tag => {
      tag.addEventListener('click', () => {
        document.getElementById('researchType').value = tag.dataset.skill;
        Helpers.showToast(`已选择：${tag.dataset.name}`, 'info');
      });
    });
  },

  // --- 研究历史 ---
  renderHistory() {
    const container = document.getElementById('researchHistory');
    const history = Storage.getArray(CONFIG.storageKeys.researchHistory);

    if (history.length === 0) {
      container.innerHTML = '<div class="empty-hint">还没有研究记录，输入公司名称开始第一次研究</div>';
      return;
    }

    container.innerHTML = history.map((h, i) => `
      <div class="history-item" data-idx="${i}">
        <div class="hi-left">
          <span class="hi-company">${Dashboard.escapeHtml(h.company)}</span>
          <span class="hi-type">${Dashboard.escapeHtml(h.typeName)}</span>
        </div>
        <span class="hi-time">${Helpers.formatTimestamp(h.time)}</span>
      </div>
    `).join('');

    // 点击历史项重新研究
    container.querySelectorAll('.history-item').forEach(item => {
      item.addEventListener('click', () => {
        const idx = parseInt(item.dataset.idx);
        const h = history[idx];
        if (h) {
          document.getElementById('companyInput').value = h.company;
          document.getElementById('researchType').value = h.type;
          this.startResearch();
        }
      });
    });
  },
};
