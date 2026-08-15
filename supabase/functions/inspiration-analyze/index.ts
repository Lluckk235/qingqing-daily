import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const origin = 'https://lluckk235.github.io'
const headers = {
  'Access-Control-Allow-Origin': origin,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const reply = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...headers, 'Content-Type': 'application/json' } })
const clean = (value: unknown, limit = 24000) => String(value || '').trim().slice(0, limit)
const now = () => new Date().toISOString()

function publicUrl(value: unknown) {
  const raw = clean(value, 1200)
  if (!raw) return ''
  try {
    const url = new URL(raw)
    const privateHost = /^(localhost|127\.|10\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(url.hostname.toLowerCase())
    return url.protocol === 'https:' && !privateHost ? url.toString() : ''
  } catch { return '' }
}

function json(content: string) {
  try { return JSON.parse(content) } catch { throw new Error('模型返回格式异常，请重试。') }
}

function textPrompt(transcript: string, sourceUrl: string) {
  return `你是中文短视频的编导与表达拆解师。只分析用户主动提交的参考视频，禁止抓取链接、禁止生成多种脚本、禁止泛泛夸赞。

转录文案：\n${transcript}\n来源链接：${sourceUrl || '未提供'}

请先拆透原视频为什么有效，再生成一版可直接拍的参考拍摄稿。参考拍摄稿允许保留原片约80%的结构顺序、情绪推进、节奏节点和画面功能，但不得逐句改写原文、不得复用作者的个人经历或标志性表达、不得编造用户经历。

参考拍摄稿的中文必须：保留核心原意与观点力度；减少过度工整的句式和机械分段；允许少量口语化和不规则表达；长短句自然交替；删除空话、套话和重复总结；自然、有个人表达感，但不假装是用户真实经历。

严格只返回 JSON：
{
 "title":"不超过18个字的参考视频标题",
 "analysis":{
   "one_line":"一句话判断",
   "hook":{"what":"前5秒说了什么","promise":"给了什么承诺或反差","why":"为什么让人继续看"},
   "structure":[{"segment":"例如 开头","content":"讲了什么","purpose":"这一段完成什么","effect":"观众得到什么"}],
   "writing":[{"move":"文案动作","example":"来自原片的短句或概括，最多20字","why":"为什么有力量"}],
   "sharpness":{"claim":"最有立场的一句话或概括","tension":"它制造什么冲突","support":"后面如何把观点讲实"},
   "mechanisms":["机制一","机制二","机制三"],
   "observations":["可训练的新观察","可训练的新观察"]
 },
 "shooting_script":{
   "core":"参考稿核心句",
   "script":"一版60到90秒、可直接口播的完整参考稿",
   "beats":[{"segment":"开头/推进/收束","spoken":"这段要说什么","visual":"没有截图时写对应画面功能，不虚构具体素材","text":"重点文字提示","sound":"音效或停顿的功能"}],
   "notes":["拍摄提醒","拍摄提醒"]
 }
}`
}

function visionPrompt(analysis: unknown, urls: string[]) {
  return `你是中文短视频画面、字幕与节奏拆解师。用户上传的是自己选取的关键帧，不是完整视频。只能判断截图明确可见的内容；看不出来的音效或镜头变化必须写“无法从截图确认”，不能猜。

已完成的文案拆解：${JSON.stringify(analysis)}

严格只返回 JSON：
{
 "visual":{"summary":"画面系统一句话判断","mapping":[{"content_node":"对应的内容节点","visible":"截图里看见了什么","function":"这个画面承担什么作用"}],"text_design":["重点文字、颜色或版式如何帮助理解"],"rhythm":["从关键帧可确认的节奏或转场规律"],"sound":"仅说明截图无法确认或用户可复看标记的声音节点"},
 "script_visual_beats":[{"segment":"对应参考拍摄稿段落","visual":"可直接拍的画面功能，不照搬原片具体场景","text":"上屏重点文字","sound":"提示音、停顿或音乐的功能"}]
}`
}

async function deepseek(prompt: string) {
  const key = Deno.env.get('DEEPSEEK_API_KEY')
  if (!key) throw new Error('灵感集尚未配置 DEEPSEEK_API_KEY。')
  const model = Deno.env.get('DEEPSEEK_INSPIRATION_MODEL') || 'deepseek-chat'
  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, temperature: 0.72, response_format: { type: 'json_object' }, messages: [{ role: 'user', content: prompt }] }),
  })
  if (!response.ok) throw new Error('DeepSeek 服务暂时不可用，请稍后重试。')
  const data = await response.json()
  return json(data.choices?.[0]?.message?.content || '')
}

async function apiYiVision(prompt: string, urls: string[]) {
  const key = Deno.env.get('APIYI_API_KEY')
  if (!key) return { visual: { unavailable: true, summary: '截图已保存；尚未配置 API 易看图服务。' }, script_visual_beats: [] }
  const configuredBase = Deno.env.get('APIYI_BASE_URL') || 'https://api.apiyi.com/v1'
  const endpoint = configuredBase.endsWith('/chat/completions')
    ? configuredBase
    : `${configuredBase.replace(/\/$/, '')}/chat/completions`
  const model = Deno.env.get('APIYI_VISION_MODEL') || 'gpt-5.4-mini'
  const content = [{ type: 'text', text: prompt }, ...urls.map(url => ({ type: 'image_url', image_url: { url, detail: 'low' } }))]
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, temperature: 0.4, response_format: { type: 'json_object' }, messages: [{ role: 'user', content }] }),
  })
  if (!response.ok) throw new Error('截图分析服务暂时不可用，请稍后重试。')
  const data = await response.json()
  return json(data.choices?.[0]?.message?.content || '')
}

async function signedUrls(client: any, paths: string[]) {
  const urls: string[] = []
  for (const path of paths.slice(0, 8)) {
    const { data } = await client.storage.from('inspiration-assets').createSignedUrl(path, 900)
    if (data?.signedUrl) urls.push(data.signedUrl)
  }
  return urls
}

async function processItem(client: any, itemId: string, userId: string) {
  try {
    const { data: item, error } = await client.from('inspiration_items').select('*').eq('id', itemId).eq('user_id', userId).maybeSingle()
    if (error || !item) throw new Error('找不到这条灵感。')
    const generated = await deepseek(textPrompt(item.transcript, item.source_url || ''))
    const paths = Array.isArray(item.image_paths) ? item.image_paths.filter((x: unknown) => typeof x === 'string') : []
    const imageUrls = paths.length ? await signedUrls(client, paths) : []
    const vision = imageUrls.length ? await apiYiVision(visionPrompt(generated.analysis, imageUrls), imageUrls) : { visual: null, script_visual_beats: [] }
    const analysis = { ...(generated.analysis || {}), visual: vision.visual || null }
    const shootingScript = { ...(generated.shooting_script || {}), beats: vision.script_visual_beats?.length ? vision.script_visual_beats : (generated.shooting_script?.beats || []) }
    const { error: updateError } = await client.from('inspiration_items').update({
      title: clean(generated.title, 120) || '未命名视频参考',
      status: 'ready', error_message: null, analysis, shooting_script: shootingScript, updated_at: now(),
    }).eq('id', itemId).eq('user_id', userId)
    if (updateError) throw updateError
  } catch (error) {
    await client.from('inspiration_items').update({ status: 'failed', error_message: clean(error instanceof Error ? error.message : '后台拆解失败。', 240), updated_at: now() }).eq('id', itemId).eq('user_id', userId)
  }
}

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers })
  if (request.method !== 'POST') return reply({ error: 'Method not allowed' }, 405)
  try {
    const service = createClient(Deno.env.get('SUPABASE_URL') || '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '')
    const token = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '')
    const { data: authData } = await service.auth.getUser(token)
    const user = authData.user
    if (!user) return reply({ error: '请先登录。' }, 401)
    const { data: member } = await service.from('workspace_members').select('user_id').eq('user_id', user.id).maybeSingle()
    if (!member) return reply({ error: '没有工作台访问权限。' }, 403)
    const body = await request.json().catch(() => ({}))
    const action = clean(body.action, 20) || 'create'
    let itemId = clean(body.item_id, 80)

    if (action === 'create') {
      const transcript = clean(body.transcript, 24000)
      if (transcript.length < 30) return reply({ error: '请粘贴至少一句转录文案。' }, 400)
      const imagePaths = Array.isArray(body.image_paths) ? body.image_paths.filter((x: unknown) => typeof x === 'string' && x.startsWith(`${user.id}/`)).slice(0, 8) : []
      const { data, error } = await service.from('inspiration_items').insert({
        user_id: user.id, source_url: publicUrl(body.source_url) || null, transcript, image_paths: imagePaths, status: 'processing',
      }).select().single()
      if (error || !data) throw error || new Error('灵感收录失败。')
      itemId = data.id
      EdgeRuntime.waitUntil(processItem(service, itemId, user.id))
      return reply({ item: data }, 202)
    }

    if (action === 'retry') {
      const { data, error } = await service.from('inspiration_items').update({ status: 'processing', error_message: null, updated_at: now() }).eq('id', itemId).eq('user_id', user.id).eq('status', 'failed').select().maybeSingle()
      if (error || !data) return reply({ error: '这条灵感暂时无法重试。' }, 404)
      EdgeRuntime.waitUntil(processItem(service, itemId, user.id))
      return reply({ item: data }, 202)
    }

    return reply({ error: '未知操作。' }, 400)
  } catch (error) {
    return reply({ error: error instanceof Error ? error.message : '服务暂时不可用。' }, 503)
  }
})
