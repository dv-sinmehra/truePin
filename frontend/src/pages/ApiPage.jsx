// ApiPage.jsx — REST API integration reference page
import React, { useState } from 'react'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const REAL_SNIPPET = `POST ${API_BASE}/api/report
Content-Type: application/json

{
  "user_id": "demo_user_001",
  "account_age_days": 180,
  "lat": 28.6315,
  "lng": 77.2167,
  "asn_type": "MOBILE_ISP",
  "kinematic_variance": 1.8,
  "has_gps_breadcrumbs": true,
  "approach_speed_kmh": 5.2,
  "is_ground_truth_fake": false
}

// Response:
{
  "verdict": "VERIFIED",
  "final_score": 87.3,
  "l1_score": 45.0,
  "l2_penalty": 0.0,
  "l3_penalty": 0.0,
  "l4_penalty": 0.0,
  "l5_boost": 28.0,
  "trust_score_after": 68.0,
  "layer_log": [
    "L1: Mobile/Campus ASN +25",
    "L1: Valid phone kinematics +20",
    "L5: Solo Proof-of-Presence Boost +28",
    "L5: Final Score=87.3 → VERIFIED"
  ]
}`

const CURL_SNIPPET = `curl -X POST ${API_BASE}/api/report \\
  -H "Content-Type: application/json" \\
  -d '{
    "user_id": "demo_user_001",
    "account_age_days": 180,
    "lat": 28.6315,
    "lng": 77.2167,
    "asn_type": "MOBILE_ISP",
    "kinematic_variance": 1.8,
    "has_gps_breadcrumbs": true,
    "approach_speed_kmh": 5.2,
    "is_ground_truth_fake": false
  }'`

const ENDPOINTS = [
  { method: 'POST', path: '/api/report', desc: 'Submit a report through the 5-layer pipeline. Returns full verdict + layer scores.' },
  { method: 'GET',  path: '/api/state', desc: 'Get all active reports, live metrics, baseline nodes, and trust graph snapshot.' },
  { method: 'POST', path: '/api/simulate/{scenario}', desc: 'Run an adversarial scenario. Options: solo_alley_sos, campus_wifi_surge, vps_jitter_raid, slow_drip_sleeper, zero_day_drift' },
  { method: 'POST', path: '/api/reset', desc: 'Clear all reports and reset system state.' },
  { method: 'GET',  path: '/api/osm/fetch-live', desc: 'Fetch live OpenStreetMap civic nodes (police stations, metro gates) in Central Delhi.' },
  { method: 'POST', path: '/api/benchmark/run', desc: 'Run the 1,200-row Delhi benchmark dataset through the pipeline. Returns confusion matrix and metrics.' },
  { method: 'POST', path: '/api/benchmark/upload-csv', desc: 'Upload a custom CSV (needs lat, lng columns) and run the pipeline on it.' },
  { method: 'GET',  path: '/api/benchmark/download-csv', desc: 'Download the 1,200-row benchmark CSV.' },
  { method: 'GET',  path: '/api/health', desc: 'Health check — returns server status and number of reports in memory.' },
]

const METHOD_COLORS = {
  GET: 'bg-blue-900 text-blue-300 border-blue-700',
  POST: 'bg-emerald-900 text-emerald-300 border-emerald-700',
}

export default function ApiPage() {
  const [copiedJson, setCopiedJson] = useState(false)
  const [copiedCurl, setCopiedCurl] = useState(false)
  const [liveResult, setLiveResult] = useState(null)
  const [testing, setTesting] = useState(false)

  const copy = (text, setter) => {
    navigator.clipboard.writeText(text).then(() => {
      setter(true)
      setTimeout(() => setter(false), 2000)
    })
  }

  const testLive = async () => {
    setTesting(true); setLiveResult(null)
    try {
      const res = await fetch(`${API_BASE}/api/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: 'api_demo_user',
          account_age_days: 180,
          lat: 28.6315,
          lng: 77.2167,
          asn_type: 'MOBILE_ISP',
          kinematic_variance: 1.8,
          has_gps_breadcrumbs: true,
          approach_speed_kmh: 5.2,
          is_ground_truth_fake: false,
        }),
      })
      const data = await res.json()
      setLiveResult(data)
    } catch (e) {
      setLiveResult({ error: e.message })
    }
    setTesting(false)
  }

  return (
    <div className="h-full overflow-y-auto p-5 max-w-4xl space-y-5">

      {/* Header */}
      <div>
        <div className="text-base font-bold text-white">🔌 REST API Reference</div>
        <div className="text-xs text-slate-400 mt-0.5">
          The truePin backend runs at <code className="text-violet-300 bg-violet-950 px-1 rounded">{API_BASE}</code> — all endpoints below are <strong>live and working</strong> right now.
        </div>
      </div>

      {/* Main endpoint snippet */}
      <div className="bg-slate-800 border border-slate-600 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-sm font-bold text-white">Core Endpoint — Submit &amp; Verify a Report</div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              This endpoint is <span className="text-emerald-400 font-semibold">live and working</span>.
              Click "Test Live" to send a real request to your backend right now.
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={testLive}
              disabled={testing}
              className="text-xs bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg font-semibold transition"
            >
              {testing ? '⏳ Sending...' : '▶ Test Live'}
            </button>
            <button
              onClick={() => copy(REAL_SNIPPET, setCopiedJson)}
              className="text-xs bg-violet-700 hover:bg-violet-600 text-white px-3 py-1.5 rounded-lg font-semibold transition"
            >
              {copiedJson ? '✅ Copied!' : '📋 Copy JSON'}
            </button>
          </div>
        </div>
        <pre className="text-[11px] text-emerald-300 bg-slate-950 rounded-lg p-4 overflow-x-auto whitespace-pre leading-relaxed font-mono border border-slate-700">
{REAL_SNIPPET}
        </pre>
      </div>

      {/* Live test result */}
      {liveResult && (
        <div className={`border rounded-xl p-4 ${liveResult.error ? 'border-red-700 bg-red-950/30' : 'border-emerald-700 bg-emerald-950/30'}`}>
          <div className={`text-xs font-bold mb-2 ${liveResult.error ? 'text-red-400' : 'text-emerald-400'}`}>
            {liveResult.error ? '❌ Request Failed' : `✅ Live Response — Verdict: ${liveResult.verdict} · Score: ${liveResult.final_score}`}
          </div>
          <pre className="text-[10px] text-slate-300 bg-slate-950 rounded-lg p-3 overflow-x-auto whitespace-pre font-mono border border-slate-700">
{JSON.stringify(liveResult, null, 2)}
          </pre>
        </div>
      )}

      {/* cURL snippet */}
      <div className="bg-slate-800 border border-slate-600 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-bold text-white">cURL Equivalent</div>
          <button
            onClick={() => copy(CURL_SNIPPET, setCopiedCurl)}
            className="text-xs bg-slate-600 hover:bg-slate-500 text-white px-3 py-1.5 rounded-lg font-semibold transition"
          >
            {copiedCurl ? '✅ Copied!' : '📋 Copy'}
          </button>
        </div>
        <pre className="text-[11px] text-yellow-300 bg-slate-950 rounded-lg p-4 overflow-x-auto whitespace-pre leading-relaxed font-mono border border-slate-700">
{CURL_SNIPPET}
        </pre>
      </div>

      {/* All endpoints */}
      <div>
        <div className="text-xs font-bold text-slate-300 mb-3">All Available Endpoints</div>
        <div className="space-y-1.5">
          {ENDPOINTS.map(ep => (
            <div key={ep.path} className="flex items-start gap-3 bg-slate-900/60 border border-slate-800 rounded-lg px-3 py-2.5">
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border shrink-0 mt-0.5 ${METHOD_COLORS[ep.method]}`}>
                {ep.method}
              </span>
              <span className="font-mono text-[10px] text-violet-300 shrink-0">{API_BASE}{ep.path}</span>
              <span className="text-[10px] text-slate-500">{ep.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Fields reference */}
      <div>
        <div className="text-xs font-bold text-slate-300 mb-3">Request Fields Reference</div>
        <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden">
          <table className="w-full text-[10px]">
            <thead>
              <tr className="border-b border-slate-700 bg-slate-800/60">
                <th className="text-left text-slate-400 px-3 py-2">Field</th>
                <th className="text-left text-slate-400 px-3 py-2">Type</th>
                <th className="text-left text-slate-400 px-3 py-2">Valid Values</th>
                <th className="text-left text-slate-400 px-3 py-2">Purpose</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {[
                { f: 'lat / lng', t: 'float', v: 'Any GPS coordinate', p: 'Location of the report' },
                { f: 'asn_type', t: 'string', v: 'MOBILE_ISP · CAMPUS_WIFI · DATACENTER_VPS', p: 'Internet source type — L1 filter' },
                { f: 'kinematic_variance', t: 'float', v: '0.0 – 4.5 (human) · 0.0 = bot', p: 'Phone motion sensor variance — L1 kinematics' },
                { f: 'has_gps_breadcrumbs', t: 'bool', v: 'true / false', p: 'Whether phone logged a GPS trail before submission' },
                { f: 'approach_speed_kmh', t: 'float', v: '0 – 60 km/h (human) · >60 = anomaly', p: 'Speed of approach — L4 IsolationForest' },
                { f: 'account_age_days', t: 'int', v: '0 = brand new · 730 = 2-year-old account', p: 'Account maturity — L3 Trust Graph' },
                { f: 'is_ground_truth_fake', t: 'bool', v: 'true / false', p: 'For benchmark/testing only — label the actual truth' },
              ].map(row => (
                <tr key={row.f} className="hover:bg-slate-800/30">
                  <td className="px-3 py-2 font-mono text-violet-300 font-semibold">{row.f}</td>
                  <td className="px-3 py-2 text-blue-300">{row.t}</td>
                  <td className="px-3 py-2 text-slate-400">{row.v}</td>
                  <td className="px-3 py-2 text-slate-500">{row.p}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="h-4" />
    </div>
  )
}
