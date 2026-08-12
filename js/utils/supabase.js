/* ========================================
   卿卿日常 · Supabase REST 封装（纯 fetch，无 CDN 依赖）
   所有模块统一使用此封装访问 Supabase
   使用 var 声明确保自动挂载到 window
   ======================================== */

var Supabase = {
  url: 'https://prpyjwxrovckkpzwytgw.supabase.co',
  key: 'sb_publishable_rWW7Vpp5hI1jgKofE34xaA_-XjFlfBj',
  appUrl: 'https://lluckk235.github.io/qingqing-daily/',
  // 保留旧键，避免原浏览器的匿名身份和历史数据丢失。
  sessionKey: 'qq_anonymous_session_v1',
  session: null,
  membership: null,
  refreshPromise: null,

  async initSession() {
    await this.consumeCallback();
    this.session = this.readSession();
    if (this.session && this.session.expires_at * 1000 > Date.now() + 60000) return this.session;
    if (this.session && this.session.refresh_token) {
      try { return await this.refreshSession(this.session.refresh_token); } catch (_) { this.clearSession(); }
    }
    return null;
  },

  readSession() {
    try { return JSON.parse(localStorage.getItem(this.sessionKey) || 'null'); } catch (_) { return null; }
  },

  saveSession(session) {
    this.session = session;
    localStorage.setItem(this.sessionKey, JSON.stringify(session));
    return session;
  },

  clearSession() {
    this.session = null;
    localStorage.removeItem(this.sessionKey);
  },

  async createAnonymousSession() {
    const res = await fetch(`${this.url}/auth/v1/signup`, {
      method: 'POST',
      headers: { 'apikey': this.key, 'Authorization': `Bearer ${this.key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: { app: 'qingqing-daily' } }),
    });
    if (!res.ok) throw new Error(`匿名身份创建失败 (${res.status})。请确认 Supabase 已启用 Anonymous Sign-Ins。`);
    const payload = await res.json();
    if (!payload.access_token || !payload.user?.id) throw new Error('Supabase 未返回匿名会话');
    return this.saveSession(payload);
  },

  async refreshSession(refreshToken) {
    const res = await fetch(`${this.url}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: { 'apikey': this.key, 'Authorization': `Bearer ${this.key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) throw new Error(`匿名会话刷新失败 (${res.status})`);
    return this.saveSession(await res.json());
  },

  async refreshActiveSession() {
    if (!this.session?.refresh_token) throw new Error('登录状态已失效，请在设置中重新登录');
    if (!this.refreshPromise) {
      this.refreshPromise = this.refreshSession(this.session.refresh_token)
        .finally(() => { this.refreshPromise = null; });
    }
    return this.refreshPromise;
  },

  get userId() { return this.session?.user?.id || null; },
  get hasSession() { return Boolean(this.session?.access_token && this.userId); },
  get isAuthenticated() { return this.hasSession && Boolean(this.membership?.status === 'active'); },
  get isOwner() { return this.isAuthenticated && this.membership?.role === 'owner'; },

  async consumeCallback() {
    const hash = new URLSearchParams(location.hash.slice(1));
    const accessToken = hash.get('access_token');
    const refreshToken = hash.get('refresh_token');
    if (!accessToken || !refreshToken) return null;
    const res = await fetch(`${this.url}/auth/v1/user`, { headers: { apikey: this.key, Authorization: `Bearer ${accessToken}` } });
    if (!res.ok) throw new Error('邮件登录链接已失效，请重新发送');
    const user = await res.json();
    this.saveSession({ access_token: accessToken, refresh_token: refreshToken, expires_at: Math.floor(Date.now() / 1000) + Number(hash.get('expires_in') || 3600), user });
    history.replaceState({}, document.title, `${location.pathname}${location.search}`);
    return this.session;
  },

  async loadMembership() {
    this.membership = null;
    if (!this.hasSession) return null;
    try {
      const rows = await this.get(`workspace_members?select=role,status&user_id=eq.${encodeURIComponent(this.userId)}&limit=1`);
      this.membership = rows?.[0] || null;
    } catch (_) { this.membership = null; }
    return this.membership;
  },

  async sendMagicLink(email, createUser = false, inviteToken = '') {
    // 不使用当前页面地址：手机从邮件、微信或旧路径打开时，可能把错误路径带进回跳链接并造成 GitHub Pages 404。
    const redirect = new URL(this.appUrl);
    if (inviteToken) redirect.searchParams.set('invite', inviteToken);
    const res = await fetch(`${this.url}/auth/v1/otp`, { method: 'POST', headers: { apikey: this.key, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, create_user: createUser, gotrue_meta_security: {}, redirect_to: redirect.toString() }) });
    if (res.status === 429) throw new Error('邮件发送已达免费额度（每小时最多 2 封），请等待约 1 小时后再试');
    if (!res.ok) throw new Error(`邮件发送失败 (${res.status})`);
  },

  headers(extra = {}) {
    return {
      'apikey': this.key,
      'Authorization': `Bearer ${this.session?.access_token || this.key}`,
      'Content-Type': 'application/json',
      ...extra,
    };
  },

  /**
   * 底层 fetch 封装
   * path: PostgREST 路径，如 'user_data?select=key,value'
   */
  async fetch(path, options = {}) {
    const url = `${this.url}/rest/v1/${path}`;
    const res = await fetch(url, {
      ...options,
      headers: { ...this.headers(), ...(options.headers || {}) },
    });
    if (!res.ok) {
      const err = await res.text().catch(() => '');
      console.warn('[Supabase] REST error:', path, res.status, err);
      throw new Error(`Supabase ${res.status}: ${err}`);
    }
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  },

  get(path) { return this.fetch(path, { method: 'GET' }); },

  post(path, body) {
    return this.fetch(path, { method: 'POST', body: JSON.stringify(body) });
  },

  /**
   * Upsert：插入或更新（基于唯一约束列）
   * path: 表名，如 'user_data'
   * body: 要插入的对象
   * onConflict: 冲突列名，如 'key'
   */
  upsert(path, body, onConflict) {
    const query = onConflict ? `${path}?on_conflict=${onConflict}` : path;
    return this.fetch(query, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Prefer': 'return=representation,resolution=merge-duplicates' },
    });
  },

  patch(path, body) {
    return this.fetch(path, {
      method: 'PATCH',
      body: JSON.stringify(body),
      headers: { 'Prefer': 'return=representation' },
    });
  },

  delete(path) { return this.fetch(path, { method: 'DELETE' }); },

  async invokeFunction(name, body) {
    const request = () => fetch(`${this.url}/functions/v1/${name}`, {
      method: 'POST', headers: this.headers(), body: JSON.stringify(body),
    });
    let res = await request();
    // 页面长时间未刷新时 JWT 会过期。静默刷新后只重试一次，避免让视频解析误报 401。
    if (res.status === 401 && this.session?.refresh_token) {
      try { await this.refreshActiveSession(); res = await request(); } catch (_) { /* 下面给出明确登录提示 */ }
    }
    if (!res.ok) {
      if (res.status === 401) throw new Error('登录状态已过期，请在设置中重新登录后再添加视频');
      const detail = await res.json().catch(() => null);
      throw new Error(detail?.error || `服务暂时无法解析视频信息 (${res.status})`);
    }
    return res.json();
  },

  async linkRecoveryEmail(email) {
    const res = await fetch(`${this.url}/auth/v1/user`, {
      // GoTrue 的 update-user 接口使用 email_redirect_to；redirect_to 会被忽略。
      method: 'PUT', headers: this.headers(), body: JSON.stringify({ email, email_redirect_to: this.appUrl }),
    });
    if (res.status === 429) throw new Error('确认邮件已达免费额度（每小时最多 2 封），请等待约 1 小时后再试');
    if (!res.ok) throw new Error(`恢复邮箱绑定失败 (${res.status})`);
    const user = await res.json();
    // 保留 new_email，设置页据此判断是否真的还有一封待确认邮件。
    if (this.session) this.saveSession({ ...this.session, user });
    return user;
  },

  async resendPendingEmailConfirmation() {
    const email = this.session?.user?.new_email;
    if (!email) throw new Error('当前邮箱已经确认；请在新设备的设置中发送登录邮件');
    const res = await fetch(`${this.url}/auth/v1/resend`, {
      method: 'POST', headers: { apikey: this.key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'email_change', email, email_redirect_to: this.appUrl }),
    });
    if (res.status === 429) throw new Error('邮件发送已达免费额度（每小时最多 2 封），请等待约 1 小时后再试');
    if (!res.ok) throw new Error(`确认邮件发送失败 (${res.status})`);
  },

  async signOut() {
    if (this.session?.access_token) await fetch(`${this.url}/auth/v1/logout`, { method: 'POST', headers: this.headers() }).catch(() => {});
    this.clearSession(); this.membership = null;
  },
};

// var 已自动挂载 window.Supabase，再显式赋值做双重保险
window.Supabase = Supabase;

/**
 * 控制台诊断函数
 * 在浏览器控制台执行：await supabaseDiag()
 */
var supabaseDiag = async function() {
  console.log('=== Supabase 诊断 ===');
  console.log('1. typeof window.supabase (CDN SDK):', typeof window.supabase);
  console.log('2. typeof window.supabaseClient (旧SDK实例):', typeof window.supabaseClient);
  console.log('3. typeof window.Supabase (REST封装):', typeof window.Supabase);
  console.log('4. Supabase.url:', window.Supabase ? window.Supabase.url : 'N/A');

  // 测试读取 user_data
  try {
    var data = await window.Supabase.get('user_data?select=key&limit=5');
    console.log('5. ✅ user_data 读取成功，行数:', data ? data.length : 0, 'keys:', data ? data.map(function(r) { return r.key; }) : []);
  } catch (e) {
    console.log('5. ❌ user_data 读取失败:', e.message);
  }

  // 测试读取 checkins
  try {
    var data2 = await window.Supabase.get('checkins?select=date&limit=3&order=date.desc');
    console.log('6. ✅ checkins 读取成功，行数:', data2 ? data2.length : 0, data2 ? data2.map(function(r) { return r.date; }) : []);
  } catch (e) {
    console.log('6. ❌ checkins 读取失败:', e.message);
  }

  console.log('=== 诊断结束 ===');
};

// var 已自动挂载 window.supabaseDiag，再显式赋值做双重保险
window.supabaseDiag = supabaseDiag;
