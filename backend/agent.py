"""
truePin Agent Runtime
=====================
A lightweight ReAct-style (Reasoning + Acting) agent that chains truePin skills
to complete multi-step safety verification tasks autonomously.

Pattern:
  THINK → choose the next skill to call
  ACT   → execute it via the skills registry
  OBS   → observe the result and update context
  REPEAT (up to max_steps)
  ANSWER → return final structured response

Exposed via FastAPI at:
  POST /api/agent/run
  Body: { "task": str, "context": {...}, "max_steps": int }

Example tasks:
  "Verify this report and file a civic ticket if it's real"
  "Detect if these 10 pins are a coordinated fake-report cluster"
  "Run full OSINT on Hauz Khas and return the trust adjustment"
"""

from __future__ import annotations

import time
from typing import Any, Dict, List, Optional

from skills.registry import skill_registry


# ---------------------------------------------------------------------------
# Task → skill routing rules
# ---------------------------------------------------------------------------

_TASK_ROUTING: List[Dict[str, Any]] = [
    {
        "keywords": ["verify", "trust", "score", "pipeline", "layer", "report"],
        "skill":    "trust_scorer",
        "reason":   "Task requires running the 5-layer adversarial trust pipeline",
    },
    {
        "keywords": ["osint", "corroborate", "tinyfish", "web", "search", "fetch", "civic alert"],
        "skill":    "osint_agent",
        "reason":   "Task requires live-web OSINT corroboration via TinyFish",
    },
    {
        "keywords": ["anomaly", "cluster", "dbscan", "isolation", "batch", "flood", "coordinated"],
        "skill":    "anomaly_detector",
        "reason":   "Task requires DBSCAN + IsolationForest batch anomaly analysis",
    },
    {
        "keywords": ["ticket", "civic", "file", "patrol", "dispatch", "mcd", "police"],
        "skill":    "civic_reporter",
        "reason":   "Task requires filing an automated civic patrol dispatch ticket",
    },
]


def _choose_skill(task: str, used: set) -> Optional[Dict[str, Any]]:
    """Pick the best unused skill for this task based on keyword matching."""
    task_lower = task.lower()
    for rule in _TASK_ROUTING:
        if rule["skill"] in used:
            continue
        if any(kw in task_lower for kw in rule["keywords"]):
            return rule
    return None


# ---------------------------------------------------------------------------
# Predefined multi-step plans for common task archetypes
# ---------------------------------------------------------------------------

TASK_PLANS: Dict[str, List[str]] = {
    "full_verify": [
        "trust_scorer",
        "osint_agent",
        "civic_reporter",
    ],
    "anomaly_then_score": [
        "anomaly_detector",
        "trust_scorer",
    ],
    "osint_only": [
        "osint_agent",
    ],
    "ticket_only": [
        "civic_reporter",
    ],
}


def _detect_plan(task: str) -> Optional[List[str]]:
    """Return a pre-defined plan if the task matches a known archetype."""
    t = task.lower()
    if ("full" in t or "complete" in t) and ("verify" in t or "all" in t):
        return TASK_PLANS["full_verify"]
    if "anomaly" in t and ("score" in t or "verify" in t):
        return TASK_PLANS["anomaly_then_score"]
    if ("osint" in t or "corroborate" in t) and "ticket" not in t:
        return TASK_PLANS["osint_only"]
    if "ticket" in t and "verify" not in t:
        return TASK_PLANS["ticket_only"]
    return None


# ---------------------------------------------------------------------------
# Agent runner
# ---------------------------------------------------------------------------

async def run_agent(
    task: str,
    context: Dict[str, Any],
    max_steps: int = 4,
) -> Dict[str, Any]:
    """
    Execute the ReAct agent loop.

    Args:
        task:      Natural-language task description.
        context:   Initial parameters (lat, lng, zone_name, reports, etc.)
        max_steps: Maximum reasoning-action cycles.

    Returns:
        Structured dict with: steps, final_answer, total_skills_called, duration_ms.
    """
    t_start = time.perf_counter()
    steps: List[Dict[str, Any]] = []
    accumulated: Dict[str, Any] = dict(context)
    used_skills: set = set()

    # ------------------------------------------------------------------
    # THINK — choose a plan or reason step-by-step
    # ------------------------------------------------------------------
    plan = _detect_plan(task)
    plan_skills = list(plan) if plan else []

    for step_idx in range(max_steps):
        # Choose the next skill
        if plan_skills:
            skill_name = plan_skills.pop(0)
            reason = f"Executing step {step_idx + 1} of pre-defined plan: {skill_name}"
        else:
            chosen = _choose_skill(task, used_skills)
            if not chosen:
                steps.append({
                    "step": step_idx + 1,
                    "thought": "No more applicable skills found for this task.",
                    "action": None,
                    "observation": None,
                })
                break
            skill_name = chosen["skill"]
            reason = chosen["reason"]

        if skill_name in used_skills:
            continue
        used_skills.add(skill_name)

        # ACT — build kwargs from accumulated context
        skill_kwargs = _build_kwargs(skill_name, accumulated, context)

        # THINK log
        thought = (
            f"Step {step_idx + 1}: {reason}. "
            f"Calling skill '{skill_name}' with context keys: {list(skill_kwargs.keys())}."
        )

        # Execute
        result = await skill_registry.execute(skill_name, **skill_kwargs)

        # OBS — merge relevant outputs back into accumulated context
        _merge_context(accumulated, skill_name, result)

        steps.append({
            "step":        step_idx + 1,
            "thought":     thought,
            "action":      {"skill": skill_name, "kwargs": skill_kwargs},
            "observation": result,
        })

        # Early termination if civic ticket is filed (end of chain)
        if skill_name == "civic_reporter" and not plan_skills:
            break

    # ------------------------------------------------------------------
    # ANSWER — summarise
    # ------------------------------------------------------------------
    final_answer = _build_answer(task, steps, accumulated)

    return {
        "task":               task,
        "plan_used":          plan.__class__.__name__ if plan else "dynamic_routing",
        "steps":              steps,
        "total_skills_called": len(used_skills),
        "skills_called":      list(used_skills),
        "final_answer":       final_answer,
        "accumulated_context": accumulated,
        "duration_ms":        round((time.perf_counter() - t_start) * 1000, 2),
    }


def _build_kwargs(skill_name: str, acc: Dict[str, Any], ctx: Dict[str, Any]) -> Dict[str, Any]:
    """Extract the right kwargs for each skill from accumulated context."""
    base = {**ctx}  # start from original context

    if skill_name == "trust_scorer":
        return {k: acc.get(k, base.get(k)) for k in [
            "lat", "lng", "user_id", "asn_type", "report_type",
            "kinematic_variance", "account_age_days", "reports_last_min",
        ] if acc.get(k) is not None or base.get(k) is not None}

    if skill_name == "osint_agent":
        return {k: acc.get(k, base.get(k)) for k in [
            "lat", "lng", "zone_name", "current_trust_score", "report_type",
        ] if acc.get(k) is not None or base.get(k) is not None}

    if skill_name == "anomaly_detector":
        return {k: acc.get(k, base.get(k)) for k in [
            "reports", "eps_deg", "min_samples",
        ] if acc.get(k) is not None or base.get(k) is not None}

    if skill_name == "civic_reporter":
        return {k: acc.get(k, base.get(k)) for k in [
            "zone_name", "lat", "lng", "incident_type", "priority", "notes",
        ] if acc.get(k) is not None or base.get(k) is not None}

    return base


def _merge_context(acc: Dict[str, Any], skill_name: str, result: Dict[str, Any]) -> None:
    """Feed skill outputs back into the accumulated context for the next step."""
    if skill_name == "trust_scorer":
        acc["current_trust_score"] = result.get("final_score", acc.get("current_trust_score", 50))
        acc["verdict"]             = result.get("verdict")
        acc["incident_type"]       = result.get("report_type", acc.get("incident_type", "SAFETY_INCIDENT"))

    if skill_name == "osint_agent":
        acc["osint_verdict"]       = result.get("corroboration_verdict")
        acc["trust_score_delta"]   = result.get("trust_score_delta", 0)
        acc["ticket_id"]           = result.get("ticket_id")

    if skill_name == "anomaly_detector":
        acc["anomaly_verdict"]     = result.get("anomaly_verdict")
        acc["anomaly_flagged"]     = result.get("reports_in_clusters", 0) > 0


def _build_answer(task: str, steps: List[Dict], acc: Dict[str, Any]) -> str:
    """Build a natural-language final answer from the step outcomes."""
    parts = [f"Completed task: '{task}'."]
    parts.append(f"Executed {len(steps)} agent step(s).")

    if "verdict" in acc:
        parts.append(f"Trust verdict: {acc['verdict']} (score: {acc.get('current_trust_score', '?')}).")

    if "osint_verdict" in acc:
        delta = acc.get("trust_score_delta", 0)
        parts.append(
            f"OSINT corroboration: {acc['osint_verdict']} "
            f"({'+'if delta >= 0 else ''}{delta} trust delta)."
        )

    if acc.get("ticket_id"):
        parts.append(f"Civic patrol ticket filed: #{acc['ticket_id']}.")

    if "anomaly_verdict" in acc:
        parts.append(f"Anomaly analysis: {acc['anomaly_verdict']}.")

    return " ".join(parts)
