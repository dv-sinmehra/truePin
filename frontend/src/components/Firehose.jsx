// Firehose.jsx — Scrolling live report feed
import React from 'react'

function verdictStyle(verdict) {
  if (verdict === 'VERIFIED')   return { badge: 'bg-emerald-900 text-emerald-300', dot: '#10b981' }
  if (verdict === 'SOFT_ALERT') return { badge: 'bg-yellow-900 text-yellow-300',   dot: '#f59e0b' }
  return                               { badge: 'bg-red-900 text-red-300',         dot: '#ef4444' }
}

function asnShort(asn) {
  if (asn === 'MOBILE_ISP')    return { label: 'MOBILE', color: 'text-blue-400' }
  if (asn === 'CAMPUS_WIFI')   return { label: 'CAMPUS', color: 'text-cyan-400' }
  return                              { label: 'VPS',    color: 'text-red-400'  }
}

export default function Firehose({ reports, selectedId, onSelect }) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-3 py-2 border-b border-slate-800 text-xs font-bold text-slate-400 uppercase tracking-widest shrink-0">
        📡 Live Report Firehose
        <span className="ml-2 text-slate-600 font-normal normal-case">{reports.length} reports</span>
      </div>
      <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60">
        {reports.length === 0 && (
          <div className="text-center text-slate-600 text-xs py-8">
            No reports yet. Click a simulation button →
          </div>
        )}
        {reports.map((r) => {
          const vs = verdictStyle(r.verdict)
          const asn = asnShort(r.asn_type)
          const isSelected = r.report_id === selectedId
          return (
            <div
              key={r.report_id}
              onClick={() => onSelect(r)}
              className={`px-3 py-2 cursor-pointer transition-colors hover:bg-slate-800/60 ${
                isSelected ? 'bg-slate-800 border-l-2 border-violet-500' : ''
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: vs.dot }} />
                  <span className="text-xs text-slate-300 font-mono truncate">
                    {r.user_id.slice(0, 14)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className={`text-[9px] font-bold px-1 py-0.5 rounded ${vs.badge}`}>
                    {r.verdict}
                  </span>
                  <span className="text-[10px] font-mono font-bold text-slate-200">
                    {r.final_score}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-0.5 pl-3">
                <span className={`text-[10px] font-semibold ${asn.color}`}>{asn.label}</span>
                <span className="text-[10px] text-slate-600">{r.account_age_days}d</span>
                <span className="text-[10px] text-slate-600 truncate">{r.report_type}</span>
              </div>
              {/* Score bar */}
              <div className="mt-1 pl-3">
                <div className="h-0.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${r.final_score}%`,
                      background: vs.dot,
                    }}
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
