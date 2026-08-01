/* ========================================
   卿卿日常 · GEX 期权分析模块
   ======================================== */

const GexAnalyzer = {
  currentSymbol: 'SPY',
  currentImage: null,

  init() {
    this.bindEvents();
    this.renderHistory();
  },

  bindEvents() {
    // 产品切换
    document.querySelectorAll('.gex-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.gex-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.currentSymbol = tab.dataset.symbol;
        this.resetUpload();
        this.updateUploadText();
      });
    });

    // 上传区域
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');

    document.getElementById('btnUpload').addEventListener('click', () => fileInput.click());
    uploadArea.addEventListener('click', (e) => {
      if (e.target !== document.getElementById('btnUpload')) fileInput.click();
    });

    // 拖拽上传
    uploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadArea.classList.add('drag-over');
    });
    uploadArea.addEventListener('dragleave', () => {
      uploadArea.classList.remove('drag-over');
    });
    uploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadArea.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      if (file) this.handleFile(file);
    });

    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) this.handleFile(file);
    });

    // 分析按钮
    document.getElementById('btnAnalyze').addEventListener('click', () => this.runAnalysis());
    document.getElementById('btnCancelUpload').addEventListener('click', () => this.resetUpload());

    // 清空历史
    document.getElementById('btnClearGexHistory').addEventListener('click', () => {
      Storage.remove(CONFIG.storageKeys.gexHistory);
      this.renderHistory();
      Helpers.showToast('分析历史已清空', 'info');
    });
  },

  updateUploadText() {
    document.querySelector('#uploadArea .upload-text').textContent =
      `拖拽或点击上传 ${this.currentSymbol} 期权分析截图`;
  },

  handleFile(file) {
    if (!file.type.startsWith('image/')) {
      Helpers.showToast('请上传图片文件', 'error');
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      Helpers.showToast('图片大小不能超过 20MB', 'error');
      return;
    }

    this.currentImage = file;

    const reader = new FileReader();
    reader.onload = (e) => {
      document.getElementById('previewImage').src = e.target.result;
      document.getElementById('uploadArea').classList.add('hidden');
      document.getElementById('uploadPreview').classList.remove('hidden');
      document.getElementById('analysisResult').classList.add('hidden');
    };
    reader.readAsDataURL(file);
  },

  resetUpload() {
    this.currentImage = null;
    document.getElementById('fileInput').value = '';
    document.getElementById('uploadArea').classList.remove('hidden');
    document.getElementById('uploadPreview').classList.add('hidden');
    document.getElementById('analysisResult').classList.add('hidden');
  },

  runAnalysis() {
    if (!this.currentImage) {
      Helpers.showToast('请先上传图片', 'error');
      return;
    }

    Helpers.showToast('正在分析中，请稍候...', 'info', 2000);

    setTimeout(() => {
      const sampleData = this.getSampleData(this.currentSymbol);
      this.showAnalysisTemplate(sampleData);
      document.getElementById('analysisResult').classList.remove('hidden');

      // 保存完整分析数据到历史
      const record = {
        id: Helpers.uid(),
        symbol: this.currentSymbol,
        time: Date.now(),
        imageName: this.currentImage.name,
        data: sampleData,
      };
      Storage.pushArray(CONFIG.storageKeys.gexHistory, record);
      Dashboard.addActivity('gex', `GEX分析：${this.currentSymbol} (${this.currentImage.name})`);
      this.renderHistory();
    }, 800);
  },

  showAnalysisTemplate(data) {
    const sym = this.currentSymbol;
    const sampleData = data || this.getSampleData(sym);
    document.getElementById('analysisTitle').textContent = `${sym} GEX 分析结果`;
    document.getElementById('analysisBadge').textContent = sym;

    document.getElementById('gexGamma').textContent = sampleData.gamma;
    document.getElementById('gexVolume').textContent = sampleData.volume;
    document.getElementById('gexPutCall').textContent = sampleData.putCall;
    document.getElementById('gexIVHV').textContent = sampleData.ivhv;
    document.getElementById('gexStrikes').textContent = sampleData.strikes;

    // 0DTE / 1DTE
    document.getElementById('dteAnalysis').innerHTML = `
      <div class="dte-card">
        <h4>0DTE 分析</h4>
        <div class="dte-row"><span class="dte-label">Gamma 敞口</span><span class="dte-val">${sampleData.dte0.gamma}</span></div>
        <div class="dte-row"><span class="dte-label">Call 阻力</span><span class="dte-val">${sampleData.dte0.callWall}</span></div>
        <div class="dte-row"><span class="dte-label">Put 支撑</span><span class="dte-val">${sampleData.dte0.putWall}</span></div>
        <div class="dte-row"><span class="dte-label">最大痛点</span><span class="dte-val">${sampleData.dte0.maxPain}</span></div>
        <div class="dte-row"><span class="dte-label">成交量</span><span class="dte-val">${sampleData.dte0.volume}</span></div>
      </div>
      <div class="dte-card">
        <h4>1DTE 分析</h4>
        <div class="dte-row"><span class="dte-label">Gamma 敞口</span><span class="dte-val">${sampleData.dte1.gamma}</span></div>
        <div class="dte-row"><span class="dte-label">Call 阻力</span><span class="dte-val">${sampleData.dte1.callWall}</span></div>
        <div class="dte-row"><span class="dte-label">Put 支撑</span><span class="dte-val">${sampleData.dte1.putWall}</span></div>
        <div class="dte-row"><span class="dte-label">最大痛点</span><span class="dte-val">${sampleData.dte1.maxPain}</span></div>
        <div class="dte-row"><span class="dte-label">成交量</span><span class="dte-val">${sampleData.dte1.volume}</span></div>
      </div>
    `;

    // 关键价位
    document.getElementById('levelsGrid').innerHTML = `
      <div class="level-card resistance">
        <div class="level-type">⬆ 上方压力</div>
        <div class="level-price">${sampleData.levels.resistance}</div>
        <div class="level-note">Call Wall 集中区</div>
      </div>
      <div class="level-card support">
        <div class="level-type">⬇ 下方支撑</div>
        <div class="level-price">${sampleData.levels.support}</div>
        <div class="level-note">Put Wall 集中区</div>
      </div>
      <div class="level-card magnet">
        <div class="level-type">🧲 可能吸附位</div>
        <div class="level-price">${sampleData.levels.magnet}</div>
        <div class="level-note">最大GEX价位</div>
      </div>
      <div class="level-card breakdown">
        <div class="level-type">⚠ 风险破位位</div>
        <div class="level-price">${sampleData.levels.breakdown}</div>
        <div class="level-note">跌破触发加速</div>
      </div>
    `;

    // 大盘环境 + 执行方案
    const bias = sampleData.bias;
    document.getElementById('marketBias').textContent = bias.label;
    document.getElementById('marketBias').className = `market-bias ${bias.color}`;
    document.getElementById('conclusionText').innerHTML = sampleData.conclusion;
    document.getElementById('actionPlan').innerHTML = sampleData.actionPlan;
  },

  getSampleData(symbol) {
    // 模板数据（实际使用时由 AI 从截图中识别）
    if (symbol === 'SPY') {
      return {
        gamma: '+3.2B（偏正）',
        volume: '545-550 高量集中',
        putCall: '0.72（偏 Call）',
        ivhv: 'IV 18.2% / HV 15.8%（IV溢价）',
        strikes: '548 / 550 / 545 / 540',
        dte0: { gamma: '+1.8B', callWall: '550', putWall: '542', maxPain: '546', volume: '2.1M' },
        dte1: { gamma: '+2.4B', callWall: '552', putWall: '540', maxPain: '548', volume: '1.8M' },
        levels: { resistance: '550-552', support: '540-542', magnet: '546-548', breakdown: '538' },
        bias: { label: '偏多', color: 'bullish' },
        conclusion: 'GEX +3.2B偏正，0DTE Put Wall 542强支撑，Call Wall 550形成压力。IV溢价但方向偏多，550突破则加速上行。',
        actionPlan: `<div class="action-plan-item"><span class="ap-label">方向</span><span class="ap-value bullish">偏多操作</span></div>
          <div class="action-plan-item"><span class="ap-label">入场</span><span class="ap-value">回调至 544-546 不破则做多，或突破 550 追多</span></div>
          <div class="action-plan-item"><span class="ap-label">止损</span><span class="ap-value">跌破 540 止损，破 538 反手做空</span></div>
          <div class="action-plan-item"><span class="ap-label">目标</span><span class="ap-value">第一目标 550，第二目标 552-555</span></div>
          <div class="action-plan-item"><span class="ap-label">风险</span><span class="ap-value">IV溢价偏高，买方成本大，注意时间衰减</span></div>`,
      };
    } else {
      return {
        gamma: '+1.8B（偏正）',
        volume: '480-485 高量集中',
        putCall: '0.85（偏 Call）',
        ivhv: 'IV 22.5% / HV 19.2%（IV溢价明显）',
        strikes: '482 / 485 / 478 / 475',
        dte0: { gamma: '+1.1B', callWall: '485', putWall: '475', maxPain: '480', volume: '1.5M' },
        dte1: { gamma: '+1.5B', callWall: '488', putWall: '473', maxPain: '482', volume: '1.3M' },
        levels: { resistance: '485-488', support: '473-475', magnet: '480-482', breakdown: '470' },
        bias: { label: '偏多', color: 'bullish' },
        conclusion: 'GEX +1.8B偏正但弱于SPY。IV溢价更高，科技股波动大。480为最大痛点，485 Call Wall压制，475下方支撑有效。',
        actionPlan: `<div class="action-plan-item"><span class="ap-label">方向</span><span class="ap-value bullish">偏多操作</span></div>
          <div class="action-plan-item"><span class="ap-label">入场</span><span class="ap-value">478-480 区间不破做多，或站上 485 追多</span></div>
          <div class="action-plan-item"><span class="ap-label">止损</span><span class="ap-value">跌破 473 止损，破 470 反手</span></div>
          <div class="action-plan-item"><span class="ap-label">目标</span><span class="ap-value">第一目标 485，第二目标 488-490</span></div>
          <div class="action-plan-item"><span class="ap-label">风险</span><span class="ap-value">高IV + 高波动，仓位减半，避免追高</span></div>`,
      };
    }
  },

  // --- 分析历史 ---
  renderHistory() {
    const container = document.getElementById('gexHistory');
    const history = Storage.getArray(CONFIG.storageKeys.gexHistory);

    if (history.length === 0) {
      container.innerHTML = '<div class="empty-hint">还没有分析记录</div>';
      return;
    }

    container.innerHTML = history.map((h, i) => `
      <div class="history-item" data-idx="${i}">
        <div class="hi-left clickable" data-action="view" data-idx="${i}">
          <span class="hi-company">${Dashboard.escapeHtml(h.symbol)}</span>
          <span class="hi-type">${Dashboard.escapeHtml(h.imageName || '截图分析')}</span>
        </div>
        <div class="hi-right">
          <span class="hi-time">${Helpers.formatTimestamp(h.time)}</span>
          <span class="hi-delete" data-action="delete" data-idx="${i}" title="删除此条">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </span>
        </div>
      </div>
    `).join('');

    // 点击查看
    container.querySelectorAll('[data-action="view"]').forEach(el => {
      el.addEventListener('click', () => {
        const idx = parseInt(el.dataset.idx);
        const h = history[idx];
        if (h && h.data) {
          this.currentSymbol = h.symbol;
          // 切换到 GEX 面板
          App.navigateTo('gex');
          // 显示历史数据
          document.getElementById('uploadArea').classList.add('hidden');
          document.getElementById('uploadPreview').classList.add('hidden');
          this.showAnalysisTemplate(h.data);
          document.getElementById('analysisResult').classList.remove('hidden');
          Helpers.showToast(`已加载 ${h.symbol} ${Helpers.formatTimestamp(h.time)} 的分析`, 'info');
        }
      });
    });

    // 单条删除
    container.querySelectorAll('[data-action="delete"]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(el.dataset.idx);
        this.deleteHistoryItem(idx);
      });
    });
  },

  deleteHistoryItem(idx) {
    Storage.removeArray(CONFIG.storageKeys.gexHistory, (_, i) => i === idx);
    this.renderHistory();
    Helpers.showToast('已删除该条记录', 'info');
  },
};

// 暴露到全局
window.GexAnalyzer = GexAnalyzer;
