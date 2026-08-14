import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const origin = 'https://lluckk235.github.io'
const headers = { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }
const reply = (body: object, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...headers, 'Content-Type': 'application/json' } })
const text = (value: unknown, limit = 5000) => String(value || '').replace(/\s+/g, ' ').trim().slice(0, limit)

function urlInfo(value: unknown) {
  try {
    const url = new URL(String(value || ''))
    const privateHost = /^(localhost|127\.|10\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(url.hostname.toLowerCase())
    if (url.protocol !== 'https:' || privateHost) return { url: '', note: '链接必须是公开的 HTTPS 地址。' }
    if (/(^|\.)douyin\.com$|(^|\.)iesdouyin\.com$/.test(url.hostname)) return { url: url.toString(), note: '抖音链接不会自动抓取，请补充一句你想讲的观察。' }
    return { url: url.toString(), note: '' }
  } catch { return { url: '', note: '' } }
}

function prompt(input: string, link: string, note: string, action: string, old: unknown) {
  const task = action === 'alternative' ? '保持事实和核心观点不变，重新给出三条结构明显不同的讲法。' : action === 'enhance' ? '保留事实，强化场景、开场和口语节奏，不制造夸张承诺。' : '围绕同一选题给出三条完全不同的表达路径，让用户先选讲法再练。'
  return `你是中文短视频表达教练。${task} 面向个人成长和女性成长，拒绝鸡汤和未经确认的事实。输入：${input || '只提供链接'}；链接：${link || '无'}；提示：${note || '无'}；原卡：${old ? JSON.stringify(old) : '无'}。严格只返回 JSON：{"title":"","paths":[{"name":"例如：从真实经历讲","mode":"真实经历/问题解法/对比选择/观察评论/清单叙事/观点辩论之一","core_sentence":"","openers":["","",""],"flow":[{"label":"","text":""},{"label":"","text":""},{"label":"","text":""}],"keywords":["","","",""],"broll":"","script_60":""},{"name":"第二种讲法","mode":"","core_sentence":"","openers":["","",""],"flow":[{"label":"","text":""},{"label":"","text":""},{"label":"","text":""}],"keywords":["","","",""],"broll":"","script_60":""},{"name":"第三种讲法","mode":"","core_sentence":"","openers":["","",""],"flow":[{"label":"","text":""},{"label":"","text":""},{"label":"","text":""}],"keywords":["","","",""],"broll":"","script_60":""}]}`
}

async function generate(input: string, link: string, note: string, action: string, old: unknown) {
  const openai = action === 'enhance'
  const key = Deno.env.get(openai ? 'OPENAI_API_KEY' : 'DEEPSEEK_API_KEY')
  if (!key) throw new Error(openai ? '高质量重写尚未配置，请先在服务端配置 OPENAI_API_KEY。' : '练习卡生成尚未配置，请先在服务端配置 DEEPSEEK_API_KEY。')
  const endpoint = openai ? 'https://api.openai.com/v1/chat/completions' : 'https://api.deepseek.com/chat/completions'
  const model = Deno.env.get(openai ? 'OPENAI_EXPRESSION_MODEL' : 'DEEPSEEK_EXPRESSION_MODEL') || (openai ? 'gpt-5.4-mini' : 'deepseek-chat')
  const response = await fetch(endpoint, { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model, temperature: openai ? 0.75 : 0.65, response_format: { type: 'json_object' }, messages: [{ role: 'user', content: prompt(input, link, note, action, old) }] }) })
  if (!response.ok) throw new Error('模型服务暂时不可用，请稍后再试。')
  const data = await response.json()
  return JSON.parse(data.choices?.[0]?.message?.content || '{}')
}

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers })
  if (request.method !== 'POST') return reply({ error: 'Method not allowed' }, 405)
  try {
    const auth = request.headers.get('Authorization') || ''
    const client = createClient(Deno.env.get('SUPABASE_URL') || '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '')
    const token = auth.replace(/^Bearer\s+/i, '')
    const { data: authData } = await client.auth.getUser(token)
    const user = authData.user
    if (!user) return reply({ error: '请先登录。' }, 401)
    const { data: member } = await client.from('workspace_members').select('user_id').eq('user_id', user.id).maybeSingle()
    if (!member) return reply({ error: '没有工作台访问权限。' }, 403)
    const body = await request.json()
    const action = text(body.action, 20) || 'create'
    if (!['create', 'alternative', 'enhance'].includes(action)) return reply({ error: '未知操作。' }, 400)
    if (action === 'create') {
      const input = text(body.input, 3000)
      const source = urlInfo(body.source_url)
      if (!input && !source.url) return reply({ error: '写一句选题，或粘贴一个公开链接。' }, 400)
      if (source.note && !input) return reply({ error: source.note }, 400)
      const card = await generate(input, source.url, source.note, action, null)
      const { data, error } = await client.from('expression_cards').insert({ user_id: user.id, title: text(card.title, 180) || '我的表达练习', input_text: input || null, source_url: source.url || null, source_summary: source.note || null, card, variants: [{ kind: 'initial', created_at: new Date().toISOString(), content: card }] }).select().single()
      if (error) throw error
      return reply({ card: data })
    }
    const { data: old, error } = await client.from('expression_cards').select('*').eq('id', text(body.card_id, 80)).eq('user_id', user.id).maybeSingle()
    if (error || !old) return reply({ error: '找不到这张练习卡。' }, 404)
    const card = await generate(old.input_text || '', old.source_url || '', old.source_summary || '', action, old.card)
    const variants = [...(old.variants || []), { kind: action, created_at: new Date().toISOString(), content: card }]
    const { data, error: updateError } = await client.from('expression_cards').update({ variants, updated_at: new Date().toISOString() }).eq('id', old.id).select().single()
    if (updateError) throw updateError
    return reply({ card: data })
  } catch (error) { return reply({ error: error instanceof Error ? error.message : '服务暂时不可用。' }, 503) }
})
