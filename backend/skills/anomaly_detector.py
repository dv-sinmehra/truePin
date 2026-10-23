"""
Skill: anomaly_detector
-----------------------
Exposes the DBSCAN + IsolationForest anomaly detection pipeline
as a directly callable skill (decoupled from the full 5-layer trust pipeline).

Useful for:
  - Batch analysis of report clusters
  - MCP tool-call: "Is this coordinate cluster anomalous?"
  - Agent reasoning step: "Check anomaly before filing OSINT"

Returns detailed cluster membership, anomaly score, and recommendation.
"""

from __future__ import annotations

import math
from typing import Any, Dict, List

from .registry import Skill

try:
    import numpy as np
    from sklearn.cluster import DBSCAN
    from sklearn.ensemble import IsolationForest
    _SK = True
except ImportError:
    _SK = False


# ---------------------------------------------------------------------------
# 15 civic-infrastructure baseline nodes (used to train IsolationForest)
# ---------------------------------------------------------------------------
BASELINE_NODES: List[Dict[str, float]] = [
    {"lat": 28.6315, "lng": 77.2167},  # Connaught Place Police Station
    {"lat": 28.6212, "lng": 77.2072},  # Parliament Street PS
    {"lat": 28.6328, "lng": 77.2197},  # Rajiv Chowk Metro
    {"lat": 28.5435, "lng": 77.2067},  # Hauz Khas Metro
    {"lat": 28.6741, "lng": 77.2069},  # Kamla Nagar PS
    {"lat": 28.6341, "lng": 77.2778},  # Laxmi Nagar Metro
    {"lat": 28.5921, "lng": 77.0460},  # Dwarka Metro
    {"lat": 28.5245, "lng": 77.2066},  # Saket PS
    {"lat": 28.6517, "lng": 77.1907},  # Karol Bagh Metro
    {"lat": 28.7041, "lng": 77.1025},  # Rohini PS
    {"lat": 28.6692, "lng": 77.4538},  # Noida Sector 18 (boundary)
    {"lat": 28.4595, "lng": 77.0266},  # Gurgaon boundary node
    {"lat": 28.6862, "lng": 77.3110},  # Vivek Vihar PS
    {"lat": 28.5562, "lng": 77.1000},  # Vasant Kunj PS
    {"lat": 28.6139, "lng": 77.2090},  # Delhi city centre
]


def _fit_isolation_forest():
    """Return a fitted IsolationForest on the 15 baseline civic nodes."""
    if not _SK:
        return None
    X = np.array([[n["lat"], n["lng"]] for n in BASELINE_NODES])
    clf = IsolationForest(contamination=0.12, random_state=42)
    clf.fit(X)
    return clf


# Fit once at import time
_IF_MODEL = _fit_isolation_forest()


class AnomalyDetectorSkill(Skill):
    name = "anomaly_detector"
    description = (
        "Run DBSCAN cluster analysis and IsolationForest anomaly scoring on a set of "
        "report coordinates. Returns cluster membership labels, outlier flags, and "
        "an overall anomaly verdict. Use before scoring a report batch."
    )
    version = "1.1.0"
    input_schema = {
        "reports": {
            "type": "array",
            "description": "List of report objects each with lat, lng, report_id fields",
            "items": {
                "type": "object",
                "properties": {
                    "lat":       {"type": "number"},
                    "lng":       {"type": "number"},
                    "report_id": {"type": "string"},
                },
            },
        },
        "eps_deg": {
            "type": "number",
            "description": "DBSCAN epsilon in degrees (~0.001° = 111m). Default 0.001.",
        },
        "min_samples": {
            "type": "integer",
            "description": "DBSCAN min cluster size. Default 3.",
        },
    }

    async def execute(self, **kwargs: Any) -> Dict[str, Any]:
        raw_reports: List[Dict[str, Any]] = kwargs.get("reports", [])
        eps        = float(kwargs.get("eps_deg", 0.001))
        min_samp   = int(kwargs.get("min_samples", 3))

        if not raw_reports:
            return {"anomaly_verdict": "NO_DATA", "clusters": [], "outliers": []}

        coords = [[float(r.get("lat", 0)), float(r.get("lng", 0))] for r in raw_reports]
        ids    = [str(r.get("report_id", f"r{i}")) for i, r in enumerate(raw_reports)]

        # ------------------------------------------------------------------
        # DBSCAN cluster detection
        # ------------------------------------------------------------------
        if _SK:
            import numpy as np  # local import to avoid top-level error if absent
            X = np.array(coords)
            db = DBSCAN(eps=eps, min_samples=min_samp, metric="euclidean")
            labels = db.fit_predict(X).tolist()
        else:
            # Pure-Python fallback: naive distance grouping
            labels = [-1] * len(coords)

        cluster_counts: Dict[int, int] = {}
        for lbl in labels:
            if lbl >= 0:
                cluster_counts[lbl] = cluster_counts.get(lbl, 0) + 1

        flagged_clusters = {lbl for lbl, cnt in cluster_counts.items() if cnt >= min_samp}

        clusters_out = []
        for i, (rid, lbl) in enumerate(zip(ids, labels)):
            clusters_out.append({
                "report_id":    rid,
                "lat":          coords[i][0],
                "lng":          coords[i][1],
                "cluster_id":   lbl,
                "is_noise":     lbl == -1,
                "in_fake_cluster": lbl in flagged_clusters,
            })

        # ------------------------------------------------------------------
        # IsolationForest outlier scoring
        # ------------------------------------------------------------------
        outliers_out = []
        if _SK and _IF_MODEL is not None:
            import numpy as np
            X = np.array(coords)
            scores = _IF_MODEL.decision_function(X).tolist()
            preds  = _IF_MODEL.predict(X).tolist()           # -1 = outlier
            for i, (rid, score, pred) in enumerate(zip(ids, scores, preds)):
                outliers_out.append({
                    "report_id":        rid,
                    "anomaly_score":    round(score, 4),
                    "is_outlier":       pred == -1,
                })
        else:
            for rid in ids:
                outliers_out.append({
                    "report_id":     rid,
                    "anomaly_score": 0.0,
                    "is_outlier":    False,
                })

        # ------------------------------------------------------------------
        # Summary verdict
        # ------------------------------------------------------------------
        n_cluster_fake  = sum(1 for c in clusters_out if c["in_fake_cluster"])
        n_if_outlier    = sum(1 for o in outliers_out if o["is_outlier"])
        total           = len(raw_reports)

        if n_cluster_fake / max(total, 1) > 0.5 or n_if_outlier / max(total, 1) > 0.4:
            verdict = "HIGH_ANOMALY — coordinated fake attack likely"
        elif n_cluster_fake > 0 or n_if_outlier > 0:
            verdict = "MODERATE_ANOMALY — some suspicious clusters detected"
        else:
            verdict = "CLEAN — no anomalous clusters detected"

        return {
            "anomaly_verdict":      verdict,
            "total_reports":        total,
            "dbscan_fake_clusters": len(flagged_clusters),
            "reports_in_clusters":  n_cluster_fake,
            "isolation_outliers":   n_if_outlier,
            "clusters":             clusters_out,
            "outliers":             outliers_out,
            "parameters": {
                "eps_deg":     eps,
                "min_samples": min_samp,
                "sklearn_available": _SK,
            },
        }
