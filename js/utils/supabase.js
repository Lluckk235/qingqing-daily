/* ========================================
   卿卿日常 · Supabase 客户端
   双通道: SDK (旧模块) + 自定义 fetch (checkin/daily-quote)
   ======================================== */

window.supabaseClient = window.supabase.createClient(
  'https://prpyjwxrovckkpzwytgw.supabase.co',
  'sb_publishable_rWW7Vpp5hI1jgKofE34xaA_-XjFlfBj'
);

// 自定义 fetch 封装，供 checkin.js / daily-quote.js 使用
const Supabase = {
  url: 'https://prpyjwxrovckkpzwytgw.supabase.co',
  key: 'sb_publishable_rWW7Vpp5hI1jgKofE34xaA_-XjFlfBj',

  headers() {
    return {
      'apikey': this.key,
      'Authorization': `Bearer ${this.key}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    };
  },

  async fetch(path, options = {}) {
    const url = `${this.url}/rest/v1/${path}`;
    const res = await fetch(url, {
      ...options,
      headers: { ...this.headers(), ...(options.headers || {}) },
    });
    if (!res.ok) {
      const err = await res.text();
      console.warn('Supabase error:', path, res.status, err);
      throw new Error(`Supabase ${res.status}: ${err}`);
    }
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  },

  get(path) { return this.fetch(path, { method: 'GET' }); },
  post(path, body) { return this.fetch(path, { method: 'POST', body: JSON.stringify(body) }); },
  patch(path, body) { return this.fetch(path, { method: 'PATCH', body: JSON.stringify(body) }); },
  delete(path) { return this.fetch(path, { method: 'DELETE' }); },
};
