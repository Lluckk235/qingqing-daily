/* ========================================
   卿卿日常 · 全局配置
   ======================================== */

const CONFIG = {
  // AI Berkshire skills 配置
  berkshire: {
    skillsPath: '.codebuddy/skills/skills',
    categories: {
      '深度研究': [
        { id: 'investment-research', name: '深度研究', desc: '四大师综合深度分析' },
        { id: 'investment-team', name: '多Agent团队', desc: '4Agent并行研究' },
        { id: 'management-deep-dive', name: '管理层纵深', desc: '管理层深度研究' },
        { id: 'private-company-research', name: '未上市公司', desc: '未上市企业研究' },
        { id: 'deep-company-series', name: '长文系列', desc: '8篇系列深度拆解' },
      ],
      '财报分析': [
        { id: 'earnings-review', name: '财报精读', desc: '一手财报分析' },
        { id: 'earnings-team', name: '财报团队', desc: '多视角财报解读' },
      ],
      '行业筛选': [
        { id: 'industry-research', name: '行业研究', desc: '产业链全景扫描' },
        { id: 'industry-funnel', name: '行业漏斗', desc: '全市场→终选3家' },
        { id: 'quality-screen', name: '质量筛选', desc: '7条硬指标去劣' },
        { id: 'bottleneck-hunter', name: '瓶颈猎手', desc: '供应链瓶颈识别' },
        { id: 'investment-checklist', name: '投资清单', desc: '六关快速筛选' },
      ],
      '持仓管理': [
        { id: 'income-investment', name: '收益分析', desc: '股息可持续性' },
        { id: 'portfolio-review', name: '组合管理', desc: '仓位/集中度/再平衡' },
        { id: 'thesis-tracker', name: '论文追踪', desc: '买入后纪律跟踪' },
        { id: 'thesis-drift', name: '漂移检测', desc: '事实变化vs措辞变化' },
        { id: 'news-pulse', name: '异动归因', desc: '股价异动快速分析' },
      ],
      '思维工具': [
        { id: 'dyp-ask', name: '段永平问答', desc: '段永平视角思考' },
        { id: 'financial-data', name: '财务数据', desc: '交叉验证规范' },
        { id: 'wechat-article', name: '公众号文章', desc: '三Agent协作写作' },
      ],
    }
  },

  // 预设公司列表
  companies: [
    // 美股
    { code: 'AAPL', name: '苹果', market: 'us' },
    { code: 'MSFT', name: '微软', market: 'us' },
    { code: 'GOOGL', name: '谷歌', market: 'us' },
    { code: 'AMZN', name: '亚马逊', market: 'us' },
    { code: 'NVDA', name: '英伟达', market: 'us' },
    { code: 'META', name: 'Meta', market: 'us' },
    { code: 'TSLA', name: '特斯拉', market: 'us' },
    { code: 'BRK.B', name: '伯克希尔B', market: 'us' },
    { code: 'JPM', name: '摩根大通', market: 'us' },
    { code: 'V', name: 'Visa', market: 'us' },
    { code: 'COST', name: '好市多', market: 'us' },
    { code: 'NFLX', name: '奈飞', market: 'us' },
    { code: 'AMD', name: 'AMD', market: 'us' },
    { code: 'INTC', name: '英特尔', market: 'us' },
    { code: 'BABA', name: '阿里巴巴', market: 'us' },
    { code: 'PDD', name: '拼多多', market: 'us' },
    { code: 'JD', name: '京东', market: 'us' },
    // 港股
    { code: '0700.HK', name: '腾讯', market: 'hk' },
    { code: '9988.HK', name: '阿里巴巴-SW', market: 'hk' },
    { code: '3690.HK', name: '美团', market: 'hk' },
    { code: '9618.HK', name: '京东集团-SW', market: 'hk' },
    { code: '1810.HK', name: '小米集团', market: 'hk' },
    // A股
    { code: '600519.SH', name: '贵州茅台', market: 'cn' },
    { code: '000858.SZ', name: '五粮液', market: 'cn' },
    { code: '300750.SZ', name: '宁德时代', market: 'cn' },
    { code: '601318.SH', name: '中国平安', market: 'cn' },
    { code: '600036.SH', name: '招商银行', market: 'cn' },
  ],

  // GEX 分析模板
  gex: {
    symbols: ['SPY', 'QQQ'],
    // 分析字段
    fields: [
      { key: 'gamma', label: 'Gamma 敞口 (GEX)', hint: '单位：百万美元' },
      { key: 'volume', label: '成交量分布', hint: '高成交量行权价区间' },
      { key: 'putCall', label: 'Put/Call 比率', hint: '' },
      { key: 'ivhv', label: 'IV / HV', hint: '隐含波动率 vs 历史波动率' },
      { key: 'strikes', label: '关键行权价', hint: '最大GEX集中价位' },
    ],
    // 价位类型
    levels: [
      { key: 'resistance', label: '上方压力', icon: '⬆' },
      { key: 'support', label: '下方支撑', icon: '⬇' },
      { key: 'magnet', label: '可能吸附位', icon: '🧲' },
      { key: 'breakdown', label: '风险破位位', icon: '⚠' },
    ],
    // 大盘环境
    biases: [
      { key: 'bullish', label: '偏多', color: 'bullish' },
      { key: 'bearish', label: '偏空', color: 'bearish' },
      { key: 'neutral', label: '震荡', color: 'neutral' },
      { key: 'volatile', label: '高波动', color: 'volatile' },
    ],
  },

  // 投资名言
  quotes: [
    '别人贪婪时恐惧，别人恐惧时贪婪。',
    '投资的第一原则是不要亏钱。',
    '时间是优秀企业的朋友。',
    '以合理的价格买入优秀的公司。',
    '买股票就是买公司。',
    '市场短期是投票机，长期是称重机。',
    '做对的事情，把事情做对。',
    '能力圈大小不重要，知道边界才重要。',
  ],

  // 存储键
  storageKeys: {
    watchlist: 'iw_watchlist',
    researchHistory: 'iw_research_history',
    gexHistory: 'iw_gex_history',
    notes: 'iw_notes',
    activity: 'iw_activity',
    moodCalendar: 'iw_mood_calendar',
    currentPanel: 'iw_current_panel',
  },
};

// 导出（兼容模块化）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
}
