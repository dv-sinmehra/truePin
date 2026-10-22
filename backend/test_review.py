"""
test_review.py — ig-nite Round 2 pytest suite
Tests the False-Positive Review Queue feature for truePin.
Run with: pytest test_review.py -v
"""

import time
import pytest
from fastapi.testclient import TestClient
from main import app, REPORTS, USER_TRUST, REVIEW_LOG, REVIEWED_IDS, process_report, Report
import main  # for resetting global state

client = TestClient(app)


def reset_all():
    """Helper: clear all in-memory state between tests."""
    REPORTS.clear()
    USER_TRUST.clear()
    REVIEW_LOG.clear()
    REVIEWED_IDS.clear()
    main.MANUAL_OVERRIDES = 0


def make_quarantined_sos() -> str:
    """Create a genuine-looking SOS report that gets QUARANTINED (new account, low trust)."""
    # New account (age < 30 → base_trust=40) + no kinematics → will score low
    rep = Report(
        report_id=f"test_sos_{int(time.time()*1000)}",
        timestamp=time.time(),
        user_id="test_sos_user_001",
        account_age_days=1,           # brand new → trust=40
        lat=28.6315,
        lng=77.2167,
        report_type="UNSAFE_HARASSMENT",
        ip_address="49.205.10.99",
        asn_type="MOBILE_ISP",
        kinematic_variance=0.0,       # no motion → L1 -30
        has_gps_breadcrumbs=False,    # no trail → L1 -30
        approach_speed_kmh=0.0,
        is_ground_truth_fake=False,   # genuinely distressed user
    )
    processed = process_report(rep)
    REPORTS.append(processed)
    return processed.report_id


def make_low_score_non_sos() -> str:
    """Create a non-SOS report that gets QUARANTINED for ordering test."""
    rep = Report(
        report_id=f"test_nonsos_{int(time.time()*1000)}",
        timestamp=time.time() - 1,
        user_id="test_nonsos_user_001",
        account_age_days=0,
        lat=28.6320,
        lng=77.2170,
        report_type="INCIDENT",       # not SOS type
        ip_address="18.100.10.5",
        asn_type="DATACENTER_VPS",    # -40
        kinematic_variance=0.0,
        has_gps_breadcrumbs=False,
        approach_speed_kmh=0.0,
        is_ground_truth_fake=True,
    )
    processed = process_report(rep)
    REPORTS.append(processed)
    return processed.report_id


# ─────────────────────────────────────────────────────────────────────────────
# TEST 1 — Queue ordering: SOS appears before non-SOS even if non-SOS has lower score
# ─────────────────────────────────────────────────────────────────────────────
def test_queue_ordering():
    reset_all()
    non_sos_id = make_low_score_non_sos()  # created first, lower score
    sos_id = make_quarantined_sos()        # created second, SOS type

    res = client.get("/api/review-queue")
    assert res.status_code == 200
    queue = res.json()["queue"]

    # Must have at least 2 items
    assert len(queue) >= 2, f"Expected >=2 items in queue, got {len(queue)}"

    # SOS report must appear BEFORE the non-SOS report
    ids_in_order = [r["report_id"] for r in queue]
    assert ids_in_order.index(sos_id) < ids_in_order.index(non_sos_id), (
        f"SOS report should rank first. Order was: {ids_in_order}"
    )


# ─────────────────────────────────────────────────────────────────────────────
# TEST 2 — Release: verdict becomes VERIFIED, manually_released=True, manual_overrides=1
# ─────────────────────────────────────────────────────────────────────────────
def test_release_report():
    reset_all()
    sos_id = make_quarantined_sos()

    res = client.post(f"/api/review/{sos_id}", json={
        "decision": "release",
        "note": "Verified genuine SOS — new student on campus network"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["decision"] == "release"
    assert data["new_verdict"] == "VERIFIED"
    assert data["manual_overrides"] == 1

    # Report should now show as VERIFIED in REPORTS
    report = next(r for r in REPORTS if r.report_id == sos_id)
    assert report.verdict == "VERIFIED"
    assert report.manually_released is True
    assert "manually released" in report.layer_log[-1].lower()

    # Should no longer appear in the queue
    queue_res = client.get("/api/review-queue")
    queue_ids = [r["report_id"] for r in queue_res.json()["queue"]]
    assert sos_id not in queue_ids


# ─────────────────────────────────────────────────────────────────────────────
# TEST 3 — Confirm: report stays QUARANTINED, confirmed_fake=True
# ─────────────────────────────────────────────────────────────────────────────
def test_confirm_report():
    reset_all()
    sos_id = make_quarantined_sos()

    res = client.post(f"/api/review/{sos_id}", json={
        "decision": "confirm",
        "note": "Cross-checked with nearby sensors — no real incident detected"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["decision"] == "confirm"
    assert data["new_verdict"] == "QUARANTINED"   # stays quarantined

    report = next(r for r in REPORTS if r.report_id == sos_id)
    assert report.verdict == "QUARANTINED"
    assert report.confirmed_fake is True

    # Should no longer appear in the queue (already reviewed)
    queue_res = client.get("/api/review-queue")
    queue_ids = [r["report_id"] for r in queue_res.json()["queue"]]
    assert sos_id not in queue_ids


# ─────────────────────────────────────────────────────────────────────────────
# TEST 4 — Double review: second call returns 409 Conflict
# ─────────────────────────────────────────────────────────────────────────────
def test_double_review_conflict_409():
    reset_all()
    sos_id = make_quarantined_sos()

    # First review — should succeed
    first = client.post(f"/api/review/{sos_id}", json={
        "decision": "release",
        "note": "First review — genuine SOS"
    })
    assert first.status_code == 200

    # Second review — must return 409
    second = client.post(f"/api/review/{sos_id}", json={
        "decision": "confirm",
        "note": "Attempting second review"
    })
    assert second.status_code == 409, (
        f"Expected 409 on double review, got {second.status_code}: {second.text}"
    )


# ─────────────────────────────────────────────────────────────────────────────
# TEST 5 — Empty note returns validation error (422)
# ─────────────────────────────────────────────────────────────────────────────
def test_empty_note_returns_error():
    reset_all()
    sos_id = make_quarantined_sos()

    # Empty string note
    res = client.post(f"/api/review/{sos_id}", json={
        "decision": "release",
        "note": ""
    })
    assert res.status_code == 422, (
        f"Expected 422 for empty note, got {res.status_code}"
    )

    # Whitespace-only note
    res2 = client.post(f"/api/review/{sos_id}", json={
        "decision": "release",
        "note": "   "
    })
    assert res2.status_code == 422


# ─────────────────────────────────────────────────────────────────────────────
# TEST 6 — Metrics unchanged: fake_detection_rate and genuine_suppression_rate
#           do NOT change after releasing a genuinely quarantined report
# ─────────────────────────────────────────────────────────────────────────────
def test_metrics_unchanged_after_release():
    reset_all()
    sos_id = make_quarantined_sos()

    # Capture metrics BEFORE review
    before = client.get("/api/state").json()["metrics"]
    rate_before = before["fake_detection_rate"]
    suppression_before = before["genuine_suppression_rate"]

    # Release the genuinely quarantined SOS report
    client.post(f"/api/review/{sos_id}", json={
        "decision": "release",
        "note": "Genuine victim — releasing from review queue"
    })

    # Capture metrics AFTER review
    after = client.get("/api/state").json()["metrics"]
    rate_after = after["fake_detection_rate"]
    suppression_after = after["genuine_suppression_rate"]

    assert rate_after == rate_before, (
        f"fake_detection_rate changed after release: {rate_before} → {rate_after}"
    )
    assert suppression_after == suppression_before, (
        f"genuine_suppression_rate changed after release: {suppression_before} → {suppression_after}"
    )

    # manual_overrides should have incremented
    assert after["manual_overrides"] == before.get("manual_overrides", 0) + 1
