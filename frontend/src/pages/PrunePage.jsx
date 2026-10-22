// PrunePage.jsx — Prune AI Gateway: LLM-powered safety report corroboration
import React, { useState } from 'react'

const DELHI_ZONES = [
  { name: 'Connaught Place', lat: 28.6315, lng: 77.2167 },
  { name: 'Hauz Khas',       lat: 28.5494, lng: 77.2001 },
  { name: 'Kamla Nagar',     lat: 28.6741, lng: 77.2069 },
  { name: 'Laxmi Nagar',     lat: 28.6340, lng: 77.2780 },
  { name: 'Rohini',          lat: 28.7041, lng: 77.1025 },
  { name: 'Dwarka',          lat: 28.5921, lng: 77.0460 },
  { name: 'Saket',           lat: 28.5245, lng: 77.2066 },
  { name: 'Karol Bagh',      lat: 28.6517, lng: 77.1907 },
]

const MODELS = [
  { id: 'gpt-4o-mini', label: 'GPT-4o Mini', note: 'Fast · Low cost' },
  { id: 'gpt-4o',      label: 'GPT-4o',      note: 'High accuracy' },
  { id: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo', note: 'Ultra-fast' },
]

const STEPS = [
  { id: 1, icon: '🔐', label: 'Key Vault',      desc: 'Prune secures your LLM API key in encrypted vault — never exposed in code' },
  { id: 2, icon: '🧠', label: 'LLM Reasoning',  desc: 'Corroboration prompt sent through Prune gateway to LLM model' },
  { id: 3, icon: '📋', label: 'Prune Receipt',   desc: 'prune_metadata returned with cache hits, token savings, cost breakdown' },
]

export default function PrunePage({ API, selectedReport }) {
  const [zone, setZone]             = useState(DELHI_ZONES[0])
  const [trustScore, setTrustScore] = useState(65)
  const [reportType, setReportType] = useState('UNSAFE_HARASSMENT')
  const [model, setModel]           = useState('gpt-4o-mini')
  const [usePin, setUsePin]         = useState(false)

  const [running, setRunning] = useState(false)
  const [step, setStep]       = useState(0)
  const [result, setResult]   = useState(null)
  const [error, setError]     = useState(null)

  const lat  = usePin && selectedReport ? selectedReport.lat  : zone.lat
  const lng  = usePin && selectedReport ? selectedReport.lng  : zone.lng
  const zoneName = usePin && selectedReport
    ? `Pin @ (${Number(selectedReport.lat).toFixed(4)}, ${Number(selectedReport.lng).toFixed(4)})`
    : zone.name

  const run = async () => {
    setRunning(true)
    setResult(null)
    setError(null)
    for (let s = 1; s <= 3; s++) {
      setStep(s)
      await new Promise(r => setTimeout(r, 800))
    }
    try {
      const res = await fetch(`${API}/api/prune/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lng, zone_name: zoneName, report_type: reportType, current_trust_score: trustScore, model }),
      })
      if (!res.ok) throw new Error(`Backend returned ${res.status}`)
      setResult(await res.json())
      setStep(4)
    } catch (e) {
      setError(e.message)
      setStep(0)
    } finally {
      setRunning(false)
    }
  }

  const isGood = result?.corroboration_verdict === 'CORROBORATED_HAZARD'
  const vs = isGood
    ? { border: 'border-emerald-700', bg: 'bg-emerald-950/40', text: 'text-emerald-400', badge: 'bg-emerald-900 text-emerald-200' }
    : { border: 'border-red-700',     bg: 'bg-red-950/40',     text: 'text-red-400',     badge: 'bg-red-900 text-red-200' }

  return (
    <div className="h-full overflow-y-auto p-5 space-y-5 max-w-4xl">

      {/* Header */}
      <div>
        <div className="text-base font-bold text-white flex items-center gap-2 flex-wrap">
          🌿 Prune AI Gateway
          <span className="text-[10px] font-normal px-2 py-0.5 bg-violet-950 border border-violet-700 text-violet-300 rounded-full">
            OpenAI-Compatible · Key Vault · Cost Control
          </span>
          {result?.prune_status === 'LIVE' && (
            <span className="text-[9px] font-bold px-2 py-0.5 bg-emerald-900 border border-emerald-700 text-emerald-300 rounded-full animate-pulse">
              ● LIVE
            </span>
          )}
          {result?.prune_status === 'FALLBACK' && (
            <span className="text-[9px] font-bold px-2 py-0.5 bg-slate-800 border border-slate-600 text-slate-400 rounded-full">
              ○ FALLBACK (set PRUNE_API_KEY)
            </span>
          )}
        </div>
        <div className="text-xs text-slate-400 mt-1">
          Routes LLM calls through <span className="text-violet-300 font-semibold">withprune.com</span> — one base_url swap gives you
          encrypted key storage, spend caps, caching, and{' '}
          <span className="text-cyan-300 font-semibold">prune_metadata</span> receipts per call.
          Corroborates safety reports: grants <span className="text-emerald-400 font-semibold">+18 Trust</span> on verified hazards
          or applies <span className="text-red-400 font-semibold">-30 Penalty</span> on defamation raids.
        </div>
      </div>

      {/* How Prune works strip */}
      <div className="grid grid-cols-3 gap-2">
        {STEPS.map(s => (
          <div key={s.id} className={`rounded-xl border p-3 transition-all ${
            step === s.id ? 'border-violet-600 bg-violet-950/40 animate-pulse'
            : step > s.id || step === 4 ? 'border-emerald-800 bg-emerald-950/20'
            : 'border-slate-700 bg-slate-900/40'
          }`}>
            <div className="text-lg mb-1">{s.icon}</div>
            <div className={`text-[10px] font-bold mb-1 ${
              step > s.id || step === 4 ? 'text-emerald-300'
              : step === s.id ? 'text-violet-300' : 'text-slate-500'
            }`}>
              Step {s.id}: {s.label}
            </div>
            <div className={`text-[9px] leading-relaxed ${
              step > s.id || step === 4 ? 'text-slate-300'
              : step === s.id ? 'text-violet-200' : 'text-slate-600'
            }`}>
              {step > s.id || step === 4 ? '✅ Done' : step === s.id ? s.desc : 'Waiting…'}
            </div>
          </div>
        ))}
      </div>

      {/* Config panel */}
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 space-y-4">
        <div className="text-xs font-bold text-slate-300">Configure Corroboration Request</div>

        {/* Active pin toggle */}
        {selectedReport && (
          <label className="flex items-center gap-2 cursor-pointer w-fit">
            <input type="checkbox" checked={usePin} onChange={e => setUsePin(e.target.checked)} className="accent-violet-500" />
            <span className="text-xs text-violet-300">
              Use active X-Ray pin — {selectedReport.report_id} ({selectedReport.verdict})
            </span>
          </label>
        )}

        {/* Zone grid */}
        <div className={`grid grid-cols-4 gap-2 ${usePin ? 'opacity-40 pointer-events-none' : ''}`}>
          {DELHI_ZONES.map(z => (
            <button
              key={z.name}
              onClick={() => setZone(z)}
              className={`text-[10px] font-semibold px-2 py-2 rounded-lg border transition text-center ${
                zone.name === z.name
                  ? 'bg-violet-900 border-violet-600 text-violet-200'
                  : 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200 bg-slate-800/40'
              }`}
            >
              {z.name}
            </button>
          ))}
        </div>

        {/* Model + trust + report type row */}
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <div className="text-[10px] text-slate-400 mb-1">LLM Model (via Prune)</div>
            <div className="flex gap-2">
              {MODELS.map(m => (
                <button
                  key={m.id}
                  onClick={() => setModel(m.id)}
                  className={`text-[9px] font-semibold px-2 py-1.5 rounded-lg border transition ${
                    model === m.id
                      ? 'bg-violet-900 border-violet-600 text-violet-200'
                      : 'border-slate-700 text-slate-500 hover:border-slate-500 hover:text-slate-300'
                  }`}
                >
                  {m.label}
                  <div className={`text-[8px] font-normal mt-0.5 ${model === m.id ? 'text-violet-400' : 'text-slate-600'}`}>{m.note}</div>
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400 mb-1">Trust Score (simulate)</div>
            <div className="flex items-center gap-2">
              <input type="range" min="0" max="100" value={trustScore} onChange={e => setTrustScore(Number(e.target.value))} className="w-28 accent-violet-500" />
              <span className={`text-xs font-bold ${trustScore >= 55 ? 'text-emerald-400' : 'text-red-400'}`}>
                {trustScore} — {trustScore >= 55 ? 'CORROBORATED (+18)' : 'MISMATCH (-30)'}
              </span>
            </div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400 mb-1">Report Type</div>
            <select value={reportType} onChange={e => setReportType(e.target.value)}
              className="text-xs bg-slate-800 border border-slate-600 text-slate-200 rounded-lg px-2 py-1.5">
              <option value="UNSAFE_HARASSMENT">UNSAFE_HARASSMENT</option>
              <option value="INCIDENT">INCIDENT</option>
              <option value="CROWD_EMERGENCY">CROWD_EMERGENCY</option>
              <option value="FAKE_SAFE_MASK">FAKE_SAFE_MASK</option>
            </select>
          </div>
        </div>

        <div className="text-[10px] text-slate-500 font-mono bg-slate-800/60 px-3 py-1.5 rounded-lg w-fit">
          Target: {zoneName} · ({lat.toFixed ? lat.toFixed(4) : lat}, {lng.toFixed ? lng.toFixed(4) : lng})
        </div>

        <button onClick={run} disabled={running}
          className="w-full py-2.5 rounded-xl font-bold text-sm bg-violet-700 hover:bg-violet-600 disabled:opacity-50 text-white transition flex items-center justify-center gap-2">
          {running
            ? <><span className="animate-spin">⟳</span> Running through Prune Gateway…</>
            : <>🌿 Run Prune Corroboration</>}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="border border-red-700 bg-red-950/30 rounded-xl p-4 text-xs text-red-400">❌ {error}</div>
      )}

      {/* Result */}
      {result && (
        <div className={`border rounded-xl p-4 space-y-4 ${vs.border} ${vs.bg}`}>

          {/* Verdict banner */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <div className={`text-sm font-bold ${vs.text}`}>
                {isGood ? '✅ CORROBORATED HAZARD — Genuine SOS · Trust +18' : '🚫 DEFAMATION MISMATCH — Fake Raid Blocked · Trust -30'}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Zone: {result.zone_name} · Model: {result.model_used} · {result.processing_time_ms?.toFixed(0)}ms
                {result.prune_status === 'LIVE' && <span className="ml-2 text-emerald-400 font-semibold">via Prune Gateway (LIVE)</span>}
                {result.prune_status === 'FALLBACK' && <span className="ml-2 text-slate-500">(Fallback — PRUNE_API_KEY not configured)</span>}
              </div>
            </div>
            <span className={`text-xs font-bold px-2 py-1 rounded-lg ${vs.badge}`}>
              {result.trust_score_adjustment > 0 ? '+' : ''}{result.trust_score_adjustment} Trust Score
            </span>
          </div>

          {/* LLM analysis */}
          <div className="bg-slate-900/70 border border-slate-700 rounded-lg p-3">
            <div className="text-[10px] font-bold text-slate-300 mb-1">🧠 LLM Corroboration Analysis</div>
            <div className="text-[10px] text-slate-300 leading-relaxed">{result.analysis}</div>
          </div>

          {/* Civic action */}
          <div className="bg-slate-900/70 border border-slate-700 rounded-lg p-3">
            <div className="text-[10px] font-bold text-slate-300 mb-1">🏛️ Civic Action</div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                result.civic_action?.outcome === 'TICKET_FILED' ? 'bg-emerald-900 text-emerald-300' : 'bg-red-900 text-red-300'
              }`}>
                {result.civic_action?.outcome}
              </span>
              {result.civic_action?.ticket_id && (
                <span className="text-[9px] font-mono text-cyan-300">#{result.civic_action.ticket_id}</span>
              )}
              <span className="text-[9px] text-slate-500">{result.civic_action?.portal}</span>
            </div>
            <div className="text-[10px] text-slate-300">{result.civic_action?.message}</div>
          </div>

          {/* Prune metadata receipt */}
          {result.prune_metadata && (
            <div className="bg-violet-950/40 border border-violet-800 rounded-lg p-3">
              <div className="text-[10px] font-bold text-violet-300 mb-1">🌿 Prune Metadata Receipt</div>
              <pre className="text-[9px] text-violet-200 font-mono leading-relaxed overflow-x-auto">
                {JSON.stringify(result.prune_metadata, null, 2)}
              </pre>
            </div>
          )}
          {!result.prune_metadata && result.prune_status === 'FALLBACK' && (
            <div className="bg-slate-900/60 border border-slate-700 rounded-lg p-3 text-[10px] text-slate-500">
              🌿 <span className="text-violet-400 font-semibold">prune_metadata</span> receipt will appear here once{' '}
              <span className="font-mono text-slate-400">PRUNE_API_KEY</span> is set in Render environment variables.
              It shows cache hits, token savings, and cost per call.
            </div>
          )}

          {/* Raw JSON toggle */}
          <details className="text-[9px]">
            <summary className="text-slate-500 cursor-pointer hover:text-slate-300">View raw JSON response</summary>
            <pre className="mt-2 bg-slate-950 rounded-lg p-3 text-[9px] text-slate-300 overflow-x-auto border border-slate-800 font-mono leading-relaxed">
              {JSON.stringify(result, null, 2)}
            </pre>
          </details>
        </div>
      )}

      <div className="h-4" />
    </div>
  )
}
