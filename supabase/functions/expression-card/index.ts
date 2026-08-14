import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const appOrigin = 'https://lluckk235.github.io';
const corsHeaders = { 'Access-Control-Allow-Origin': appOrigin, 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const json = (body: Record<string, unknown>, status = 200) => Response.json(body, { status, headers: corsHeaders });
const clean = (value: unknown, limit: number) => String(value || '').replace(/\s+/g, ' ').trim().slice(0, limit);

function safePublicUrl(raw: unknown) {
  try {
    const url = new URL(String(raw || '').trim());
    if (url.protocol !== 'https:') return null;
    const host = url.hostname.toLowerCase();
    if (host === 'localhost' || /^(127\.|10\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(host)) return null;
    return url;
  } catch (_) { return null; }
}

function htmlText(html: string) {
  const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const withoutNoise = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<noscript[\s\S]*?<\/noscript>/gi, ' ');
  const text = withoutNoise.replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&amp;|&quot;|&#39;/g, ' ').replace(/\s+/g, ' ').trim();
  return { title: clean(title, 160), text: clean(text, 7000) };
}

async function sourceFromUrl(raw: unknown) {
  const url = safePublicUrl(raw); if (!url) return { url: '', title: '', summary: '', note: '' };
  if (/(^|\.)douyin\.com$|(^|\.)iesdouyin\.com$/.test(url.hostname)) return { url: url.toString(), title: '', summary: '', note: '抖音链接不自动读取口播，请在输入框补一句你想讲的观察。' };
  try {
    const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; QingqingDaily/1.0)' }, redirect: 'follow' });
    if (!response.ok || !response.headers.get('content-type')?.includes('text/html')) throw new Error('unreadable');
    const parsed = htmlText(await response.text());
    return { url: url.toString(), title: parsed.title, summary: parsed.text.slice(0, 3500), note: parsed.text ? '' : '链接没有可提炼的正文，请补一句你的观察。' };
  } catch (_) { return { url: url.toString(), title: '', summary: '', note: '链接暂时读不到，请补一句你想讲的观察。' }; }
}

function promptForCreate(input: string, source: { title: string; summary: string; note: string }) {
  return `你是中文短视频表达教练。用户不是要鸡汤，也不是要照抄文章；请把她真实的想法整理成可直接练习的表达卡。\n创作档案：面向中文短视频用户，重点是个人成长与女性成长的具体处境；口语自然、有判断、有场景，拒绝夸张承诺、空泛反常识和未经确认的事实。\n用户输入：${input || '（只提供了链接）'}\n来源标题：${source.title || '无'}\n来源摘要：${source.summary || '无'}\n读取提示：${source.note || '无'}\n请严格输出一个 JSON 对象，不要 Markdown：{"title":"","mode":"真实经历/反常识拆解/问题解法/对比选择/观察评论/清单叙事/观点辩论之一","core_sentence":"","openers":["3句不同开场"],"flow":[{"label":"第一步","text":""},{"label":"第二步","text":""},{"label":"第三步","text":""}],"script_30":"","script_60":"","keywords":["4到7个关键词"],"broll":"适合露脸+辅助画面的具体建议","alternative_modes":["另外两种明显不同的表达方式"]}`;
}

function promptForRewrite(card: Record<string, unknown>, action: string, requestedMode: string) {
  const task = action === 'enhance'
    ? '不改变事实、判断和逻辑，增强短视频的口语节奏、具体场景、开场张力；不能标题党。'
    : `保持事实与判断不变，改成${requestedMode || '一种与原版明显不同的表达路径'}，不要只是换词。`;
  return `你是中文短视频表达教练。${task}\n原练习卡：${JSON.stringify(card)}\n严格输出同一 JSON 结构：{"title":"","mode":"","core_sentence":"","openers":[""],"flow":[{"label":"","text":""}],"script_30":"","script_60":"","keywords":[""],"broll":"","alternative_modes":[""]}`;
}

async function modelJson(prompt: string, provider: 'deepseek' | 'openai') {
  const key = provider === 'openai' ? Deno.env.get('OPENAI_API_KEY') : Deno.env.get('DEEPSEEK_API_KEY');
  if (!key) throw new Error(provider === 'openai' ? '高质量重写尚未配置，请先在服务端配置 OPENAI_API_KEY。' : '练习卡生成尚未配置，请先在服务端配置 DEEPSEEK_API_KEY。');
  const url = provider === 'openai' ? 'https://api.openai.com/v1/chat/completions' : 'https://api.deepseek.com/chat/completions';
  const model = provider === 'openai' ? (Deno.env.get('OPENAI_EXPRESSION_MODEL') || 'gpt-5.4-mini') : (Deno.env.get('DEEPSEEK_EXPRESSION_MODEL') || 'deepseek-chat');
  const response = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model, temperature: actionTemperature(provider), response_format: { type: 'json_object' }, messages: [{ role: 'user', content: prompt }] }) });
  if (!response.ok) throw new Error(provider === 'openai' ? '高质量重写暂时不可用，请稍后重试。' : '练习卡暂时生成失败，请稍后重试。');
  const content = (await response.json()).choices?.[0]?.message?.content;
  try { return JSON.parse(content); } catch (_) { throw new Error('生成结果格式异常，请重新生成。'); }
}
function actionTemperature(provider: 'deepseek' | 'openai') { return provider === 'openai' ? 0.82 : 0.72; }

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: '仅支持 POST 请求' }, 405);
  const authHeader = request.headers.get('Authorization') || '';
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const auth = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return json({ error: '登录状态已失效，请重新登录。' }, 401);
  const admin = createClient(supabaseUrl, serviceKey);
  const { data: member } = await admin.from('workspace_members').select('status').eq('user_id', user.id).maybeSingle();
  if (member?.status !== 'active') return json({ error: '当前账号没有工作台访问权限。' }, 403);
  const body = await request.json().catch(() => ({}));
  const action = clean(body.action, 20);
  try {
    if (action === 'create') {
      const input = clean(body.input, 5000); const source = await sourceFromUrl(body.source_url);
      if (!input && !source.url) return json({ error: '请输入一个想法或公开链接。' }, 400);
      if (!input && source.note) return json({ error: `${source.note} 请在输入框写下你的想法后再生成。` }, 400);
      const card = await modelJson(promptForCreate(input, source), 'deepseek');
      const { data, error } = await admin.from('expression_cards').insert({ user_id: user.id, title: clean(card.title, 180) || '我的表达练习', input_text: input || null, source_url: source.url || null, source_title: source.title || null, source_summary: source.summary ? source.summary.slice(0, 1200) : null, card, variants: [{ kind: 'initial', created_at: new Date().toISOString(), content: card }] }).select().single();
      if (error) throw error; return json({ card: data });
    }
    if (action !== 'alternative' && action !== 'enhance') return json({ error: '未知的表达操作。' }, 400);
    const cardId = clean(body.card_id, 80); const { data: existing, error } = await admin.from('expression_cards').select('*').eq('id', cardId).eq('user_id', user.id).maybeSingle();
    if (error || !existing) return json({ error: '练习卡不存在或没有访问权限。' }, 404);
    const content = await modelJson(promptForRewrite(existing.card, action, clean(body.mode, 40)), action === 'enhance' ? 'openai' : 'deepseek');
    const variants = [...(existing.variants || []), { kind: action, created_at: new Date().toISOString(), content }];
    const { data, error: updateError } = await admin.from('expression_cards').update({ variants, updated_at: new Date().toISOString() }).eq('id', existing.id).select().single();
    if (updateError) throw updateError; return json({ card: data });
  } catch (error) { return json({ error: error instanceof Error ? error.message : '服务暂时不可用。' }, 503); }
});
