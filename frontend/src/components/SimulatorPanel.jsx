// SimulatorPanel.jsx — Horizontal attack scenario bar + Auto-Demo button
import React from 'react'

const SCENARIOS = [
  {
    id: 'solo_alley_sos',
    icon: '🧍‍♀️',
    label: 'Solo Woman',
    sub: 'Quiet Alley · L5 +28',
    color: 'border-emerald-600 hover:bg-emerald-900/40 text-emerald-300',
    badge: 'L5', badgeColor: 'bg-emerald-900 text-emerald-300',
  },
  {
    id: 'campus_wifi_surge',
    icon: '🏫',
    label: 'Campus Surge',
    sub: '15 Users · CGNAT',
    color: 'border-blue-600 hover:bg-blue-900/40 text-blue-300',
    badge: 'L1', badgeColor: 'bg-blue-900 text-blue-300',
  },
  {
    id: 'vps_jitter_raid',
    icon: '🤖',
    label: 'VPS Raid',
    sub: '20 Bots · L1+L2',
    color: 'border-red-600 hover:bg-red-900/40 text-red-300',
    badge: 'L1+L2', badgeColor: 'bg-red-900 text-red-300',
  },
  {
    id: 'slow_drip_sleeper',
    icon: '🕵️‍♂️',
    label: 'Sleeper Bot',
    sub: 'Zero-history · L3',
    color: 'border-orange-600 hover:bg-orange-900/40 text-orange-300',
    badge: 'L3', badgeColor: 'bg-orange-900 text-orange-300',
  },
  {
    id: 'zero_day_drift',
    icon: '🧬',
    label: 'Zero-Day',
    sub: '220 km/h · L4',
    color: 'border-purple-600 hover:bg-purple-900/40 text-purple-300',
    badge: 'L4', badgeColor: 'bg-purple-900 text-purple-300',
  },
]

export default function SimulatorPanel({ loading, onRun, onReset, onCustom, onAutoDemo }) {
  const isAutoDemoRunning = !!loading['auto_demo']

  return (
    <div className="flex flex-col gap-2">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
          🎮 Judge Attack Simulator
        </span>
        <div className="flex gap-1.5">
          <button
            onClick={onReset}
            className="text-[11px] px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-md cursor-pointer transition-colors"
          >
            🔄 Reset
          </button>
          <button
            onClick={onCustom}
            className="text-[11px] px-2.5 py-1 bg-indigo-800 hover:bg-indigo-700 text-indigo-200 rounded-md cursor-pointer transition-colors"
          >
            ⚙️ Custom
          </button>
        </div>
      </div>

      {/* Scenario buttons — horizontal */}
      <div className="flex gap-2 flex-wrap">
        {SCENARIOS.map(s => (
          <button
            key={s.id}
            onClick={() => onRun(s.id)}
            disabled={!!loading[s.id] || isAutoDemoRunning}
            title={s.sub}
            className={`flex-1 min-w-[100px] text-left border rounded-lg px-2.5 py-2 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${s.color} bg-slate-900/60`}
          >
            <div className="flex items-center justify-between gap-1">
              <span className="text-base">
                {loading[s.id]
                  ? <span className="inline-block w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  : s.icon}
              </span>
              <span className={`text-[9px] font-bold px-1 py-0.5 rounded ${s.badgeColor}`}>{s.badge}</span>
            </div>
            <div className="text-[11px] font-semibold mt-0.5">{s.label}</div>
            <div className="text-[9px] text-slate-500 mt-0.5">{s.sub}</div>
          </button>
        ))}

        {/* Auto-Demo button */}
        <button
          onClick={onAutoDemo}
          disabled={isAutoDemoRunning}
          className={`flex-1 min-w-[120px] border-2 rounded-lg px-3 py-2 transition-all cursor-pointer
            ${isAutoDemoRunning
              ? 'border-yellow-500 bg-yellow-900/30 text-yellow-300 animate-pulse'
              : 'border-yellow-500 bg-yellow-900/20 hover:bg-yellow-900/40 text-yellow-300'}
            disabled:cursor-not-allowed`}
        >
          <div className="flex items-center gap-1.5">
            {isAutoDemoRunning
              ? <span className="inline-block w-3.5 h-3.5 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
              : <span className="text-base">⚡</span>}
            <span className="text-[11px] font-bold">
              {isAutoDemoRunning ? 'Demo Running...' : 'Auto-Run Live Demo'}
            </span>
          </div>
          <div className="text-[9px] text-yellow-500/70 mt-0.5">
            {isAutoDemoRunning ? 'Watch both maps update' : 'All 5 scenarios · hands-free'}
          </div>
        </button>
      </div>

      {/* Compact layer legend */}
      <div className="flex gap-3 flex-wrap pt-1">
        {[
          ['L1','CGNAT/ASN','text-blue-400'],
          ['L2','DBSCAN','text-cyan-400'],
          ['L3','Trust','text-orange-400'],
          ['L4','IsoForest','text-purple-400'],
          ['L5','Consensus','text-emerald-400'],
        ].map(([id, name, c]) => (
          <span key={id} className={`text-[10px] ${c}`}>
            <span className="font-bold font-mono">{id}</span>
            <span className="text-slate-600"> {name}</span>
          </span>
        ))}
      </div>
    </div>
  )
}
