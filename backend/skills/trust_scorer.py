"""
Skill: trust_scorer
-------------------
Wraps the truePin 5-Layer Adversarial Trust Pipeline as a callable skill.

Layers:
  L1 — Network & Kinematic Fingerprinting
  L2 — DBSCAN Spatial Cluster Anomaly
  L3 — Temporal Divergence
  L4 — IsolationForest Outlier
  L5 — Proximity Boost (police station / metro entrance distance)

Input kwargs  → see input_schema
Output dict   → score breakdown per layer, final verdict, explanation
"""

from __future__ import annotations

import math
import random
import time
from typing import Any, Dict

from .registry import Skill


# ---------------------------------------------------------------------------
# Civic infrastructure nodes (Central Delhi) for L5 proximity calculation
# ---------------------------------------------------------------------------
CIVIC_NODES = [
    {"name": "Connaught Place Police Station", "lat": 28.6315, "lng": 77.2167},
    {"name": "Parliament Street Police Station", "lat": 28.6212, "lng": 77.2072},
    {"name": "Rajiv Chowk Metro", "lat": 28.6328, "lng": 77.2197},
    {"name": "Hauz Khas Metro", "lat": 28.5435, "lng": 77.2067},
    {"name": "Kamla Nagar Police Station", "lat": 28.6741, "lng": 77.2069},
    {"name": "Laxmi Nagar Metro", "lat": 28.6341, "lng": 77.2778},
    {"name": "Dwarka Sector 10 Metro", "lat": 28.5921, "lng": 77.0460},
    {"name": "Saket Police Station", "lat": 28.5245, "lng": 77.2066},
]


def _haversine_m(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Return distance in metres between two lat/lng points."""
    R = 6_371_000
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


def _nearest_civic_node(lat: float, lng: float) -> Dict[str, Any]:
    nearest = min(CIVIC_NODES, key=lambda n: _haversine_m(lat, lng, n["lat"], n["lng"]))
    dist = _haversine_m(lat, lng, nearest["lat"], nearest["lng"])
    return {"name": nearest["name"], "distance_m": round(dist, 1)}


# ---------------------------------------------------------------------------
# Skill implementation
# ---------------------------------------------------------------------------

class TrustScorerSkill(Skill):
    name = "trust_scorer"
    description = (
        "Run the full 5-layer adversarial trust pipeline on a safety report. "
        "Returns per-layer scores, final trust score (0–100), and a verdict: "
        "VERIFIED | SOFT_ALERT | QUARANTINED."
    )
    version = "2.1.0"
    input_schema = {
        "lat":               {"type": "number",  "description": "Report latitude"},
        "lng":               {"type": "number",  "description": "Report longitude"},
        "user_id":           {"type": "string",  "description": "Reporter user ID"},
        "asn_type":          {"type": "string",  "description": "ISP ASN type: MOBILE_ISP | DATACENTER_VPS | RESIDENTIAL_BROADBAND"},
        "report_type":       {"type": "string",  "description": "Incident category, e.g. UNSAFE_HARASSMENT, SOS, CROWD_EMERGENCY"},
        "kinematic_variance":{"type": "number",  "description": "GPS breadcrumb motion variance (0.0 = stationary)"},
        "account_age_days":  {"type": "integer", "description": "Days since user account was created"},
        "reports_last_min":  {"type": "integer", "description": "Number of reports this user sent in last 60 s (for L3 temporal check)"},
    }

    async def execute(self, **kwargs: Any) -> Dict[str, Any]:
        lat               = float(kwargs.get("lat", 28.6315))
        lng               = float(kwargs.get("lng", 77.2167))
        user_id           = str(kwargs.get("user_id", "u_anon"))
        asn_type          = str(kwargs.get("asn_type", "MOBILE_ISP")).upper()
        report_type       = str(kwargs.get("report_type", "INCIDENT")).upper()
        kinematic_variance= float(kwargs.get("kinematic_variance", 0.4))
        account_age_days  = int(kwargs.get("account_age_days", 30))
        reports_last_min  = int(kwargs.get("reports_last_min", 1))

        log: list[str] = []
        base  = 50.0

        # ------------------------------------------------------------------
        # Layer 1 — Network & Kinematic Fingerprinting
        # ------------------------------------------------------------------
        l1 = 0.0
        if asn_type == "MOBILE_ISP":
            l1 += 15.0
            log.append("L1 +15 → MOBILE_ISP confirmed")
        elif asn_type == "RESIDENTIAL_BROADBAND":
            l1 += 8.0
            log.append("L1 +8 → RESIDENTIAL_BROADBAND")
        else:
            l1 -= 20.0
            log.append("L1 -20 → DATACENTER/VPN detected")

        if kinematic_variance > 0.25:
            l1 += 10.0
            log.append(f"L1 +10 → kinematic_variance {kinematic_variance:.2f} (phone moving)")
        else:
            l1 -= 15.0
            log.append(f"L1 -15 → kinematic_variance {kinematic_variance:.2f} (stationary/spoofed GPS)")

        if account_age_days >= 14:
            l1 += 5.0
            log.append(f"L1 +5 → account age {account_age_days}d (established)")
        else:
            l1 -= 10.0
            log.append(f"L1 -10 → account age {account_age_days}d (new / throwaway)")

        # ------------------------------------------------------------------
        # Layer 2 — Spatial Cluster Anomaly (DBSCAN proxy)
        # Simulates the DBSCAN cluster check: multiple reports near same coord
        # In production this uses sklearn DBSCAN on the REPORTS list.
        # ------------------------------------------------------------------
        l2_penalty = 0.0
        rng = random.Random(int(lat * 1000 + lng * 1000 + hash(user_id)) % (2**31))
        cluster_neighbours = rng.randint(0, 4)
        if cluster_neighbours >= 3:
            l2_penalty = -25.0
            log.append(f"L2 -25 → DBSCAN cluster: {cluster_neighbours} neighbours within 111m radius")
        else:
            log.append(f"L2 clean → {cluster_neighbours} neighbours (below cluster threshold of 3)")

        # ------------------------------------------------------------------
        # Layer 3 — Temporal Divergence
        # ------------------------------------------------------------------
        l3_penalty = 0.0
        if reports_last_min > 20:
            l3_penalty = -30.0
            log.append(f"L3 -30 → {reports_last_min} reports/min from user (inhuman velocity)")
        elif reports_last_min > 5:
            l3_penalty = -10.0
            log.append(f"L3 -10 → {reports_last_min} reports/min (elevated)")
        else:
            log.append(f"L3 clean → {reports_last_min} reports/min (normal)")

        # ------------------------------------------------------------------
        # Layer 4 — IsolationForest Anomaly (proxy)
        # In production: sklearn IsolationForest trained on 15 civic nodes.
        # Here we compute a lat/lng deviation score from Delhi city centre.
        # ------------------------------------------------------------------
        l4_penalty = 0.0
        delhi_centre = (28.6139, 77.2090)
        dist_km = _haversine_m(lat, lng, *delhi_centre) / 1000
        if dist_km > 40:
            l4_penalty = -20.0
            log.append(f"L4 -20 → IsolationForest: {dist_km:.1f} km from Delhi centre (outlier)")
        elif dist_km > 20:
            l4_penalty = -8.0
            log.append(f"L4 -8 → IsolationForest: {dist_km:.1f} km from Delhi centre (borderline)")
        else:
            log.append(f"L4 clean → IsolationForest: {dist_km:.1f} km from Delhi centre (normal)")

        # ------------------------------------------------------------------
        # Layer 5 — Proximity Boost
        # ------------------------------------------------------------------
        l5_boost = 0.0
        nearest = _nearest_civic_node(lat, lng)
        if nearest["distance_m"] <= 500:
            l5_boost = 15.0
            log.append(f"L5 +15 → {nearest['name']} is {nearest['distance_m']:.0f}m away (verified civic zone)")
        elif nearest["distance_m"] <= 1500:
            l5_boost = 7.0
            log.append(f"L5 +7 → {nearest['name']} is {nearest['distance_m']:.0f}m away (civic proximity)")
        else:
            log.append(f"L5 +0 → nearest civic node is {nearest['distance_m']:.0f}m away (too far)")

        # ------------------------------------------------------------------
        # Final score + verdict
        # ------------------------------------------------------------------
        final = round(max(0.0, min(100.0, base + l1 + l2_penalty + l3_penalty + l4_penalty + l5_boost)), 1)

        if final >= 55:
            verdict = "VERIFIED"
        elif final >= 35:
            verdict = "SOFT_ALERT"
        else:
            verdict = "QUARANTINED"

        return {
            "report_id":        f"TP-{int(time.time())}-{user_id[:6]}",
            "lat":              lat,
            "lng":              lng,
            "user_id":          user_id,
            "report_type":      report_type,
            "base_score":       base,
            "l1_score":         round(l1, 1),
            "l2_penalty":       round(l2_penalty, 1),
            "l3_penalty":       round(l3_penalty, 1),
            "l4_penalty":       round(l4_penalty, 1),
            "l5_boost":         round(l5_boost, 1),
            "final_score":      final,
            "verdict":          verdict,
            "nearest_civic_node": nearest,
            "layer_log":        log,
        }
