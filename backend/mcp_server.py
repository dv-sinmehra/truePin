"""
truePin MCP Server
==================
A real Model Context Protocol (MCP) server that exposes all four truePin
skills as MCP tools.  Built with FastMCP (official Python MCP SDK).

Transport: Streamable HTTP (stateless, JSON responses) served at /mcp by the FastAPI app.

Any MCP client (Claude, Cursor, MCP Inspector, other agents) can connect to:
    https://truepin.onrender.com/mcp

Requirements for this to work when hosted inside FastAPI (see main.py):
  * the FastAPI lifespan must run `mcp_lifespan()` (starts the session manager)
  * the app is mounted at "/" AFTER all other routes, so the endpoint is exactly /mcp
  * the public hostname must be in the transport-security allowlist (else HTTP 421)

Tools exposed:
  - verify_safety_report   → 5-layer trust pipeline
  - run_osint_corroboration → TinyFish Search + Fetch + Web Agent (live)
  - detect_anomalies       → DBSCAN + IsolationForest batch analysis
  - file_civic_ticket      → MCD civic complaint path via TinyFish Web Agent (read-only)
  - list_skills            → Discovery — returns all registered skills
  - get_system_metrics     → Live trust-engine KPI snapshot
  - analyze_and_explain    → Gemini explanation of a verdict
"""

from __future__ import annotations

import contextlib
import os
import time
from typing import Any, Dict, List, Optional

# ---------------------------------------------------------------------------
# MCP SDK import. v2 calls the server class MCPServer; v1 called it FastMCP.
# If the package is missing, a small shim below explains that at /mcp.
# ---------------------------------------------------------------------------
try:
    from mcp.server import MCPServer as FastMCP  # mcp v2
    _MCP_V2 = True
    _MCP_AVAILABLE = True
except ImportError:
    try:
        from mcp.server.fastmcp import FastMCP  # mcp v1
        _MCP_V2 = False
        _MCP_AVAILABLE = True
    except ImportError:
        _MCP_AVAILABLE = False
        FastMCP = None  # type: ignore

try:
    from mcp.server.transport_security import TransportSecuritySettings
except ImportError:  # very old SDKs had no transport security
    TransportSecuritySettings = None  # type: ignore


def _allowed_hosts() -> List[str]:
    """Hostnames MCP will answer for. Render sets RENDER_EXTERNAL_HOSTNAME automatically."""
    hosts = {"truepin.onrender.com", "localhost", "127.0.0.1"}
    if os.environ.get("RENDER_EXTERNAL_HOSTNAME"):
        hosts.add(os.environ["RENDER_EXTERNAL_HOSTNAME"])
    hosts.update(h.strip() for h in os.environ.get("MCP_ALLOWED_HOSTS", "").split(",") if h.strip())
    return sorted(hosts | {f"{h}:*" for h in hosts})


def _allowed_origins() -> List[str]:
    """Browser origins allowed to call /mcp (server-side MCP clients send no Origin)."""
    origins = {"https://truepin-frontend.onrender.com", "http://localhost:5173", "http://localhost:8000"}
    origins.update(o.strip() for o in os.environ.get("MCP_ALLOWED_ORIGINS", "").split(",") if o.strip())
    return sorted(origins)


_TRANSPORT_OPTS: Dict[str, Any] = {
    "streamable_http_path": "/mcp",
    "stateless_http": True,   # no session stickiness needed — fine on Render restarts
    "json_response": True,    # plain JSON replies; simplest for any client
}
if TransportSecuritySettings is not None:
    _TRANSPORT_OPTS["transport_security"] = TransportSecuritySettings(
        allowed_hosts=_allowed_hosts(),
        allowed_origins=_allowed_origins(),
    )

from skills.registry import skill_registry


# ---------------------------------------------------------------------------
# Create the FastMCP server instance
# ---------------------------------------------------------------------------
if _MCP_AVAILABLE:
    _server_kwargs: Dict[str, Any] = {} if _MCP_V2 else dict(_TRANSPORT_OPTS)  # v1 takes them here
    mcp = FastMCP(
        **_server_kwargs,
        name="truePin Trust Engine",
        instructions=(
            "truePin is a 5-layer adversarial trust engine for women's safety maps in Delhi. "
            "Use these tools to: verify safety pin-drops, run live-web OSINT corroboration, "
            "detect coordinated fake-report clusters, prepare civic complaints, get a Gemini "
            "explanation of a verdict, and inspect the real-time trust-engine metrics."
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
        kinematic_variance: float = 1.0,
        account_age_days: int = 30,
        has_gps_breadcrumbs: bool = True,
        approach_speed_kmh: float = 4.0,
        ip_address: str = "127.0.0.1",
        save_to_map: bool = True,
    ) -> Dict[str, Any]:
        """
        Run a safety report through truePin's real 5-layer trust pipeline — the same code
        the website uses (POST /api/report).

        Layer 1 — CGNAT, ASN & kinematics filter (ISP type, device entropy, GPS motion)
        Layer 2 — DBSCAN spatio-temporal clustering over recent reports (Sybil raid detection)
        Layer 3 — Bayesian user-trust graph + target-trust divergence
        Layer 4 — IsolationForest behavioural drift detection
        Layer 5 — Solo proof-of-presence boost / multi-party corroboration

        asn_type: MOBILE_ISP | CAMPUS_WIFI | RESIDENTIAL_BROADBAND | DATACENTER_VPS.
        save_to_map=True adds the report to the live map, like a normal submission.
        Returns: per-layer scores, layer log, final trust score 0–100, verdict
        VERIFIED (≥75) | SOFT_ALERT (≥35) | QUARANTINED.
        """
        return await skill_registry.execute(
            "trust_scorer",
            lat=lat, lng=lng, user_id=user_id, asn_type=asn_type,
            report_type=report_type, kinematic_variance=kinematic_variance,
            account_age_days=account_age_days, has_gps_breadcrumbs=has_gps_breadcrumbs,
            approach_speed_kmh=approach_speed_kmh, ip_address=ip_address,
            save_to_map=save_to_map,
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

        Real TinyFish API calls (no mock data):
        - TinyFish Search API: queries the live web for local news / civic alerts for the zone
        - TinyFish Fetch API:  extracts the full text of the top result pages
        - TinyFish Web Agent:  for corroborated hazards, reads the live MCD Online portal and
                               prepares the complaint filing path (read-only, never submits)

        Returns: CORROBORATED_HAZARD (+18), UNVERIFIED (0) or DEFAMATION_MISMATCH (-30),
        the real web sources found, and the Web Agent outcome. Errors are returned, not faked.
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
        Prepare a civic patrol / complaint dispatch on the MCD Online portal.

        Uses the live TinyFish Web Agent to open the civic portal, find the complaint page and
        read the filing steps, required fields and helplines. Read-only: it never submits a form.
        Returns outcome, complaint page, steps and the TinyFish run_id. Errors are returned, not faked.
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
        # Same numbers as the dashboard (GET /api/state). Lazy import avoids a circular import.
        try:
            import main  # type: ignore
            return {
                **main.compute_metrics(),
                "active_users": len(main.USER_TRUST),
                "timestamp":    time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            }
        except Exception as exc:
            return {
                "error":     str(exc),
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            }

    @mcp.tool()
    async def analyze_and_explain(
        verdict: str,
        final_score: float,
        zone_name: str = "Delhi",
        layer_log: Optional[List[str]] = None,
        osint_verdict: str = "",
        report_type: str = "INCIDENT",
    ) -> Dict[str, Any]:
        """
        Use Google Gemini to explain WHY a safety report received its verdict.
        Returns explanation, key_signals, confidence and false_positive_risk.
        Check `ai_powered`: true = Gemini answered (see `model`); false = Gemini was not
        available and a rule-based explanation was returned (see `fallback_reason`).
        """
        return await skill_registry.execute(
            "ai_reasoner",
            mode="explain_verdict",
            verdict=verdict,
            final_score=final_score,
            zone_name=zone_name,
            layer_log=layer_log or [],
            osint_verdict=osint_verdict,
            report_type=report_type,
        )

    # Build the ASGI app once, at import time (session_manager exists only after this)
    _MCP_APP = mcp.streamable_http_app(**_TRANSPORT_OPTS) if _MCP_V2 else mcp.streamable_http_app()

    def get_mcp_asgi_app():
        """ASGI app serving the MCP endpoint at /mcp. Mount it at "/" after all other routes."""
        return _MCP_APP

    @contextlib.asynccontextmanager
    async def mcp_lifespan():
        """Run inside the FastAPI lifespan — a mounted app's own lifespan never runs."""
        async with mcp.session_manager.run():
            yield

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
        return Starlette(routes=[Route("/mcp", _mcp_unavailable, methods=["GET", "POST", "DELETE"])])

    @contextlib.asynccontextmanager
    async def mcp_lifespan():
        yield
