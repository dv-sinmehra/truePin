"""
backend/test_review_queue.py
ig-nite Round 2 — False-Positive Review Queue
pytest suite: 7 required tests + bonus bulk-release test

Run: cd backend; python -m pytest test_review_queue.py -v
"""
import pytest
from fastapi.testclient import TestClient
import main
from main import app, REPORTS, USER_TRUST, REVIEW_LOG, REVIEWED_IDS

client = TestClient(app)


# ── Helpers ──────────────────────────────────────────────────────────────────

def reset_all():
    """Wipe all in-memory state between tests."""
    REPORTS.clear()
    USER_TRUST.clear()
    REVIEW_LOG.clear()
    REVIEWED_IDS.clear()
    main.MANUAL_OVERRIDES = 0
    main.METRICS['total_reports'] = 0
    main.METRICS['total_fakes'] = 0
    main.METRICS['total_genuines'] = 0
    main.METRICS['fakes_quarantined'] = 0
    main.METRICS['genuines_quarantined'] = 0


def trigger_quarantined_sos():
    """Fire the quarantined_sos simulator scenario and return the first report dict."""
    res = client.post('/api/simulate/quarantined_sos')
    assert res.status_code == 200, f"quarantined_sos scenario failed: {res.text}"
    data = res.json()
    # The simulate endpoint returns a list of ProcessedReport dicts
    if isinstance(data, list):
        return data[0]
    # If it returns a dict with a 'reports' key
    if isinstance(data, dict) and 'reports' in data:
        return data['reports'][0]
    return data


def submit_report(overrides: dict) -> dict:
    """Submit a custom report with given field overrides."""
    payload = {
        'user_id': 'tester',
        'account_age_days': 1,
        'lat': 28.6315,
        'lng': 77.2167,
        'report_type': 'INCIDENT',
        'ip_address': '10.0.0.1',
        'asn_type': 'MOBILE_ISP',
        'device_hash': 'abc',
        'kinematic_variance': 0.0,
        'has_gps_breadcrumbs': False,
        'is_ground_truth_fake': False,
        **overrides,
    }
    res = client.post('/api/report', json=payload)
    assert res.status_code == 200, f"report submission failed: {res.text}"
    return res.json()


def get_queue():
    res = client.get('/api/review-queue')
    assert res.status_code == 200
    return res.json()['queue']


# ── Test 1 ────────────────────────────────────────────────────────────────────
def test_queue_ordering_sos_first_then_lowest_score():
    """
    SOS reports must appear before non-SOS reports regardless of score.
    Within each group, lower final_score comes first.
    """
    reset_all()

    # Two quarantined_sos triggers → SOS type, low score (~11)
    trigger_quarantined_sos()
    trigger_quarantined_sos()

    # Two non-SOS quarantined reports (new account, mobile ISP, no GPS)
    submit_report({'report_type': 'INCIDENT', 'user_id': 'u_non_sos_1', 'account_age_days': 1,
                   'kinematic_variance': 0.0, 'has_gps_breadcrumbs': False})
    submit_report({'report_type': 'INCIDENT', 'user_id': 'u_non_sos_2', 'account_age_days': 1,
                   'kinematic_variance': 0.0, 'has_gps_breadcrumbs': False})

    queue = get_queue()
    assert len(queue) >= 2, f"Expected at least 2 items in queue, got {len(queue)}"

    # Find boundary: first non-SOS index
    sos_set = {'UNSAFE_HARASSMENT', 'CROWD_EMERGENCY', 'SOS'}
    sos_indices = [i for i, r in enumerate(queue) if r['report_type'] in sos_set
                   or 'SOS' in str(r['report_type']).upper()]
    non_sos_indices = [i for i, r in enumerate(queue) if i not in sos_indices]

    # All SOS items must come before all non-SOS items
    if sos_indices and non_sos_indices:
        assert max(sos_indices) < min(non_sos_indices), (
            f"SOS items not all before non-SOS: SOS at {sos_indices}, non-SOS at {non_sos_indices}"
        )

    # Within SOS group: ascending score
    sos_items = [queue[i] for i in sos_indices]
    scores = [r['final_score'] for r in sos_items]
    assert scores == sorted(scores), f"SOS group not sorted by score asc: {scores}"

    # Within non-SOS group: ascending score
    non_sos_items = [queue[i] for i in non_sos_indices]
    nscores = [r['final_score'] for r in non_sos_items]
    assert nscores == sorted(nscores), f"Non-SOS group not sorted by score asc: {nscores}"


# ── Test 2 ────────────────────────────────────────────────────────────────────
def test_release_report_moves_to_protected_map_and_logs():
    """
    Release a quarantined SOS report.
    - verdict changes to VERIFIED / manually_released = True
    - user trust increases by +5
    - review-log contains the correct keys
    """
    reset_all()
    data = trigger_quarantined_sos()
    report_id = data['report_id']
    user_id = data['user_id']

    trust_before = USER_TRUST.get(user_id, 40.0)

    res = client.post(f'/api/review/{report_id}', json={
        'decision': 'release',
        'note': 'Verified by campus security — genuine SOS',
    })
    assert res.status_code == 200, f"Release failed: {res.text}"
    body = res.json()
    assert body['new_verdict'] == 'VERIFIED', f"Expected VERIFIED, got {body['new_verdict']}"

    # Report in memory must reflect changes
    report = next(r for r in REPORTS if r.report_id == report_id)
    assert report.manually_released is True
    assert report.reviewed is True
    assert report.review_decision == 'release'

    # Trust increased by +5, capped at 100
    trust_after = USER_TRUST.get(user_id, 40.0)
    assert trust_after == min(100.0, trust_before + 5.0), (
        f"Trust: expected {min(100.0, trust_before + 5.0)}, got {trust_after}"
    )

    # Audit log entry correct
    log_res = client.get('/api/review-log')
    assert log_res.status_code == 200
    log = log_res.json()['log']
    assert len(log) >= 1
    entry = next(e for e in log if e['report_id'] == report_id)
    assert entry['decision'] == 'release'
    assert entry['previous_verdict'] is not None
    assert 'timestamp' in entry
    assert entry['note']
    assert 'Z' in entry['timestamp']  # ISO format with Z suffix

    # Report should NOT appear in queue any more
    queue = get_queue()
    ids_in_queue = [r['report_id'] for r in queue]
    assert report_id not in ids_in_queue, "Released report still in queue"


# ── Test 3 ────────────────────────────────────────────────────────────────────
def test_confirm_report_stays_quarantined_and_logs():
    """
    Confirm a report as fake.
    - verdict stays QUARANTINED, confirmed_fake = True
    - user trust decreases by -5
    - logged in review-log
    """
    reset_all()
    data = trigger_quarantined_sos()
    report_id = data['report_id']
    user_id = data['user_id']

    trust_before = USER_TRUST.get(user_id, 40.0)

    res = client.post(f'/api/review/{report_id}', json={
        'decision': 'confirm',
        'note': 'Checked CCTV — no incident at this location',
    })
    assert res.status_code == 200, f"Confirm failed: {res.text}"

    # Report stays quarantined and is marked confirmed-fake
    report = next(r for r in REPORTS if r.report_id == report_id)
    assert report.confirmed_fake is True
    assert report.reviewed is True
    assert report.review_decision == 'confirm'
    assert report.verdict == 'QUARANTINED'

    # Trust decreased by -5, floored at 0
    trust_after = USER_TRUST.get(user_id, 40.0)
    assert trust_after == max(0.0, trust_before - 5.0), (
        f"Trust: expected {max(0.0, trust_before - 5.0)}, got {trust_after}"
    )

    # Audit log entry
    log_res = client.get('/api/review-log')
    log = log_res.json()['log']
    entry = next(e for e in log if e['report_id'] == report_id)
    assert entry['decision'] == 'confirm'
    assert 'Z' in entry['timestamp']

    # Must NOT appear in queue (reviewed == True)
    queue = get_queue()
    ids_in_queue = [r['report_id'] for r in queue]
    assert report_id not in ids_in_queue, "Confirmed-fake report still in queue"


# ── Test 4 ────────────────────────────────────────────────────────────────────
def test_double_review_returns_409():
    """Reviewing the same report twice must return HTTP 409."""
    reset_all()
    data = trigger_quarantined_sos()
    report_id = data['report_id']

    # First review: OK
    r1 = client.post(f'/api/review/{report_id}', json={
        'decision': 'release',
        'note': 'First review — legitimate',
    })
    assert r1.status_code == 200

    # Second review: 409
    r2 = client.post(f'/api/review/{report_id}', json={
        'decision': 'confirm',
        'note': 'Trying to review again',
    })
    assert r2.status_code == 409, f"Expected 409, got {r2.status_code}: {r2.text}"
    assert 'already been reviewed' in r2.json()['detail'].lower()


# ── Test 5 ────────────────────────────────────────────────────────────────────
def test_unknown_report_id_returns_404():
    """Reviewing a non-existent report_id must return HTTP 404."""
    reset_all()
    res = client.post('/api/review/nonexistent_id_xyz', json={
        'decision': 'release',
        'note': 'Some note',
    })
    assert res.status_code == 404, f"Expected 404, got {res.status_code}: {res.text}"
    assert 'not found' in res.json()['detail'].lower()


# ── Test 6 ────────────────────────────────────────────────────────────────────
def test_empty_or_missing_note_returns_validation_error():
    """
    Submitting with note="" or whitespace-only must return 400 or 422.
    The report must remain in the review queue (not removed).
    """
    reset_all()
    data = trigger_quarantined_sos()
    report_id = data['report_id']

    # Empty string note
    r1 = client.post(f'/api/review/{report_id}', json={
        'decision': 'release',
        'note': '',
    })
    assert r1.status_code in (400, 422), (
        f"Expected 400/422 for empty note, got {r1.status_code}: {r1.text}"
    )

    # Whitespace-only note
    r2 = client.post(f'/api/review/{report_id}', json={
        'decision': 'release',
        'note': '   ',
    })
    assert r2.status_code in (400, 422), (
        f"Expected 400/422 for whitespace note, got {r2.status_code}: {r2.text}"
    )

    # Report must still be in queue (not consumed)
    queue = get_queue()
    ids_in_queue = [r['report_id'] for r in queue]
    assert report_id in ids_in_queue, (
        f"Report {report_id} was removed from queue after failed (empty-note) review!"
    )


# ── Test 7 ────────────────────────────────────────────────────────────────────
def test_metrics_unchanged_and_manual_overrides_increments():
    """
    After releasing a quarantined report:
    - fake_detection_rate stays 100% (or unchanged from before)
    - genuine_suppression_rate stays 100% (or unchanged from before)
    - manual_overrides increments by exactly 1
    Also verifies /api/reset clears the queue and log.
    """
    reset_all()

    # Submit a KNOWN fake → will be quarantined, counted in fakes_quarantined
    trigger_quarantined_sos()

    # Snapshot metrics before review
    state_before = client.get('/api/state').json()
    metrics_before = state_before.get('metrics', state_before)
    fdr_before = metrics_before.get('fake_detection_rate', None)
    gsr_before = metrics_before.get('genuine_suppression_rate', None)
    mo_before = metrics_before.get('manual_overrides', 0)

    # Get the quarantined SOS from queue
    queue = get_queue()
    assert len(queue) > 0, "Queue empty — no QUARANTINED report to release"
    report_id = queue[0]['report_id']

    # Release it
    r = client.post(f'/api/review/{report_id}', json={
        'decision': 'release',
        'note': 'Confirmed genuine — metrics must stay frozen',
    })
    assert r.status_code == 200

    # Check metrics AFTER
    state_after = client.get('/api/state').json()
    metrics_after = state_after.get('metrics', state_after)
    fdr_after = metrics_after.get('fake_detection_rate', None)
    gsr_after = metrics_after.get('genuine_suppression_rate', None)
    mo_after = metrics_after.get('manual_overrides', 0)

    # Rates must be unchanged
    if fdr_before is not None and fdr_after is not None:
        assert fdr_before == fdr_after, (
            f"fake_detection_rate changed after release: {fdr_before} → {fdr_after}"
        )
    if gsr_before is not None and gsr_after is not None:
        assert gsr_before == gsr_after, (
            f"genuine_suppression_rate changed after release: {gsr_before} → {gsr_after}"
        )

    # manual_overrides +1
    assert mo_after == mo_before + 1, (
        f"manual_overrides should be {mo_before + 1}, got {mo_after}"
    )

    # Now test /api/reset clears everything
    reset_res = client.post('/api/reset')
    assert reset_res.status_code == 200

    queue_after_reset = get_queue()
    assert len(queue_after_reset) == 0, "Queue not cleared after reset"

    log_after_reset = client.get('/api/review-log').json()['log']
    assert len(log_after_reset) == 0, "Review log not cleared after reset"

    state_reset = client.get('/api/state').json()
    metrics_reset = state_reset.get('metrics', state_reset)
    assert metrics_reset.get('manual_overrides', 0) == 0, "manual_overrides not reset to 0"


# ── Bonus Test: bulk-release ──────────────────────────────────────────────────
def test_bulk_release_by_asn():
    """
    Bonus: POST /api/review/bulk-release releases all matching QUARANTINED reports.
    - Requires non-empty note (returns 422 otherwise)
    - manual_overrides increments for each released report
    - Each entry appears in review-log
    """
    reset_all()

    # Trigger two quarantined_sos (both MOBILE_ISP by default in the scenario)
    d1 = trigger_quarantined_sos()
    d2 = trigger_quarantined_sos()

    queue_before = get_queue()
    quarantined_mobile = [r for r in queue_before if r['asn_type'] == 'MOBILE_ISP']
    assert len(quarantined_mobile) >= 1, "Need at least one MOBILE_ISP quarantined report"

    # Empty note → 422
    bad = client.post('/api/review/bulk-release', json={'asn': 'MOBILE_ISP', 'note': ''})
    assert bad.status_code in (400, 422)

    # Valid bulk release
    res = client.post('/api/review/bulk-release', json={
        'asn': 'MOBILE_ISP',
        'note': 'Campus Wi-Fi block identified — bulk releasing all MOBILE_ISP reports',
    })
    assert res.status_code == 200
    body = res.json()
    assert body['released_count'] >= 1
    assert body['manual_overrides'] >= 1

    # All released reports no longer in queue
    queue_after = get_queue()
    queue_ids = {r['report_id'] for r in queue_after}
    for rid in body['released_ids']:
        assert rid not in queue_ids, f"Released report {rid} still in queue"
