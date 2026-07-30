/* ========================================
   卿卿日常 · AI热点模块（嵌入首页Dashboard）
   每周五更新 · 联网检索权威来源
   ======================================== */

const AiNews = {
  data: {
    weekLabel: '7月26日 — 8月1日',
    highlights: [
      {
        date: '7/31',
        title: '国内AI三连发：阿里Qwen3-Coder-Flash、阶跃Step 3开源、Manus Wide Research',
        why: '阿里编码模型可在33GB内存本地运行；阶跃Step 3（321B MoE）多模态推理开源SOTA；Manus支持100+并行Agent。',
        sourceUrl: 'https://news.qq.com/rain/a/20250802A00M4300',
        tags: ['开源', 'Agent', '阿里', '阶跃'],
        factLevel: '事实',
      },
      {
        date: '7/30',
        title: '字节豆包图像编辑3.0 + 同声传译2.0（延迟降至2-3秒）+ 开源扣子',
        why: '同声传译实现0样本声音复刻；扣子平台以Apache 2.0开源，降低AI应用开发门槛。',
        sourceUrl: 'https://news.qq.com/rain/a/20250802A00M4300',
        tags: ['字节', '豆包', '语音AI'],
        factLevel: '事实',
      },
      {
        date: '7/28',
        title: '智谱GLM-4.5发布：Agent综合能力开源SOTA，API价格极具竞争力',
        why: '12个评测基准全球第三、国产第一。输入仅0.8元/百万tokens，公开52道评测题供复现。',
        sourceUrl: 'https://news.qq.com/rain/a/20250802A00M4300',
        tags: ['智谱', 'GLM', '开源SOTA'],
        factLevel: '事实',
      },
      {
        date: '7/28',
        title: '阿里Wan2.2视频生成模型发布，超越Sora/Kling 2.0，5B版本地可跑',
        why: '在运动质量、画面质量等测试中超越闭源商业模型，RTX 3060即可本地部署。',
        sourceUrl: 'https://news.qq.com/rain/a/20250802A00M4300',
        tags: ['阿里', '视频生成', '开源'],
        factLevel: '事实',
      },
      {
        date: '7/28',
        title: '腾讯开源HunyuanWorld-1.0 3D世界模型 + CodeBuddy IDE国际版',
        why: '文字/图片即可生成完整3D世界，支持360°漫游；IDE整合Claude/GPT/Gemini。',
        sourceUrl: 'https://news.qq.com/rain/a/20250802A00M4300',
        tags: ['腾讯', '3D生成', 'IDE'],
        factLevel: '事实',
      },
      {
        date: '7/28',
        title: '全球首个设计AI Agent Lovart上线（腾讯混元支持）+ 特斯拉Optimus Gen 3入华计划',
        why: 'AI Agent从通用走向垂直专业领域；特斯拉人形机器人计划2025年进入中国C端。',
        sourceUrl: 'https://fangx.ai/july-2025-ai-major-events-summary-and-review/',
        tags: ['Agent', '机器人', '硬件'],
        factLevel: '事实',
      },
      {
        date: '7/26',
        title: 'OpenAI确认GPT-5 8月初发布；阿里夸克AI眼镜首次亮相WAIC',
        why: 'GPT-5可能重新定义行业格局；夸克眼镜整合通义千问+高德+支付宝+淘宝生态。',
        sourceUrl: 'https://fangx.ai/july-2025-ai-major-events-summary-and-review/',
        tags: ['GPT-5', 'AI眼镜', 'OpenAI'],
        factLevel: '预告',
      },
    ],
    nextWeek: [
      'OpenAI GPT-5 预计8月初正式发布',
      '关注GPT-5发布后美股AI板块反应（微软、NVIDIA）',
      '8月2日欧盟《通用AI行为准则》正式实施',
      '国内关注字节/百度/华为是否有新回应',
    ],
  },

  init() {
    this.render();
  },

  render() {
    const container = document.getElementById('aiHotContainer');
    const weekLabel = document.getElementById('aiHotWeekLabel');
    const d = this.data;

    weekLabel.textContent = d.weekLabel;

    let html = '<div class="ai-hot-list">';

    d.highlights.forEach((h) => {
      const factCls = h.factLevel === '事实' ? 'fact' : 'preview';
      html += `
        <div class="ai-hot-item">
          <div class="ai-hot-item-top">
            <span class="ai-hot-date">${h.date}</span>
            <span class="ai-hot-fact ${factCls}">${h.factLevel}</span>
            <span class="ai-hot-tags">${h.tags.map(t => `<span class="ai-hot-tag">#${t}</span>`).join(' ')}</span>
          </div>
          <div class="ai-hot-title">${h.title}</div>
          <div class="ai-hot-why">${h.why}</div>
          <a href="${h.sourceUrl}" target="_blank" rel="noopener" class="ai-hot-link">查看来源 →</a>
        </div>
      `;
    });

    html += '</div>';

    // 下周观察
    html += '<div class="ai-hot-next">';
    html += '<div class="ai-hot-next-title">👀 下周观察</div>';
    d.nextWeek.forEach(item => {
      html += `<div class="ai-hot-next-item">· ${item}</div>`;
    });
    html += '</div>';

    container.innerHTML = html;
  },
};
