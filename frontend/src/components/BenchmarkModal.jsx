// BenchmarkModal.jsx — Real Dataset Reliability Benchmark Panel
import React, { useState } from 'react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function BenchmarkModal({ onClose }) {
  const [results, setResults] = useState(null)
  const [osmNodes, setOsmNodes] = useState(null)
  const [running, setRunning] = useState(false)
  const [fetchingOsm, setFetchingOsm] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)

  const runBenchmark = async () => {
    setRunning(true); setError(null)
    try {
      const res = await fetch(`${API}/api/benchmark/run`, { method: 'POST' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setResults(await res.json())
    } catch (e) { setError(`Benchmark failed: ${e.message}`) }
    finally { setRunning(false) }
  }

  const fetchOsm = async () => {
    setFetchingOsm(true); setError(null)
    try {
      const res = await fetch(`${API}/api/osm/fetch-live`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setOsmNodes(await res.json())
    } catch (e) { setError(`OSM fetch failed: ${e.message}`) }
    finally { setFetchingOsm(false) }
  }

  const handleUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true); setError(null)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch(`${API}/api/benchmark/upload-csv`, { method: 'POST', body: form })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setResults(await res.json())
    } catch (e) { setError(`Upload failed: ${e.message}`) }
    finally { setUploading(false) }
  }

  const downloadCsv = () => {
    window.open(`${API}/api/benchmark/download-csv`, '_blank')
  }

  const m = results?.metrics || {}
  const cm = results?.confusion_matrix || {}
  const fa = results?.failure_analysis || {}

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-violet-800 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 sticky top-0 bg-slate-900 z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-white">📊 Dataset Reliability Benchmark</span>
              <span className="text-[9px] font-semibold bg-yellow-500 text-black px-1.5 py-0.5 rounded animate-pulse">★ Mentor Feedback Added</span>
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              OpenStreetMap Overpass API + Kaggle Delhi Crime Coordinates — N = 1,200 rows
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl font-bold leading-none">×</button>
        </div>

        <div className="p-4 space-y-4">

          {/* Data sources */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-slate-800 rounded-lg p-3 border border-slate-700">
              <div className="text-violet-400 font-semibold mb-1">🌐 Source 1</div>
              <div className="text-white font-medium">OpenStreetMap Overpass API</div>
              <div className="text-slate-400">Live Delhi police & metro nodes (bounding box 28.61–28.66 N, 77.19–77.24 E)</div>
            </div>
            <div className="bg-slate-800 rounded-lg p-3 border border-slate-700">
              <div className="text-violet-400 font-semibold mb-1">📂 Source 2</div>
              <div className="text-white font-medium">Kaggle Delhi Crime Hotspot CSV</div>
              <div className="text-slate-400">8 hotspots · 5 ASN providers · 1,200 rows with realistic noise & edge cases</div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={runBenchmark}
              disabled={running}
              className="flex items-center gap-1.5 bg-violet-700 hover:bg-violet-600 disabled:opacity-50 text-white text-xs font-semibold px-3 py-2 rounded-lg transition"
            >
              {running ? '⏳ Running...' : '▶ Run 1,200-Row Benchmark'}
            </button>
            <button
              onClick={fetchOsm}
              disabled={fetchingOsm}
              className="flex items-center gap-1.5 bg-blue-700 hover:bg-blue-600 disabled:opacity-50 text-white text-xs font-semibold px-3 py-2 rounded-lg transition"
            >
              {fetchingOsm ? '⏳ Fetching...' : '🌐 Fetch Live OSM Delhi Nodes'}
            </button>
            <label className={`flex items-center gap-1.5 ${uploading ? 'opacity-50' : 'cursor-pointer hover:bg-emerald-600'} bg-emerald-700 text-white text-xs font-semibold px-3 py-2 rounded-lg transition`}>
              {uploading ? '⏳ Processing...' : '📁 Upload External Kaggle CSV'}
              <input type="file" accept=".csv" className="hidden" onChange={handleUpload} disabled={uploading} />
            </label>
            <button
              onClick={downloadCsv}
              className="flex items-center gap-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold px-3 py-2 rounded-lg transition"
            >
              ⬇ Download CSV
            </button>
          </div>

          {/* Error */}
          {error && <div className="text-red-400 text-xs bg-red-950 border border-red-800 rounded p-2">{error}</div>}

          {/* OSM nodes result */}
          {osmNodes && (
            <div className="bg-slate-800 border border-blue-800 rounded-lg p-3 text-xs">
              <div className="text-blue-400 font-semibold mb-1">🌐 OSM Live Result — {osmNodes.source === 'openstreetmap' ? '✅ Live Data' : '⚠ Fallback Data'}</div>
              <div className="text-white">Fetched <span className="font-bold text-blue-300">{osmNodes.count}</span> civic nodes from Central Delhi</div>
              {osmNodes.fallback_reason && <div className="text-yellow-400 mt-1">Reason: {osmNodes.fallback_reason}</div>}
              <div className="mt-2 space-y-1 max-h-24 overflow-y-auto">
                {osmNodes.nodes?.slice(0, 5).map((n, i) => (
                  <div key={i} className="text-slate-400">{n.tags?.name || n.tags?.amenity || n.tags?.railway || 'Node'} — {n.lat?.toFixed(4)}, {n.lng?.toFixed(4)}</div>
                ))}
                {osmNodes.nodes?.length > 5 && <div className="text-slate-500">...and {osmNodes.nodes.length - 5} more</div>}
              </div>
            </div>
          )}

          {/* Benchmark results */}
          {results && (
            <div className="space-y-4">
              <div className="text-xs text-slate-400">
                ✅ Processed <span className="text-white font-bold">{results.total_rows_processed}</span> rows · Source: {results.dataset_source}
              </div>

              {/* Confusion Matrix */}
              <div>
                <div className="text-xs font-semibold text-slate-300 mb-2">2×2 Confusion Matrix</div>
                <div className="grid grid-cols-2 gap-1.5">
                  <div className="bg-emerald-950 border border-emerald-700 rounded-lg p-3 text-center">
                    <div className="text-emerald-400 text-xs font-semibold">TP — Fakes Caught</div>
                    <div className="text-3xl font-bold text-emerald-300 mt-1">{cm.tp ?? '—'}</div>
                    <div className="text-slate-400 text-[10px] mt-0.5">Correctly QUARANTINED fakes</div>
                  </div>
                  <div className="bg-red-950 border border-red-800 rounded-lg p-3 text-center">
                    <div className="text-red-400 text-xs font-semibold">FP — Real Users Suppressed</div>
                    <div className="text-3xl font-bold text-red-300 mt-1">{cm.fp ?? '—'}</div>
                    <div className="text-slate-400 text-[10px] mt-0.5">Genuine reports QUARANTINED</div>
                  </div>
                  <div className="bg-slate-800 border border-slate-600 rounded-lg p-3 text-center">
                    <div className="text-slate-300 text-xs font-semibold">TN — Genuine Passed</div>
                    <div className="text-3xl font-bold text-slate-200 mt-1">{cm.tn ?? '—'}</div>
                    <div className="text-slate-400 text-[10px] mt-0.5">Real reports correctly passed</div>
                  </div>
                  <div className="bg-orange-950 border border-orange-800 rounded-lg p-3 text-center">
                    <div className="text-orange-400 text-xs font-semibold">FN — Fakes Slipped Through</div>
                    <div className="text-3xl font-bold text-orange-300 mt-1">{cm.fn ?? '—'}</div>
                    <div className="text-slate-400 text-[10px] mt-0.5">SIM-farm attacks evaded pipeline</div>
                  </div>
                </div>
              </div>

              {/* Metrics */}
              <div>
                <div className="text-xs font-semibold text-slate-300 mb-2">Performance Metrics</div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Precision', val: m.precision_pct, unit: '%', color: 'text-violet-300' },
                    { label: 'Recall / Fake Detection', val: m.recall_fake_detection_pct, unit: '%', color: 'text-emerald-300' },
                    { label: 'False Suppression Rate', val: m.false_suppression_rate_pct, unit: '%', color: 'text-red-300' },
                    { label: 'F1-Score', val: m.f1_score_pct, unit: '%', color: 'text-blue-300' },
                    { label: 'Map Accuracy Before', val: m.map_accuracy_before_pct, unit: '%', color: 'text-orange-300' },
                    { label: 'Map Accuracy After', val: m.map_accuracy_after_pct, unit: '%', color: 'text-emerald-300' },
                  ].map(({ label, val, unit, color }) => (
                    <div key={label} className="bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-center">
                      <div className="text-slate-400 text-[10px] mb-0.5">{label}</div>
                      <div className={`text-xl font-bold ${color}`}>{val ?? '—'}{unit}</div>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div className="bg-slate-800 border border-slate-700 rounded-lg p-2 text-center text-xs">
                    <span className="text-slate-400">RMSE Before: </span>
                    <span className="text-orange-300 font-bold">{m.rmse_before ?? '—'}</span>
                    <span className="text-slate-400"> → After: </span>
                    <span className="text-emerald-300 font-bold">{m.rmse_after ?? '—'}</span>
                  </div>
                </div>
              </div>

              {/* Failure Analysis */}
              <div className="bg-slate-800 border border-yellow-800 rounded-lg p-3">
                <div className="text-yellow-400 text-xs font-bold mb-2">⚠ Honest Failure-Mode & Edge-Case Audit</div>

                {fa.false_positives_sample?.length > 0 && (
                  <div className="mb-3">
                    <div className="text-red-400 text-xs font-semibold mb-1">🔴 False Positive Samples — Genuine users suppressed (VPN + dead GPS indoors)</div>
                    {fa.false_positives_sample.map((s, i) => (
                      <div key={i} className="text-slate-400 text-[10px] bg-slate-900 rounded p-2 mb-1">
                        <span className="text-white font-mono">{s.report_id}</span> · {s.hotspot} · ASN: {s.asn_type} · kv={s.kinematic_variance} · GPS={String(s.has_gps_breadcrumbs)} · Score={s.final_score} → {s.verdict}
                        <div className="text-yellow-400 mt-0.5">Reason: {s.reason}</div>
                      </div>
                    ))}
                  </div>
                )}

                {fa.false_negatives_sample?.length > 0 && (
                  <div>
                    <div className="text-orange-400 text-xs font-semibold mb-1">🟠 False Negative Samples — SIM-farm fakes that slipped through</div>
                    {fa.false_negatives_sample.map((s, i) => (
                      <div key={i} className="text-slate-400 text-[10px] bg-slate-900 rounded p-2 mb-1">
                        <span className="text-white font-mono">{s.report_id}</span> · {s.hotspot} · ASN: {s.asn_type} · kv={s.kinematic_variance} · GPS={String(s.has_gps_breadcrumbs)} · Score={s.final_score} → {s.verdict}
                        <div className="text-yellow-400 mt-0.5">Reason: {s.reason}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  )
}
