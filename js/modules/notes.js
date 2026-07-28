/* ========================================
   卿卿日常 · 快速笔记模块
   ======================================== */

const Notes = {
  init() {
    this.bindEvents();
    this.renderNotes();
  },

  bindEvents() {
    document.getElementById('btnSaveNote').addEventListener('click', () => this.saveNote());
    document.getElementById('btnClearNotes').addEventListener('click', () => {
      Storage.remove(CONFIG.storageKeys.notes);
      this.renderNotes();
      Helpers.showToast('笔记已清空', 'info');
    });

    // Ctrl+Enter 保存
    document.getElementById('noteContent').addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        this.saveNote();
      }
    });
  },

  saveNote() {
    const title = document.getElementById('noteTitle').value.trim();
    const content = document.getElementById('noteContent').value.trim();
    const category = document.getElementById('noteCategory').value;

    if (!title && !content) {
      Helpers.showToast('请输入笔记内容', 'error');
      return;
    }

    const note = {
      id: Helpers.uid(),
      title: title || '无标题',
      content,
      category,
      time: Date.now(),
    };

    Storage.pushArray(CONFIG.storageKeys.notes, note);
    Dashboard.addActivity('note', `新建笔记：${note.title}`);

    // 清空表单
    document.getElementById('noteTitle').value = '';
    document.getElementById('noteContent').value = '';

    this.renderNotes();
    Helpers.showToast('笔记已保存', 'success');
  },

  renderNotes() {
    const container = document.getElementById('notesList');
    const notes = Storage.getArray(CONFIG.storageKeys.notes);

    if (notes.length === 0) {
      container.innerHTML = '<div class="empty-hint">还没有笔记</div>';
      return;
    }

    const categoryLabels = {
      thought: '投资思考',
      trade: '交易记录',
      todo: '待办事项',
      research: '研究笔记',
    };

    const categoryBadges = {
      thought: 'info',
      trade: 'warm',
      todo: 'negative',
      research: 'positive',
    };

    container.innerHTML = notes.map((n, i) => `
      <div class="note-card">
        <div class="note-header">
          <span class="note-title">${Dashboard.escapeHtml(n.title)}</span>
          <span class="note-meta">
            <span class="badge ${categoryBadges[n.category] || 'info'}">${categoryLabels[n.category] || n.category}</span>
            <span>${Helpers.formatTimestamp(n.time)}</span>
            <span class="wl-remove" data-idx="${i}" title="删除" style="opacity:1;margin-left:4px;">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </span>
          </span>
        </div>
        <div class="note-body">${Dashboard.escapeHtml(n.content).replace(/\n/g, '<br>')}</div>
      </div>
    `).join('');

    // 删除
    container.querySelectorAll('.wl-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.idx);
        this.deleteNote(idx);
      });
    });
  },

  deleteNote(idx) {
    Storage.removeArray(CONFIG.storageKeys.notes, (_, i) => i === idx);
    this.renderNotes();
    Helpers.showToast('笔记已删除', 'info');
  },
};
