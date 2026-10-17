// CustomReportModal.jsx — Slider-based custom report form for judges
import React, { useState } from 'react'

const ASN_OPTIONS = ['MOBILE_ISP', 'CAMPUS_WIFI', 'DATACENTER_VPS']

export default function CustomReportModal({ onSubmit, onClose }) {
  const [form, setForm] = useState({
    account_age_days: 90,
    kinematic_variance: 1.5,
    asn_type: 'MOBILE_ISP',
    lat: 28.6315,
    lng: 77.2167,
    has_gps_breadcrumbs: true,
    approach_speed_kmh: 5,
    report_type: 'UNSAFE_HARASSMENT',
  })

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }))

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-slate-200">⚙️ Custom Report Builder</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white text-xl cursor-pointer">×</button>
        </div>

        <div className="space-y-4">
          {/* ASN Type */}
          <div>
            <label className="text-xs text-slate-400 font-semibold">ASN Type</label>
            <div className="flex gap-2 mt-1">
              {ASN_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  onClick={() => set('asn_type', opt)}
                  className={`flex-1 text-xs rounded py-1.5 border transition-colors cursor-pointer ${
                    form.asn_type === opt
                      ? 'bg-violet-700 border-violet-500 text-white'
                      : 'bg-slate-800 border-slate-600 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  {opt.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Account Age */}
          <div>
            <label className="text-xs text-slate-400 font-semibold flex justify-between">
              Account Age <span className="text-violet-400">{form.account_age_days} days</span>
            </label>
            <input type="range" min="0" max="730" value={form.account_age_days}
              onChange={(e) => set('account_age_days', +e.target.value)}
              className="w-full accent-violet-500 mt-1" />
          </div>

          {/* Kinematic Variance */}
          <div>
            <label className="text-xs text-slate-400 font-semibold flex justify-between">
              Kinematic Variance (m/s²) <span className="text-violet-400">{form.kinematic_variance.toFixed(1)}</span>
            </label>
            <input type="range" min="0" max="5" step="0.1" value={form.kinematic_variance}
              onChange={(e) => set('kinematic_variance', +e.target.value)}
              className="w-full accent-violet-500 mt-1" />
            <div className="text-[10px] text-slate-600 mt-0.5">0.0 = bot flatline · 0.3–4.5 = real walking human</div>
          </div>

          {/* Approach Speed */}
          <div>
            <label className="text-xs text-slate-400 font-semibold flex justify-between">
              Approach Speed (km/h) <span className="text-violet-400">{form.approach_speed_kmh}</span>
            </label>
            <input type="range" min="0" max="250" value={form.approach_speed_kmh}
              onChange={(e) => set('approach_speed_kmh', +e.target.value)}
              className="w-full accent-violet-500 mt-1" />
            <div className="text-[10px] text-slate-600 mt-0.5">3–40 = human · &gt;150 = anomaly spoofer</div>
          </div>

          {/* GPS Breadcrumbs toggle */}
          <div className="flex items-center justify-between">
            <label className="text-xs text-slate-400 font-semibold">GPS Breadcrumbs</label>
            <button
              onClick={() => set('has_gps_breadcrumbs', !form.has_gps_breadcrumbs)}
              className={`w-10 h-5 rounded-full transition-colors cursor-pointer relative ${
                form.has_gps_breadcrumbs ? 'bg-emerald-600' : 'bg-slate-600'
              }`}
            >
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${
                form.has_gps_breadcrumbs ? 'left-5' : 'left-0.5'
              }`} />
            </button>
          </div>

          {/* Lat/Lng */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs text-slate-400 font-semibold">Latitude</label>
              <input type="number" step="0.0001" value={form.lat}
                onChange={(e) => set('lat', +e.target.value)}
                className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs text-slate-200 mt-1 outline-none focus:border-violet-500" />
            </div>
            <div className="flex-1">
              <label className="text-xs text-slate-400 font-semibold">Longitude</label>
              <input type="number" step="0.0001" value={form.lng}
                onChange={(e) => set('lng', +e.target.value)}
                className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs text-slate-200 mt-1 outline-none focus:border-violet-500" />
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-5">
          <button onClick={onClose}
            className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm font-semibold rounded-lg py-2 cursor-pointer">
            Cancel
          </button>
          <button onClick={() => onSubmit(form)}
            className="flex-1 bg-violet-700 hover:bg-violet-600 text-white text-sm font-semibold rounded-lg py-2 cursor-pointer">
            Submit Report
          </button>
        </div>
      </div>
    </div>
  )
}
