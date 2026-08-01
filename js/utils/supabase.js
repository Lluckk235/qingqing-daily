/* ========================================
   卿卿日常 · Supabase REST 封装（纯 fetch，无 CDN 依赖）
   所有模块统一使用此封装访问 Supabase
   使用 var 声明确保自动挂载到 window
   ======================================== */

var Supabase = {
  url: 'https://prpyjwxrovckkpzwytgw.supabase.co',
  key: 'sb_publishable_rWW7Vpp5hI1jgKofE34xaA_-XjFlfBj',

  headers(extra = {}) {
    return {
      'apikey': this.key,
      'Authorization': `Bearer ${this.key}`,
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
