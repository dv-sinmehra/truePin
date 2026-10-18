// FirehosePage.jsx — Full-page live report stream + X-Ray inspector
import React, { useState } from 'react'
import XRayInspector from '../components/XRayInspector.jsx'

const VERDICT_COLOR = {
  VERIFIED: { badge: 'bg-emerald-900 text-emerald-300 border-emerald-700', dot: 'bg-emerald-400' },
  SOFT_ALERT: { badge: 'bg-yellow-900 text-yellow-300 border-yellow-700', dot: 'bg-yellow-400' },
  QUARANTINED: { badge: 'bg-red-900 text-red-300 border-red-700', dot: 'bg-red-400' },
}

export default function FirehosePage({ state, selectedReport, setSelectedReport }) {
  const [filter, setFilter] = useState('ALL')
  const reports = (state.reports || [])
  const filtered = filter === 'ALL' ? reports : reports.filter(r => r.verdict === filter)

  return (
    <div className="flex h-full overflow-hidden">

      {/* Left: Firehose */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden border-r border-slate-800">

        {/* Filter bar */}
        <div className="shrink-0 flex items-center gap-2 px-4 py-2.5 bg-slate-900/50 border-b border-slate-800">
          <span className="text-xs text-slate-400 font-semibold mr-1">📡 Live Report Firehose</span>
          <span className="text-[10px] text-slate-500">({reports.length} total)</span>
          <div className="ml-auto flex gap-1">
            {['ALL', 'VERIFIED', 'SOFT_ALERT', 'QUARANTINED'].map(v => (
              <button
                key={v}
                onClick={() => setFilter(v)}
                className={`text-[10px] font-semibold px-2 py-1 rounded transition ${
                  filter === v
                    ? 'bg-violet-700 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {v === 'ALL' ? `All (${reports.length})` :
                 v === 'VERIFIED' ? `✅ ${reports.filter(r => r.verdict === 'VERIFIED').length}` :
                 v === 'SOFT_ALERT' ? `⚠ ${reports.filter(r => r.verdict === 'SOFT_ALERT').length}` :
                 `🚫 ${reports.filter(r => r.verdict === 'QUARANTINED').length}`}
              </button>
            ))}
          </div>
        </div>

        {/* Report list */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
          {filtered.length === 0 && (
            <div className="flex items-center justify-center h-32 text-slate-600 text-sm border border-dashed border-slate-800 rounded-xl m-4">
              No reports yet — run a scenario in the Attack Simulator
            </div>
          )}
          {filtered.map(r => {
            const vc = VERDICT_COLOR[r.verdict] || VERDICT_COLOR.SOFT_ALERT
            const isSelected = selectedReport?.report_id === r.report_id
            return (
              <button
                key={r.report_id}
                onClick={() => setSelectedReport(r)}
                className={`w-full text-left rounded-xl p-3 border transition ${
                  isSelected
                    ? 'border-violet-500 bg-violet-950/40'
                    : 'border-slate-800 bg-slate-900/40 hover:border-slate-600 hover:bg-slate-900/60'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${vc.dot} shrink-0`} />
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${vc.badge}`}>{r.verdict}</span>
                  <span className="text-[10px] text-slate-400 font-mono truncate flex-1">{r.report_id}</span>
                  <span className="text-[10px] text-slate-300 font-bold shrink-0">{r.final_score}</span>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-slate-500">
                  <span>{r.user_id}</span>
                  <span className="text-slate-700">·</span>
                  <span>{r.asn_type}</span>
                  <span className="text-slate-700">·</span>
                  <span>kv={r.kinematic_variance}</span>
                  <span className="text-slate-700">·</span>
                  <span className="truncate">{r.lat?.toFixed(4)}, {r.lng?.toFixed(4)}</span>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Right: X-Ray Inspector */}
      <div className="shrink-0 overflow-y-auto bg-slate-900/30" style={{ width: '360px' }}>
        {selectedReport ? (
          <div className="p-3">
            <XRayInspector report={selectedReport} onDismiss={() => setSelectedReport(null)} />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-6 gap-3">
            <span className="text-4xl">🔬</span>
            <div className="text-sm font-semibold text-slate-400">X-Ray Inspector</div>
            <div className="text-xs text-slate-600">Click any report on the left to inspect its full 5-layer scoring breakdown</div>
          </div>
        )}
      </div>
    </div>
  )
}
