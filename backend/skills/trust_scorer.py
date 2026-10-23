"""
Skill: trust_scorer
-------------------
Runs a safety report through truePin's REAL 5-layer adversarial trust pipeline —
the same `process_report()` in main.py that powers POST /api/report and the website.
(It used to be a separate simplified copy with a random DBSCAN step; now there is
one pipeline, so the MCP tool, the agent and the website always agree.)

Layers:
  L1 — CGNAT, ASN & kinematics filter
  L2 — DBSCAN spatio-temporal clustering over recent reports
  L3 — Bayesian user-trust graph + target-trust divergence
  L4 — IsolationForest behavioural drift detection
  L5 — Solo proof-of-presence boost / multi-party corroboration

Verdict thresholds: VERIFIED ≥ 75 · SOFT_ALERT ≥ 35 · QUARANTINED < 35
"""

from __future__ import annotations

import importlib
import sys
from typing import Any, Dict

from .registry import Skill


def _main():
    # main.py imports the skills package at startup, so import it lazily here.
    return sys.modules.get("main") or importlib.import_module("main")


class TrustScorerSkill(Skill):
    name = "trust_scorer"
    description = (
        "Run a safety report through truePin's real 5-layer adversarial trust pipeline "
        "(the same code as POST /api/report). Returns per-layer scores, the layer log, "
        "final trust score (0–100) and a verdict: VERIFIED | SOFT_ALERT | QUARANTINED."
    )
    version = "3.0.0"
    input_schema = {
        "lat":                 {"type": "number",  "description": "Report latitude"},
        "lng":                 {"type": "number",  "description": "Report longitude"},
        "user_id":             {"type": "string",  "description": "Reporter user ID"},
        "asn_type":            {"type": "string",  "description": "MOBILE_ISP | CAMPUS_WIFI | RESIDENTIAL_BROADBAND | DATACENTER_VPS"},
        "report_type":         {"type": "string",  "description": "Incident category, e.g. UNSAFE_HARASSMENT, CROWD_EMERGENCY"},
        "kinematic_variance":  {"type": "number",  "description": "Phone motion variance (0.0 = stationary/spoofed; 0.3–4.5 = human)"},
        "account_age_days":    {"type": "integer", "description": "Days since the user account was created"},
        "has_gps_breadcrumbs": {"type": "boolean", "description": "Whether the device sent a GPS trail"},
        "approach_speed_kmh":  {"type": "number",  "description": "Speed approaching the pin location"},
        "ip_address":          {"type": "string",  "description": "Reporter IP (used for the CGNAT check)"},
        "save_to_map":         {"type": "boolean", "description": "Add the report to the live map (default true)"},
    }

    async def execute(self, **kwargs: Any) -> Dict[str, Any]:
        m = _main()
        report = m.Report(
            user_id=str(kwargs.get("user_id", "u_anon")),
            account_age_days=int(kwargs.get("account_age_days", 30)),
            lat=float(kwargs.get("lat", 28.6315)),
            lng=float(kwargs.get("lng", 77.2167)),
            report_type=str(kwargs.get("report_type", "INCIDENT")).upper(),
            ip_address=str(kwargs.get("ip_address", "127.0.0.1")),
            asn_type=str(kwargs.get("asn_type", "MOBILE_ISP")).upper(),
            kinematic_variance=float(kwargs.get("kinematic_variance", 1.0)),
            has_gps_breadcrumbs=bool(kwargs.get("has_gps_breadcrumbs", True)),
            approach_speed_kmh=float(kwargs.get("approach_speed_kmh", 4.0)),
        )
        processed = m.process_report(report)
        if kwargs.get("save_to_map", True):
            m.REPORTS.append(processed)
            m.compute_metrics()
        return {**processed.model_dump(), "saved_to_map": bool(kwargs.get("save_to_map", True))}
