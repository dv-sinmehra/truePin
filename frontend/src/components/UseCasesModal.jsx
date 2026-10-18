// UseCasesModal.jsx — Real-World B2B API Use Cases Showcase
import React, { useState } from 'react'

const API_SNIPPET = `POST https://api.truepin.in/v1/verify-report
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json

{
  "lat": 28.6315,
  "lng": 77.2167,
  "asn_type": "MOBILE_ISP",
  "kinematic_variance": 1.8,
  "has_gps_breadcrumbs": true,
  "account_age_days": 180
}

// Response: { "verdict": "VERIFIED", "final_score": 87.3, "layer_log": [...] }`

const USE_CASES = [
  {
    icon: '🗺️',
    title: 'B2B Middleware API for Safety & Navigation Apps',
    partners: 'Safetipin · Google Maps Well-Lit Routing · Campus SOS Apps',
    color: 'border-violet-700 bg-violet-950/30',
    badgeColor: 'bg-violet-800 text-violet-200',
    badge: 'Safety Apps',
    description: 'Any navigation or women-safety app integrates truePin as a REST middleware. Before displaying a user-submitted "safe" or "unsafe" pin on their map, the app passes it through the truePin API. Fake "Safe" pins planted by stalkers to mask dark alleys — e.g. flooding Hauz Khas market with fake SAFE reports — are quarantined before they ever appear on user maps.',
    attack: '🔴 Attack Stopped: Stalker plants 50 fake "SAFE" pins around a dark alley to lure victims → truePin catches coordinated VPS jitter raid (L2 DBSCAN) and quarantines all 50 before display.',
    flow: ['App receives user pin submission', 'Calls POST /v1/verify-report', 'truePin returns VERIFIED / QUARANTINED', 'App shows or suppresses the pin'],
  },
  {
    icon: '🚔',
    title: 'Police & Dial-112 / Himmat Plus Command Centers',
    partners: 'Delhi Police PCR · Himmat Plus · Suraksha App · Dial 112',
    color: 'border-blue-700 bg-blue-950/30',
    badgeColor: 'bg-blue-800 text-blue-200',
    badge: 'Law Enforcement',
    description: 'Police command dashboards integrate truePin to triage incoming SOS and incident reports in real time. Coordinated fake SOS bursts — used by criminal gangs to flood Sector A with fake emergency alerts and divert police patrol vans away from Sector B where the real crime is happening — are identified as QUARANTINED before PCR dispatch.',
    attack: '🔴 Attack Stopped: Gang floods 20 fake SOS pins in Sector A (Connaught Place) to divert PCR away from Sector B (Kamla Nagar) → truePin detects Trust Divergence + Sybil Raid (L3+L2) and flags the entire burst QUARANTINED.',
    flow: ['PCR officer sees 20 SOS alerts', 'Dashboard checks truePin verdict', '18 QUARANTINED (coordinated bot raid)', '2 VERIFIED SOS get real police response'],
  },
  {
    icon: '🏪',
    title: 'Hyperlocal Business Anti-Extortion Shield',
    partners: 'Zomato · Swiggy · Google My Business · Girls\' Hostel Associations',
    color: 'border-emerald-700 bg-emerald-950/30',
    badgeColor: 'bg-emerald-800 text-emerald-200',
    badge: 'Business Protection',
    description: 'Competitors and extortionists spam fake harassment or unsafe pins outside a rival cafe, restaurant, or girls\' hostel. This tanks the establishment\'s reputation on hyperlocal safety maps. truePin\'s Sleeper-Bot Burn layer (L3 Asymmetric Bayesian Trust Graph) identifies accounts specifically aged to target one location and burns their trust to zero permanently.',
    attack: '🔴 Attack Stopped: Competitor pays a click-farm to post 30 "UNSAFE" pins outside rival cafe in Saket → truePin detects Target Trust Divergence (avg account_age < 3 days targeting single lat/lng) and quarantines all 30.',
    flow: ['30 "unsafe" pins submitted near cafe', 'truePin runs L3 Trust Divergence check', 'avg_age=1.2 days → QUARANTINED all 30', 'Cafe reputation protected, trust burned'],
  },
]

export default function UseCasesModal({ onClose }) {
  const [copied, setCopied] = useState(false)

  const copySnippet = () => {
    navigator.clipboard.writeText(API_SNIPPET).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-violet-800 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 sticky top-0 bg-slate-900 z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-white">🔌 Real-World Use Cases & API</span>
              <span className="text-[9px] font-semibold bg-yellow-500 text-black px-1.5 py-0.5 rounded animate-pulse">★ Mentor Feedback Added</span>
            </div>
            <div className="text-xs text-slate-400 mt-0.5">Where is truePin deployed? B2B integration architecture & REST API</div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl font-bold leading-none">×</button>
        </div>

        <div className="p-4 space-y-4">

          {/* Use case cards */}
          {USE_CASES.map((uc, i) => (
            <div key={i} className={`border rounded-xl p-4 ${uc.color}`}>
              <div className="flex items-start gap-3">
                <span className="text-2xl mt-0.5">{uc.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <div className="text-white font-bold text-sm">Use Case {i + 1}: {uc.title}</div>
                    <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${uc.badgeColor}`}>{uc.badge}</span>
                  </div>
                  <div className="text-slate-400 text-[10px] mb-2 font-medium">{uc.partners}</div>
                  <div className="text-slate-300 text-xs leading-relaxed mb-3">{uc.description}</div>

                  {/* Flow */}
                  <div className="flex items-center gap-1 flex-wrap mb-3">
                    {uc.flow.map((step, j) => (
                      <React.Fragment key={j}>
                        <span className="text-[10px] bg-slate-800 border border-slate-600 rounded px-1.5 py-0.5 text-slate-300">{step}</span>
                        {j < uc.flow.length - 1 && <span className="text-slate-500 text-[10px]">→</span>}
                      </React.Fragment>
                    ))}
                  </div>

                  {/* Attack scenario */}
                  <div className="bg-slate-900/60 border border-red-900 rounded-lg p-2 text-[10px] text-slate-400">
                    {uc.attack}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* REST API Snippet */}
          <div className="bg-slate-800 border border-slate-600 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-white text-sm font-bold">⚡ REST API Integration — Any App in 5 Minutes</div>
                <div className="text-slate-400 text-[10px] mt-0.5">Copy this snippet and replace YOUR_API_KEY — production endpoint ready</div>
              </div>
              <button
                onClick={copySnippet}
                className="text-xs bg-violet-700 hover:bg-violet-600 text-white px-3 py-1.5 rounded-lg font-semibold transition"
              >
                {copied ? '✅ Copied!' : '📋 Copy'}
              </button>
            </div>
            <pre className="text-[10px] text-emerald-300 bg-slate-950 rounded-lg p-3 overflow-x-auto whitespace-pre leading-relaxed font-mono border border-slate-700">
{API_SNIPPET}
            </pre>
          </div>

          {/* Architecture note */}
          <div className="bg-slate-800 border border-yellow-800/50 rounded-lg p-3 text-xs text-slate-300">
            <span className="text-yellow-400 font-semibold">💡 Architecture Note: </span>
            truePin runs as a stateless microservice. Each app gets an API key. The 5-layer pipeline processes each report in &lt;50ms. No user PII is stored — only anonymised telemetry hashes. Fully GDPR-compatible.
          </div>

        </div>
      </div>
    </div>
  )
}
