/* ========================================
   卿卿日常 · 今日热点资讯（每日版）
   优先从 Supabase 读取（跨设备同步），失败则用本地 JSON
   ======================================== */

const DailyNews = {
  data: null,
  activeCategory: 'all',
  expanded: false,

  categories: [
    { key: 'all', label: '全部' },
    { key: 'ai-tech', label: 'AI 技术' },
    { key: 'business', label: '商业' },
    { key: 'product', label: '产品' },
    { key: 'finance', label: '金融/市场' },
  ],

  categoryIcons: {
    'ai-tech': '◇',
    'business': '○',
    'product': '□',
    'finance': '△',
  },

  async init() {
    await this.loadNews();
    this.render();
  },

  // ====================================
  // 数据加载（Supabase → 本地 JSON → cache）
  // ====================================

  async loadNews(forceRefresh = false) {
    // 1. 优先从 Supabase 加载（当天数据）
    try {
      const today = new Date().toISOString().slice(0, 10);
      const sbData = await Supabase.fetch(`daily_news?news_date=eq.${today}&order=rank.asc&limit=12`);
      if (sbData && Array.isArray(sbData) && sbData.length > 0) {
        this.data = this.mapFromSupabase(sbData);
        this.cacheData(this.data);
        console.log(`📡 从 Supabase 加载 ${sbData.length} 条新闻`);
        return;
      }
    } catch (err) {
      console.warn('Supabase 加载失败，尝试本地 JSON:', err.message);
    }

    // 2. 降级：本地 JSON
    try {
      const url = forceRefresh
        ? `data/daily-news.json?t=${Date.now()}`
        : 'data/daily-news.json';
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const json = await resp.json();
      if (!json.news || !Array.isArray(json.news)) throw new Error('Invalid format');
      this.data = json;
      this.cacheData(json);
      console.log(`📄 从本地 JSON 加载 ${json.news.length} 条新闻`);
      return;
    } catch (err) {
      console.warn('本地 JSON 加载失败，尝试缓存:', err.message);
    }

    // 3. 最终降级：localStorage 缓存
    this.loadFromCache();
  },

  // 分类 → 前端展示字段的映射
  _catMap: {
    'ai-tech':  { label: 'AI 技术',   badge: 'AI NEWS',   icon: '◇' },
    'business': { label: '商业',     badge: 'INSIGHT',  icon: '○' },
    'product':  { label: '产品',     badge: 'PRODUCT',  icon: '□' },
    'finance':  { label: '金融/市场', badge: 'ANALYSIS', icon: '△' },
  },

  _extractDomain(url) {
    try { return new URL(url).hostname.replace('www.', ''); }
    catch { return ''; }
  },

  _relativeTime(iso) {
    if (!iso) return '';
    const diff = (Date.now() - new Date(iso).getTime()) / 1000 / 3600;
    if (diff < 1)   return `${Math.max(1, Math.floor(diff * 60))} 分钟前`;
    if (diff < 24)  return `${Math.floor(diff)} 小时前`;
    if (diff < 48)  return '昨天';
    return `${Math.floor(diff / 24)} 天前`;
  },

  mapFromSupabase(rows) {
    const news = rows.map(row => {
      const cat = this._catMap[row.category] || this._catMap['ai-tech'];
      return {
        id: row.id,
        title: row.title,
        category: row.category,
        categoryLabel: cat.label,
        badge: cat.badge,
        source: row.source,
        sourceDomain: this._extractDomain(row.url),
        sourceUrl: row.url,
        published: row.published_at,
        relativeTime: this._relativeTime(row.published_at),
        summary: Array.isArray(row.summary) ? row.summary : [],
        whyImportant: row.why_important,
        tags: [],
        rank: row.rank || 0,
      };
    });
    news.sort((a, b) => a.rank - b.rank);
    const today = new Date().toISOString().slice(0, 10);
    return {
      date: today,
      total: news.length,
      defaultDisplay: 6,
      news,
    };
  },

  cacheData(json) {
    try {
      localStorage.setItem('daily_news_cache', JSON.stringify(json));
    } catch (e) { /* ignore */ }
  },

  loadFromCache() {
    try {
      const raw = localStorage.getItem('daily_news_cache');
      if (raw) {
        this.data = JSON.parse(raw);
        console.log('已加载本地缓存新闻');
        return;
      }
    } catch (e) { /* ignore */ }
    this.data = null;
  },

  async refresh() {
    const btn = document.getElementById('dailyNewsRefresh');
    if (btn) {
      btn.classList.add('spinning');
      btn.disabled = true;
    }
    await this.loadNews(true);
    this.activeCategory = 'all';
    this.expanded = false;
    this.render();
    if (btn) {
      btn.classList.remove('spinning');
      btn.disabled = false;
    }
  },

  // ====================================
  // 渲染
  // ====================================

  render() {
    const container = document.getElementById('dailyNewsContainer');
    if (!container) return;

    if (!this.data || !this.data.news || this.data.news.length === 0) {
      container.innerHTML = '<div class="empty-hint">暂无今日新闻，点击刷新重试</div>';
      return;
    }

    const dateLabel = this.data.date || '';
    const totalCount = this.filteredNews().length;
    const displayNews = this.getDisplayNews();
    const hasMore = !this.expanded && totalCount > displayNews.length;

    let html = '';

    // 标题区
    html += this.renderHeader(dateLabel, totalCount);

    // 分类 tab
    html += this.renderTabs();

    // 卡片网格
    html += '<div class="daily-news-grid">';
    if (displayNews.length === 0) {
      html += '<div class="empty-hint">该分类下暂无新闻</div>';
    } else {
      displayNews.forEach((item) => {
        html += this.renderCard(item);
      });
    }
    html += '</div>';

    // 展开更多
    if (hasMore) {
      html += `
        <div class="daily-news-more" id="dailyNewsMore">
          <button class="btn-text" onclick="DailyNews.expand()">
            展开更多 <span class="more-count">(${totalCount - displayNews.length} 条)</span>
          </button>
        </div>
      `;
    }

    container.innerHTML = html;
  },

  renderHeader(dateLabel, totalCount) {
    return `
      <div class="daily-news-header">
        <div class="daily-news-title-row">
          <div>
            <h2 class="daily-news-title">🔥 今日热点资讯</h2>
            <p class="daily-news-subtitle">实时追踪全球科技与商业领域最具影响力的技术突破与商业变革。</p>
          </div>
          <div class="daily-news-meta">
            <span class="daily-news-date">${dateLabel}</span>
            <span class="daily-news-count">${totalCount} 条</span>
            <button class="btn-icon daily-news-refresh" id="dailyNewsRefresh" onclick="DailyNews.refresh()" title="刷新">
              ↻
            </button>
          </div>
        </div>
      </div>
    `;
  },

  renderTabs() {
    return `
      <div class="daily-news-tabs" id="dailyNewsTabs">
        ${this.categories
          .map(
            (cat) => `
          <button
            class="daily-news-tab ${cat.key === this.activeCategory ? 'active' : ''}"
            data-category="${cat.key}"
            onclick="DailyNews.switchCategory('${cat.key}')"
          >${cat.label}</button>
        `
          )
          .join('')}
      </div>
    `;
  },

  renderCard(item) {
    const icon = this.categoryIcons[item.category] || '○';
    const domain = item.sourceDomain || '';
    return `
      <div class="daily-news-card">
        <div class="dnc-top">
          <span class="dnc-badge badge-${item.category}">${item.badge || 'AI NEWS'}</span>
          <span class="dnc-time">${item.relativeTime || ''}</span>
        </div>
        <div class="dnc-source">
          <span class="dnc-cat-icon">${icon}</span>
          <span class="dnc-cat-label">${item.categoryLabel || ''}</span>
          <span class="dnc-sep">·</span>
          <span class="dnc-source-name">${item.source || domain}</span>
        </div>
        <div class="dnc-title">${this.escapeHtml(item.title)}</div>
        <div class="dnc-summary">
          ${(item.summary || [])
            .slice(0, 3)
            .map((s) => `<p>${this.escapeHtml(this.cleanHtml(s))}</p>`)
            .join('')}
        </div>
        ${item.whyImportant ? `<div class="dnc-why"><span class="dnc-why-label">为什么重要</span><span class="dnc-why-text">${this.escapeHtml(this.cleanHtml(item.whyImportant))}</span></div>` : ''}
        <a href="${item.sourceUrl}" target="_blank" rel="noopener" class="dnc-link">
          打开原文 / 浏览器翻译阅读 →
        </a>
      </div>
    `;
  },

  // ====================================
  // 交互
  // ====================================

  switchCategory(key) {
    this.activeCategory = key;
    this.expanded = false;
    document.querySelectorAll('.daily-news-tab').forEach((tab) => {
      tab.classList.toggle('active', tab.dataset.category === key);
    });
    this.render();
  },

  expand() {
    this.expanded = true;
    this.render();
  },

  // ====================================
  // 工具
  // ====================================

  filteredNews() {
    if (!this.data || !this.data.news) return [];
    if (this.activeCategory === 'all') return this.data.news;
    return this.data.news.filter((item) => item.category === this.activeCategory);
  },

  getDisplayNews() {
    const filtered = this.filteredNews();
    if (this.expanded) return filtered;
    return filtered.slice(0, this.data.defaultDisplay || 6);
  },

  escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  cleanHtml(str) {
    if (!str) return '';
    return str.replace(/&#?\w+;/g, '').replace(/\s+/g, ' ').trim();
  },
};
