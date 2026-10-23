"""
truePin Agent Runtime
=====================
A ReAct-style (Reasoning + Acting) agent that chains truePin skills to
complete multi-step safety verification tasks autonomously.

Routing modes:
  1. LLM routing  — uses Gemini Flash (ai_reasoner skill) to decide which
                    skill to call next based on natural language understanding.
  2. Plan routing — pre-defined skill sequences for common task archetypes.
  3. Keyword routing — fallback when Gemini is unavailable.

Pattern per step:
  THINK → ai_reasoner (Gemini) picks the best skill for this step
  ACT   → execute chosen skill via skill_registry
  OBS   → observe result, update accumulated context
  REPEAT (up to max_steps)
  ANSWER → ai_reasoner generates final natural-language summary

Exposed via FastAPI:
  POST /api/agent/run       { task, context, max_steps }
  GET  /api/agent/plans
"""

from __future__ import annotations

import os
import time
from typing import Any, Dict, List, Optional

from skills.registry import skill_registry

_GEMINI_KEY = os.environ.get("GEMINI_API_KEY", "")


# ---------------------------------------------------------------------------
# Keyword routing rules (fallback when Gemini unavailable)
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
        "reason":   "Task requires preparing a civic complaint via the TinyFish Web Agent",
    },
    {
        "keywords": ["explain", "reason", "analyse", "analyze", "why", "understand", "narrative"],
        "skill":    "ai_reasoner",
        "reason":   "Task requires LLM-powered explanation and reasoning",
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
        "ai_reasoner",    # LLM explains verdict + recommends action at the end
        "civic_reporter",
    ],
    "full_verify_ai": [   # AI-driven version: LLM routes every step
        "trust_scorer",
        "osint_agent",
        "ai_reasoner",
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
    "explain_only": [
        "trust_scorer",
        "ai_reasoner",
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
    if "explain" in t or "reason" in t or "why" in t:
        return TASK_PLANS["explain_only"]
    return None


# ---------------------------------------------------------------------------
# LLM-powered routing (Gemini Flash decides next skill)
# ---------------------------------------------------------------------------

async def _llm_choose_skill(
    task: str,
    used_skills: set,
    accumulated: Dict[str, Any],
) -> Optional[Dict[str, Any]]:
    """
    Ask Gemini Flash which skill to call next.
    Returns {"skill_name": str, "reason": str} or None if done.
    Falls back to keyword routing if Gemini unavailable.
    """
    if not _GEMINI_KEY or "ai_reasoner" not in skill_registry:
        return _choose_skill(task, used_skills)

    available = [s for s in skill_registry.names() if s not in used_skills]
    if not available:
        return None

    result = await skill_registry.execute(
        "ai_reasoner",
        mode="route_task",
        task=task,
        available_skills=available,
        used_skills=list(used_skills),
        accumulated_context={k: str(v)[:100] for k, v in accumulated.items()},
    )

    if result.get("ai_powered"):
        accumulated["_gemini_used"] = True
    chosen = result.get("chosen_skill", "DONE")
    if chosen == "DONE" or not result.get("should_continue", True):
        return None

    if chosen in skill_registry and chosen not in used_skills:
        return {"skill": chosen, "reason": result.get("reason", "LLM-selected skill")}

    # LLM chose something invalid — fall back to keyword routing
    return _choose_skill(task, used_skills)


# ---------------------------------------------------------------------------
# Agent runner
# ---------------------------------------------------------------------------

async def run_agent(
    task: str,
    context: Dict[str, Any],
    max_steps: int = 4,
    use_llm_routing: bool = True,
) -> Dict[str, Any]:
    """
    Execute the ReAct agent loop.

    When GEMINI_API_KEY is set and use_llm_routing=True, Gemini Flash decides
    which skill to call at each step (true AI agent behaviour).
    Falls back to keyword routing when Gemini is unavailable.

    Args:
        task:             Natural-language task description.
        context:          Initial parameters (lat, lng, zone_name, etc.)
        max_steps:        Maximum reasoning-action cycles.
        use_llm_routing:  Whether to use Gemini for step-routing.

    Returns:
        Structured dict with: steps, routing_mode, final_answer, duration_ms.
    """
    t_start = time.perf_counter()
    steps: List[Dict[str, Any]] = []
    accumulated: Dict[str, Any] = dict(context)
    used_skills: set = set()
    routing_mode = "llm" if (_GEMINI_KEY and use_llm_routing) else "keyword"

    # ------------------------------------------------------------------
    # THINK — choose a plan or route step-by-step
    # ------------------------------------------------------------------
    plan = _detect_plan(task)
    plan_skills = list(plan) if plan else []

    for step_idx in range(max_steps):
        # Choose the next skill
        if plan_skills:
            skill_name = plan_skills.pop(0)
            reason = f"Plan step {step_idx + 1}: {skill_name}"
            routing_mode = "plan"
        elif use_llm_routing and _GEMINI_KEY:
            # LLM routing — Gemini decides
            chosen = await _llm_choose_skill(task, used_skills, accumulated)
            if not chosen:
                steps.append({
                    "step": step_idx + 1,
                    "thought": "Gemini determined task is complete.",
                    "action": None,
                    "observation": None,
                })
                break
            skill_name = chosen["skill"]
            reason = chosen["reason"]
        else:
            # Keyword routing fallback
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
        if skill_name == "ai_reasoner" and result.get("ai_powered"):
            accumulated["_gemini_used"] = True

        steps.append({
            "step":        step_idx + 1,
            "thought":     thought,
            "routing":     routing_mode,
            "action":      {"skill": skill_name, "kwargs": skill_kwargs},
            "observation": result,
        })

        # Civic dispatch is the last step of a chain
        if skill_name == "civic_reporter" and not plan_skills:
            break

    # ------------------------------------------------------------------
    # ANSWER — LLM generates final summary if Gemini available
    # ------------------------------------------------------------------
    if _GEMINI_KEY and "trust_scorer" in used_skills and "ai_reasoner" not in used_skills:
        # Auto-add an ai_reasoner explanation step as the final answer
        try:
            ai_kwargs = _build_kwargs("ai_reasoner", accumulated, context)
            ai_kwargs["mode"] = "explain_verdict"
            ai_result = await skill_registry.execute("ai_reasoner", **ai_kwargs)
            accumulated["ai_explanation"]   = ai_result.get("explanation", "")
            accumulated["ai_confidence"]    = ai_result.get("confidence", "")
            accumulated["ai_false_pos_risk"]= ai_result.get("false_positive_risk", "")
            if ai_result.get("ai_powered"):
                accumulated["_gemini_used"] = True
            used_skills.add("ai_reasoner")
        except Exception:
            pass  # silently skip if ai_reasoner not registered

    final_answer = _build_answer(task, steps, accumulated)

    return {
        "task":                task,
        "routing_mode":        routing_mode,
        # True only if Gemini actually answered at least once in this run
        "llm_powered":         bool(accumulated.get("_gemini_used")),
        "gemini_configured":   bool(_GEMINI_KEY),
        "plan_used":           "predefined" if plan else "dynamic",
        "steps":               steps,
        "total_skills_called": len(used_skills),
        "skills_called":       list(used_skills),
        "final_answer":        final_answer,
        "ai_explanation":      accumulated.get("ai_explanation", ""),
        "accumulated_context": {k: v for k, v in accumulated.items() if not k.startswith("_")},
        "duration_ms":         round((time.perf_counter() - t_start) * 1000, 2),
    }


def _build_kwargs(skill_name: str, acc: Dict[str, Any], ctx: Dict[str, Any]) -> Dict[str, Any]:
    """Extract the right kwargs for each skill from accumulated context."""
    base = {**ctx}

    if skill_name == "trust_scorer":
        return {k: acc.get(k, base.get(k)) for k in [
            "lat", "lng", "user_id", "asn_type", "report_type",
            "kinematic_variance", "account_age_days", "has_gps_breadcrumbs",
            "approach_speed_kmh", "ip_address", "save_to_map",
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

    if skill_name == "ai_reasoner":
        # Feed the full accumulated trust + OSINT context to Gemini
        return {
            "mode":         acc.get("ai_mode", "explain_verdict"),
            "verdict":      acc.get("verdict", base.get("verdict", "")),
            "final_score":  acc.get("current_trust_score", 50),
            "zone_name":    acc.get("zone_name", base.get("zone_name", "")),
            "lat":          acc.get("lat", base.get("lat", "")),
            "lng":          acc.get("lng", base.get("lng", "")),
            "report_type":  acc.get("report_type", base.get("report_type", "")),
            "asn_type":     acc.get("asn_type", base.get("asn_type", "")),
            "kinematic_variance": acc.get("kinematic_variance", base.get("kinematic_variance", 0)),
            "account_age_days":   acc.get("account_age_days", base.get("account_age_days", 0)),
            "layer_log":    acc.get("layer_log", []),
            "osint_verdict": acc.get("osint_verdict", ""),
            "osint_sources": acc.get("osint_sources", []),
        }

    return base


def _merge_context(acc: Dict[str, Any], skill_name: str, result: Dict[str, Any]) -> None:
    """Feed skill outputs back into the accumulated context for the next step."""
    if skill_name == "trust_scorer":
        acc["current_trust_score"] = result.get("final_score", acc.get("current_trust_score", 50))
        acc["verdict"]             = result.get("verdict")
        acc["layer_log"]           = result.get("layer_log", [])
        acc["incident_type"]       = result.get("report_type", acc.get("incident_type", "SAFETY_INCIDENT"))

    if skill_name == "osint_agent":
        acc["osint_verdict"]   = result.get("corroboration_verdict")
        acc["trust_score_delta"] = result.get("trust_score_delta", 0)
        acc["ticket_id"]       = result.get("ticket_id")
        acc["web_agent_outcome"] = result.get("web_agent_outcome")
        acc["web_agent_message"] = result.get("web_agent_message")
        if result.get("success") is False:
            acc["osint_error"] = result.get("error")
        acc["osint_sources"]   = result.get("sources", [])

    if skill_name == "anomaly_detector":
        acc["anomaly_verdict"] = result.get("anomaly_verdict")
        acc["anomaly_flagged"] = result.get("reports_in_clusters", 0) > 0

    if skill_name == "ai_reasoner":
        acc["ai_explanation"]    = result.get("explanation", "")
        acc["ai_confidence"]     = result.get("confidence", "")
        acc["ai_risk_level"]     = result.get("risk_level", "")
        acc["ai_recommendation"] = result.get("recommended_action", "")


def _build_answer(task: str, steps: List[Dict], acc: Dict[str, Any]) -> str:
    """Build the final answer — uses Gemini explanation if available."""
    # If we have an LLM explanation, use it as the primary answer
    if acc.get("ai_explanation"):
        parts = [acc["ai_explanation"]]
        if acc.get("ai_risk_level"):
            parts.append(f"Risk level: {acc['ai_risk_level']}.")
        if acc.get("ai_recommendation"):
            parts.append(f"Recommendation: {acc['ai_recommendation']}")
        if acc.get("web_agent_message"):
            parts.append(acc["web_agent_message"])
        return " ".join(parts)

    # Fallback: rule-based summary
    parts = [f"Completed task: '{task}'.", f"Executed {len(steps)} agent step(s)."]
    if "verdict" in acc:
        parts.append(f"Trust verdict: {acc['verdict']} (score: {acc.get('current_trust_score', '?')}).")
    if "osint_verdict" in acc:
        delta = acc.get("trust_score_delta", 0)
        parts.append(
            f"OSINT corroboration: {acc['osint_verdict']} "
            f"({'+'if delta >= 0 else ''}{delta} trust delta)."
        )
    if acc.get("web_agent_message"):
        parts.append(acc["web_agent_message"])
    if acc.get("osint_error"):
        parts.append(f"TinyFish OSINT failed: {acc['osint_error']}.")
    if "anomaly_verdict" in acc:
        parts.append(f"Anomaly analysis: {acc['anomaly_verdict']}.")
    return " ".join(parts)
