// SimulatorPage.jsx — Full-page attack scenario simulator + X-Ray inspector
import React from 'react'
import XRayInspector from '../components/XRayInspector.jsx'

const SCENARIO_INFO = {
  solo_alley_sos: {
    icon: '🚶‍♀️',
    layer: 'L5',
    title: 'Solo Woman SOS',
    desc: 'Single trusted Jio mobile user in a deserted lane at night. Tests Layer 5 Solo Proof-of-Presence boost (+28). Expected VERIFIED.',
    color: 'border-emerald-700 bg-emerald-950/20',
    expected: 'VERIFIED',
    expectedColor: 'bg-emerald-800 text-emerald-200',
  },
  campus_wifi_surge: {
    icon: '🎓',
    layer: 'L1',
    title: 'Campus WiFi Surge',
    desc: '15 students reporting from shared campus WiFi. Tests CGNAT bypass logic — genuine crowd on one IP should NOT be penalised.',
    color: 'border-blue-700 bg-blue-950/20',
    expected: 'VERIFIED',
    expectedColor: 'bg-emerald-800 text-emerald-200',
  },
  vps_jitter_raid: {
    icon: '🤖',
    layer: 'L1+L2',
    title: 'VPS Jitter Raid',
    desc: '20 bots from AWS/DigitalOcean datacenter IPs flooding fake pins in a tight cluster. Tests L1 ASN filter + L2 DBSCAN Sybil detection.',
    color: 'border-red-700 bg-red-950/20',
    expected: 'QUARANTINED',
    expectedColor: 'bg-red-800 text-red-200',
  },
  slow_drip_sleeper: {
    icon: '💤',
    layer: 'L3',
    title: 'Sleeper Bot',
    desc: '8 brand-new accounts (age=0) dripping slow fake reports from Jio IPs. Tests L3 Bayesian Trust Graph & zero-history burn.',
    color: 'border-orange-700 bg-orange-950/20',
    expected: 'QUARANTINED',
    expectedColor: 'bg-red-800 text-red-200',
  },
  zero_day_drift: {
    icon: '🌪️',
    layer: 'L4',
    title: 'Zero-Day Drift',
    desc: '5 fresh accounts arriving at 220 km/h from VPS IPs. Tests L4 IsolationForest anomaly isolation — physically impossible human motion.',
    color: 'border-purple-700 bg-purple-950/20',
    expected: 'QUARANTINED',
    expectedColor: 'bg-red-800 text-red-200',
  },
  new_account_sos: {
    icon: '🆕',
    layer: 'L3',
    title: 'New Account SOS',
    desc: '4 brand-new users (7 days old) on Jio mobile with valid kinematics. Low trust score → SOFT_ALERT ⚠ (yellow). The map needs more corroboration to promote to VERIFIED.',
    color: 'border-yellow-700 bg-yellow-950/20',
    expected: 'SOFT_ALERT',
    expectedColor: 'bg-yellow-800 text-yellow-200',
  },
}


export default function SimulatorPage({ state, selectedReport, setSelectedReport, loading, onRun, onReset, onAutoDemo, onCustom }) {
  const recent = (state.reports || []).slice(0, 15)

  return (
    <div className="flex h-full overflow-hidden">

      {/* Left: Simulator controls + recent results */}
      <div className="flex-1 min-w-0 overflow-y-auto p-4 space-y-4">

        {/* Header */}
        <div>
          <div className="text-sm font-bold text-white">⚡ Judge Attack Simulator</div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Inject real adversarial scenarios to demonstrate each layer of the 5-layer AEGIS-MAP pipeline in live action
          </div>
        </div>

        {/* Scenario cards */}
        <div className="space-y-2">
          {Object.entries(SCENARIO_INFO).map(([key, info]) => (
            <div key={key} className={`border rounded-xl p-3 flex items-center gap-4 ${info.color}`}>
              <div className="text-2xl shrink-0">{info.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <span className="text-xs font-bold text-white">{info.title}</span>
                  <span className="text-[9px] font-mono bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded">{info.layer}</span>
                  <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${info.expectedColor}`}>
                    → {info.expected}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 leading-relaxed">{info.desc}</div>
              </div>
              <button
                onClick={() => { onRun(key); setSelectedReport(null) }}
                disabled={!!loading[key]}
                className="shrink-0 text-xs bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-semibold transition"
              >
                {loading[key] ? '⏳' : '▶ Run'}
              </button>
            </div>
          ))}
        </div>

        {/* Control buttons */}
        <div className="flex gap-2 flex-wrap border-t border-slate-800 pt-3">
          <button
            onClick={onAutoDemo}
            disabled={!!loading.auto_demo}
            className="flex items-center gap-1.5 text-xs bg-yellow-700 hover:bg-yellow-600 disabled:opacity-50 text-white px-3 py-2 rounded-lg font-semibold transition"
          >
            {loading.auto_demo ? '⏳ Running all 5...' : '⚡ Auto-Run All 5 Scenarios'}
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
            <div className="text-xs font-semibold text-slate-400 mb-2">Recent Pipeline Results (click to X-Ray inspect)</div>
            <div className="space-y-1">
              {recent.map(r => (
                <button
                  key={r.report_id}
                  onClick={() => setSelectedReport(r)}
                  className={`w-full text-left rounded-lg px-3 py-2 flex items-center gap-3 transition border ${
                    selectedReport?.report_id === r.report_id
                      ? 'border-violet-500 bg-violet-950/50'
                      : 'border-slate-800 bg-slate-900/50 hover:border-slate-600'
                  }`}
                >
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                    r.verdict === 'VERIFIED'    ? 'bg-emerald-800 text-emerald-300' :
                    r.verdict === 'QUARANTINED' ? 'bg-red-900 text-red-300' :
                                                   'bg-yellow-900 text-yellow-300'
                  }`}>{r.verdict}</span>
                  <span className="text-[10px] text-slate-400 font-mono truncate flex-1">{r.report_id}</span>
                  <span className="text-[10px] text-slate-500 shrink-0">{r.asn_type}</span>
                  <span className="text-[10px] text-slate-400 shrink-0">Score: <span className="text-white font-bold">{r.final_score}</span></span>
                </button>
              ))}
            </div>
          </div>
        )}

        {recent.length === 0 && (
          <div className="flex items-center justify-center h-24 text-slate-600 text-sm border border-dashed border-slate-800 rounded-xl">
            Run a scenario above to see results here
          </div>
        )}
      </div>

      {/* Right: X-Ray Inspector panel */}
      {selectedReport ? (
        <div className="shrink-0 border-l border-slate-800 overflow-y-auto p-3" style={{ width: '340px' }}>
          <XRayInspector report={selectedReport} onDismiss={() => setSelectedReport(null)} />
        </div>
      ) : (
        <div className="shrink-0 border-l border-slate-800 flex flex-col items-center justify-center p-6 gap-3" style={{ width: '280px' }}>
          <span className="text-4xl">🔬</span>
          <div className="text-sm font-semibold text-slate-400 text-center">X-Ray Inspector</div>
          <div className="text-[10px] text-slate-600 text-center">Run a scenario and click any result to see the full 5-layer scoring breakdown here</div>
        </div>
      )}
    </div>
  )
}
