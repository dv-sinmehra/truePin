// ReviewPage.jsx — ig-nite Round 2: False-Positive Review Queue
import React, { useState, useEffect, useCallback } from 'react'

const SOS_TYPES = new Set(['UNSAFE_HARASSMENT', 'CROWD_EMERGENCY', 'SOS'])

function VerdictBadge({ verdict, manuallyReleased, confirmedFake }) {
  if (manuallyReleased) return (
    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-blue-900 border border-blue-600 text-blue-300">
      ✋ MANUALLY RELEASED
    </span>
  )
  if (confirmedFake) return (
    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-red-950 border border-red-700 text-red-400">
      🚫 CONFIRMED FAKE
    </span>
  )
  if (verdict === 'QUARANTINED') return (
    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-red-900 border border-red-700 text-red-300">
      🔒 QUARANTINED
    </span>
  )
  if (verdict === 'SOFT_ALERT') return (
    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-yellow-900 border border-yellow-700 text-yellow-300">
      ⚠️ SOFT_ALERT
    </span>
  )
  return (
    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-900 border border-emerald-700 text-emerald-300">
      ✅ VERIFIED
    </span>
  )
}

function ReportCard({ report, onReview }) {
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showXray, setShowXray] = useState(false)
  const isSos = SOS_TYPES.has(report.report_type)

  const submit = async (decision) => {
    if (!note.trim()) { setError('A note is required before submitting.'); return }
    setLoading(true)
    setError(null)
    try {
      await onReview(report.report_id, decision, note.trim())
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`rounded-xl border p-4 space-y-3 ${
      isSos ? 'border-orange-700 bg-orange-950/30' : 'border-slate-700 bg-slate-900/60'
    }`}>
      {/* Header row */}
      <div className="flex items-center gap-2 flex-wrap">
        {isSos && (
          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-orange-900 border border-orange-600 text-orange-300 animate-pulse">
            🚨 SOS — PRIORITY
          </span>
        )}
        <VerdictBadge verdict={report.verdict} manuallyReleased={report.manually_released} confirmedFake={report.confirmed_fake} />
        <span className="text-[9px] font-mono text-slate-400">{report.report_id}</span>
        <span className="text-[9px] text-slate-500 ml-auto">Score: <span className={`font-bold ${report.final_score < 35 ? 'text-red-400' : 'text-yellow-400'}`}>{report.final_score}</span></span>
      </div>

      {/* Info row */}
      <div className="grid grid-cols-3 gap-2 text-[9px] text-slate-400">
        <div>📍 ({report.lat?.toFixed(4)}, {report.lng?.toFixed(4)})</div>
        <div>📶 {report.asn_type}</div>
        <div>📱 kv={report.kinematic_variance}</div>
        <div>👤 {report.user_id}</div>
        <div>🗓️ {report.account_age_days}d old</div>
        <div>📋 {report.report_type}</div>
      </div>

      {/* X-Ray toggle */}
      <button
        onClick={() => setShowXray(v => !v)}
        className="text-[9px] text-slate-500 hover:text-cyan-400 transition"
      >
        {showXray ? '▲ Hide' : '▼ Show'} X-Ray layer breakdown
      </button>
      {showXray && (
        <div className="bg-slate-950 border border-slate-800 rounded-lg p-2 space-y-0.5">
          {report.layer_log?.map((line, i) => (
            <div key={i} className="text-[9px] font-mono text-slate-400 leading-relaxed">
              <span className="text-slate-600 mr-1">{i + 1}.</span>{line}
            </div>
          ))}
        </div>
      )}

      {/* Score components */}
      <div className="flex gap-3 text-[9px] flex-wrap">
        <span className={report.l1_score > 0 ? 'text-emerald-400' : 'text-red-400'}>L1: {report.l1_score > 0 ? '+' : ''}{report.l1_score}</span>
        <span className={report.l2_penalty === 0 ? 'text-slate-500' : 'text-red-400'}>L2: {report.l2_penalty}</span>
        <span className={report.l3_penalty === 0 ? 'text-slate-500' : 'text-red-400'}>L3: {report.l3_penalty}</span>
        <span className={report.l4_penalty === 0 ? 'text-slate-500' : 'text-red-400'}>L4: {report.l4_penalty}</span>
        <span className="text-cyan-400">L5 boost: +{report.l5_boost}</span>
      </div>

      {/* Review controls */}
      <div className="space-y-2 pt-1 border-t border-slate-700">
        <div className="text-[9px] font-bold text-slate-300">Moderator Decision</div>
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Write a note explaining your decision (required)…"
          className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-[10px] text-slate-200 placeholder-slate-600 resize-none focus:outline-none focus:border-cyan-700"
          rows={2}
        />
        {error && (
          <div className="text-[9px] text-red-400 bg-red-950/30 border border-red-800 rounded-lg px-3 py-1.5">
            ❌ {error}
          </div>
        )}
        <div className="flex gap-2">
          <button
            onClick={() => submit('release')}
            disabled={loading}
            className="flex-1 py-1.5 rounded-lg bg-emerald-800 hover:bg-emerald-700 disabled:opacity-50 text-white text-[10px] font-bold transition"
          >
            {loading ? '…' : '✅ Release — Show on Clean Map'}
          </button>
          <button
            onClick={() => submit('confirm')}
            disabled={loading}
            className="flex-1 py-1.5 rounded-lg bg-red-900 hover:bg-red-800 disabled:opacity-50 text-white text-[10px] font-bold transition"
          >
            {loading ? '…' : '🚫 Confirm Fake — Keep Quarantined'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ReviewPage({ API }) {
  const [queue, setQueue] = useState([])
  const [log, setLog] = useState([])
  const [metrics, setMetrics] = useState({})
  const [loadingQueue, setLoadingQueue] = useState(false)
  const [activeTab, setActiveTab] = useState('queue')

  const fetchQueue = useCallback(async () => {
    setLoadingQueue(true)
    try {
      const [qRes, lRes, sRes] = await Promise.all([
        fetch(`${API}/api/review-queue`),
        fetch(`${API}/api/review-log`),
        fetch(`${API}/api/state`),
      ])
      const qData = await qRes.json()
      const lData = await lRes.json()
      const sData = await sRes.json()
      setQueue(qData.queue || [])
      setLog(lData.log || [])
      setMetrics(sData.metrics || {})
    } catch (e) {
      console.error('Review fetch error', e)
    } finally {
      setLoadingQueue(false)
    }
  }, [API])

  useEffect(() => {
    fetchQueue()
    const t = setInterval(fetchQueue, 3000)
    return () => clearInterval(t)
  }, [fetchQueue])

  const handleReview = async (reportId, decision, note) => {
    const res = await fetch(`${API}/api/review/${reportId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision, note }),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.detail || `Server error ${res.status}`)
    }
    await fetchQueue()
  }

  const sosPriority = queue.filter(r => SOS_TYPES.has(r.report_type))
  const others = queue.filter(r => !SOS_TYPES.has(r.report_type))

  return (
    <div className="h-full overflow-y-auto p-5 space-y-5 max-w-3xl">

      {/* Header */}
      <div>
        <div className="text-base font-bold text-white flex items-center gap-2">
          🔍 False-Positive Review Queue
          <span className="text-[10px] font-normal px-2 py-0.5 bg-orange-950 border border-orange-700 text-orange-300 rounded-full">
            Human Moderator Panel
          </span>
        </div>
        <div className="text-xs text-slate-400 mt-1">
          Review wrongly quarantined SOS reports. <span className="text-emerald-400 font-semibold">Release</span> recovers a real victim's pin onto the clean map.{' '}
          <span className="text-red-400 font-semibold">Confirm</span> permanently flags a fake. All decisions are logged in the audit trail.
        </div>
      </div>

      {/* Metric strip */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'In Queue', value: queue.length, color: 'text-yellow-400' },
          { label: 'SOS Priority', value: sosPriority.length, color: 'text-orange-400' },
          { label: 'Manual Overrides', value: metrics.manual_overrides ?? 0, color: 'text-blue-400' },
          { label: 'Fake Detection Rate', value: `${metrics.fake_detection_rate ?? 0}%`, color: 'text-emerald-400' },
        ].map(m => (
          <div key={m.label} className="bg-slate-900 border border-slate-700 rounded-xl p-3 text-center">
            <div className={`text-lg font-bold ${m.color}`}>{m.value}</div>
            <div className="text-[9px] text-slate-500 mt-0.5">{m.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {['queue', 'log'].map(t => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`text-xs font-semibold px-4 py-1.5 rounded-lg border transition ${
              activeTab === t
                ? 'bg-violet-900 border-violet-600 text-violet-200'
                : 'border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-500'
            }`}
          >
            {t === 'queue' ? `📋 Review Queue (${queue.length})` : `📜 Audit Log (${log.length})`}
          </button>
        ))}
        <button
          onClick={fetchQueue}
          disabled={loadingQueue}
          className="ml-auto text-[9px] px-3 py-1 rounded-lg border border-slate-700 text-slate-400 hover:text-slate-200 transition"
        >
          {loadingQueue ? '⟳ Refreshing…' : '↻ Refresh'}
        </button>
      </div>

      {/* Queue tab */}
      {activeTab === 'queue' && (
        <div className="space-y-4">
          {queue.length === 0 ? (
            <div className="text-center py-12 text-slate-600">
              <div className="text-3xl mb-2">✅</div>
              <div className="text-sm">Queue is empty — no reports pending review</div>
              <div className="text-xs mt-1">Run a simulator scenario to populate the queue</div>
            </div>
          ) : (
            <>
              {sosPriority.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold text-orange-400 mb-2">🚨 SOS Priority Reports ({sosPriority.length})</div>
                  <div className="space-y-3">
                    {sosPriority.map(r => <ReportCard key={r.report_id} report={r} onReview={handleReview} />)}
                  </div>
                </div>
              )}
              {others.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold text-slate-400 mb-2">Other Reports — Lowest Score First ({others.length})</div>
                  <div className="space-y-3">
                    {others.map(r => <ReportCard key={r.report_id} report={r} onReview={handleReview} />)}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Audit log tab */}
      {activeTab === 'log' && (
        <div className="space-y-2">
          {log.length === 0 ? (
            <div className="text-center py-12 text-slate-600">
              <div className="text-3xl mb-2">📜</div>
              <div className="text-sm">No review decisions yet</div>
            </div>
          ) : (
            log.map((entry, i) => (
              <div key={i} className={`rounded-xl border p-3 space-y-1.5 ${
                entry.decision === 'release'
                  ? 'border-emerald-800 bg-emerald-950/20'
                  : 'border-red-900 bg-red-950/20'
              }`}>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                    entry.decision === 'release'
                      ? 'bg-emerald-900 text-emerald-300'
                      : 'bg-red-900 text-red-300'
                  }`}>
                    {entry.decision === 'release' ? '✅ RELEASED' : '🚫 CONFIRMED FAKE'}
                  </span>
                  <span className="text-[9px] font-mono text-slate-400">{entry.report_id}</span>
                  <span className="text-[8px] text-slate-600 ml-auto">{entry.timestamp_str}</span>
                </div>
                <div className="text-[9px] text-slate-500">
                  Previous verdict: <span className="text-slate-300 font-semibold">{entry.previous_verdict}</span>
                </div>
                <div className="text-[10px] text-slate-300 bg-slate-800/60 rounded-lg px-2 py-1 italic">
                  "{entry.note}"
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <div className="h-4" />
    </div>
  )
}
