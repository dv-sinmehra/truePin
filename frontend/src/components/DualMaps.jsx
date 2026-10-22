// DualMaps.jsx — Side-by-side Leaflet maps: BEFORE (unfiltered) and AFTER (truePin clean)
import React from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import L from 'leaflet'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// Google Maps standard street tiles — vibrant, familiar, no API key for tile access
const TILE_URL  = 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}'
const TILE_ATTR = '&copy; Google Maps'
const CENTER    = [28.6315, 77.2167]
const ZOOM      = 14

// Fill + white border so markers pop on Google's colourful basemap
const MARKER_STYLE = {
  VERIFIED:          { fill: '#10b981', border: '#ffffff' },
  MANUALLY_RELEASED: { fill: '#3b82f6', border: '#ffffff' },  // blue for human-released
  SOFT_ALERT:        { fill: '#f59e0b', border: '#ffffff' },
  QUARANTINED:       { fill: '#ef4444', border: '#1e293b' },
  BASELINE:          { fill: '#3b82f6', border: '#ffffff' },
}

function ReportMarker({ report, onClick }) {
  const isManuallyReleased = report.manually_released === true
  const styleKey = isManuallyReleased ? 'MANUALLY_RELEASED' : (MARKER_STYLE[report.verdict] ? report.verdict : 'QUARANTINED')
  const style = MARKER_STYLE[styleKey]
  return (
    <CircleMarker
      center={[report.lat, report.lng]}
      radius={isManuallyReleased ? 11 : (report.verdict === 'QUARANTINED' ? 7 : 9)}
      pathOptions={{
        fillColor:    style.fill,
        fillOpacity:  0.92,
        color:        isManuallyReleased ? '#93c5fd' : style.border,
        weight:       isManuallyReleased ? 3.5 : 2.5,
        dashArray:    report.verdict === 'SOFT_ALERT' ? '5 3' : undefined,
      }}
      eventHandlers={{ click: () => onClick && onClick(report) }}
    >
      <Popup>
        <div style={{ fontSize: 11, color: '#1e293b' }}>
          {isManuallyReleased && (
            <div style={{ background: '#1d4ed8', color: '#fff', padding: '2px 6px', borderRadius: 4, marginBottom: 4, fontWeight: 'bold' }}>
              ✋ MANUALLY RELEASED
            </div>
          )}
          <strong>{report.verdict}</strong> · Score: {report.final_score}<br />
          {report.report_type}<br />{report.user_id.slice(0, 16)}<br />ASN: {report.asn_type}
          {isManuallyReleased && report.review_note && (
            <><br /><em style={{ color: '#1e40af' }}>Note: {report.review_note}</em></>
          )}
        </div>
      </Popup>
    </CircleMarker>
  )
}

function BaselineMarker({ node }) {
  const style = MARKER_STYLE.BASELINE
  return (
    <CircleMarker
      center={[node.lat, node.lng]}
      radius={11}
      pathOptions={{ fillColor: style.fill, fillOpacity: 0.9, color: style.border, weight: 2.5 }}
    >
      <Popup>
        <div style={{ fontSize: 11, color: '#1e293b' }}>
          🏛️ <strong>{node.label}</strong><br />Verified Safe Infrastructure
        </div>
      </Popup>
    </CircleMarker>
  )
}

export default function DualMaps({ reports, baselineNodes, onSelectReport }) {
  const verified         = reports.filter(r => r.verdict === 'VERIFIED' && !r.manually_released)
  const manuallyReleased = reports.filter(r => r.manually_released === true)
  const softAlert        = reports.filter(r => r.verdict === 'SOFT_ALERT')
  const quarantined      = reports.filter(r => r.verdict === 'QUARANTINED')
  const cleanReports     = [...verified, ...manuallyReleased, ...softAlert]

  return (
    <div className="grid grid-cols-2 gap-3 h-full">

      {/* ── BEFORE map ──────────────────────────────────── */}
      <div className="flex flex-col rounded-lg overflow-hidden border border-red-900/40">
        <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900 shrink-0">
          <span className="text-red-400 text-xs font-bold">⚠️ BEFORE: Unfiltered Poisoned Map</span>
          <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">
            Raw Stream: {reports.length + baselineNodes.length} pins
          </span>
        </div>
        <div className="flex-1 min-h-0">
          <MapContainer center={CENTER} zoom={ZOOM} style={{ height: '100%', width: '100%' }}>
            <TileLayer url={TILE_URL} attribution={TILE_ATTR} maxZoom={20} />
            {baselineNodes.map(n => <BaselineMarker key={n.id} node={n} />)}
            {reports.map(r => <ReportMarker key={r.report_id} report={r} onClick={onSelectReport} />)}
          </MapContainer>
        </div>
        <div className="flex gap-3 px-3 py-1 bg-slate-900 border-t border-slate-800 shrink-0">
          <span className="text-[10px] text-emerald-400">● {verified.length} Verified</span>
          <span className="text-[10px] text-yellow-400">● {softAlert.length} Soft Alert</span>
          <span className="text-[10px] text-red-400">● {quarantined.length} Blocked</span>
          <span className="text-[10px] text-blue-400">● {baselineNodes.length} Baseline</span>
        </div>
      </div>

      {/* ── AFTER map ───────────────────────────────────── */}
      <div className="flex flex-col rounded-lg overflow-hidden border border-emerald-900/40">
        <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900 shrink-0">
          <span className="text-emerald-400 text-xs font-bold">🛡️ AFTER: truePin-Protected Public Map</span>
          <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">
            truePin Filtered: {verified.length}V · {softAlert.length}S · {manuallyReleased.length} Released · {quarantined.length} Blocked
          </span>
        </div>
        <div className="flex-1 min-h-0">
          <MapContainer center={CENTER} zoom={ZOOM} style={{ height: '100%', width: '100%' }}>
            <TileLayer url={TILE_URL} attribution={TILE_ATTR} maxZoom={20} />
            {baselineNodes.map(n => <BaselineMarker key={n.id} node={n} />)}
            {cleanReports.map(r => <ReportMarker key={r.report_id} report={r} onClick={onSelectReport} />)}
          </MapContainer>
        </div>
        <div className="flex gap-3 px-3 py-1 bg-slate-900 border-t border-slate-800 shrink-0">
          <span className="text-[10px] text-emerald-400">● {verified.length} Verified</span>
          <span className="text-[10px] text-yellow-400">● {softAlert.length} Soft Alert</span>
          <span className="text-[10px] text-red-500 line-through opacity-50">● {quarantined.length} Blocked (hidden)</span>
          {manuallyReleased.length > 0 && (
            <span className="text-[10px] text-blue-400 font-semibold">● {manuallyReleased.length} ✋ Manually Released</span>
          )}
          <span className="text-[10px] text-blue-400">● {baselineNodes.length} Baseline</span>
        </div>
      </div>

    </div>
  )
}
