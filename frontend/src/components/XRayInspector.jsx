// XRayInspector.jsx — 5-Layer breakdown panel for a selected report
import React, { useEffect, useState } from 'react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const LAYER_PREFIXES = ['L1', 'L2', 'L3', 'L4', 'L5']
const LAYER_NAMES = {
  L1: 'CGNAT / ASN / Kinematics',
  L2: 'DBSCAN Clustering',
  L3: 'Bayesian Trust Graph',
  L4: 'IsolationForest Drift',
  L5: 'Consensus Router',
}
const LAYER_COLORS = {
  L1: 'text-blue-400',
  L2: 'text-cyan-400',
  L3: 'text-orange-400',
  L4: 'text-purple-400',
  L5: 'text-emerald-400',
}

function verdictBadge(verdict) {
  if (verdict === 'VERIFIED')   return 'bg-emerald-900 text-emerald-300 border-emerald-700'
  if (verdict === 'SOFT_ALERT') return 'bg-yellow-900 text-yellow-300 border-yellow-700'
  return 'bg-red-900 text-red-300 border-red-700'
}

function scoreColor(val) {
  if (val > 0) return 'text-emerald-400'
  if (val < 0) return 'text-red-400'
  return 'text-slate-400'
}

export default function XRayInspector({ report, onDismiss }) {
  const [ai, setAi]           = useState(null)   // ai_reasoner result
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState(null)

  // Clear the explanation when a different report is selected
  useEffect(() => { setAi(null); setAiError(null) }, [report?.report_id])

  const explainWithGemini = async () => {
    setAiLoading(true)
    setAiError(null)
    try {
      const res = await fetch(`${API}/api/skills/ai_reasoner/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'explain_verdict',
          verdict: report.verdict,
          final_score: report.final_score,
          layer_log: report.layer_log || [],
          report_type: report.report_type,
          asn_type: report.asn_type,
          kinematic_variance: report.kinematic_variance,
          account_age_days: report.account_age_days,
          lat: report.lat,
          lng: report.lng,
          zone_name: 'Delhi',
          osint_verdict: report.tinyfish_osint_status !== 'NOT_CHECKED' ? report.tinyfish_osint_status : '',
        }),
      })
      const data = await res.json()
      if (!res.ok || data.success === false) throw new Error(data.detail || data.error || `Backend returned ${res.status}`)
      setAi(data)
    } catch (e) {
      setAiError(e.message)
    } finally {
      setAiLoading(false)
    }
  }

  if (!report) return null

  const layerScores = {
    L1: report.l1_score,
    L2: report.l2_penalty,
    L3: report.l3_penalty,
    L4: report.l4_penalty,
    L5: report.l5_boost,
  }

  return (
    <div className="border border-slate-700 rounded-lg bg-slate-900 p-3 slide-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-300">🔬 X-Ray Inspector</span>
          <span className={`text-[10px] font-bold border px-1.5 py-0.5 rounded ${verdictBadge(report.verdict)}`}>
            {report.verdict}
          </span>
        </div>
        <button
          onClick={onDismiss}
          className="text-slate-500 hover:text-slate-300 text-lg leading-none cursor-pointer"
        >
          ×
        </button>
      </div>

      {/* Report meta */}
      <div className="text-[10px] text-slate-500 mb-3 font-mono truncate">
        {report.report_id} · Score: <span className="text-slate-200 font-bold">{report.final_score}</span>
        {' · '}Trust after: <span className="text-slate-200">{report.trust_score_after}</span>
      </div>

      {/* Layer rows */}
      {LAYER_PREFIXES.map((lid) => {
        const logs = (report.layer_log || []).filter((l) => l.startsWith(lid + ':'))
        const score = layerScores[lid]
        return (
          <div key={lid} className="mb-2">
            <div className="flex items-center justify-between">
              <span className={`text-[11px] font-bold font-mono ${LAYER_COLORS[lid]}`}>
                {lid} — {LAYER_NAMES[lid]}
              </span>
              {score !== undefined && score !== null && (
                <span className={`text-xs font-mono font-bold ${scoreColor(score)}`}>
                  {score > 0 ? '+' : ''}{score}
                </span>
              )}
            </div>
            {logs.map((log, i) => (
              <div key={i} className="text-[10px] text-slate-400 pl-2 border-l border-slate-700 mt-0.5">
                {log.replace(/^L\d: /, '')}
              </div>
            ))}
          </div>
        )
      })}

      {/* AI explanation (ai_reasoner skill — Gemini when configured) */}
      <div className="mt-3 pt-3 border-t border-slate-700">
        {!ai && (
          <button
            onClick={explainWithGemini}
            disabled={aiLoading}
            className="w-full text-[11px] font-semibold py-1.5 rounded-lg bg-indigo-800 hover:bg-indigo-700 disabled:opacity-50 text-indigo-100 transition"
          >
            {aiLoading ? 'Asking Gemini…' : '✨ Explain this verdict with Gemini'}
          </button>
        )}
        {aiError && <div className="text-[10px] text-red-400 mt-1">❌ {aiError}</div>}
        {ai && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                ai.ai_powered
                  ? 'bg-indigo-950 text-indigo-300 border-indigo-700'
                  : 'bg-slate-800 text-slate-400 border-slate-600'
              }`}>
                {ai.ai_powered ? `✨ Gemini · ${ai.model}` : '⚙️ Rule-based (Gemini not used)'}
              </span>
              {ai.confidence && <span className="text-[9px] text-slate-400">Confidence: {ai.confidence}</span>}
            </div>
            <div className="text-[10px] text-slate-200 leading-relaxed">{ai.explanation}</div>
            {Array.isArray(ai.key_signals) && ai.key_signals.length > 0 && (
              <ul className="text-[10px] text-slate-400 list-disc pl-4">
                {ai.key_signals.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            )}
            {ai.false_positive_risk && (
              <div className="text-[10px] text-slate-500">False-positive risk: {ai.false_positive_risk}</div>
            )}
            {!ai.ai_powered && ai.fallback_reason && (
              <div className="text-[9px] text-slate-500 italic">{ai.fallback_reason}</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
