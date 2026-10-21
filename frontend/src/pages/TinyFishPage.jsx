// TinyFishPage.jsx — TinyFish Live-Web OSINT Agent page
import React, { useState } from 'react'

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Extract hostname badge from a URL */
function getDomain(url) {
  try { return new URL(url).hostname.replace(/^www\./, '') }
  catch { return url }
}

/** Strip markdown nav/heading garbage from Fetch API raw text and return a clean excerpt */
function cleanFetchSnippet(raw, maxLen = 320) {
  if (!raw) return ''
  const lines = raw.split('\n')
  const meaningful = lines.filter(l => {
    const t = l.trim()
    if (t.length < 25) return false                       // too short = nav fragment
    if (t.startsWith('#')) return false                   // markdown heading
    if (t.startsWith('* ') || t.startsWith('- ')) return false // bullet list item
    if ((t.match(/\*/g) || []).length >= 2) return false  // nav line with multiple *
    if (t.startsWith('[') && t.includes('](')) return false  // bare markdown link
    if (/^(Updated|Published|Written|Source|Share|Follow|Subscribe):/i.test(t)) return false
    return true
  })
  // Also strip any leading * or - from individual sentences in the joined result
  const joined = meaningful.slice(0, 5).join(' ').replace(/\s+/g, ' ').trim()
  const cleaned = joined.replace(/^\*\s+/, '').replace(/^-\s+/, '')
  return cleaned.length > maxLen ? cleaned.slice(0, maxLen) + '…' : cleaned
}

/** Relevance score → colour class */
function relevanceColor(score) {
  if (score >= 0.85) return 'text-emerald-400'
  if (score >= 0.70) return 'text-yellow-400'
  return 'text-slate-400'
}

/** Friendly date string from ISO or "N days ago" */
function fmtDate(d) {
  if (!d) return null
  if (d.includes('ago') || d.includes('day') || d.includes('hour')) return d
  try {
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch { return d }
}

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

const STEP_LABELS = [
  { id: 1, api: 'TinyFish Search API', icon: '🔍', desc: 'Querying live web for hyperlocal civic/news/business signals…' },
  { id: 2, api: 'TinyFish Fetch API',  icon: '📄', desc: 'Extracting structured AI-ready content from live web pages…' },
  { id: 3, api: 'TinyFish Web Agent',  icon: '🤖', desc: 'Filing automated civic patrol/dispatch ticket on municipal portal…' },
]

export default function TinyFishPage({ API, selectedReport }) {
  const [selectedZone, setSelectedZone] = useState(DELHI_ZONES[0])
  const [trustScore, setTrustScore]     = useState(65)
  const [reportType, setReportType]     = useState('UNSAFE_HARASSMENT')
  const [useActivePin, setUseActivePin] = useState(false)

  const [running, setRunning]           = useState(false)
  const [step, setStep]                 = useState(0)   // 0 = idle, 1/2/3 = step in progress, 4 = done
  const [result, setResult]             = useState(null)
  const [error, setError]               = useState(null)

  const effectiveLat = useActivePin && selectedReport ? selectedReport.lat : selectedZone.lat
  const effectiveLng = useActivePin && selectedReport ? selectedReport.lng : selectedZone.lng
  const effectiveZone = useActivePin && selectedReport
    ? `Pin @ (${Number(selectedReport.lat).toFixed(4)}, ${Number(selectedReport.lng).toFixed(4)})`
    : selectedZone.name

  const runOsint = async () => {
    setRunning(true)
    setResult(null)
    setError(null)

    // Simulate 3-step visual progress
    for (let s = 1; s <= 3; s++) {
      setStep(s)
      await new Promise(r => setTimeout(r, 900))
    }

    try {
      const res = await fetch(`${API}/api/tinyfish/verify-osint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat: effectiveLat,
          lng: effectiveLng,
          zone_name: effectiveZone,
          report_type: reportType,
          current_trust_score: trustScore,
        }),
      })
      if (!res.ok) throw new Error(`Backend returned ${res.status}`)
      const data = await res.json()
      setResult(data)
      setStep(4)
    } catch (e) {
      setError(e.message)
      setStep(0)
    } finally {
      setRunning(false)
    }
  }

  const verdictStyle = result?.corroboration_verdict === 'CORROBORATED_HAZARD'
    ? { bg: 'bg-emerald-950/60 border-emerald-600', text: 'text-emerald-400', badge: 'bg-emerald-800 text-emerald-200' }
    : { bg: 'bg-red-950/60 border-red-700', text: 'text-red-400', badge: 'bg-red-800 text-red-200' }

  return (
    <div className="h-full overflow-y-auto p-5 space-y-5 max-w-4xl">

      {/* Header */}
      <div>
        <div className="text-base font-bold text-white flex items-center gap-2">
          🐟 TinyFish Live-Web OSINT Agent
          <span className="text-[10px] font-normal px-2 py-0.5 bg-cyan-950 border border-cyan-700 text-cyan-300 rounded-full">
            Search API · Fetch API · Web Agent
          </span>
        </div>
        <div className="text-xs text-slate-400 mt-1">
          Corroborates safety reports against live web signals — civic alerts, business intel, patrol advisories.
          Grants <span className="text-emerald-400 font-semibold">+18 Trust Boost</span> on verified hazards or applies{' '}
          <span className="text-red-400 font-semibold">−30 Penalty</span> to block defamation raids.
        </div>
      </div>

      {/* Config panel */}
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 space-y-4">
        <div className="text-xs font-bold text-slate-300 mb-1">Select Target Zone</div>

        {/* Active pin toggle */}
        {selectedReport && (
          <label className="flex items-center gap-2 cursor-pointer w-fit">
            <input
              type="checkbox"
              checked={useActivePin}
              onChange={e => setUseActivePin(e.target.checked)}
              className="accent-cyan-500"
            />
            <span className="text-xs text-cyan-300">
              Use active X-Ray pin — {selectedReport.report_id} ({selectedReport.verdict})
            </span>
          </label>
        )}

        {/* Zone selector */}
        <div className={`grid grid-cols-4 gap-2 ${useActivePin ? 'opacity-40 pointer-events-none' : ''}`}>
          {DELHI_ZONES.map(z => (
            <button
              key={z.name}
              onClick={() => setSelectedZone(z)}
              className={`text-[10px] font-semibold px-2 py-2 rounded-lg border transition text-center ${
                selectedZone.name === z.name
                  ? 'bg-cyan-900 border-cyan-600 text-cyan-200'
                  : 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200 bg-slate-800/40'
              }`}
            >
              {z.name}
            </button>
          ))}
        </div>

        {/* Trust score + report type */}
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <div className="text-[10px] text-slate-400 mb-1">Current Trust Score (simulate)</div>
            <div className="flex items-center gap-2">
              <input
                type="range" min="0" max="100" value={trustScore}
                onChange={e => setTrustScore(Number(e.target.value))}
                className="w-32 accent-cyan-500"
              />
              <span className={`text-xs font-bold ${trustScore >= 55 ? 'text-emerald-400' : 'text-red-400'}`}>
                {trustScore} — {trustScore >= 55 ? 'CORROBORATED_HAZARD (+18)' : 'DEFAMATION_MISMATCH (−30)'}
              </span>
            </div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400 mb-1">Report Type</div>
            <select
              value={reportType}
              onChange={e => setReportType(e.target.value)}
              className="text-xs bg-slate-800 border border-slate-600 text-slate-200 rounded-lg px-2 py-1.5"
            >
              <option value="UNSAFE_HARASSMENT">UNSAFE_HARASSMENT</option>
              <option value="INCIDENT">INCIDENT</option>
              <option value="CROWD_EMERGENCY">CROWD_EMERGENCY</option>
              <option value="FAKE_SAFE_MASK">FAKE_SAFE_MASK</option>
            </select>
          </div>
        </div>

        {/* Target coordinates display */}
        <div className="text-[10px] text-slate-500 font-mono bg-slate-800/60 px-3 py-1.5 rounded-lg w-fit">
          Target: {effectiveZone} · ({effectiveLat.toFixed(4)}, {effectiveLng.toFixed(4)})
        </div>

        {/* Run button */}
        <button
          onClick={runOsint}
          disabled={running}
          className="w-full py-2.5 rounded-xl font-bold text-sm bg-cyan-700 hover:bg-cyan-600 disabled:opacity-50 text-white transition flex items-center justify-center gap-2"
        >
          {running ? (
            <><span className="animate-spin">⟳</span> Running TinyFish Pipeline…</>
          ) : (
            <>🌐 Run TinyFish Search + Fetch + Web Agent</>
          )}
        </button>
      </div>

      {/* 3-step visual pipeline */}
      <div className="grid grid-cols-3 gap-3">
        {STEP_LABELS.map(s => {
          const isDone = step > s.id || step === 4
          const isActive = step === s.id
          return (
            <div
              key={s.id}
              className={`rounded-xl border p-3 transition-all ${
                isDone
                  ? 'border-cyan-700 bg-cyan-950/40'
                  : isActive
                  ? 'border-yellow-600 bg-yellow-950/40 animate-pulse'
                  : 'border-slate-700 bg-slate-900/40'
              }`}
            >
              <div className="text-lg mb-1">{s.icon}</div>
              <div className={`text-[10px] font-bold mb-1 ${isDone ? 'text-cyan-300' : isActive ? 'text-yellow-300' : 'text-slate-500'}`}>
                Step {s.id}: {s.api}
              </div>
              <div className={`text-[9px] leading-relaxed ${isDone ? 'text-slate-300' : isActive ? 'text-yellow-200' : 'text-slate-600'}`}>
                {isDone ? '✅ Complete' : isActive ? s.desc : 'Waiting…'}
              </div>
            </div>
          )
        })}
      </div>

      {/* Error */}
      {error && (
        <div className="border border-red-700 bg-red-950/30 rounded-xl p-4 text-xs text-red-400">
          ❌ {error}
        </div>
      )}

      {/* Results */}
      {result && (
        <div className={`border rounded-xl p-4 space-y-4 ${verdictStyle.bg}`}>

          {/* Verdict banner */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <div className={`text-sm font-bold ${verdictStyle.text}`}>
                {result.corroboration_verdict === 'CORROBORATED_HAZARD'
                  ? '✅ CORROBORATED HAZARD — Soft Alert → VERIFIED'
                  : '🚫 DEFAMATION MISMATCH — Fake Business Defamation Raid Blocked'}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Zone: {result.zone_name} · ({result.lat?.toFixed(4)}, {result.lng?.toFixed(4)}) ·
                Processing time: {result.processing_time_ms?.toFixed(0)}ms
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <span className={`text-xs font-bold px-2 py-1 rounded-lg ${verdictStyle.badge}`}>
                {result.trust_score_adjustment > 0 ? '+' : ''}{result.trust_score_adjustment} Trust Score
              </span>
              {result.tinyfish_apis_used?.map(api => (
                <span key={api} className="text-[9px] px-2 py-1 rounded-lg bg-slate-800 text-cyan-300 border border-slate-600">
                  {api}
                </span>
              ))}
            </div>
          </div>

          {/* Live web sources — structured cards */}
          <div>
            <div className="text-[10px] font-bold text-slate-300 mb-2 flex items-center gap-2">
              🌐 Live Web Sources Scanned
              <span className="text-[8px] font-normal text-slate-500">
                {result.live_web_sources_scanned?.length} source{result.live_web_sources_scanned?.length !== 1 ? 's' : ''} analysed
              </span>
              {result.live_web_sources_scanned?.some(s => s.live_api_called) && (
                <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-emerald-900 border border-emerald-700 text-emerald-300">
                  ● LIVE API
                </span>
              )}
            </div>

            <div className="space-y-3">
              {result.live_web_sources_scanned?.map((src, i) => {
                const isSearch = src.step?.toLowerCase().includes('search')
                const isFetch  = src.step?.toLowerCase().includes('fetch')
                const domain   = getDomain(src.url)
                const excerpt  = isFetch
                  ? cleanFetchSnippet(src.extracted_snippet)
                  : (src.extracted_snippet || '').slice(0, 320)
                const date     = fmtDate(src.published_date || src.date)

                return (
                  <div
                    key={i}
                    className={`rounded-xl border p-3 space-y-2 ${
                      isSearch
                        ? 'bg-slate-900/80 border-slate-700'
                        : 'bg-slate-900/90 border-cyan-900/60'
                    }`}
                  >
                    {/* Row 1: step badge + domain + live indicator + relevance */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border ${
                        isSearch
                          ? 'bg-violet-950 text-violet-300 border-violet-700'
                          : 'bg-cyan-950 text-cyan-300 border-cyan-800'
                      }`}>
                        {isSearch ? '🔍 Search' : '📄 Fetch'}
                      </span>

                      {/* Domain pill */}
                      <span className="text-[8px] font-mono text-slate-400 bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded">
                        {domain}
                      </span>

                      {/* Date */}
                      {date && (
                        <span className="text-[8px] text-slate-500">📅 {date}</span>
                      )}

                      {/* Author (Fetch only) */}
                      {isFetch && src.author && (
                        <span className="text-[8px] text-slate-500">✍️ {src.author}</span>
                      )}

                      {/* Live indicator */}
                      <span className={`ml-auto text-[8px] font-bold px-1 py-0.5 rounded ${
                        src.live_api_called
                          ? 'text-emerald-400'
                          : 'text-slate-500'
                      }`}>
                        {src.live_api_called ? '● live' : '○ cached'}
                      </span>

                      {/* Relevance bar */}
                      <span className={`text-[8px] font-semibold ${relevanceColor(src.relevance_score)}`}>
                        {Math.round((src.relevance_score || 0) * 100)}% match
                      </span>
                    </div>

                    {/* Row 2: Title */}
                    {src.title && (
                      <div className="text-[11px] font-semibold text-slate-100 leading-snug">
                        {src.title}
                      </div>
                    )}

                    {/* Row 3: Clean excerpt */}
                    {excerpt ? (
                      <div className="text-[10px] text-slate-300 leading-relaxed bg-slate-800/50 rounded-lg px-3 py-2 border border-slate-700/60">
                        {excerpt}
                      </div>
                    ) : (
                      <div className="text-[9px] text-slate-600 italic">No extractable content</div>
                    )}

                    {/* Row 4: Source URL (truncated, clickable) */}
                    <a
                      href={src.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[8px] text-slate-500 hover:text-cyan-400 font-mono truncate block transition"
                      title={src.url}
                    >
                      ↗ {src.url.length > 80 ? src.url.slice(0, 80) + '…' : src.url}
                    </a>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Web Agent action */}
          <div>
            <div className="text-[10px] font-bold text-slate-300 mb-2">🤖 TinyFish Web Agent — Civic Ticket</div>
            <div className="bg-slate-900/70 border border-slate-700 rounded-lg p-3 space-y-1.5">
              <div className="flex items-center gap-2">
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                  result.web_agent_action?.outcome === 'TICKET_FILED'
                    ? 'bg-emerald-900 text-emerald-300'
                    : 'bg-red-900 text-red-300'
                }`}>
                  {result.web_agent_action?.outcome}
                </span>
                {result.web_agent_action?.ticket_id && (
                  <span className="text-[9px] font-mono text-cyan-300">
                    #{result.web_agent_action.ticket_id}
                  </span>
                )}
                <span className="text-[9px] text-slate-500">
                  Portal: {result.web_agent_action?.portal}
                </span>
              </div>
              {result.web_agent_action?.steps_executed?.map((step, i) => (
                <div key={i} className="text-[9px] text-slate-400 flex items-start gap-2">
                  <span className="text-emerald-500 shrink-0">→</span>
                  <span>{step}</span>
                </div>
              ))}
              <div className="text-[10px] text-slate-300 mt-1 pt-1 border-t border-slate-700">
                {result.web_agent_action?.message}
              </div>
            </div>
          </div>

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
