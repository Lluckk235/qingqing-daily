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

function extractVideoUrl(value: unknown) {
  const raw = String(value || '').trim();
  const matched = raw.match(/https?:\/\/[^\s<>"'，。；、）】]+/i);
  let candidate = matched ? matched[0] : raw.replace(/^["'【（(\s]+|["'】）)\s]+$/g, '');
  if (!/^https?:\/\//i.test(candidate) && /^(?:[a-z0-9-]+\.)*(?:bilibili\.com|b23\.tv|douyin\.com|iesdouyin\.com)(?:\/|$)/i.test(candidate)) {
    candidate = `https://${candidate}`;
  }
  return candidate;
}

function valueFromJsonLd(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (Array.isArray(value)) return value.map(valueFromJsonLd).find(Boolean) || '';
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return valueFromJsonLd(record.url || record.contentUrl || record.name);
  }
  return '';
}

function readJsonLd(html: string) {
  const result = { title: '', cover_url: '', creator: '' };
  const objects: Record<string, unknown>[] = [];
  const collect = (value: unknown) => {
    if (Array.isArray(value)) return value.forEach(collect);
    if (!value || typeof value !== 'object') return;
    const record = value as Record<string, unknown>;
    objects.push(record);
    Object.values(record).forEach(child => {
      if (child && typeof child === 'object') collect(child);
    });
  };

  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    if (!/type\s*=\s*["']application\/ld\+json["']/i.test(match[1])) continue;
    try { collect(JSON.parse(match[2])); } catch (_) { /* 忽略格式不完整的 JSON-LD */ }
  }
  for (const item of objects) {
    if (!result.title) result.title = valueFromJsonLd(item.headline || item.name);
    if (!result.cover_url) result.cover_url = valueFromJsonLd(item.thumbnailUrl || item.image);
    if (!result.creator) result.creator = valueFromJsonLd(item.author || item.creator || item.publisher);
    if (result.title && result.cover_url && result.creator) break;
  }
  return result;
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
  try { target = new URL(extractVideoUrl(url)); } catch (_) { return json({ error: '链接格式不正确' }, 400); }
  if (!isAllowedHost(target.hostname.toLowerCase())) return json({ error: '仅支持抖音和哔哩哔哩链接' }, 400);
  try {
    const response = await fetch(target, { redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0 qingqing-daily/1.0' }, signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error(`upstream ${response.status}`);
    const finalUrl = new URL(response.url);
    if (!isAllowedHost(finalUrl.hostname.toLowerCase())) throw new Error('redirect host denied');
    const html = (await response.text()).slice(0, 750000);
    const jsonLd = readJsonLd(html);
    const title = readMeta(html, 'og:title') || readMeta(html, 'twitter:title') || jsonLd.title;
    const cover_url = readMeta(html, 'og:image') || readMeta(html, 'twitter:image') || jsonLd.cover_url;
    const creator = readMeta(html, 'author') || readMeta(html, 'og:site_name') || jsonLd.creator;
    const missing = [!title && 'title', !cover_url && 'cover', !creator && 'creator'].filter(Boolean);
    return json({
      title,
      cover_url,
      creator,
      missing,
      metadata_status: missing.length ? (title ? 'partial' : 'fallback') : 'ready',
      canonical_url: finalUrl.toString(),
    });
  } catch (_) {
    return json({ error: '平台未返回可用元数据' }, 422);
  }
});
