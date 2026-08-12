/* 私人工作台：邮箱魔法链接、指定邮箱邀请码与成员管理。 */
const WorkspaceAccess = {
  inviteToken: '',

  init() {
    this.inviteToken = new URLSearchParams(location.search).get('invite') || '';
    document.getElementById('btnSettings')?.addEventListener('click', () => this.openSettings());
    if (!Supabase.isAuthenticated && this.inviteToken) this.openAccess(true);
  },

  escape(value = '') {
    return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  },

  modal(title, body, saveText = '', closeText = '取消') {
    document.getElementById('workspaceAccessModal')?.remove();
    const el = document.createElement('div'); el.id = 'workspaceAccessModal'; el.className = 'modal-overlay';
    el.innerHTML = `<div class="modal workspace-modal"><div class="modal-header"><h3>${title}</h3><button class="btn-icon" data-close aria-label="关闭">×</button></div><div class="modal-body">${body}</div><div class="modal-footer"><button class="btn-secondary" data-close>${closeText}</button>${saveText ? `<button class="btn-primary" data-save>${saveText}</button>` : ''}</div></div>`;
    document.body.appendChild(el); el.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => el.remove())); return el;
  },

  openAccess(invited = false) {
    const title = invited ? '激活你的私人工作台' : '登录私人工作台';
    const hint = invited
      ? '请输入收到邀请的邮箱。验证邮件会发到该邮箱；邀请链接被转发给其他邮箱也无法激活。'
      : '输入邮箱与登录密码即可进入。添加到 iPhone 主屏幕后，用同一邮箱＋密码登录，数据会自动同步，之后打开无需再次登录。';
    // 日常登录以「邮箱 + 密码」为主；Magic Link 降为低优先级恢复入口（换设备/忘记密码）。
    const body = `
      <p class="workspace-hint">${hint}</p>
      <label>邮箱<input class="input" id="workspaceEmail" type="email" autocomplete="email" placeholder="name@example.com"></label>
      <label>密码<input class="input" id="workspacePassword" type="password" autocomplete="current-password" placeholder="你的登录密码"></label>
      <button class="btn-text workspace-recover" type="button" data-magic-link>忘记密码 / 用邮箱链接登录</button>
    `;
    const modal = this.modal(title, body, '登录');
    const emailEl = modal.querySelector('#workspaceEmail');
    const passEl = modal.querySelector('#workspacePassword');

    // 低优先级：使用邮箱链接（Magic Link）恢复登录，不清除上方输入框。
    modal.querySelector('[data-magic-link]')?.addEventListener('click', () => {
      const email = emailEl.value.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return Helpers.showToast('请输入正确的邮箱地址', 'error');
      const send = async () => {
        try {
          if (this.inviteToken) await Supabase.invokeFunction('request-invite-login', { email, token: this.inviteToken });
          else await Supabase.sendMagicLink(email, false);
          Helpers.showToast('登录邮件已发送，请在该邮箱打开链接', 'success');
        } catch (error) { Helpers.showToast(error.message, 'error'); }
      };
      send();
    });

    modal.querySelector('[data-save]').addEventListener('click', async () => {
      const email = emailEl.value.trim().toLowerCase();
      const password = passEl.value;
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return Helpers.showToast('请输入正确的邮箱地址', 'error');
      if (!password) return Helpers.showToast('请输入登录密码', 'error');
      const btn = modal.querySelector('[data-save]');
      btn.disabled = true; btn.textContent = '登录中…';
      try {
        await Supabase.signInWithPassword(email, password);
        modal.remove();
        const ok = await this.finishLogin();
        Helpers.showToast(ok ? '登录成功，正在加载你的工作台…' : '登录成功，但该邮箱暂无私人工作台权限', ok ? 'success' : 'error');
        // 重载页面让 App.init 从已保存会话全量加载私有模块；会话存于 localStorage，重载后仍保持登录。
        // 非 active 成员则不刷新（留在登录界面，避免访客误进）。
        if (ok) setTimeout(() => { location.href = location.pathname; }, 600);
        else this.openAccess(Boolean(this.inviteToken));
      } catch (error) {
        Helpers.showToast(error.message, 'error');
        btn.disabled = false; btn.textContent = '登录';
      }
    });
  },

  // 登录（Magic Link 或 password）成功后统一执行：载入成员身份、同步云端数据。
  async finishLogin() {
    try {
      await Supabase.loadMembership();
    } catch (_) { /* 放行 UI 刷新 */ }
    Storage.cloudSync = Supabase.isAuthenticated;
    if (Supabase.isAuthenticated) {
      await Promise.race([Storage.syncFromCloud(), new Promise(r => setTimeout(r, 3000))]);
    }
    return Supabase.isAuthenticated;
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
    if (!Supabase.isOwner) return Helpers.showToast('只有工作台管理员可以绑定恢复邮箱', 'error');
    const modal = this.modal('开启多设备同步', '<p class="workspace-hint">绑定邮箱后，换手机时输入同一邮箱并点击邮件链接即可恢复这份工作台。日常不需要密码。</p><label>你的邮箱<input class="input" id="workspaceSyncEmail" type="email" autocomplete="email" placeholder="name@example.com"></label>', '发送确认邮件');
    modal.querySelector('[data-save]').addEventListener('click', async () => {
      const email = modal.querySelector('#workspaceSyncEmail').value.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return Helpers.showToast('请输入正确的邮箱地址', 'error');
      try { await Supabase.linkRecoveryEmail(email); modal.remove(); Helpers.showToast('确认邮件已发送；确认后即可在手机登录同步', 'success'); } catch (error) { Helpers.showToast(error.message, 'error'); }
    });
  },

  async openSettings() {
    if (!Supabase.isAuthenticated) {
      const modal = this.modal('设置', '<p class="workspace-hint">登录后才能查看和同步自己的私人工作台。收到专属邀请码时，请在该链接打开的网站里使用对应邮箱登录。</p>', '登录/使用邀请码', '关闭');
      modal.querySelector('[data-save]')?.addEventListener('click', () => {
        modal.remove();
        this.openAccess(Boolean(this.inviteToken));
      });
      return;
    }

    const email = Supabase.session?.user?.email || '';
    const pendingEmail = Supabase.session?.user?.new_email || '';

    // 登录密码：所有已认证成员（含普通成员）均可见；仅设置/修改自身密码，不能见成员管理。
    const loginPassword = `
      <section class="workspace-setting-section">
        <h4>登录密码</h4>
        <p class="workspace-hint">设置后，iPhone 主屏幕版或任意新设备直接用「邮箱 + 登录密码」即可进入，无需再走邮件链接。密码至少 10 位。</p>
        <label>新密码<input class="input" id="wsNewPass" type="password" autocomplete="new-password" placeholder="至少 10 位"></label>
        <label>确认新密码<input class="input" id="wsConfirmPass" type="password" autocomplete="new-password" placeholder="再次输入新密码"></label>
        <button class="btn-primary" type="button" data-save-password>设置 / 修改登录密码</button>
      </section>`;

    const ownerSync = Supabase.isOwner
      ? (email || pendingEmail)
        ? `<section class="workspace-setting-section"><h4>多设备同步</h4><p class="workspace-hint">${pendingEmail ? `正在等待确认 <strong>${this.escape(pendingEmail)}</strong>。` : `已绑定 <strong>${this.escape(email)}</strong>。`}换设备时，请在新设备的设置中输入此邮箱并打开<strong>新设备发出的登录邮件</strong>；网站更新不会影响身份或云端数据。</p>${pendingEmail ? '<button class="btn-text" type="button" data-resend-confirmation>重新发送确认邮件</button>' : ''}</section>`
        : '<section class="workspace-setting-section"><h4>多设备同步</h4><p class="workspace-hint">绑定邮箱后，换手机时可恢复当前这份工作台；日常无需登录。</p><button class="btn-primary" type="button" data-open-sync>开启多设备同步</button></section>'
      : '';
    const ownerMembers = Supabase.isOwner
      ? `<section class="workspace-setting-section workspace-owner-section"><h4>成员管理</h4><p class="workspace-hint">为指定邮箱生成一次性邀请链接（7 天有效）。对方激活后只能使用自己的数据，不能查看或管理其他成员。</p><label>朋友或粉丝邮箱<input class="input" id="inviteEmail" type="email" autocomplete="email" placeholder="friend@example.com"></label><button class="btn-primary" type="button" id="btnCreateInvitation">生成专属邀请链接</button><div id="inviteResult"></div><div class="workspace-member-list" id="workspaceInviteList">加载中…</div></section>`
      : '';
    const modal = this.modal('设置', `${loginPassword}<section class="workspace-setting-section"><h4>数据与访问</h4><p class="workspace-detail"><span>当前邮箱</span><strong>${email ? this.escape(email) : pendingEmail ? `待确认：${this.escape(pendingEmail)}` : '暂未绑定'}</strong></p><p class="workspace-hint">在新设备打开常用网址，进入设置后用同一邮箱登录，即可继续使用自己的工作台。</p><button class="btn-text workspace-danger" type="button" data-sign-out>退出当前设备</button></section>${ownerSync}${ownerMembers}`, '', '关闭');

    modal.querySelector('[data-save-password]')?.addEventListener('click', async () => {
      const np = modal.querySelector('#wsNewPass').value;
      const cp = modal.querySelector('#wsConfirmPass').value;
      if (np.length < 10) return Helpers.showToast('密码至少 10 位', 'error');
      if (np !== cp) return Helpers.showToast('两次输入的密码不一致', 'error');
      const btn = modal.querySelector('[data-save-password]');
      btn.disabled = true; btn.textContent = '保存中…';
      try {
        await Supabase.updatePassword(np);
        modal.querySelector('#wsNewPass').value = '';
        modal.querySelector('#wsConfirmPass').value = '';
        Helpers.showToast('登录密码已更新，主屏幕版现在可用「邮箱 + 密码」进入', 'success');
      } catch (error) { Helpers.showToast(error.message, 'error'); }
      btn.disabled = false; btn.textContent = '设置 / 修改登录密码';
    });

    modal.querySelector('[data-open-sync]')?.addEventListener('click', () => { modal.remove(); this.openSync(); });
    modal.querySelector('[data-resend-confirmation]')?.addEventListener('click', async () => {
      try {
        await Supabase.resendPendingEmailConfirmation();
        Helpers.showToast('确认邮件已发送，请在邮箱中完成确认', 'success');
      } catch (error) { Helpers.showToast(error.message, 'error'); }
    });
    modal.querySelector('[data-sign-out]')?.addEventListener('click', async () => {
      try {
        await Supabase.signOut();
        location.href = location.pathname;
      } catch (error) { Helpers.showToast(error.message || '退出失败，请重试', 'error'); }
    });
    if (Supabase.isOwner) this.bindInviteManager(modal);
  },

  async bindInviteManager(modal) {
    const list = modal.querySelector('#workspaceInviteList');
    if (!list) return;
    const reload = async () => {
      const rows = await Supabase.get('workspace_invitations?select=id,email,status,expires_at,accepted_at&order=created_at.desc');
      list.innerHTML = (rows || []).map(r => {
        const status = r.status === 'pending' ? `待激活 · 截止 ${new Date(r.expires_at).toLocaleDateString('zh-CN')}` : r.status === 'accepted' ? '已激活' : '已撤销';
        return `<div class="workspace-member"><span>${this.escape(r.email)}<small>${status}</small></span>${r.status === 'pending' ? `<button class="btn-text" type="button" data-revoke="${r.id}">撤销</button>` : ''}</div>`;
      }).join('') || '还没有邀请。';
    };
    try { await reload(); } catch (_) { list.textContent = '成员列表加载失败'; }
    list.addEventListener('click', async e => { const id = e.target.closest('[data-revoke]')?.dataset.revoke; if (!id) return; try { await Supabase.invokeFunction('revoke-workspace-invite', { id }); await reload(); } catch (error) { Helpers.showToast(error.message, 'error'); } });
    modal.querySelector('#btnCreateInvitation')?.addEventListener('click', async () => {
      const email = modal.querySelector('#inviteEmail').value.trim().toLowerCase(); if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return Helpers.showToast('请输入正确的邮箱地址', 'error');
      try { const result = await Supabase.invokeFunction('create-workspace-invite', { email }); modal.querySelector('#inviteResult').innerHTML = `<label>复制后单独发给对方<input class="input" readonly value="${this.escape(result.invite_url)}"></label>`; await reload(); } catch (error) { Helpers.showToast(error.message, 'error'); }
    });
  },
};
window.WorkspaceAccess = WorkspaceAccess;
