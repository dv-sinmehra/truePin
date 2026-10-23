"""
Skill: osint_agent
------------------
Wraps the TinyFish Search + Fetch + Web Agent OSINT pipeline as a skill.

Real TinyFish API calls only (backend/tinyfish.py). There is no hardcoded fallback:
if TINYFISH_API_KEY is missing or TinyFish fails, the skill raises and the registry
returns success=False with the real error.

Output: corroboration verdict, trust delta, live web sources, civic dispatch status.
"""

from __future__ import annotations

from typing import Any, Dict

import tinyfish

from .registry import Skill


class OsintAgentSkill(Skill):
    name = "osint_agent"
    description = (
        "Run TinyFish Search + Fetch (and, for corroborated hazards, the Web Agent) live-web OSINT "
        "corroboration for a Delhi location. Returns CORROBORATED_HAZARD (+18 trust), UNVERIFIED (0) "
        "or DEFAMATION_MISMATCH (-30 trust), the real web sources found, and the civic portal "
        "filing path the Web Agent read."
    )
    version = "2.0.0"
    input_schema = {
        "lat":                {"type": "number", "description": "Target latitude"},
        "lng":                {"type": "number", "description": "Target longitude"},
        "zone_name":          {"type": "string", "description": "Delhi zone name, e.g. 'Connaught Place'"},
        "current_trust_score":{"type": "number", "description": "Current report trust score (0–100)"},
        "report_type":        {"type": "string", "description": "Incident category"},
        "run_web_agent":      {"type": "boolean", "description": "Run the Web Agent step (uses TinyFish credit). Default true."},
    }

    async def execute(self, **kwargs: Any) -> Dict[str, Any]:
        data = await tinyfish.run_osint(
            zone=str(kwargs.get("zone_name", "Connaught Place")),
            lat=float(kwargs.get("lat", 28.6315)),
            lng=float(kwargs.get("lng", 77.2167)),
            report_type=str(kwargs.get("report_type", "INCIDENT")),
            trust_score=float(kwargs.get("current_trust_score", 60.0)),
            run_web_agent=bool(kwargs.get("run_web_agent", True)),
        )
        agent = data["web_agent_action"]
        return {
            "zone_name":             data["zone_name"],
            "lat":                   data["lat"],
            "lng":                   data["lng"],
            "corroboration_verdict": data["corroboration_verdict"],
            "corroboration_signals": data["corroboration_signals"],
            "trust_score_delta":     data["trust_score_adjustment"],
            "osint_status":          data["tinyfish_osint_status"],
            "ticket_id":             None,  # nothing is ever auto-submitted to a government portal
            "portal":                agent.get("portal"),
            "web_agent_outcome":     agent.get("outcome"),
            "web_agent_run_id":      agent.get("run_id"),
            "web_agent_message":     agent.get("message"),
            "sources": [
                {
                    "step":      s["step"],
                    "url":       s.get("url", ""),
                    "title":     s.get("title", ""),
                    "snippet":   (s.get("extracted_snippet") or "")[:500],
                    "relevance": s.get("relevance_score", 0.0),
                    "live_api_called": True,
                }
                for s in data["live_web_sources_scanned"]
            ],
            "apis_used":             data["tinyfish_apis_used"],
            "processing_time_ms":    data["processing_time_ms"],
            "source":                "live_tinyfish_api",
        }
