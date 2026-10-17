// XRayInspector.jsx — 5-Layer breakdown panel for a selected report
import React from 'react'

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
    </div>
  )
}
