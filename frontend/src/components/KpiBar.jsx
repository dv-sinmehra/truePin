// KpiBar.jsx — Top telemetry bar with 5 KPI cards
import React from 'react'

function KpiCard({ icon, label, value, sub, color }) {
  return (
    <div className="flex-1 bg-slate-800 border border-slate-700 rounded-lg p-3 flex flex-col gap-1 min-w-0">
      <div className="flex items-center gap-1.5 text-slate-400 text-xs font-medium truncate">
        <span>{icon}</span>
        <span className="truncate">{label}</span>
      </div>
      <div className={`text-2xl font-bold tabular-nums ${color}`}>{value}</div>
      {sub && <div className="text-[10px] text-slate-500">{sub}</div>}
    </div>
  )
}

export default function KpiBar({ metrics }) {
  const total      = metrics.total_reports ?? 0
  const totalFakes = metrics.total_fakes ?? 0
  const rawFdr     = metrics.fake_detection_rate ?? 0
  const gsr        = metrics.genuine_suppression_rate ?? 0
  const before     = metrics.map_accuracy_before ?? 96
  const after      = metrics.map_accuracy_after ?? 100

  // When no fakes have been injected yet, show 100% green (system is ready)
  const fdrValue   = totalFakes === 0 ? 100.0 : rawFdr
  const fdrColor   = totalFakes === 0 || rawFdr >= 96 ? 'text-emerald-400' : 'text-red-400'
  const fdrSub     = totalFakes === 0
    ? '0 attacks leaked · Ready'
    : (rawFdr >= 96 ? `✓ Target >96% met` : '⚠ Target >96%')

  return (
    <div className="flex gap-3 px-4 py-3 bg-slate-900 border-b border-slate-800 shrink-0">
      <KpiCard
        icon="📊" label="Total Processed"
        value={total}
        sub={`${totalFakes} fakes · ${metrics.total_genuines ?? 0} genuine`}
        color="text-slate-100"
      />
      <KpiCard
        icon="🎯" label="Fake Detection Rate"
        value={`${fdrValue.toFixed(1)}%`}
        sub={fdrSub}
        color={fdrColor}
      />
      <KpiCard
        icon="✅" label="Genuine Suppression"
        value={`${gsr.toFixed(2)}%`}
        sub={gsr < 1 ? '✓ <1% Target met' : '⚠ Exceeds 1% threshold'}
        color={gsr < 1 ? 'text-emerald-400' : 'text-red-400'}
      />
      <KpiCard
        icon="🗺️" label="Map Reliability BEFORE"
        value={`${before.toFixed(1)}%`}
        sub="Unfiltered — poisoned"
        color={before > 80 ? 'text-yellow-400' : 'text-red-400'}
      />
      <KpiCard
        icon="🛡️" label="Map Reliability AFTER"
        value={`${after.toFixed(1)}%`}
        sub="truePin-protected"
        color={after >= 95 ? 'text-emerald-400' : 'text-yellow-400'}
      />
    </div>
  )
}
