"""
Skill: civic_reporter
---------------------
Uses the real TinyFish Web Agent to open the live MCD Online civic portal and prepare a
patrol/civic complaint: it finds the complaint page and reads the filing steps, required
fields and helplines for the incident. It is READ-ONLY — it never submits a form to a
government portal, so no fake or test complaints are filed.

No simulation: if TINYFISH_API_KEY is missing or TinyFish fails, the skill raises and the
registry returns success=False with the real error.

Output: outcome (DISPATCH_READY | AGENT_RUNNING | AGENT_FAILED), complaint page, steps, run_id
"""

from __future__ import annotations

import time
from typing import Any, Dict

import tinyfish

from .registry import Skill


class CivicReporterSkill(Skill):
    name = "civic_reporter"
    description = (
        "Prepare a civic patrol / complaint dispatch for a Delhi incident using the live TinyFish "
        "Web Agent on the MCD Online portal: returns the real complaint page URL, filing steps, "
        "required fields and helplines. Read-only — never submits a form. "
        "Accepts zone, lat, lng, incident_type, priority."
    )
    version = "2.0.0"
    input_schema = {
        "zone_name":     {"type": "string",  "description": "Delhi zone name, e.g. 'Hauz Khas'"},
        "lat":           {"type": "number",  "description": "Incident latitude"},
        "lng":           {"type": "number",  "description": "Incident longitude"},
        "incident_type": {"type": "string",  "description": "E.g. STREETLIGHT_FAILURE, UNSAFE_HARASSMENT, CROWD_EMERGENCY"},
        "priority":      {"type": "string",  "description": "HIGH | MEDIUM | LOW"},
        "notes":         {"type": "string",  "description": "Optional free-text notes for the complaint"},
    }

    async def execute(self, **kwargs: Any) -> Dict[str, Any]:
        zone          = str(kwargs.get("zone_name", "Delhi"))
        lat           = float(kwargs.get("lat", 28.6315))
        lng           = float(kwargs.get("lng", 77.2167))
        incident_type = str(kwargs.get("incident_type", "SAFETY_INCIDENT")).upper()
        priority      = str(kwargs.get("priority", "HIGH")).upper()
        notes         = str(kwargs.get("notes", ""))

        run_id = await tinyfish.start_agent(
            tinyfish.CIVIC_PORTAL_URL,
            tinyfish.civic_portal_goal(zone, incident_type),
            output_schema=tinyfish.CIVIC_PORTAL_SCHEMA,
        )
        run = await tinyfish.wait_for_run(run_id)
        info = tinyfish.describe_agent_run(run)

        return {
            "outcome":        info["outcome"],
            "ticket_id":      None,  # read-only: nothing submitted, so no ticket number exists
            "run_id":         run_id,
            "portal":         info.get("portal", tinyfish.CIVIC_PORTAL_URL),
            "zone":           zone,
            "lat":            lat,
            "lng":            lng,
            "incident_type":  incident_type,
            "priority":       priority,
            "notes":          notes,
            "prepared_at":    time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "steps_executed": info.get("steps_executed", []),
            "agent_result":   info.get("agent_result"),
            "message":        info.get("message", ""),
            "source":         "live_tinyfish_api",
        }
