/* ========================================
   卿卿日常 · 每日一句模块
   数据源: Supabase 句库 (跨设备同步), 本地兜底
   分类: 成长 / 表达 / 投资
   每日默认一句，支持换一句
   ======================================== */

const DAILY_QUOTE_CACHE_KEY = 'qq_daily_quote_cache';

// 本地兜底句库（Supabase 读取失败时使用）
const FALLBACK_QUOTES = [
  { category:'成长',zh:'今天不用证明自己很厉害，只要比昨天更清楚一点。',en:'You do not need to prove yourself today. Just become a little clearer than yesterday.',action:'写下今天最重要的一件小事。' },
  { category:'成长',zh:'稳定不是每天状态都好，而是状态一般时也能做一点。',en:'Consistency means doing a little even on ordinary days.',action:'完成一个 10 分钟任务。' },
  { category:'成长',zh:'别急着变成别人期待的样子，先把自己的节奏找回来。',en:'Do not rush to become what others expect. Return to your own rhythm first.',action:'给自己 15 分钟安静时间。' },
  { category:'成长',zh:'你不是落后了，你只是在重新整理自己的路线。',en:'You are not behind. You are reorganizing your path.',action:'整理一个最近卡住的问题。' },
  { category:'成长',zh:'今天先不要追求完美，先让事情发生。',en:'Do not chase perfection today. Let the work begin first.',action:'打开一个任务，先做第一步。' },
  { category:'成长',zh:'真正的进步，常常发生在没人看见的重复里。',en:'Real progress often happens in unseen repetition.',action:'重复练习一个你想变好的动作。' },
  { category:'成长',zh:'今天的目标不是翻盘，而是恢复一点掌控感。',en:'Today\'s goal is to regain a little sense of control.',action:'列出三件你能控制的小事。' },
  { category:'成长',zh:'不用等到准备好，准备好往往是在开始之后发生的。',en:'Readiness often comes after you begin.',action:'现在开始，不超过 3 分钟。' },
  { category:'成长',zh:'少一点自责，多一点复盘，路会更清楚。',en:'Less self-blame, more reflection. The path becomes clearer.',action:'写下一个可调整的地方。' },
  { category:'成长',zh:'你今天完成的小事，会成为未来信任自己的证据。',en:'The small thing you finish today becomes evidence that you can trust yourself.',action:'完成一件很小但真实的事。' },
  { category:'成长',zh:'慢一点没关系，关键是不要把自己从生活里放弃掉。',en:'Moving slowly is fine. Just do not give up on your own life.',action:'做一件照顾自己的小事。' },
  { category:'成长',zh:'把注意力放回行动上，焦虑会小一点。',en:'Bring your attention back to action, and anxiety becomes smaller.',action:'选一件能立刻开始的事。' },
  { category:'成长',zh:'你不需要一次改变人生，只需要今天不原地打转。',en:'You do not need to change your whole life at once. Just stop circling today.',action:'推进一个停滞的任务。' },
  { category:'成长',zh:'清醒不是不难过，而是难过时还能看见下一步。',en:'Clarity is not the absence of sadness. It is seeing the next step through it.',action:'写下下一步该做什么。' },
  { category:'成长',zh:'真正的自律，是给重要的事留出位置。',en:'Real discipline is making room for what matters.',action:'删掉一个不必要的安排。' },
  { category:'成长',zh:'不要用一天的情绪，否定长期的努力。',en:'Do not judge long-term effort by one day\'s mood.',action:'回顾一个最近的进步。' },
  { category:'成长',zh:'生活变好，常常不是突然突破，而是少一点混乱。',en:'Life often gets better not through a breakthrough, but through less chaos.',action:'整理一个小区域。' },
  { category:'成长',zh:'你可以重新开始很多次，每次都算数。',en:'You can begin again many times. Every beginning counts.',action:'重启一个被搁置的小计划。' },
  { category:'成长',zh:'不要把低谷当结论，它只是一个阶段。',en:'Do not treat a low point as a conclusion. It is only a phase.',action:'写下一个还可以尝试的方法。' },
  { category:'成长',zh:'能持续的节奏，比短暂的爆发更可靠。',en:'A sustainable rhythm is more reliable than a short burst.',action:'把今天的任务减到最小可完成。' },
  { category:'表达',zh:'表达不是天赋，是一次次把模糊想法说清楚的练习。',en:'Expression is the practice of making unclear thoughts clear.',action:'用三句话说清楚一个想法。' },
  { category:'表达',zh:'不要急着说得漂亮，先说得真实、清楚、完整。',en:'Do not rush to sound impressive. Be true, clear, and complete first.',action:'录一段 1 分钟口播。' },
  { category:'表达',zh:'内容不是把自己包装得完美，而是把真实经验整理得有用。',en:'Content is not perfect packaging. It is useful organization of lived experience.',action:'写一个今天的小观察。' },
  { category:'表达',zh:'一个好选题，往往来自你反复遇到的问题。',en:'A good topic often comes from a problem you keep meeting.',action:'记录一个反复出现的问题。' },
  { category:'表达',zh:'先讲清楚，再讲好听；先有结构，再有风格。',en:'Be clear before being elegant. Build structure before style.',action:'把一个想法拆成三点。' },
  { category:'表达',zh:'你的生活不是素材库，它先是你正在认真经历的人生。',en:'Your life is not just content material. It is a life being sincerely lived.',action:'写一条不发布的生活记录。' },
  { category:'表达',zh:'不要为了流量改变标签，要为了长期表达找到位置。',en:'Do not change your identity for traffic. Find your position for long-term expression.',action:'写下你不想被误解成什么。' },
  { category:'表达',zh:'复盘不是否定自己，是给下一次表达一张地图。',en:'Reflection is not self-denial. It is a map for your next expression.',action:'复盘一个优点和一个可改点。' },
  { category:'表达',zh:'真实不是把所有事都说出来，而是说出来的部分不假。',en:'Being real does not mean saying everything. It means what you say is not false.',action:'删掉一句不真实的表达。' },
  { category:'表达',zh:'好的表达，不是声音最大，而是让人听懂。',en:'Good expression is not the loudest voice. It is being understood.',action:'把一句话改得更简单。' },
  { category:'投资',zh:'投资先问风险，再问收益；先问能否活下来，再问能赚多少。',en:'In investing, ask about risk before return. Survival comes before profit.',action:'检查一个持仓的最大风险。' },
  { category:'投资',zh:'市场每天报价，但不每天给答案。',en:'The market gives prices every day, but not answers every day.',action:'少看一次价格，多看一个事实。' },
  { category:'投资',zh:'好公司不等于好价格，好故事不等于好投资。',en:'A good company is not always a good price. A good story is not always a good investment.',action:'写下一个标的的估值疑问。' },
  { category:'投资',zh:'真正的安全边际，来自理解，而不是安慰自己。',en:'A real margin of safety comes from understanding, not self-comfort.',action:'补充一个没弄懂的数据。' },
  { category:'投资',zh:'不要因为涨了才相信，也不要因为跌了才研究。',en:'Do not believe only because it rises, and do not research only because it falls.',action:'更新一条核心事实。' },
  { category:'投资',zh:'长期主义不是拿着不动，而是知道什么变化真的重要。',en:'Long-term thinking is not doing nothing. It is knowing what changes truly matter.',action:'区分一个事实变化和情绪变化。' },
  { category:'投资',zh:'能力圈不是限制你，而是保护你慢慢变强。',en:'Your circle of competence does not limit you. It protects you while you grow.',action:'标记一个暂时看不懂的领域。' },
  { category:'投资',zh:'一次不冲动的放弃，也是一笔好投资。',en:'A non-impulsive pass can also be a good investment.',action:'写下一个今天决定不碰的机会。' },
  { category:'投资',zh:'现金不是懒惰，现金有时是等待清晰的选择权。',en:'Cash is not laziness. Sometimes it is the option to wait for clarity.',action:'检查一次仓位舒适度。' },
  { category:'投资',zh:'看懂一家公司，比追十个热点更有复利。',en:'Understanding one company compounds better than chasing ten trends.',action:'读一页财报或公司资料。' },
];

const CATEGORY_LABELS = { 成长: '🌱', 表达: '💬', 投资: '📈' };

const DailyQuote = {
  quotes: [],
  currentIdx: 0,
  activeCategory: 'all',
  loaded: false,

  async init() {
    const catEls = document.querySelectorAll('#dailyQuoteSection, #dailyQuoteSectionMobile');
    if (!catEls.length) return;

    await this.load();
    this.currentIdx = this.getDefaultIdx();
    this.render();
    this.bindEvents();
  },

  async load() {
    try {
      const data = await Supabase.get('daily_quotes?order=id.asc');
      if (data && data.length > 0) {
        this.quotes = data;
        this.loaded = true;
        Storage.set(DAILY_QUOTE_CACHE_KEY, data);
        return;
      }
    } catch (e) {
      console.warn('DailyQuote: Supabase 读取失败', e.message);
    }

    // Fallback: 读缓存
    const cached = Storage.get(DAILY_QUOTE_CACHE_KEY);
    if (cached && cached.length > 0) {
      this.quotes = cached;
      this.loaded = true;
      return;
    }

    // 最终兜底：内置句库
    this.quotes = FALLBACK_QUOTES;
    this.loaded = true;
  },

  // 基于日期的确定性索引（同一天、所有设备看到同一句）
  getDaySeed() {
    const d = new Date();
    return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  },

  getFiltered() {
    if (this.activeCategory === 'all') return this.quotes;
    return this.quotes.filter(q => q.category === this.activeCategory);
  },

  // 获取"今日默认"句子的索引
  getDefaultIdx() {
    const filtered = this.getFiltered();
    if (filtered.length === 0) return 0;
    return this.getDaySeed() % filtered.length;
  },

  getCurrentQuote() {
    const filtered = this.getFiltered();
    if (filtered.length === 0) {
      return { category: '', zh: '暂无内容', en: '', action: '' };
    }
    const idx = this.currentIdx % filtered.length;
    return filtered[idx];
  },

  nextQuote() {
    this.currentIdx++;
    this.render();
  },

  switchCategory(cat) {
    this.activeCategory = cat;
    this.currentIdx = this.getDefaultIdx();
    this.render();
  },

  render() {
    const q = this.getCurrentQuote();

    const html = `
      <div class="quote-body">
        <div class="quote-zh">${this.escapeHtml(q.zh)}</div>
        <div class="quote-en">${this.escapeHtml(q.en)}</div>
        ${q.action ? `<div class="quote-action">👉 ${this.escapeHtml(q.action)}</div>` : ''}
      </div>
      <div class="quote-footer-bar">
        <button class="quote-refresh-btn" id="quoteRefreshBtn" title="换一句">🔄 换一句</button>
      </div>
    `;

    const el = document.getElementById('dailyQuoteSection');
    if (el) el.innerHTML = html;

    const elMobile = document.getElementById('dailyQuoteSectionMobile');
    if (elMobile) elMobile.innerHTML = html;
  },

  bindEvents() {
    // 同时绑定桌面端和移动端容器
    ['dailyQuoteSection', 'dailyQuoteSectionMobile'].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('click', (e) => {
        const catBtn = e.target.closest('.quote-cat-btn');
        if (catBtn) {
          this.switchCategory(catBtn.dataset.cat);
          return;
        }
        const refreshBtn = e.target.closest('#quoteRefreshBtn');
        if (refreshBtn) {
          this.nextQuote();
        }
      });
    });
  },

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },
};

// 暴露到全局
window.DailyQuote = DailyQuote;
