// 函数内部验证 Authorization JWT；不下载或存储视频/图片。
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const allowedHosts = ['douyin.com', 'iesdouyin.com', 'bilibili.com', 'b23.tv'];
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

function decodeEscaped(value: string) {
  return value
    .replace(/\\u([0-9a-f]{4})/gi, (_, hex) => String.fromCharCode(Number.parseInt(hex, 16)))
    .replace(/\\\//g, '/')
    .replace(/\\"/g, '"')
    .replace(/&amp;/g, '&')
    .trim();
}

// 抖音经常不输出 Open Graph，但首屏脚本中仍会携带 desc / cover_url。
function readDouyinScriptMetadata(html: string) {
  const find = (patterns: RegExp[]) => {
    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match?.[1]) return decodeEscaped(match[1]);
    }
    return '';
  };
  return {
    title: find([/"desc"\s*:\s*"((?:\\.|[^"\\])*)"/i, /"title"\s*:\s*"((?:\\.|[^"\\])*)"/i]),
    cover_url: find([/"(?:cover_url|origin_cover|dynamic_cover|cover)"\s*:\s*"((?:\\.|[^"\\])*)"/i]),
    creator: find([/"(?:nickname|author_name)"\s*:\s*"((?:\\.|[^"\\])*)"/i]),
  };
}

function titleFromShareText(value: unknown) {
  const original = String(value || '').replace(/[\n\r]+/g, ' ');
  // 抖音的「复制链接」通常是：7.66 复制打开抖音，看看【标题】的视频。
  // 只取书名号中的标题，避免把“7.66 复制”保存进动作库。
  const bracketed = original.match(/看看\s*【([^】]{2,140})】\s*的?视频/i)?.[1]?.trim();
  if (bracketed) return bracketed;
  const text = String(value || '').replace(/https?:\/\/[^\s<>'"，。；、）】]+/gi, ' ').trim();
  const cleaned = text
    .replace(/[\n\r]+/g, ' ')
    .replace(/复制此链接[，,。！!]?\s*打开抖音.*$/i, '')
    .replace(/打开抖音.*$/i, '')
    .replace(/#(?:抖音|douyin)\b/gi, '')
    .trim();
  const withoutCode = cleaned.replace(/^\s*\d{1,3}\.\d{2}\s*复制\s*/i, '').trim();
  return withoutCode.length >= 2 && withoutCode.length <= 140 && !/^(?:复制|打开抖音)$/i.test(withoutCode) ? withoutCode : '';
}

function bilibiliBvid(url: URL) {
  const match = url.pathname.match(/\/video\/(BV[0-9A-Za-z]+)/i);
  return match?.[1] || '';
}

// B 站公开页面偶尔会对云端网页抓取触发风控；其公开视频接口更稳定，且不需要账号或密钥。
async function readBilibiliPublicMetadata(url: URL) {
  if (!url.hostname.toLowerCase().endsWith('bilibili.com')) return { title: '', cover_url: '', creator: '' };
  const bvid = bilibiliBvid(url);
  if (!bvid) return { title: '', cover_url: '', creator: '' };
  try {
    const response = await fetch(`https://api.bilibili.com/x/web-interface/view?bvid=${encodeURIComponent(bvid)}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 qingqing-daily/1.0', Accept: 'application/json' },
      signal: AbortSignal.timeout(5000),
    });
    const body = await response.json();
    const data = body?.code === 0 ? body.data : null;
    return { title: String(data?.title || ''), cover_url: String(data?.pic || '').replace(/^http:/, 'https:'), creator: String(data?.owner?.name || '') };
  } catch (_) {
    return { title: '', cover_url: '', creator: '' };
  }
}

function douyinAwemeId(url: URL, html = '') {
  const pathMatch = url.pathname.match(/\/(?:video|note)\/(\d{10,})/);
  if (pathMatch?.[1]) return pathMatch[1];
  const htmlMatch = html.match(/(?:aweme_id|itemId|item_id)["'=:\\s]+(\d{10,})/i);
  return htmlMatch?.[1] || '';
}

function firstUrl(value: unknown): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(firstUrl).find(Boolean) || '';
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return firstUrl(record.url_list || record.urlList || record.url || record.uri);
  }
  return '';
}

// 分享页常因风控不给 HTML 元数据；该公开详情接口能在多数情况下返回同一条公开视频的信息。
async function readDouyinPublicMetadata(url: URL, html: string) {
  if (!url.hostname.toLowerCase().endsWith('douyin.com')) return { title: '', cover_url: '', creator: '' };
  const awemeId = douyinAwemeId(url, html);
  if (!awemeId) return { title: '', cover_url: '', creator: '' };
  const endpoints = [
    `https://www.iesdouyin.com/web/api/v2/aweme/iteminfo/?item_ids=${encodeURIComponent(awemeId)}`,
    `https://www.douyin.com/aweme/v1/web/aweme/detail/?aweme_id=${encodeURIComponent(awemeId)}&aid=6383&device_platform=webapp`,
  ];
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; qingqing-daily/1.0)', Accept: 'application/json', Referer: 'https://www.douyin.com/' },
        signal: AbortSignal.timeout(6000),
      });
      if (!response.ok) continue;
      const body = await response.json();
      const item = body?.item_list?.[0] || body?.aweme_detail || body?.data?.aweme_detail || body?.data?.[0];
      if (!item) continue;
      const result = {
        title: String(item?.desc || item?.title || '').trim(),
        cover_url: firstUrl(item?.video?.origin_cover || item?.video?.cover || item?.video?.dynamic_cover).replace(/^http:/i, 'https:'),
        creator: String(item?.author?.nickname || item?.author?.unique_id || '').trim(),
      };
      if (result.title || result.cover_url || result.creator) return result;
    } catch (_) { /* 尝试下一个公开端点 */ }
  }
  return { title: '', cover_url: '', creator: '' };
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
  const { url, share_text } = await request.json().catch(() => ({}));
  let target: URL;
  try { target = new URL(extractVideoUrl(url)); } catch (_) { return json({ error: '链接格式不正确' }, 400); }
  if (!isAllowedHost(target.hostname.toLowerCase())) return json({ error: '仅支持抖音和哔哩哔哩链接' }, 400);
  try {
    const response = await fetch(target, { redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0 qingqing-daily/1.0' }, signal: AbortSignal.timeout(8000) });
    const finalUrl = new URL(response.url);
    if (!isAllowedHost(finalUrl.hostname.toLowerCase())) throw new Error('redirect host denied');
    const bilibili = await readBilibiliPublicMetadata(finalUrl);
    // 抖音分享页常返回风控页，但重定向后的 URL 仍可用来请求公开视频详情接口。
    const isDouyin = finalUrl.hostname.toLowerCase().endsWith('douyin.com');
    if (!response.ok && !bilibili.title && !isDouyin) throw new Error(`upstream ${response.status}`);
    const html = response.ok ? (await response.text()).slice(0, 750000) : '';
    const jsonLd = readJsonLd(html);
    const douyin = finalUrl.hostname.toLowerCase().endsWith('douyin.com') ? readDouyinScriptMetadata(html) : { title: '', cover_url: '', creator: '' };
    const douyinPublic = await readDouyinPublicMetadata(finalUrl, html);
    const title = bilibili.title || douyinPublic.title || readMeta(html, 'og:title') || readMeta(html, 'twitter:title') || jsonLd.title || douyin.title || titleFromShareText(share_text);
    const cover_url = bilibili.cover_url || douyinPublic.cover_url || readMeta(html, 'og:image') || readMeta(html, 'twitter:image') || jsonLd.cover_url || douyin.cover_url;
    const creator = bilibili.creator || douyinPublic.creator || readMeta(html, 'author') || readMeta(html, 'og:site_name') || jsonLd.creator || douyin.creator;
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
