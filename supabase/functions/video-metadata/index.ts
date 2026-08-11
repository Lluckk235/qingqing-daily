// 函数内部验证 Authorization JWT；不下载或存储视频/图片。
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const allowedHosts = ['douyin.com', 'bilibili.com', 'b23.tv'];
const isAllowedHost = (host: string) => allowedHosts.some(domain => host === domain || host.endsWith('.' + domain));
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://lluckk235.github.io',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: Record<string, unknown>, status = 200) => Response.json(body, { status, headers: corsHeaders });

function attr(tag: string, attribute: string) {
  const pattern = new RegExp(attribute + "\\s*=\\s*(?:\"([^\"]*)\"|'([^']*)'|([^\\s>]+))", 'i');
  const match = tag.match(pattern);
  return match ? (match[1] || match[2] || match[3] || '') : '';
}

function readMeta(html: string, name: string) {
  for (const tag of html.match(/<meta\b[^>]*>/gi) || []) {
    const type = (attr(tag, 'property') || attr(tag, 'name')).toLowerCase();
    if (type === name.toLowerCase()) return attr(tag, 'content').replaceAll('&amp;', '&').trim();
  }
  return '';
}

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const auth = request.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SB_PUBLISHABLE_KEY');
  if (!anonKey) return json({ error: 'Function configuration missing' }, 500);
  const client = createClient(Deno.env.get('SUPABASE_URL')!, anonKey, { global: { headers: { Authorization: auth } } });
  const { data: { user } } = await client.auth.getUser();
  if (!user) return json({ error: 'Unauthorized' }, 401);
  const { url } = await request.json().catch(() => ({}));
  let target: URL;
  try { target = new URL(url); } catch (_) { return json({ error: '链接格式不正确' }, 400); }
  if (!isAllowedHost(target.hostname.toLowerCase())) return json({ error: '仅支持抖音和哔哩哔哩链接' }, 400);
  try {
    const response = await fetch(target, { redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0 qingqing-daily/1.0' }, signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error(`upstream ${response.status}`);
    const finalUrl = new URL(response.url);
    if (!isAllowedHost(finalUrl.hostname.toLowerCase())) throw new Error('redirect host denied');
    const html = (await response.text()).slice(0, 750000);
    const title = readMeta(html, 'og:title') || readMeta(html, 'twitter:title') || finalUrl.hostname;
    const cover_url = readMeta(html, 'og:image') || readMeta(html, 'twitter:image');
    const creator = readMeta(html, 'author') || readMeta(html, 'og:site_name');
    return json({ title, cover_url, creator, canonical_url: finalUrl.toString() });
  } catch (_) {
    return json({ error: '平台未返回可用元数据，请手动填写' }, 422);
  }
});
