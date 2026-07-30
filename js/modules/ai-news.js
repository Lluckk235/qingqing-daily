/* ========================================
   卿卿日常 · AI一周资讯模块
   每周五更新 · 联网检索权威来源
   ======================================== */

const AiNews = {
  // 当前周数据
  data: {
    weekLabel: '2025年7月26日 — 8月1日',
    generatedAt: '2025-08-01',
    highlights: [
      {
        date: '7月31日',
        title: '国内AI三连发：阿里开源Qwen3-Coder-Flash、阶跃开源Step 3、Manus发布Wide Research',
        category: '模型发布',
        why: '7月最后一天，中国AI公司集中发力。阿里Qwen3-Coder-Flash可在33GB内存硬件本地运行；阶跃Step 3（321B MoE）在开源多模态推理模型上取得SOTA；Manus的Wide Research支持100+并行Agent执行大规模研究任务。标志着国内AI从"跟跑"进入"并跑"阶段。',
        source: '各公司官方GitHub / 官方博客',
        sourceUrl: 'https://news.qq.com/rain/a/20250802A00M4300',
        tags: ['开源', '大模型', 'Agent', '阿里', '阶跃星辰', 'Manus'],
        factLevel: '事实',
      },
      {
        date: '7月30日',
        title: '字节火山引擎发布豆包图像编辑3.0 + 同声传译2.0 + 开源扣子（Coze）',
        category: '产品发布',
        why: '豆包同声传译2.0将延迟从8-10秒降到2-3秒，实现文本与语音同步生成和0样本声音复刻；图像编辑3.0支持自然语言指令精准修图；扣子平台核心代码以Apache 2.0开源，降低AI应用开发门槛。字节在应用层和开发者生态的布局日益清晰。',
        source: '火山引擎官方',
        sourceUrl: 'https://news.qq.com/rain/a/20250802A00M4300',
        tags: ['字节跳动', '豆包', '开源', '语音AI', '图像AI'],
        factLevel: '事实',
      },
      {
        date: '7月28日',
        title: '智谱发布 GLM-4.5 旗舰模型，Agent综合能力开源SOTA',
        category: '模型发布',
        why: 'GLM-4.5在12个评测基准综合评分排全球第三、国产第一、开源第一。特别在真实代码Agent人工对比评测中表现国内最佳，且API价格极具竞争力（输入0.8元/百万tokens）。智谱同步公开52道评测题及Agent轨迹供业界复现，透明度值得关注。',
        source: '智谱AI官方',
        sourceUrl: 'https://news.qq.com/rain/a/20250802A00M4300',
        tags: ['智谱', 'GLM', '开源', 'Agent', '大模型'],
        factLevel: '事实',
      },
      {
        date: '7月28日',
        title: '阿里通义万相 Wan2.2 视频生成模型发布，多项指标超越Sora和Kling 2.0',
        category: '模型发布',
        why: 'Wan2.2包含文生视频、图生视频、统一视频生成三款模型，在运动质量、画面质量等测试中超越了OpenAI Sora、Kling 2.0等闭源商业模型。5B版本可在消费级显卡（RTX 3060）上本地部署，大幅降低视频生成门槛。',
        source: '阿里通义万相官方',
        sourceUrl: 'https://news.qq.com/rain/a/20250802A00M4300',
        tags: ['阿里', '视频生成', '开源', '多模态'],
        factLevel: '事实',
      },
      {
        date: '7月28日',
        title: '腾讯开源 HunyuanWorld-1.0 3D世界模型 + CodeBuddy IDE 国际版发布',
        category: '模型发布 / 产品发布',
        why: 'HunyuanWorld-1.0只需文字或图片即可生成完整3D世界，支持360°漫游和标准网格导出，可直接用于游戏引擎和VR。CodeBuddy IDE整合Claude/GPT/Gemini等模型，内置Figma、BaaS，定位"产品-设计-研发"全流程AI开发工作台。腾讯在3D生成和开发者工具双线发力。',
        source: '腾讯官方 / GitHub',
        sourceUrl: 'https://news.qq.com/rain/a/20250802A00M4300',
        tags: ['腾讯', '3D生成', '开源', 'IDE', '混元'],
        factLevel: '事实',
      },
      {
        date: '7月28日',
        title: '全球首个设计类AI Agent — Lovart 正式上线（腾讯混元技术支持）',
        category: '产品发布',
        why: 'Lovart聚焦设计领域，覆盖视觉设计、3D建模、空间构图等方向，3D内容生成优先调用腾讯混元3D模型API。这是AI Agent从"通用助手"走向"垂直专业领域"的标志性案例。',
        source: 'Lovart官方',
        sourceUrl: 'https://fangx.ai/july-2025-ai-major-events-summary-and-review/',
        tags: ['AI Agent', '设计', '腾讯混元', '3D'],
        factLevel: '事实',
      },
      {
        date: '7月26日-28日',
        title: 'OpenAI确认GPT-5将于8月初发布；阿里夸克AI眼镜首次亮相WAIC',
        category: '产品预告 / 硬件',
        why: 'GPT-5是OpenAI下一代旗舰模型，Sam Altman此前表示其能力将有"显著飞跃"，可能重新定义行业格局。夸克AI眼镜整合通义千问大模型、高德导航、支付宝支付、淘宝购物，深度打通阿里生态，预计年内正式发布。AI可穿戴硬件赛道持续升温。',
        source: 'OpenAI官方 / WAIC现场',
        sourceUrl: 'https://fangx.ai/july-2025-ai-major-events-summary-and-review/',
        tags: ['OpenAI', 'GPT-5', '阿里', 'AI眼镜', '硬件'],
        factLevel: '事实+预告',
      },
      {
        date: '7月22日-25日',
        title: '阿里连发7款模型：Qwen3-235B、Qwen3-Coder、Qwen-MT（92语种翻译）、推理模型等',
        category: '模型发布',
        why: '阿里在7月最后一周开启"日更模式"，从基础模型到编码模型到翻译模型到推理模型全覆盖。Qwen3-Coder（35B MoE）在Agent能力多项评测获SOTA，Qwen-MT支持92种语言互译。阿里正通过密集开源策略建立模型生态壁垒，与Meta的Llama形成开源双极格局。',
        source: '阿里通义千问官方 / HuggingFace',
        sourceUrl: 'https://news.qq.com/rain/a/20250802A00M4300',
        tags: ['阿里', '通义千问', '开源', '编码', '翻译'],
        factLevel: '事实',
      },
    ],
    opportunities: [
      {
        title: '开源模型密集发布 → 关注AI应用层创业机会',
        desc: '阿里、智谱、阶跃等密集开源高质量模型，API调用成本持续下降（GLM-4.5-Air输入仅0.8元/百万tokens）。对自媒体创作者：可低成本使用AI生成视频/图片/文章；对投资者：关注基于这些模型构建应用的公司（如Lovart、RoboNeo等）；对普通用户：尝试用扣子/Coze搭建自己的AI助手。',
        for: '自媒体 / 投资者 / 普通用户',
      },
      {
        title: 'GPT-5即将发布 → 短期市场波动与长期格局变化',
        desc: 'OpenAI GPT-5预计8月初发布，可能引发美股AI板块短期波动。关注微软（OpenAI最大合作伙伴）、NVIDIA（算力需求可能进一步推高）的股价表现。如果GPT-5能力远超开源模型，可能改变"开源追赶闭源"的叙事。建议保持关注但避免追高。',
        for: '投资者',
      },
      {
        title: 'AI眼镜/可穿戴密集发布 → 关注消费电子新赛道',
        desc: '阿里夸克AI眼镜、Meta Ray-Ban持续迭代、亚马逊收购AI腕带公司Bee、雷鸟V3 AI拍摄眼镜更新。AI可穿戴正从"极客玩具"走向"大众消费品"。对自媒体：AI眼镜的评测和体验内容可能成为流量热点；对投资者：关注阿里、Meta、苹果在AI硬件领域的布局。',
        for: '自媒体 / 投资者',
      },
    ],
    nextWeek: [
      'OpenAI GPT-5 预计8月初正式发布 — 可能成为下半年AI行业最重要事件',
      '关注GPT-5发布后的美股AI板块反应，特别是微软、NVIDIA、Palantir等',
      '国内方面关注字节、百度、华为是否有新模型或产品回应GPT-5',
      '8月2日欧盟《通用人工智能行为准则》正式实施，关注合规影响',
      '关注阿里Qwen3-Coder和智谱GLM-4.5的实际开发者反馈和生态建设进度',
    ],
  },

  init() {
    this.render();
  },

  render() {
    const container = document.getElementById('aiNewsContainer');
    const d = this.data;

    let html = `
      <div class="ai-news-meta">
        <span>📅 ${d.weekLabel}</span>
        <span class="ai-news-update">🔄 每周五更新 · ${d.generatedAt}</span>
      </div>

      <div class="ai-news-section">
        <h3 class="ai-news-section-title">🔥 本周热点 <span class="ai-news-count">${d.highlights.length}条</span></h3>
        <div class="ai-news-highlights">
    `;

    d.highlights.forEach((h, i) => {
      const factBadge = h.factLevel === '事实' ? 'fact' : (h.factLevel.includes('预告') ? 'preview' : 'rumor');
      html += `
        <div class="ai-news-item">
          <div class="ai-news-item-header">
            <span class="ai-news-date">${h.date}</span>
            <span class="ai-news-category">${h.category}</span>
            <span class="ai-news-fact-badge ${factBadge}">${h.factLevel}</span>
          </div>
          <h4 class="ai-news-item-title">${h.title}</h4>
          <p class="ai-news-item-why"><strong>为什么重要：</strong>${h.why}</p>
          <div class="ai-news-item-footer">
            <span class="ai-news-source">📎 ${h.source}</span>
            <a href="${h.sourceUrl}" target="_blank" rel="noopener" class="ai-news-link">查看来源 →</a>
          </div>
          <div class="ai-news-tags">
            ${h.tags.map(t => `<span class="ai-news-tag">#${t}</span>`).join('')}
          </div>
        </div>
      `;
    });

    html += `
        </div>
      </div>

      <div class="ai-news-section">
        <h3 class="ai-news-section-title">💡 可跟进机会 <span class="ai-news-count">${d.opportunities.length}条</span></h3>
        <div class="ai-news-opportunities">
    `;

    d.opportunities.forEach((o, i) => {
      html += `
        <div class="ai-news-opp-item">
          <div class="ai-news-opp-num">${i + 1}</div>
          <div class="ai-news-opp-body">
            <h4>${o.title}</h4>
            <p>${o.desc}</p>
            <span class="ai-news-opp-for">👥 ${o.for}</span>
          </div>
        </div>
      `;
    });

    html += `
        </div>
      </div>

      <div class="ai-news-section">
        <h3 class="ai-news-section-title">👀 下周值得观察</h3>
        <ul class="ai-news-next-week">
    `;

    d.nextWeek.forEach(item => {
      html += `<li>${item}</li>`;
    });

    html += `
        </ul>
      </div>
    `;

    container.innerHTML = html;
  },
};
