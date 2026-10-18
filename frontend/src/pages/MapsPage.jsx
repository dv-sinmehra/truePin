// MapsPage.jsx — Full-screen BEFORE vs AFTER dual maps
import React from 'react'
import DualMaps from '../components/DualMaps.jsx'

export default function MapsPage({ state, setSelectedReport, onCustom }) {
  const m = state.metrics || {}
  const reports = state.reports || []
  const verified  = reports.filter(r => r.verdict === 'VERIFIED').length
  const soft      = reports.filter(r => r.verdict === 'SOFT_ALERT').length
  const blocked   = reports.filter(r => r.verdict === 'QUARANTINED').length
  const baseline  = (state.baseline_nodes || []).length

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* Page sub-header */}
      <div className="shrink-0 flex items-center justify-between px-4 py-2 bg-slate-900/50 border-b border-slate-800">
        <div className="flex items-center gap-4">
          <span className="text-xs font-semibold text-slate-300">🗺️ Live Trust Map — BEFORE vs AFTER truePin Filter</span>
          <div className="flex items-center gap-3 text-[10px]">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /><span className="text-slate-400">{verified} Verified</span></span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500 inline-block" /><span className="text-slate-400">{soft} Soft</span></span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /><span className="text-slate-400">{blocked} Blocked</span></span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block" /><span className="text-slate-400">{baseline} Baseline</span></span>
          </div>
        </div>
        <button
          onClick={onCustom}
          className="text-xs bg-violet-700 hover:bg-violet-600 text-white px-3 py-1.5 rounded-lg font-semibold transition"
        >
          + Submit Custom Report
        </button>
      </div>

      {/* Maps — fills remaining height */}
      <div className="flex-1 min-h-0 p-2">
        <DualMaps
          reports={state.reports}
          baselineNodes={state.baseline_nodes}
          onSelectReport={setSelectedReport}
        />
      </div>
    </div>
  )
}
