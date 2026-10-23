"""
truePin MCP Server
==================
A real Model Context Protocol (MCP) server that exposes all four truePin
skills as MCP tools.  Built with FastMCP (official Python MCP SDK).

Transport: Streamable HTTP — mounted at /mcp inside the FastAPI app.

Judges / MCP clients can connect to:
    https://truepin.onrender.com/mcp

Tools exposed:
  - verify_safety_report   → 5-layer trust pipeline
  - run_osint_corroboration → TinyFish Search + Fetch + Web Agent
  - detect_anomalies       → DBSCAN + IsolationForest batch analysis
  - file_civic_ticket      → MCD / Delhi Police patrol dispatch
  - list_skills            → Discovery — returns all registered skills
  - get_system_metrics     → Live trust-engine KPI snapshot
"""

from __future__ import annotations

import time
from typing import Any, Dict, List, Optional

# ---------------------------------------------------------------------------
# FastMCP import — falls back to a minimal shim if not installed so the
# FastAPI app still starts even when `mcp` is missing from the environment.
# ---------------------------------------------------------------------------
try:
    from mcp.server.mcpserver import MCPServer as FastMCP
    _MCP_AVAILABLE = True
except ImportError:
    _MCP_AVAILABLE = False
    FastMCP = None  # type: ignore

from skills.registry import skill_registry


# ---------------------------------------------------------------------------
# Create the FastMCP server instance
# ---------------------------------------------------------------------------
if _MCP_AVAILABLE:
    mcp = FastMCP(
        name="truePin Trust Engine",
        instructions=(
            "truePin is a 5-layer adversarial trust engine for women's safety maps in Delhi. "
            "Use these tools to: verify safety pin-drops, run live-web OSINT corroboration, "
            "detect coordinated fake-report clusters, auto-file civic patrol tickets, and "
            "inspect the real-time trust-engine metrics dashboard."
        ),
    )

    # -----------------------------------------------------------------------
    # Tool 1: verify_safety_report
    # -----------------------------------------------------------------------
    @mcp.tool()
    async def verify_safety_report(
        lat: float,
        lng: float,
        user_id: str = "u_anon",
        asn_type: str = "MOBILE_ISP",
        report_type: str = "INCIDENT",
        kinematic_variance: float = 0.4,
        account_age_days: int = 30,
        reports_last_min: int = 1,
    ) -> Dict[str, Any]:
        """
        Run the full 5-layer adversarial trust pipeline on a single safety report.

        Layer 1 — Network & Kinematic Fingerprinting (ISP type, GPS motion, account age)
        Layer 2 — DBSCAN Spatial Cluster Anomaly (coordinated fake-report flood detection)
        Layer 3 — Temporal Divergence (inhuman report velocity check)
        Layer 4 — IsolationForest Anomaly Scoring (statistical outlier in lat/lng space)
        Layer 5 — Proximity Boost (reward reports near police stations / metro entrances)

        Returns: per-layer scores, final trust score 0–100, verdict VERIFIED|SOFT_ALERT|QUARANTINED.
        """
        return await skill_registry.execute(
            "trust_scorer",
            lat=lat, lng=lng, user_id=user_id, asn_type=asn_type,
            report_type=report_type, kinematic_variance=kinematic_variance,
            account_age_days=account_age_days, reports_last_min=reports_last_min,
        )

    # -----------------------------------------------------------------------
    # Tool 2: run_osint_corroboration
    # -----------------------------------------------------------------------
    @mcp.tool()
    async def run_osint_corroboration(
        lat: float,
        lng: float,
        zone_name: str = "Connaught Place",
        current_trust_score: float = 60.0,
        report_type: str = "INCIDENT",
    ) -> Dict[str, Any]:
        """
        Run TinyFish Search API + Fetch API + Web Agent OSINT pipeline for a Delhi zone.

        - TinyFish Search API: queries live web for civic alerts, safety scores, patrol advisories
        - TinyFish Fetch API:  extracts structured content from MCD, Safetipin, Delhi Police pages
        - TinyFish Web Agent:  autonomously files a patrol dispatch ticket on MCD Online portal

        Returns: CORROBORATED_HAZARD (+18 trust) or DEFAMATION_MISMATCH (-30 trust),
        live web sources, and a civic ticket ID.
        """
        return await skill_registry.execute(
            "osint_agent",
            lat=lat, lng=lng, zone_name=zone_name,
            current_trust_score=current_trust_score, report_type=report_type,
        )

    # -----------------------------------------------------------------------
    # Tool 3: detect_anomalies
    # -----------------------------------------------------------------------
    @mcp.tool()
    async def detect_anomalies(
        reports: List[Dict[str, Any]],
        eps_deg: float = 0.001,
        min_samples: int = 3,
    ) -> Dict[str, Any]:
        """
        Run DBSCAN + IsolationForest anomaly detection on a batch of safety reports.

        DBSCAN (eps=0.001°, ~111m): identifies clusters of ≥ min_samples coordinated reports.
        IsolationForest (contamination=12%): flags statistically anomalous lat/lng pairs.

        Each report in the list must have: lat, lng, report_id fields.
        Returns: cluster membership, outlier flags, overall anomaly verdict.
        """
        return await skill_registry.execute(
            "anomaly_detector",
            reports=reports, eps_deg=eps_deg, min_samples=min_samples,
        )

    # -----------------------------------------------------------------------
    # Tool 4: file_civic_ticket
    # -----------------------------------------------------------------------
    @mcp.tool()
    async def file_civic_ticket(
        zone_name: str,
        lat: float,
        lng: float,
        incident_type: str = "SAFETY_INCIDENT",
        priority: str = "HIGH",
        notes: str = "",
    ) -> Dict[str, Any]:
        """
        File an automated patrol dispatch ticket on MCD Online / Delhi Police PCR portal.

        Uses TinyFish Web Agent to autonomously navigate to the civic portal,
        fill the complaint form, and submit it.  Returns ticket_id, portal, and steps executed.
        Falls back to a simulated ticket if TINYFISH_API_KEY is not set.
        """
        return await skill_registry.execute(
            "civic_reporter",
            zone_name=zone_name, lat=lat, lng=lng,
            incident_type=incident_type, priority=priority, notes=notes,
        )

    # -----------------------------------------------------------------------
    # Tool 5: list_skills
    # -----------------------------------------------------------------------
    @mcp.tool()
    async def list_skills() -> Dict[str, Any]:
        """
        Return all registered truePin skills with their names, descriptions,
        versions, and input schemas.  Use this for skill discovery before
        chaining tools in an agent loop.
        """
        return {
            "skills":      skill_registry.list_all(),
            "total":       len(skill_registry.names()),
            "skill_names": skill_registry.names(),
        }

    # -----------------------------------------------------------------------
    # Tool 6: get_system_metrics
    # -----------------------------------------------------------------------
    @mcp.tool()
    async def get_system_metrics() -> Dict[str, Any]:
        """
        Return a live snapshot of the truePin trust-engine metrics:
        fake_detection_rate, genuine_suppression_rate, map_reliability,
        total reports processed, verdict distribution, and uptime.
        """
        # Import the live state from main app (lazy import to avoid circular deps)
        try:
            from main import REPORTS, USER_TRUST  # type: ignore

            total     = len(REPORTS)
            verified  = sum(1 for r in REPORTS if r.final_score >= 55)
            soft      = sum(1 for r in REPORTS if 35 <= r.final_score < 55)
            quaran    = sum(1 for r in REPORTS if r.final_score < 35)
            fdr = round((quaran / total * 100), 1) if total > 0 else 0.0
            gsr = round((soft / total * 100), 1) if total > 0 else 0.0

            return {
                "total_reports":        total,
                "verified":             verified,
                "soft_alert":           soft,
                "quarantined":          quaran,
                "fake_detection_rate":  fdr,
                "genuine_suppression_rate": gsr,
                "map_reliability_before": 100.0,
                "map_reliability_after":  round(100 - gsr, 1),
                "active_users":         len(USER_TRUST),
                "timestamp":            time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            }
        except Exception as exc:
            return {
                "error":    str(exc),
                "message":  "Metrics unavailable — run a simulator scenario first",
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            }

    @mcp.tool()
    async def analyze_and_explain(
        verdict: str,
        final_score: float,
        zone_name: str = "Delhi",
        layer_log: list = [],
        osint_verdict: str = "",
        report_type: str = "INCIDENT"
    ) -> dict:
        """
        Use Gemini Flash LLM to explain WHY a safety report received its verdict
        and recommend the appropriate civic authority action.
        Returns structured JSON with ai_explanation, ai_confidence, ai_recommendation.
        Falls back gracefully to rule-based analysis when GEMINI_API_KEY is not set.
        """
        return await skill_registry.execute(
            "ai_reasoner",
            mode="explain_verdict",
            verdict=verdict,
            final_score=final_score,
            zone_name=zone_name,
            layer_log=layer_log,
            osint_verdict=osint_verdict,
            report_type=report_type,
        )

    def get_mcp_asgi_app():
        """Return the ASGI app for mounting into FastAPI at /mcp."""
        return mcp.streamable_http_app()

else:
    # -----------------------------------------------------------------------
    # Shim: mcp package not installed — return a minimal ASGI app that
    # explains the situation rather than crashing the whole server.
    # -----------------------------------------------------------------------
    from starlette.applications import Starlette
    from starlette.responses import JSONResponse
    from starlette.routing import Route

    async def _mcp_unavailable(request):
        return JSONResponse(
            {
                "error": "MCP server unavailable",
                "reason": "The `mcp` Python package is not installed.",
                "install": "pip install mcp",
                "skills_api": "/api/skills",
                "agent_api":  "/api/agent/run",
            },
            status_code=503,
        )

    def get_mcp_asgi_app():
        return Starlette(routes=[Route("/{path:path}", _mcp_unavailable)])
