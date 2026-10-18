// App.jsx — truePin: 5-Layer Adversarial Trust Engine · main layout orchestrator
import React, { useState, useEffect, useCallback, useRef } from 'react'
import KpiBar from './components/KpiBar.jsx'
import DualMaps from './components/DualMaps.jsx'
import SimulatorPanel from './components/SimulatorPanel.jsx'
import Firehose from './components/Firehose.jsx'
import XRayInspector from './components/XRayInspector.jsx'
import CustomReportModal from './components/CustomReportModal.jsx'
import BenchmarkModal from './components/BenchmarkModal.jsx'
import UseCasesModal from './components/UseCasesModal.jsx'


// In production: set VITE_API_URL to your Render backend URL
// In development: falls back to localhost:8000
const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function App() {
  const [state, setState] = useState({
    reports: [], metrics: {}, baseline_nodes: [], user_trust_snapshot: {},
  })
  const [selectedReport, setSelectedReport] = useState(null)
  const [loading, setLoading] = useState({})
  const [showCustom, setShowCustom] = useState(false)
  const [showBenchmark, setShowBenchmark] = useState(false)
  const [showUseCases, setShowUseCases] = useState(false)

  const [connected, setConnected] = useState(false)
  const intervalRef = useRef(null)

  // ── Data fetching ──────────────────────────────────────────
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

  // ── Scenario runner ────────────────────────────────────────
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

  // ── Reset ──────────────────────────────────────────────────
  const handleReset = useCallback(async () => {
    await fetch(`${API}/api/reset`, { method: 'POST' })
    setSelectedReport(null)
    await fetchState()
  }, [fetchState])

  // ── Auto-Demo: sequential hands-free run ──────────────────
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

  // ── Custom report ──────────────────────────────────────────
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col h-screen overflow-hidden">

      {/* ── Header ─────────────────────────────────────────── */}
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
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <button
            onClick={() => setShowBenchmark(true)}
            className="flex items-center gap-1 bg-violet-900 hover:bg-violet-800 border border-violet-700 text-violet-200 text-[10px] font-semibold px-2 py-1 rounded-lg transition"
          >
            📊 Dataset Reliability Benchmark
          </button>
          <button
            onClick={() => setShowUseCases(true)}
            className="flex items-center gap-1 bg-blue-900 hover:bg-blue-800 border border-blue-700 text-blue-200 text-[10px] font-semibold px-2 py-1 rounded-lg transition"
          >
            🔌 Real-World Use Cases &amp; API
          </button>
          <span className="text-[9px] font-semibold bg-yellow-500 text-black px-1.5 py-0.5 rounded animate-pulse">★ Mentor Feedback Added</span>
          <div className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
          <span className={`text-xs ${connected ? 'text-emerald-400' : 'text-red-400'}`}>
            {connected ? 'Backend Connected' : 'Connecting to :8000...'}
          </span>
        </div>

      </div>

      {/* ── KPI Telemetry Bar ───────────────────────────────── */}
      <KpiBar metrics={state.metrics} />

      {/* ── Main Layout ─────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden min-h-0">

        {/* LEFT + CENTER: Maps + Simulator stacked */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden p-3 gap-3">

          {/* Dual maps — side by side, fills available height */}
          <div className="flex-1 min-h-0">
            <DualMaps
              reports={state.reports}
              baselineNodes={state.baseline_nodes}
              onSelectReport={setSelectedReport}
            />
          </div>

          {/* Simulator bar — horizontal, pinned to bottom */}
          <div className="shrink-0 bg-slate-900/60 border border-slate-800 rounded-lg p-3">
            <SimulatorPanel
              loading={loading}
              onRun={runScenario}
              onReset={handleReset}
              onCustom={() => setShowCustom(true)}
              onAutoDemo={runAutoDemo}
            />
          </div>
        </div>

        {/* RIGHT: Firehose + X-Ray ─────────────────────────── */}
        <div className="w-80 shrink-0 flex flex-col overflow-hidden border-l border-slate-800">
          <div className="flex-1 min-h-0 overflow-hidden">
            <Firehose
              reports={state.reports}
              selectedId={selectedReport?.report_id}
              onSelect={setSelectedReport}
            />
          </div>
          {selectedReport && (
            <div className="shrink-0 border-t border-slate-800 p-2 overflow-y-auto max-h-[45%]">
              <XRayInspector
                report={selectedReport}
                onDismiss={() => setSelectedReport(null)}
              />
            </div>
          )}
        </div>

      </div>

      {/* ── Custom Report Modal — z-[9999] sits above maps ── */}
      {showCustom && (
        <div className="fixed inset-0 z-[9999]">
          <CustomReportModal
            onSubmit={submitCustom}
            onClose={() => setShowCustom(false)}
          />
        </div>
      )}

      {/* ── Benchmark Modal ────────────────────────────────── */}
      {showBenchmark && (
        <BenchmarkModal onClose={() => setShowBenchmark(false)} />
      )}

      {/* ── Use Cases Modal ───────────────────────────────── */}
      {showUseCases && (
        <UseCasesModal onClose={() => setShowUseCases(false)} />
      )}
    </div>
  )
}

