/* 私人工作台：邮箱魔法链接、指定邮箱邀请码与成员管理。 */
const WorkspaceAccess = {
  inviteToken: '',

  init() {
    this.inviteToken = new URLSearchParams(location.search).get('invite') || '';
    document.getElementById('btnWorkspaceAccess')?.addEventListener('click', () => this.openAccess());
    document.getElementById('btnWorkspaceMembers')?.addEventListener('click', () => this.openMembers());
    if (!Supabase.isAuthenticated && this.inviteToken) this.openAccess(true);
  },

  modal(title, body, saveText = '') {
    document.getElementById('workspaceAccessModal')?.remove();
    const el = document.createElement('div'); el.id = 'workspaceAccessModal'; el.className = 'modal-overlay';
    el.innerHTML = `<div class="modal workspace-modal"><div class="modal-header"><h3>${title}</h3><button class="btn-icon" data-close>×</button></div><div class="modal-body">${body}</div><div class="modal-footer"><button class="btn-secondary" data-close>取消</button>${saveText ? `<button class="btn-primary" data-save>${saveText}</button>` : ''}</div></div>`;
    document.body.appendChild(el); el.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => el.remove())); return el;
  },

  openAccess(invited = false) {
    const title = invited ? '激活你的私人工作台' : '登录私人工作台';
    const hint = invited ? '请输入收到邀请的邮箱。验证邮件会发到该邮箱；邀请链接被转发给其他邮箱也无法激活。' : '输入已绑定的邮箱。点击邮件里的链接后，这台设备会同步你的私人数据。';
    const modal = this.modal(title, `<p class="workspace-hint">${hint}</p><label>邮箱<input class="input" id="workspaceEmail" type="email" autocomplete="email" placeholder="name@example.com"></label>`, '发送登录邮件');
    modal.querySelector('[data-save]').addEventListener('click', async () => {
      const email = modal.querySelector('#workspaceEmail').value.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return Helpers.showToast('请输入正确的邮箱地址', 'error');
      try {
        if (this.inviteToken) await Supabase.invokeFunction('request-invite-login', { email, token: this.inviteToken });
        else await Supabase.sendMagicLink(email, false);
        modal.remove(); Helpers.showToast('登录邮件已发送，请在该邮箱打开链接', 'success');
      } catch (error) { Helpers.showToast(error.message, 'error'); }
    });
  },

  async afterSession() {
    if (!this.inviteToken) this.inviteToken = new URLSearchParams(location.search).get('invite') || '';
    if (!Supabase.hasSession || !this.inviteToken) return;
    try {
      await Supabase.invokeFunction('redeem-workspace-invite', { token: this.inviteToken });
      history.replaceState({}, document.title, location.pathname);
      this.inviteToken = '';
      await Supabase.loadMembership();
    } catch (error) { Helpers.showToast(error.message, 'error'); }
  },

  openSync() {
    if (!Supabase.hasSession) return this.openAccess();
    const modal = this.modal('开启多设备同步', '<p class="workspace-hint">绑定邮箱后，换手机时输入同一邮箱并点击邮件链接即可恢复这份工作台。日常不需要密码。</p><label>你的邮箱<input class="input" id="workspaceSyncEmail" type="email" autocomplete="email" placeholder="name@example.com"></label>', '发送确认邮件');
    modal.querySelector('[data-save]').addEventListener('click', async () => {
      const email = modal.querySelector('#workspaceSyncEmail').value.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return Helpers.showToast('请输入正确的邮箱地址', 'error');
      try { await Supabase.linkRecoveryEmail(email); modal.remove(); Helpers.showToast('确认邮件已发送；确认后即可在手机登录同步', 'success'); } catch (error) { Helpers.showToast(error.message, 'error'); }
    });
  },

  async openMembers() {
    if (!Supabase.isOwner) return;
    const modal = this.modal('成员管理', `<p class="workspace-hint">为指定邮箱生成一次性邀请链接（7 天有效）。只有该邮箱能激活。</p><label>朋友或粉丝邮箱<input class="input" id="inviteEmail" type="email" placeholder="friend@example.com"></label><div id="inviteResult"></div><div class="workspace-member-list" id="workspaceInviteList">加载中…</div>`, '生成邀请链接');
    const list = modal.querySelector('#workspaceInviteList');
    const reload = async () => {
      const rows = await Supabase.get('workspace_invitations?select=id,email,status,expires_at,accepted_at&order=created_at.desc');
      list.innerHTML = (rows || []).map(r => `<div class="workspace-member"><span>${r.email}<small>${r.status === 'pending' ? `待激活 · 截止 ${new Date(r.expires_at).toLocaleDateString('zh-CN')}` : r.status === 'accepted' ? '已激活' : '已撤销'}</small></span>${r.status === 'pending' ? `<button class="btn-text" data-revoke="${r.id}">撤销</button>` : ''}</div>`).join('') || '还没有邀请。';
    };
    try { await reload(); } catch (_) { list.textContent = '成员列表加载失败'; }
    list.addEventListener('click', async e => { const id = e.target.closest('[data-revoke]')?.dataset.revoke; if (!id) return; try { await Supabase.invokeFunction('revoke-workspace-invite', { id }); await reload(); } catch (error) { Helpers.showToast(error.message, 'error'); } });
    modal.querySelector('[data-save]').addEventListener('click', async () => {
      const email = modal.querySelector('#inviteEmail').value.trim().toLowerCase(); if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return Helpers.showToast('请输入正确的邮箱地址', 'error');
      try { const result = await Supabase.invokeFunction('create-workspace-invite', { email }); modal.querySelector('#inviteResult').innerHTML = `<label>复制后单独发给对方<input class="input" readonly value="${result.invite_url}"></label>`; await reload(); } catch (error) { Helpers.showToast(error.message, 'error'); }
    });
  },
};
window.WorkspaceAccess = WorkspaceAccess;
