// AgentPage.jsx — one place to see the AI layer: Gemini, agent skills, the ReAct agent and the MCP server
import React, { useEffect, useState } from 'react'

const ZONES = [
  { name: 'Connaught Place', lat: 28.6315, lng: 77.2167 },
  { name: 'Hauz Khas',       lat: 28.5494, lng: 77.2001 },
  { name: 'Kamla Nagar',     lat: 28.6741, lng: 77.2069 },
  { name: 'Laxmi Nagar',     lat: 28.6340, lng: 77.2780 },
  { name: 'Saket',           lat: 28.5245, lng: 77.2066 },
]

const REPORT_PRESETS = {
  genuine: { label: 'Genuine phone user', asn_type: 'MOBILE_ISP', kinematic_variance: 1.6, account_age_days: 240, has_gps_breadcrumbs: true, approach_speed_kmh: 4.5 },
  bot:     { label: 'Datacenter bot',     asn_type: 'DATACENTER_VPS', kinematic_variance: 0.0, account_age_days: 1, has_gps_breadcrumbs: false, approach_speed_kmh: 0.0 },
}

const TASKS = [
  { label: 'Score + explain (Gemini)',   task: 'explain why this report got its verdict',          note: 'trust_scorer → ai_reasoner' },
  { label: 'Full verify (uses TinyFish)', task: 'full verify this report and corroborate it',      note: 'trust_scorer → osint_agent → ai_reasoner → civic_reporter · can take 1–3 min' },
]

function StatusCard({ title, icon, state, okText, children }) {
  const tone = state === 'ok' ? 'border-emerald-700 bg-emerald-950/30'
    : state === 'loading' ? 'border-slate-700 bg-slate-900/60'
    : 'border-yellow-700 bg-yellow-950/20'
  const dot = state === 'ok' ? 'bg-emerald-400' : state === 'loading' ? 'bg-slate-500 animate-pulse' : 'bg-yellow-400'
  return (
    <div className={`rounded-xl border p-3 space-y-1.5 ${tone}`}>
      <div className="flex items-center gap-2">
        <span className="text-lg">{icon}</span>
        <span className="text-xs font-bold text-white">{title}</span>
        <span className={`ml-auto w-2 h-2 rounded-full ${dot}`} />
        <span className="text-[9px] text-slate-300">{state === 'ok' ? okText : state === 'loading' ? 'checking…' : 'not live'}</span>
      </div>
      <div className="text-[10px] text-slate-400 leading-relaxed">{children}</div>
    </div>
  )
}

export default function AgentPage({ API }) {
  const [ai, setAi]         = useState(null)
  const [tf, setTf]         = useState(null)
  const [skills, setSkills] = useState([])
  const [mcp, setMcp]       = useState(null)   // live MCP tools/list result
  const [copied, setCopied] = useState(false)

  const [zone, setZone]     = useState(ZONES[0])
  const [preset, setPreset] = useState('genuine')
  const [taskIdx, setTaskIdx] = useState(0)
  const [running, setRunning] = useState(false)
  const [run, setRun]       = useState(null)
  const [error, setError]   = useState(null)

  const mcpUrl = `${API}/mcp`
  const claudeCmd = `claude mcp add --transport http truepin ${mcpUrl}`

  useEffect(() => {
    const get = (path, set) => fetch(`${API}${path}`).then(r => r.json()).then(set)
      .catch(e => set({ ok: false, error: e.message }))
    get('/api/ai/health', setAi)
    get('/api/tinyfish/health', setTf)
    fetch(`${API}/api/skills`).then(r => r.json()).then(d => setSkills(d.skills || [])).catch(() => setSkills([]))
    // Real MCP request, exactly like an external AI agent would send it
    fetch(`${API}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'MCP-Protocol-Version': '2025-06-18',
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
    })
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then(d => setMcp({ ok: true, tools: (d.result?.tools || []).map(t => t.name) }))
      .catch(e => setMcp({ ok: false, error: e.message }))
  }, [API])

  const runAgent = async () => {
    setRunning(true); setRun(null); setError(null)
    try {
      const p = REPORT_PRESETS[preset]
      const res = await fetch(`${API}/api/agent/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: TASKS[taskIdx].task,
          context: {
            lat: zone.lat, lng: zone.lng, zone_name: zone.name, report_type: 'UNSAFE_HARASSMENT',
            user_id: `agent_demo_${preset}`, ...p, save_to_map: false,
          },
          max_steps: 4,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || `Backend returned ${res.status}`)
      setRun(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setRunning(false)
    }
  }

  const copyCmd = () => {
    navigator.clipboard?.writeText(claudeCmd).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }

  const aiState = ai === null ? 'loading' : ai.ok ? 'ok' : 'warn'
  const tfState = tf === null ? 'loading' : tf.ok ? 'ok' : 'warn'
  const mcpState = mcp === null ? 'loading' : mcp.ok ? 'ok' : 'warn'

  return (
    <div className="h-full overflow-y-auto p-5 space-y-5 max-w-5xl">
      {/* Header */}
      <div>
        <div className="text-base font-bold text-white">🤖 AI Agent Layer — Gemini · Agent Skills · MCP Server</div>
        <div className="text-xs text-slate-400 mt-1">
          The trust engine is packaged as 5 agent skills. A ReAct agent chains them, Google Gemini explains the verdicts,
          and an MCP server lets any MCP-compatible AI agent use truePin as tools.
        </div>
      </div>

      {/* Live status */}
      <div className="grid grid-cols-3 gap-3">
        <StatusCard title="Google Gemini" icon="✨" state={aiState} okText="live">
          {ai?.ok ? <>Model <span className="font-mono text-indigo-300">{ai.model}</span> answered just now.</>
            : ai ? <>{ai.error || 'Unavailable'} — answers fall back to rule-based (always labelled).</> : 'Checking /api/ai/health…'}
        </StatusCard>
        <StatusCard title="TinyFish live web" icon="🐟" state={tfState} okText="live">
          {tf?.ok ? <>Search returned {tf.results} live results in {Math.round(tf.latency_ms)} ms.</>
            : tf ? <>{tf.error || 'Unavailable'}</> : 'Checking /api/tinyfish/health…'}
        </StatusCard>
        <StatusCard title="MCP server" icon="🔌" state={mcpState} okText={mcp?.ok ? `${mcp.tools.length} tools` : ''}>
          {mcp?.ok ? <>A live MCP <span className="font-mono">tools/list</span> call to <span className="font-mono text-violet-300 break-all">{mcpUrl}</span> just returned {mcp.tools.length} tools.</>
            : mcp ? <>MCP call failed: {mcp.error}</> : 'Calling the MCP server…'}
        </StatusCard>
      </div>

      {/* Run the agent */}
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 space-y-3">
        <div className="text-xs font-bold text-slate-200">▶ Run the ReAct agent</div>
        <div className="flex flex-wrap gap-3 items-end text-[10px]">
          <label className="space-y-1">
            <div className="text-slate-400">Task</div>
            <select value={taskIdx} onChange={e => setTaskIdx(Number(e.target.value))}
              className="bg-slate-800 border border-slate-600 text-slate-200 rounded-lg px-2 py-1.5">
              {TASKS.map((t, i) => <option key={t.label} value={i}>{t.label}</option>)}
            </select>
          </label>
          <label className="space-y-1">
            <div className="text-slate-400">Reporter</div>
            <select value={preset} onChange={e => setPreset(e.target.value)}
              className="bg-slate-800 border border-slate-600 text-slate-200 rounded-lg px-2 py-1.5">
              {Object.entries(REPORT_PRESETS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </label>
          <label className="space-y-1">
            <div className="text-slate-400">Zone</div>
            <select value={zone.name} onChange={e => setZone(ZONES.find(z => z.name === e.target.value))}
              className="bg-slate-800 border border-slate-600 text-slate-200 rounded-lg px-2 py-1.5">
              {ZONES.map(z => <option key={z.name}>{z.name}</option>)}
            </select>
          </label>
          <button onClick={runAgent} disabled={running}
            className="px-4 py-1.5 rounded-lg font-bold text-xs bg-indigo-700 hover:bg-indigo-600 disabled:opacity-50 text-white">
            {running ? '⟳ Agent working…' : 'Run agent'}
          </button>
        </div>
        <div className="text-[9px] text-slate-500">Plan: {TASKS[taskIdx].note}. Demo reports are not added to the map.</div>

        {error && <div className="text-[10px] text-red-400">❌ {error}</div>}

        {run && (
          <div className="space-y-2 pt-2 border-t border-slate-700">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${run.llm_powered
                ? 'bg-indigo-950 text-indigo-300 border-indigo-700' : 'bg-slate-800 text-slate-400 border-slate-600'}`}>
                {run.llm_powered ? '✨ Gemini answered' : '⚙️ Gemini not used (rule-based)'}
              </span>
              <span className="text-[9px] text-slate-500">routing: {run.routing_mode} · {run.duration_ms?.toFixed(0)} ms</span>
            </div>
            {run.steps.filter(s => s.action).map(s => {
              const o = s.observation || {}
              const outcome = o.success === false ? `error: ${o.error}`
                : o.verdict ? `${o.verdict} (score ${o.final_score})`
                : o.corroboration_verdict || o.outcome
                || (o.mode ? (o.ai_powered ? `Gemini · ${o.model}` : 'rule-based') : '')
              return (
                <div key={s.step} className="flex items-start gap-2 text-[10px]">
                  <span className="text-slate-500 shrink-0">Step {s.step}</span>
                  <span className="font-mono text-cyan-300 shrink-0">{s.action.skill}</span>
                  <span className={o.success === false ? 'text-red-400' : 'text-slate-300'}>→ {outcome}</span>
                </div>
              )
            })}
            <div className="text-[11px] text-slate-100 leading-relaxed bg-slate-800/60 border border-slate-700 rounded-lg p-3">
              {run.final_answer}
            </div>
            <details className="text-[9px]">
              <summary className="text-slate-500 cursor-pointer hover:text-slate-300">View full agent trace (JSON)</summary>
              <pre className="mt-2 bg-slate-950 rounded-lg p-3 text-slate-300 overflow-x-auto border border-slate-800 max-h-80">
                {JSON.stringify(run, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </div>

      {/* Skills */}
      <div>
        <div className="text-xs font-bold text-slate-300 mb-2">🧩 Agent skills ({skills.length}) — also exposed as MCP tools</div>
        <div className="grid grid-cols-2 gap-2">
          {skills.map(s => (
            <div key={s.name} className="bg-slate-900/70 border border-slate-800 rounded-lg p-2.5">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] text-cyan-300 font-semibold">{s.name}</span>
                <span className="text-[8px] text-slate-500">v{s.version}</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-1 leading-relaxed">{s.description}</div>
            </div>
          ))}
        </div>
      </div>

      {/* MCP connect */}
      <div className="bg-slate-900 border border-violet-800/60 rounded-xl p-4 space-y-2">
        <div className="text-xs font-bold text-slate-200">🔌 Connect any MCP-compatible AI agent</div>
        <div className="text-[10px] text-slate-400">
          Tools: verify_safety_report · run_osint_corroboration · detect_anomalies · file_civic_ticket · list_skills · get_system_metrics · analyze_and_explain
        </div>
        <div className="flex items-center gap-2">
          <code className="flex-1 text-[10px] text-yellow-300 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 font-mono overflow-x-auto whitespace-nowrap">
            {claudeCmd}
          </code>
          <button onClick={copyCmd} className="text-[10px] px-2 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white shrink-0">
            {copied ? '✅ Copied' : '📋 Copy'}
          </button>
        </div>
        <div className="text-[9px] text-slate-500">
          Or open MCP Inspector (<span className="font-mono">npx @modelcontextprotocol/inspector</span>), choose Streamable HTTP and paste the URL.
        </div>
      </div>

      <div className="text-[10px] text-slate-500">
        Gemini also appears in the 🔬 X-Ray Inspector: open Attack Sim or Firehose, click any report, then “Explain this verdict with Gemini”.
      </div>
      <div className="h-4" />
    </div>
  )
}
