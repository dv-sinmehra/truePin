// App.jsx — truePin: 5-Layer Adversarial Trust Engine · multi-page with sidebar nav
import React, { useState, useEffect, useCallback, useRef } from 'react'
import KpiBar from './components/KpiBar.jsx'
import CustomReportModal from './components/CustomReportModal.jsx'

import MapsPage      from './pages/MapsPage.jsx'
import SimulatorPage from './pages/SimulatorPage.jsx'
import FirehosePage  from './pages/FirehosePage.jsx'
import BenchmarkPage from './pages/BenchmarkPage.jsx'
import ApiPage       from './pages/ApiPage.jsx'
import TinyFishPage  from './pages/TinyFishPage.jsx'

// In production: set VITE_API_URL to your Render backend URL
// In development: falls back to localhost:8000
const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const NAV = [
  { id: 'maps',       icon: '🗺️',  label: 'Live Maps',      sublabel: 'BEFORE / AFTER' },
  { id: 'simulator',  icon: '⚡',  label: 'Attack Sim',     sublabel: '5 Scenarios'    },
  { id: 'firehose',   icon: '📡',  label: 'Firehose',       sublabel: 'Live Reports'   },
  { id: 'benchmark',  icon: '📊',  label: 'Benchmark',      sublabel: '1,200 rows'     },
  { id: 'api',        icon: '🔌',  label: 'API Docs',       sublabel: 'REST Reference' },
  { id: 'tinyfish',   icon: '🐟',  label: 'TinyFish',       sublabel: 'Live-Web OSINT' },
]

export default function App() {
  const [activePage, setActivePage]       = useState('maps')
  const [state, setState]                 = useState({ reports: [], metrics: {}, baseline_nodes: [], user_trust_snapshot: {} })
  const [selectedReport, setSelectedReport] = useState(null)
  const [loading, setLoading]             = useState({})
  const [showCustom, setShowCustom]       = useState(false)
  const [connected, setConnected]         = useState(false)
  const intervalRef = useRef(null)

  // ── Data fetching ──────────────────────────────────────────────────
  const fetchState = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/state`)
      if (!res.ok) return
      const data = await res.json()
      setState(data)
      setConnected(true)
    } catch {
      setConnected(false)
    }
  }, [])

  useEffect(() => {
    fetchState()
    intervalRef.current = setInterval(fetchState, 1500)
    return () => clearInterval(intervalRef.current)
  }, [fetchState])

  // ── Scenario runner ────────────────────────────────────────────────
  const runScenario = useCallback(async (scenario) => {
    setLoading(l => ({ ...l, [scenario]: true }))
    try {
      const res = await fetch(`${API}/api/simulate/${scenario}`, { method: 'POST' })
      const results = await res.json()
      if (Array.isArray(results) && results.length > 0) {
        setSelectedReport(results[results.length - 1])
      }
      await fetchState()
    } catch (e) { console.error('Simulation error', e) }
    finally { setLoading(l => ({ ...l, [scenario]: false })) }
  }, [fetchState])

  // ── Reset ──────────────────────────────────────────────────────────
  const handleReset = useCallback(async () => {
    await fetch(`${API}/api/reset`, { method: 'POST' })
    setSelectedReport(null)
    await fetchState()
  }, [fetchState])

  // ── Auto-Demo: sequential hands-free run ───────────────────────────
  const runAutoDemo = useCallback(async () => {
    setLoading(l => ({ ...l, auto_demo: true }))
    await handleReset()
    const run = async (scenario, delay) => {
      await new Promise(r => setTimeout(r, delay))
      const res = await fetch(`${API}/api/simulate/${scenario}`, { method: 'POST' })
      const results = await res.json()
      if (Array.isArray(results) && results.length > 0) {
        setSelectedReport(results[results.length - 1])
      }
      await fetchState()
    }
    try {
      await run('solo_alley_sos',    500)
      await run('campus_wifi_surge', 2000)
      await run('vps_jitter_raid',   2000)
      await run('zero_day_drift',    2000)
      await run('slow_drip_sleeper', 2000)
    } catch (e) { console.error('Auto-demo error', e) }
    finally { setLoading(l => ({ ...l, auto_demo: false })) }
  }, [handleReset, fetchState])

  // ── Custom report ──────────────────────────────────────────────────
  const submitCustom = useCallback(async (form) => {
    const body = {
      report_id: `rep_custom_${Date.now()}`,
      timestamp: Date.now() / 1000,
      user_id: 'judge_custom_001',
      ip_address: '49.205.10.1',
      device_hash: 'custom_abc123',
      is_ground_truth_fake: false,
      report_type: 'UNSAFE_HARASSMENT',
      ...form,
    }
    try {
      const res = await fetch(`${API}/api/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const processed = await res.json()
      setSelectedReport(processed)
    } catch (e) { console.error('Custom report error', e) }
    setShowCustom(false)
    await fetchState()
  }, [fetchState])

  // ── Page props ─────────────────────────────────────────────────────
  const sharedProps = { state, selectedReport, setSelectedReport, loading, API }

  const renderPage = () => {
    switch (activePage) {
      case 'maps':      return <MapsPage      {...sharedProps} onCustom={() => setShowCustom(true)} />
      case 'simulator': return <SimulatorPage {...sharedProps} onRun={runScenario} onReset={handleReset} onAutoDemo={runAutoDemo} onCustom={() => setShowCustom(true)} />
      case 'firehose':  return <FirehosePage  {...sharedProps} />
      case 'benchmark': return <BenchmarkPage />
      case 'api':       return <ApiPage />
      case 'tinyfish':  return <TinyFishPage API={API} selectedReport={selectedReport} />
      default:          return null
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col h-screen overflow-hidden">

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-xl">🛡️</span>
          <div>
            <div className="text-sm font-bold text-white tracking-tight">
              truePin
              <span className="ml-2 text-[10px] font-normal text-violet-400 bg-violet-950 border border-violet-800 rounded px-1.5 py-0.5 align-middle">
                5-Layer Adversarial Trust Engine
              </span>
            </div>
            <div className="text-[10px] text-slate-500">
              Domain 2: Women Safety · Problem 4: The Poisoned Safety Map
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
          <span className={`text-xs ${connected ? 'text-emerald-400' : 'text-red-400'}`}>
            {connected ? 'Backend Connected' : 'Connecting to :8000...'}
          </span>
        </div>
      </div>

      {/* ── KPI Telemetry Bar ────────────────────────────────────────── */}
      <KpiBar metrics={state.metrics} />

      {/* ── Main: Sidebar + Page Content ────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden min-h-0">

        {/* Sidebar */}
        <div className="w-[72px] shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col items-center py-3 gap-1.5">
          {NAV.map(item => (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id)}
              title={item.label}
              className={`w-14 h-14 flex flex-col items-center justify-center rounded-xl text-center transition gap-0.5 border ${
                activePage === item.id
                  ? 'bg-violet-900 border-violet-600 text-violet-200'
                  : 'border-transparent text-slate-500 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <span className="text-xl leading-none">{item.icon}</span>
              <span className="text-[8px] leading-tight font-semibold tracking-tight">{item.label}</span>
              <span className="text-[7px] leading-tight text-slate-600">{item.sublabel}</span>
            </button>
          ))}
        </div>

        {/* Page content */}
        <div className="flex-1 min-w-0 overflow-hidden">
          {renderPage()}
        </div>
      </div>

      {/* ── Custom Report Modal ──────────────────────────────────────── */}
      {showCustom && (
        <div className="fixed inset-0 z-[9999]">
          <CustomReportModal
            onSubmit={submitCustom}
            onClose={() => setShowCustom(false)}
          />
        </div>
      )}
    </div>
  )
}
