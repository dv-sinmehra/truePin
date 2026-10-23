"""
tinyfish.py — the ONE place truePin talks to TinyFish.

Real API calls only. No mock data, no silent fallback: if a call fails it raises
TinyFishError with the real reason (missing key, 401, rate limit, timeout ...).

Endpoints (docs.tinyfish.ai):
  Search : GET  https://api.search.tinyfish.ai/?query=...           (free daily allowance)
  Fetch  : POST https://api.fetch.tinyfish.ai/   {"urls": [...]}    (free daily allowance)
  Agent  : POST https://agent.tinyfish.ai/v1/automation/run-async  -> run_id  (wallet credit)
           GET  https://agent.tinyfish.ai/v1/runs/{run_id}          -> status/result
Auth     : header  X-API-Key: <TINYFISH_API_KEY>
"""

from __future__ import annotations

import asyncio
import os
import re
import time
from typing import Any, Dict, List, Optional

import httpx

SEARCH_URL = "https://api.search.tinyfish.ai"
FETCH_URL = "https://api.fetch.tinyfish.ai"
AGENT_URL = "https://agent.tinyfish.ai/v1"
TERMINAL = {"COMPLETED", "FAILED", "CANCELLED"}

# How long the OSINT endpoint waits for the Web Agent before handing back a run_id
AGENT_MAX_WAIT_S = float(os.environ.get("TINYFISH_AGENT_MAX_WAIT", "75"))

SKIP_DOMAINS = ("facebook.com", "instagram.com", "youtube.com", "twitter.com",
                "x.com", "tiktok.com", "pinterest.com")

HAZARD_KEYWORDS = (
    "safety", "unsafe", "harass", "molest", "eve-teas", "stalk", "crime", "assault",
    "robbery", "snatch", "theft", "police", "pcr", "fir", "streetlight", "street light",
    "lighting", "dark", "unlit", "cctv", "accident", "waterlog", "pothole", "crowd",
    "stampede", "protest", "fire", "emergency", "women", "night",
)


class TinyFishError(RuntimeError):
    def __init__(self, message: str, status: Optional[int] = None, code: Optional[str] = None):
        self.status = status
        self.code = code
        extra = " | ".join(x for x in (f"http={status}" if status else "", f"code={code}" if code else "") if x)
        super().__init__(f"{message} ({extra})" if extra else message)


def api_key() -> str:
    # Read at call time so Render env changes / .env are always picked up
    key = os.environ.get("TINYFISH_API_KEY", "").strip()
    if not key or key == "your_tinyfish_api_key_here":
        raise TinyFishError(
            "TINYFISH_API_KEY is not set on the backend. Add it in Render → backend service → "
            "Environment (get a key at https://agent.tinyfish.ai/api-keys)."
        )
    return key


def is_configured() -> bool:
    try:
        api_key()
        return True
    except TinyFishError:
        return False


def _headers() -> Dict[str, str]:
    return {"X-API-Key": api_key(), "Content-Type": "application/json"}


def _check(resp: httpx.Response) -> Dict[str, Any]:
    if resp.status_code < 400:
        return resp.json()
    try:
        body = resp.json()
    except ValueError:
        body = {}
    err = (body.get("error") or {}) if isinstance(body, dict) else {}
    raise TinyFishError(err.get("message") or resp.text[:300] or "TinyFish request failed",
                        status=resp.status_code, code=err.get("code"))


def _now() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


# ── low-level calls ──────────────────────────────────────────────────────────

async def search(query: str, *, location: str = "IN", purpose: Optional[str] = None,
                 domain_type: Optional[str] = None, timeout: float = 30) -> Dict[str, Any]:
    params = {"query": query, "location": location}
    if purpose:
        params["purpose"] = purpose
    if domain_type:
        params["domain_type"] = domain_type
    async with httpx.AsyncClient(timeout=timeout) as c:
        try:
            resp = await c.get(SEARCH_URL, params=params, headers=_headers())
        except httpx.HTTPError as exc:
            raise TinyFishError(f"Search request failed: {type(exc).__name__}: {exc}") from exc
    return _check(resp)


async def fetch(urls: List[str], *, purpose: Optional[str] = None,
                per_url_timeout_ms: int = 45000, timeout: float = 90) -> Dict[str, Any]:
    body: Dict[str, Any] = {"urls": urls[:10], "format": "markdown",
                            "per_url_timeout_ms": per_url_timeout_ms}
    if purpose:
        body["purpose"] = purpose
    async with httpx.AsyncClient(timeout=timeout) as c:
        try:
            resp = await c.post(FETCH_URL, json=body, headers=_headers())
        except httpx.HTTPError as exc:
            raise TinyFishError(f"Fetch request failed: {type(exc).__name__}: {exc}") from exc
    return _check(resp)


async def start_agent(url: str, goal: str, *, output_schema: Optional[dict] = None,
                      max_duration_seconds: int = 240) -> str:
    body: Dict[str, Any] = {"url": url, "goal": goal,
                            "agent_config": {"max_duration_seconds": max_duration_seconds}}
    if output_schema:
        body["output_schema"] = output_schema
    async with httpx.AsyncClient(timeout=30) as c:
        try:
            resp = await c.post(f"{AGENT_URL}/automation/run-async", json=body, headers=_headers())
        except httpx.HTTPError as exc:
            raise TinyFishError(f"Agent start failed: {type(exc).__name__}: {exc}") from exc
    data = _check(resp)
    if not data.get("run_id"):
        err = data.get("error") or {}
        raise TinyFishError(err.get("message") or "Agent run was not created", code=err.get("code"))
    return data["run_id"]


async def get_run(run_id: str) -> Dict[str, Any]:
    async with httpx.AsyncClient(timeout=30) as c:
        try:
            resp = await c.get(f"{AGENT_URL}/runs/{run_id}", headers=_headers())
        except httpx.HTTPError as exc:
            raise TinyFishError(f"Run lookup failed: {type(exc).__name__}: {exc}") from exc
    return _check(resp)


async def wait_for_run(run_id: str, max_wait: float = AGENT_MAX_WAIT_S,
                       poll: float = 3.0) -> Dict[str, Any]:
    """Poll until the run finishes or max_wait passes. Returns the latest run object.
    Never re-submits: if it's still running, the caller gets status RUNNING + run_id."""
    deadline = time.monotonic() + max_wait
    while True:
        run = await get_run(run_id)
        if run.get("status") in TERMINAL or time.monotonic() >= deadline:
            return run
        await asyncio.sleep(poll)


def unwrap_result(run: Dict[str, Any]) -> Any:
    result = run.get("result")
    if isinstance(result, dict) and set(result.keys()) == {"result"}:
        return result["result"]
    return result


# ── truePin OSINT pipeline ───────────────────────────────────────────────────

CIVIC_PORTAL_SCHEMA = {
    "type": "object",
    "properties": {
        "portal_name": {"type": "string"},
        "complaint_page_url": {"type": "string"},
        "filing_steps": {"type": "array", "items": {"type": "string"}},
        "required_fields": {"type": "array", "items": {"type": "string"}},
        "helpline_numbers": {"type": "array", "items": {"type": "string"}},
    },
    "required": ["portal_name", "complaint_page_url", "filing_steps"],
}

CIVIC_PORTAL_URL = "https://mcdonline.nic.in/"


def civic_portal_goal(zone: str, report_type: str) -> str:
    return (
        f"A citizen wants to report a '{report_type}' safety/civic hazard in {zone}, Delhi. "
        "On this official portal, find the page where the public files a complaint or grievance. "
        "Read how to file it: the steps and the form fields required, and any helpline numbers shown. "
        "Do NOT submit any form, do NOT create an account and do NOT enter any personal data — read only. "
        "Return JSON with portal_name, complaint_page_url, filing_steps, required_fields, helpline_numbers."
    )


def _search_area(zone: str) -> str:
    # The frontend sends "Pin @ (lat, lng)" for custom pins — search Delhi in that case
    return "Delhi" if zone.lower().startswith("pin @") else f"{zone} Delhi"


def _score_text(text: str, zone: str) -> Dict[str, Any]:
    t = (text or "").lower()
    zone_tokens = [w for w in re.findall(r"[a-z]+", zone.lower()) if len(w) > 3 and w != "delhi"]
    zone_match = bool(zone_tokens) and all(w in t for w in zone_tokens)
    keywords = sorted({k for k in HAZARD_KEYWORDS if k in t})
    # Real, explainable relevance: 40% zone mention + 60% hazard-keyword density
    relevance = round(0.4 * zone_match + 0.6 * min(len(keywords) / 3, 1.0), 2)
    return {"zone_match": zone_match, "keywords": keywords, "relevance": relevance}


def _clean_markdown(md: str, limit: int = 1500) -> str:
    md = re.sub(r"!\[[^\]]*\]\([^)]+\)", "", md or "")
    md = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", md)
    return md.strip()[:limit]


async def run_osint(zone: str, lat: float, lng: float, report_type: str,
                    trust_score: float, run_web_agent: bool = True) -> Dict[str, Any]:
    """Search → Fetch → (Web Agent) with real TinyFish calls. Raises TinyFishError on failure."""
    t0 = time.time()
    area = _search_area(zone)
    query = f"{area} {report_type.replace('_', ' ').lower()} safety news"
    purpose = (f"Corroborate a crowd-sourced '{report_type}' safety report near "
               f"({lat:.4f}, {lng:.4f}) in {area} with recent local news and civic alerts.")

    # 1) Search
    sdata = await search(query, purpose=purpose)
    results = [r for r in sdata.get("results", []) if r.get("url")]
    clean = [r for r in results if not any(d in r["url"] for d in SKIP_DOMAINS)] or results
    top = clean[:5]

    sources: List[Dict[str, Any]] = []
    signals = 0
    for r in top:
        sc = _score_text(f"{r.get('title', '')} {r.get('snippet', '')}", zone)
        is_signal = (sc["zone_match"] or area == "Delhi") and bool(sc["keywords"])
        signals += is_signal
        sources.append({
            "step": "TinyFish Search API",
            "query": query,
            "url": r["url"],
            "title": r.get("title") or r.get("site_name") or r["url"],
            "extracted_snippet": r.get("snippet", ""),
            "site_name": r.get("site_name", ""),
            "date": r.get("date", ""),
            "search_rank": r.get("position"),
            "relevance_score": sc["relevance"],
            "matched_keywords": sc["keywords"],
            "zone_mentioned": sc["zone_match"],
            "counts_as_signal": is_signal,
            "fetched_at": _now(),
            "live_api_called": True,
        })

    # 2) Fetch the top 2 pages for full text
    fetch_targets = [r["url"] for r in top[:2]]
    if fetch_targets:
        fdata = await fetch(fetch_targets, purpose=purpose)
        for item in fdata.get("results", []):
            body = item.get("text") if isinstance(item.get("text"), str) else ""
            sc = _score_text(f"{item.get('title', '')} {body}", zone)
            sources.append({
                "step": "TinyFish Fetch API",
                "query": f"Full page extraction from {item.get('url')}",
                "url": item.get("final_url") or item.get("url"),
                "title": item.get("title") or item.get("url"),
                "extracted_snippet": _clean_markdown(body),
                "author": item.get("author") or "",
                "published_date": item.get("published_date") or "",
                "language": item.get("language") or "",
                "latency_ms": item.get("latency_ms"),
                "relevance_score": sc["relevance"],
                "matched_keywords": sc["keywords"],
                "zone_mentioned": sc["zone_match"],
                "fetched_at": _now(),
                "live_api_called": True,
            })
        for err in fdata.get("errors", []):
            sources.append({
                "step": "TinyFish Fetch API",
                "query": "Full page extraction",
                "url": err.get("url", ""),
                "title": f"Could not fetch page ({err.get('error')})",
                "extracted_snippet": "",
                "relevance_score": 0.0,
                "fetched_at": _now(),
                "live_api_called": True,
                "fetch_error": err.get("error"),
            })

    # 3) Verdict from trust score + LIVE web evidence
    if signals >= 1 and (trust_score >= 55 or signals >= 2):
        verdict, delta, status = "CORROBORATED_HAZARD", 18.0, "CORROBORATED"
    elif trust_score >= 55:
        verdict, delta, status = "UNVERIFIED", 0.0, "NO_WEB_EVIDENCE"
    else:
        verdict, delta, status = "DEFAMATION_MISMATCH", -30.0, "FLAGGED"

    # 4) Web Agent — only when there is a real hazard to act on (saves wallet credit)
    agent: Dict[str, Any] = {
        "portal": CIVIC_PORTAL_URL,
        "ticket_id": None,
        "agent_live_api_called": False,
        "live_api_called": False,
        "steps_executed": [],
    }
    if verdict != "CORROBORATED_HAZARD":
        agent.update(outcome="DISPATCH_BLOCKED",
                     message=f"Web Agent not dispatched — verdict {verdict}: live web evidence for "
                             f"{area} ({signals} signal(s)) does not support escalating this report.")
    elif not run_web_agent:
        agent.update(outcome="SKIPPED", message="Web Agent step skipped by request.")
    else:
        run_id = await start_agent(CIVIC_PORTAL_URL, civic_portal_goal(area, report_type),
                                   output_schema=CIVIC_PORTAL_SCHEMA)
        agent.update(run_id=run_id, agent_live_api_called=True, live_api_called=True)
        agent.update(describe_agent_run(await wait_for_run(run_id)))

    return {
        "zone_name": zone,
        "lat": lat,
        "lng": lng,
        "tinyfish_apis_used": ["TinyFish Search API", "TinyFish Fetch API"]
                              + (["TinyFish Web Agent"] if agent.get("run_id") else []),
        "live_web_sources_scanned": sources,
        "corroboration_verdict": verdict,
        "corroboration_signals": signals,
        "trust_score_adjustment": delta,
        "web_agent_action": agent,
        "tinyfish_osint_status": status,
        "processing_time_ms": round((time.time() - t0) * 1000, 1),
        "data_source": "tinyfish_live",
    }


def describe_agent_run(run: Dict[str, Any]) -> Dict[str, Any]:
    """Turn a TinyFish run object into the web_agent_action fields the UI shows."""
    status = run.get("status")
    run_id = run.get("run_id")
    if status == "COMPLETED":
        res = unwrap_result(run)
        info = res if isinstance(res, dict) else {"summary": res}
        steps = [str(s) for s in (info.get("filing_steps") or [])]
        fields = info.get("required_fields") or []
        if fields:
            steps.append("Required fields: " + ", ".join(map(str, fields)))
        helplines = info.get("helpline_numbers") or []
        if helplines:
            steps.append("Helplines: " + ", ".join(map(str, helplines)))
        page = info.get("complaint_page_url") or CIVIC_PORTAL_URL
        return {
            "outcome": "DISPATCH_READY",
            "agent_status": status,
            "portal": page,
            "agent_result": info,
            "steps_executed": steps or [str(info.get("summary", ""))],
            "num_of_steps": run.get("num_of_steps"),
            "message": f"TinyFish Web Agent read {info.get('portal_name') or 'the civic portal'} live and "
                       f"prepared the complaint filing path ({page}). Nothing was submitted.",
        }
    if status in ("PENDING", "RUNNING"):
        return {
            "outcome": "AGENT_RUNNING",
            "agent_status": status,
            "steps_executed": [f"Web Agent run {run_id} is still working on the live portal."],
            "streaming_url": run.get("streaming_url"),
            "message": f"Web Agent still running — check /api/tinyfish/agent-run/{run_id} for the result.",
        }
    err = run.get("error") or {}
    return {
        "outcome": "AGENT_FAILED",
        "agent_status": status,
        "steps_executed": [],
        "message": f"Web Agent run {status}: {err.get('message') or err.get('code') or 'no details'}",
    }
