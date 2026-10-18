// SimulatorPage.jsx — Full-page attack scenario simulator + X-Ray inspector
import React from 'react'
import SimulatorPanel from '../components/SimulatorPanel.jsx'
import XRayInspector from '../components/XRayInspector.jsx'

const SCENARIO_INFO = {
  solo_alley_sos: {
    title: 'Solo Woman SOS',
    desc: 'Single trusted mobile user in a deserted lane. Tests Layer 5 Solo Proof-of-Presence boost (+28).',
    color: 'border-emerald-700 bg-emerald-950/30',
    expected: 'VERIFIED',
  },
  campus_wifi_surge: {
    title: 'Campus WiFi Surge',
    desc: '15 students on shared campus WiFi. Tests CGNAT bypass for genuine crowd emergencies.',
    color: 'border-blue-700 bg-blue-950/30',
    expected: 'VERIFIED',
  },
  vps_jitter_raid: {
    title: 'VPS Jitter Raid',
    desc: '20 bots from datacenters flooding fake pins. Tests L1 ASN filter + L2 DBSCAN cluster detection.',
    color: 'border-red-700 bg-red-950/30',
    expected: 'QUARANTINED',
  },
  slow_drip_sleeper: {
    title: 'Sleeper Bot',
    desc: '8 aged fake accounts dripping slow. Tests L3 Bayesian Trust Graph & burn mechanism.',
    color: 'border-orange-700 bg-orange-950/30',
    expected: 'QUARANTINED',
  },
  zero_day_drift: {
    title: 'Zero-Day Drift',
    desc: '5 new accounts at 220 km/h from VPS. Tests L4 IsolationForest anomaly isolation.',
    color: 'border-purple-700 bg-purple-950/30',
    expected: 'QUARANTINED',
  },
}

export default function SimulatorPage({ state, selectedReport, setSelectedReport, loading, onRun, onReset, onAutoDemo, onCustom }) {
  const recent = (state.reports || []).slice(0, 20)

  return (
    <div className="flex h-full overflow-hidden">

      {/* Left: Simulator controls + recent results */}
      <div className="flex-1 min-w-0 overflow-y-auto p-4 space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-bold text-white">⚡ Judge Attack Simulator</div>
            <div className="text-[10px] text-slate-500">Inject adversarial scenarios to demonstrate the 5-layer pipeline</div>
          </div>
        </div>

        {/* Scenario cards */}
        <div className="grid grid-cols-1 gap-3">
          {Object.entries(SCENARIO_INFO).map(([key, info]) => (
            <div key={key} className={`border rounded-xl p-3 flex items-center justify-between gap-4 ${info.color}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-bold text-white">{info.title}</span>
                  <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${
                    info.expected === 'VERIFIED' ? 'bg-emerald-800 text-emerald-200' : 'bg-red-800 text-red-200'
                  }`}>
                    Expected: {info.expected}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400">{info.desc}</div>
              </div>
              <button
                onClick={() => { onRun(key); setSelectedReport(null) }}
                disabled={loading[key]}
                className="shrink-0 text-xs bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg font-semibold transition"
              >
                {loading[key] ? '⏳' : '▶ Run'}
              </button>
            </div>
          ))}
        </div>

        {/* Control buttons */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={runAutoDemo}
            disabled={loading.auto_demo}
            className="flex items-center gap-1.5 text-xs bg-yellow-700 hover:bg-yellow-600 disabled:opacity-50 text-white px-3 py-2 rounded-lg font-semibold transition"
          >
            {loading.auto_demo ? '⏳ Running...' : '⚡ Auto-Run All 5 Scenarios'}
          </button>
          <button
            onClick={onCustom}
            className="text-xs bg-violet-700 hover:bg-violet-600 text-white px-3 py-2 rounded-lg font-semibold transition"
          >
            🎯 Custom Report
          </button>
          <button
            onClick={onReset}
            className="text-xs bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 rounded-lg font-semibold transition"
          >
            🔄 Reset All
          </button>
        </div>

        {/* Recent report results */}
        {recent.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-slate-400 mb-2">Recent Results</div>
            <div className="space-y-1">
              {recent.slice(0, 10).map(r => (
                <button
                  key={r.report_id}
                  onClick={() => setSelectedReport(r)}
                  className={`w-full text-left rounded-lg px-3 py-2 flex items-center gap-3 transition border ${
                    selectedReport?.report_id === r.report_id
                      ? 'border-violet-500 bg-violet-950/50'
                      : 'border-slate-800 bg-slate-900/50 hover:border-slate-600'
                  }`}
                >
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    r.verdict === 'VERIFIED' ? 'bg-emerald-800 text-emerald-300' :
                    r.verdict === 'QUARANTINED' ? 'bg-red-900 text-red-300' :
                    'bg-yellow-900 text-yellow-300'
                  }`}>{r.verdict}</span>
                  <span className="text-[10px] text-slate-400 font-mono truncate">{r.report_id}</span>
                  <span className="ml-auto text-[10px] text-slate-500">{r.asn_type}</span>
                  <span className="text-[10px] text-slate-400">Score: <span className="text-white font-bold">{r.final_score}</span></span>
                </button>
              ))}
            </div>
          </div>
        )}

        {recent.length === 0 && (
          <div className="flex items-center justify-center h-32 text-slate-600 text-sm border border-dashed border-slate-800 rounded-xl">
            Run a scenario above to see results here
          </div>
        )}
      </div>

      {/* Right: X-Ray Inspector */}
      {selectedReport && (
        <div className="w-88 shrink-0 border-l border-slate-800 overflow-y-auto p-3" style={{ width: '340px' }}>
          <XRayInspector report={selectedReport} onDismiss={() => setSelectedReport(null)} />
        </div>
      )}
    </div>
  )
}
