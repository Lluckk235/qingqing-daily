// 部署：supabase functions deploy video-metadata --no-verify-jwt
// 函数内部仍会验证 Authorization JWT；不下载或存储视频/图片。
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const allowedHosts = ['douyin.com', 'bilibili.com', 'b23.tv'];
const isAllowedHost = (host: string) => allowedHosts.some(domain => host === domain || host.endsWith(`.${domain}`));

function readMeta(html: string, name: string) {
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${name}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${name}["']`, 'i'),
  ];
  for (const pattern of patterns) {
    const value = html.match(pattern)?.[1];
    if (value) return value.replaceAll('&amp;', '&').trim();
  }
  return '';
}

Deno.serve(async request => {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const auth = request.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return new Response('Unauthorized', { status: 401 });
  const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } });
  const { data: { user } } = await client.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });
  const { url } = await request.json().catch(() => ({}));
  let target: URL;
  try { target = new URL(url); } catch (_) { return Response.json({ error: '链接格式不正确' }, { status: 400 }); }
  if (!isAllowedHost(target.hostname.toLowerCase())) return Response.json({ error: '仅支持抖音和哔哩哔哩链接' }, { status: 400 });
  try {
    const response = await fetch(target, { redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0 qingqing-daily/1.0' }, signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error(`upstream ${response.status}`);
    const finalUrl = new URL(response.url);
    if (!isAllowedHost(finalUrl.hostname.toLowerCase())) throw new Error('redirect host denied');
    const html = (await response.text()).slice(0, 750000);
    const title = readMeta(html, 'og:title') || readMeta(html, 'twitter:title') || finalUrl.hostname;
    const cover_url = readMeta(html, 'og:image') || readMeta(html, 'twitter:image');
    const creator = readMeta(html, 'author') || readMeta(html, 'og:site_name');
    return Response.json({ title, cover_url, creator, canonical_url: finalUrl.toString() });
  } catch (_) {
    return Response.json({ error: '平台未返回可用元数据，请手动填写' }, { status: 422 });
  }
});
