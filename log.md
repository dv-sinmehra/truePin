# Mandatory Technical Disclosure Log — truePin (Prompt-ae-thon)

> **Project:** truePin — 5-Layer Adversarial Trust Engine for Women's Safety Maps  
> **Hackathon:** Prompt-ae-thon  
> **Team:** Divij Singh Mehra  
> **Live site:** https://truepin-frontend.onrender.com  
> **Backend API:** https://truepin.onrender.com  
> **GitHub:** https://github.com/dv-sinmehra/truePin (branch: `main`)  
> **Last updated:** 2026-10-23

---

## Disclosure Checklist

| # | Item | Status |
|---|---|---|
| 1 | Agent skill and capabilities | ✅ Disclosed |
| 2 | GitHub repositories | ✅ Disclosed |
| 3 | MCP servers and integration | ✅ Disclosed — real MCP server implemented |
| 4 | APIs and external services | ✅ Disclosed |
| 5 | Technology stack | ✅ Disclosed |
| 6 | AI model | ✅ Disclosed |
| 7 | Model harnesses and development platforms | ✅ Disclosed |
| 8 | Product and software | ✅ Disclosed |
| 9 | Additional development | ✅ Disclosed |

---

## 1. Agent Skill and Capabilities

**truePin runs a 5-Layer Adversarial Trust Engine** that autonomously validates or rejects crowdsourced safety pin-drops on a Delhi women-safety map. The engine is exposed as a **real Skills Registry + MCP Server + ReAct Agent runtime** (see Section 3).

| Layer | Name | What it does |
|---|---|---|
| **L1** | CGNAT, ASN & Kinematics Filter | Mobile/campus ISP +25, datacenter VPS −40; shared-IP device-entropy check (CGNAT bypass for genuine crowds, −45 for low-entropy bots); valid phone kinematics with GPS trail +20, flatline/teleport −30 |
| **L2** | Spatio-Temporal DBSCAN Clustering | DBSCAN (ε = 0.0015°, ~165 m, minPts = 5) over reports from the last 5 min; a cluster with authenticity ratio < 0.35 is a Sybil/jitter raid (−55), otherwise a genuine crowd surge (0) |
| **L3** | Asymmetric Bayesian Trust Graph | Per-user trust score; target-trust divergence when reports within 150 m come from accounts averaging < 3 days old (−35); sleeper-bot burn resets trust to 0 after coordinated attacks |
| **L4** | IsolationForest Drift Detection | Trained at startup on 60 synthetic normal-mobility samples, 5 features (time gap, distance from last report, account age, kinematic variance, approach speed), contamination 12%; −25 only if also physically implausible (speed > 60 km/h or kv outside 0.05–4.5) |
| **L5** | Proof-of-Presence & Corroboration | Solo proof-of-presence boost +28 for a trusted mobile user in a deserted lane; multi-party corroboration +20; retroactive SOFT_ALERT → VERIFIED promotion |

**Final score:** `clip(0.4 × base_trust + L1 + L2 + L3 + L4 + L5, 0, 100)` → `VERIFIED` ≥ 75 (clean map) · `SOFT_ALERT` 35–74 (visible, flagged) · `QUARANTINED` < 35 (blocked)

**Autonomous capabilities:**
- **5 agent skills** with typed input schemas (`trust_scorer`, `osint_agent`, `anomaly_detector`, `civic_reporter`, `ai_reasoner`). These are tool-style Python skills inside the backend, not Anthropic "Agent Skills" (`SKILL.md` folders)
- **ReAct agent** chains skills to complete multi-step verification tasks (predefined plans, Gemini routing, or keyword routing)
- **MCP server** — other AI agents can use the trust engine as tools at `/mcp`
- **Google Gemini** explains verdicts and recommends civic action
- Live-web OSINT corroboration via TinyFish (Search + Fetch + Web Agent)
- Civic complaint preparation: the TinyFish Web Agent reads the live MCD portal's filing steps (read-only — nothing is submitted)
- Benchmark self-evaluation on a 1,200-row synthetic Delhi dataset
- 6 adversarial / genuine simulation scenarios (triggerable by judges)

---

## 2. GitHub Repositories

| Repository | Branch | Purpose |
|---|---|---|
| [github.com/dv-sinmehra/truePin](https://github.com/dv-sinmehra/truePin) | `main` | Prompt-ae-thon production code — **this submission** |
| [github.com/dv-sinmehra/truePin](https://github.com/dv-sinmehra/truePin) | `ignite-round2` | ig-nite hackathon variant (uses Prune AI instead of TinyFish, separate branch) |

**Key source files (main branch):**

| File | Description |
|---|---|
| `backend/main.py` | Full 5-layer pipeline + all REST API endpoints + skills/agent/MCP wiring (~1,200 lines) |
| `backend/tinyfish.py` | TinyFish client — Search, Fetch, Web Agent (real calls only) |
| `backend/mcp_server.py` | **Real MCP server** — 7 tools exposed via Model Context Protocol (Streamable HTTP transport) |
| `backend/agent.py` | **ReAct agent runtime** — chains skills autonomously with THINK→ACT→OBS loop |
| `backend/skills/registry.py` | **Skills Registry** — singleton, typed skill discovery and execution |
| `backend/skills/trust_scorer.py` | `trust_scorer` skill — calls the same 5-layer `process_report()` as the website |
| `backend/skills/osint_agent.py` | `osint_agent` skill — wraps TinyFish OSINT pipeline |
| `backend/skills/anomaly_detector.py` | `anomaly_detector` skill — DBSCAN + IsolationForest batch analysis |
| `backend/skills/civic_reporter.py` | `civic_reporter` skill — TinyFish Web Agent prepares the MCD complaint path (read-only) |
| `backend/skills/ai_reasoner.py` | `ai_reasoner` skill — **Google Gemini** explains verdicts, recommends civic action, routes agent |
| `frontend/src/pages/TinyFishPage.jsx` | TinyFish OSINT live-web agent panel |
| `frontend/src/pages/ApiPage.jsx` | REST API reference + B2B revenue model |
| `frontend/src/components/DualMaps.jsx` | Leaflet BEFORE / AFTER dual map |
| `frontend/src/components/XRayInspector.jsx` | Per-layer report breakdown + "Explain with Gemini" |
| `backend/delhi_synthetic_benchmark_1200.csv` | 1,200-row synthetic Delhi benchmark dataset (generated by our code) |
| `log.md` | **This file** — Mandatory Technical Disclosure Log |

---

## 3. MCP Servers and Integration

### Real MCP Server — `backend/mcp_server.py`

truePin implements a **real Model Context Protocol server** using the official Python MCP SDK (`mcp`, tested with 2.3.0; the code also supports 1.x).

**Transport:** Streamable HTTP (stateless, JSON responses), served by the FastAPI app. The FastAPI lifespan runs the MCP session manager, and DNS-rebinding protection only accepts the Render hostname (plus localhost and `MCP_ALLOWED_HOSTS`).

**MCP Endpoint:** `https://truepin.onrender.com/mcp` — e.g. `claude mcp add --transport http truepin https://truepin.onrender.com/mcp`, or MCP Inspector (`npx @modelcontextprotocol/inspector`).

> Before 2026-10-23 this endpoint returned HTTP 500 on every request (the session manager was never started) and the real path was `/mcp/mcp`. Fixed and tested end-to-end: initialize → tools/list → tools/call.

Any MCP-compatible client (Claude, Cursor, VS Code, custom agents) can connect and call these tools:

| MCP Tool | Description |
|---|---|
| `verify_safety_report` | Run a report through the real 5-layer pipeline (same code as the website; adds it to the live map unless `save_to_map=false`) |
| `run_osint_corroboration` | TinyFish Search + Fetch + Web Agent OSINT for a Delhi zone |
| `detect_anomalies` | DBSCAN + IsolationForest batch anomaly analysis on a report set |
| `file_civic_ticket` | TinyFish Web Agent reads the live MCD portal and prepares the complaint path (read-only, no submission) |
| `list_skills` | Discover all registered skills with names, descriptions, versions, schemas |
| `get_system_metrics` | Live trust-engine KPIs (same numbers as the dashboard) |
| `analyze_and_explain` | **Google Gemini** — explains WHY a report got its verdict (`ai_powered: true` when Gemini answered) |

### Skills Registry — `backend/skills/`

A lightweight in-process skills registry that decouples skill logic from API routing:

```
skills/
  __init__.py
  registry.py          # SkillsRegistry singleton + Skill base class
  trust_scorer.py      # trust_scorer skill
  osint_agent.py       # osint_agent skill
  anomaly_detector.py  # anomaly_detector skill
  civic_reporter.py    # civic_reporter skill
  ai_reasoner.py       # ai_reasoner skill — Google Gemini reasoning
```

**REST access:**
- `GET /api/skills` — list all skills with schemas
- `POST /api/skills/{skill_name}/run` — execute any skill directly

### ReAct Agent Runtime — `backend/agent.py`

Implements a **Reasoning + Acting** agent loop:

```
THINK → choose best skill for current task
ACT   → execute via skill_registry.execute()
OBS   → observe result, update context
REPEAT (up to max_steps)
ANSWER → return structured trace + final answer
```

Supports pre-defined plans (e.g. `full_verify`: trust_scorer → osint_agent → ai_reasoner → civic_reporter)
and dynamic skill routing — **Gemini-powered routing** when `GEMINI_API_KEY` is set and no plan matches,
keyword routing otherwise. `llm_powered` in the response is `true` only if Gemini actually answered.

**REST access:**
- `POST /api/agent/run` — run agent with `{task, context, max_steps}`
- `GET /api/agent/plans` — list pre-defined plans and routing rules

### TinyFish (external AI agent)

TinyFish is used as the live-web intelligence layer:

| TinyFish API | Endpoint | Role in truePin |
|---|---|---|
| **Search API** | `api.search.tinyfish.ai` | Live web search (India-located) for recent local news / civic alerts about the reported zone |
| **Fetch API** | `api.fetch.tinyfish.ai` | Full-text extraction of the top search-result pages |
| **Web Agent** | `agent.tinyfish.ai/v1/automation/run-async` + `/v1/runs/{id}` | For corroborated hazards, reads the live MCD Online portal and prepares the complaint filing path (steps, required fields, helplines). **Read-only — never submits a form.** |

All calls are real and go through `backend/tinyfish.py` (auth: `X-API-Key`). There is **no mock or hardcoded fallback**: if `TINYFISH_API_KEY` is missing or TinyFish fails, the endpoint returns an error. `GET /api/tinyfish/health` proves the live connection.

---

## 4. APIs and External Services

| Service | Provider | What We Use It For | Auth |
|---|---|---|---|
| **TinyFish Search API** | TinyFish AI | Live web search for news / civic alerts about the reported zone | `TINYFISH_API_KEY` (`X-API-Key` header) |
| **TinyFish Fetch API** | TinyFish AI | Full-text extraction of the top search results | `TINYFISH_API_KEY` (`X-API-Key` header) |
| **TinyFish Web Agent** | TinyFish AI | Reads the live MCD portal's complaint filing steps (read-only) | `TINYFISH_API_KEY` (`X-API-Key` header) |
| **Google Gemini API** | Google AI Studio | `ai_reasoner` skill — verdict explanations, recommendations, agent routing | `GEMINI_API_KEY` |
| **OpenStreetMap Overpass API** | OSM Foundation | Live police stations & metro entrances shown on the Benchmark page (`/api/osm/fetch-live`) | No key (public) |
| **Google Maps tiles** | Google | Street map tiles for BEFORE/AFTER Leaflet maps (direct tile URL `mt1.google.com`) | No key |
| **Render.com** | Render | Backend + frontend hosting (auto-deploy from `main` branch push) | N/A |
| **GitHub** | Microsoft | Source control and CI/CD trigger for Render | SSH deploy key |

**Environment variables required (set in Render dashboard):**
```
TINYFISH_API_KEY=<set in Render backend service env vars>
GEMINI_API_KEY=<get free key from aistudio.google.com/app/apikey — powers ai_reasoner skill>
GEMINI_MODEL=<optional; default gemini-flash-latest>
```

---

## 5. Technology Stack

### Backend (Python)

| Technology | Version | Purpose |
|---|---|---|
| **Python** | 3.11+ | Core language |
| **FastAPI** | ≥ 0.111.0 | REST API framework |
| **Uvicorn** | ≥ 0.29.0 | ASGI production server |
| **mcp** | ≥ 1.10 (tested 2.3.0) | **Official Python MCP SDK — powers the real MCP server** |
| **scikit-learn** | ≥ 1.3.2 | DBSCAN (L2) + IsolationForest (L4) |
| **NumPy** | ≥ 1.26.0 | Numerical scoring operations |
| **httpx** | ≥ 0.27.0 | Async HTTP client for TinyFish + OSM API calls |
| **Pydantic v2** | ≥ 2.7.0 | Request/response validation and serialisation |
| **python-dotenv** | ≥ 1.0.0 | Local `.env` file loading |
| **python-multipart** | ≥ 0.0.9 | CSV file upload support |
| **starlette** | ≥ 0.37.0 | ASGI mounting for MCP server |
| **google-genai** | ≥ 1.0.0 | **Google Gen AI SDK** — powers the Gemini `ai_reasoner` skill (replaces the deprecated `google-generativeai`) |

### Frontend (React)

| Technology | Version | Purpose |
|---|---|---|
| **React** | 18 | UI component framework |
| **Vite** | 5 | Build tool and dev server |
| **Tailwind CSS** | 3 | Utility-first styling |
| **React-Leaflet** | 4 | BEFORE/AFTER map component |
| **Leaflet.js** | 1.9.4 | Map rendering engine |
| **Lucide React** | latest | Icon library |

### Infrastructure

| Service | Purpose |
|---|---|
| **Render.com** | Backend API + SPA frontend hosting (auto-deploy from `main` branch) |
| **GitHub** | Source control and CI/CD webhook |

---

## 6. AI Model

### IsolationForest (scikit-learn) — Layer 4

| Property | Value |
|---|---|
| **Type** | Unsupervised anomaly detection (ensemble of isolation trees) |
| **Training data** | 60 synthetic normal-mobility samples (seed 42) generated at startup |
| **Features** | `[time_gap_sec, distance_from_last_m, account_age_days, kinematic_variance, approach_speed_kmh]` |
| **Contamination** | 12% |
| **Storage** | Trained in-memory at startup — no `.pkl` file committed |

The `anomaly_detector` skill fits a separate IsolationForest on lat/lng of Delhi civic nodes for batch coordinate analysis.

### DBSCAN Clustering (scikit-learn) — Layer 2

| Property | Value |
|---|---|
| **Type** | Density-Based Spatial Clustering |
| **Parameters** | Pipeline L2: ε = 0.0015° (~165 m), minPts = 5, last-5-minute window · `anomaly_detector` skill: ε = 0.001°, minPts = 3 (configurable) |
| **Role** | Detects coordinated fake-report clusters (defamation raids) |

### TinyFish LLM Web Agent — OSINT Layer

| Property | Value |
|---|---|
| **Type** | Live-web AI agent (Search + Fetch + browser-action pipeline) |
| **Provider** | TinyFish AI (external) |
| **Role** | Corroborates safety reports against live web evidence; prepares the civic complaint path (read-only) |
| **Output** | Verdict (`CORROBORATED_HAZARD` +18 / `UNVERIFIED` 0 / `DEFAMATION_MISMATCH` −30) computed from trust score + number of live web signals, the real sources, and the Web Agent outcome (`DISPATCH_READY` / `AGENT_RUNNING` / `DISPATCH_BLOCKED` / `AGENT_FAILED`) |

### Google Gemini — `ai_reasoner` Skill

| Property | Value |
|---|---|
| **Model** | `gemini-flash-latest` (Google's alias for the current Flash model; set `GEMINI_MODEL` to pin one). The original `gemini-1.5-flash` has been shut down by Google, so before 2026-10-23 every Gemini call failed and the rule-based fallback answered. |
| **Type** | Large Language Model — AI reasoning layer |
| **SDK** | `google-genai >= 1.0.0` (async client) |
| **Modes** | `explain_verdict` · `recommend_action` · `route_task` |
| **Role** | Explains WHY a verdict was issued; recommends civic action; routes the ReAct agent |
| **Response format** | Forced JSON (`response_mime_type="application/json"`) |
| **Fallback** | Rule-based answer, always labelled `ai_powered: false` with `fallback_reason` |
| **How to verify** | `GET /api/ai/health` (live call), the "Explain with Gemini" button on the website, or `ai_powered: true` + `model` in any result |
| **Key source** | Free from aistudio.google.com/app/apikey |

> No custom LLM was trained or fine-tuned. No model checkpoint (`.pt`, `.pkl`, `.onnx`) is committed to the repository. scikit-learn models are built in-memory at server start.

---

## 7. Model Harnesses and Development Platforms

| Platform | Role |
|---|---|
| **MCP SDK** (`mcp`, tested 2.3.0) | Official Model Context Protocol Python SDK — powers the real `/mcp` endpoint |
| **TinyFish AI** (agent.tinyfish.ai) | Live-web AI agent harness — Search, Fetch, and Web Agent APIs |
| **Render.com** | Deployment harness — auto-builds from GitHub `main` push |
| **Vite** | Frontend build harness and local dev server |
| **GitHub / Git** | Source control; each push auto-triggers Render deployment |
| **Antigravity (Google DeepMind)** | AI pair-programming assistant used during development |
| **Claude (Anthropic)** | AI assistant used on 2026-10-23 to review the codebase and fix the TinyFish, MCP, Gemini and benchmark issues listed in the changelog |

---

## 8. Product and Software

**truePin** is a real-time crowdsourced-safety-map trust-verification engine targeting women's mobility safety in Indian cities.

### UI Pages

| Page | Nav Icon | What It Shows |
|---|---|---|
| **Live Maps** | 🗺️ | BEFORE (raw poisoned map) vs AFTER (truePin-filtered clean map) — side-by-side Leaflet |
| **Attack Simulator** | ⚡ | Run 6 live scenarios (4 attacks, 2 genuine) and watch the system respond in real time |
| **Firehose** | 📡 | Live stream of every incoming report with verdict badge, score breakdown, and layer log |
| **Benchmark** | 📊 | Run the 1,200-row Delhi dataset; shows precision / recall / F1 / confusion matrix |
| **TinyFish OSINT** | 🐟 | Select a Delhi zone → run live Search + Fetch + Web Agent → see real sources, verdict and the civic complaint path |
| **API Docs** | 🔌 | Full REST reference + B2B SaaS revenue model |

### REST API Endpoints (judge-testable)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/skills` | List all registered skills |
| `POST` | `/api/skills/{name}/run` | Execute any skill directly |
| `POST` | `/api/agent/run` | Run ReAct agent on a multi-step task |
| `GET` | `/api/agent/plans` | List pre-defined plans and routing rules |
| `POST` | `/mcp` | **Real MCP server** — Streamable HTTP transport |
| `GET` | `/api/ai/health` | Live Gemini check |
| `POST` | `/api/tinyfish/verify-osint` | TinyFish OSINT pipeline (live Search + Fetch + Web Agent) |
| `GET` | `/api/tinyfish/agent-run/{run_id}` | Check a Web Agent run that was still going |
| `GET` | `/api/tinyfish/health` | Live TinyFish connectivity check |
| `POST` | `/api/report` | Submit a safety report through the 5-layer pipeline |
| `POST` | `/api/benchmark/run` | Run the 1,200-row benchmark |
| `GET` | `/api/state` | Live system state + metrics |

### B2B SaaS Revenue Model

| Tier | Price | Target | Volume |
|---|---|---|---|
| Civic & Campus Starter | ₹14,999 / month | NGOs, RWAs, campus SOS apps | 50,000 verifications/mo |
| Navigation & Safety Apps | ₹74,999 / month | Safetipin, Rapido, Google Maps | 500,000 verifications/mo |
| Smart City & Police Enterprise | ₹12L–25L / year | Dial-112, Himmat Plus, State Portals | Unlimited |

---

## 9. Additional Development

### What makes truePin technically complete

1. **Real MCP server** — official `mcp` SDK, Streamable HTTP, 7 tools at `/mcp`. Any MCP client can connect (tested end-to-end locally).

2. **Real Skills Registry** — `SkillsRegistry` singleton with `Skill` base class, typed input schemas, `register()` / `execute()` / `list_all()`. **Five skills:** `trust_scorer`, `osint_agent`, `anomaly_detector`, `civic_reporter`, `ai_reasoner`.

3. **Real Agent Runtime** — `agent.py` implements a THINK→ACT→OBS ReAct loop with pre-defined plans and **Gemini-powered dynamic routing** (keyword routing when no key). Returns a full reasoning trace per step.

4. **Real LLM skill** — `ai_reasoner` uses Google Gemini to explain verdicts, recommend civic actions and route the agent. Results say `ai_powered: true` and the model name when Gemini answered.

5. **One pipeline everywhere** — the website, the agent and the MCP tool all call the same `process_report()`, so they always agree.

6. **Metrics honesty** — detection and suppression rates are computed from ground-truth labels; map accuracy is the plain share of genuine pins (no floors or tuning constants). The Benchmark tab shows the system's own false positives and false negatives.

7. **Live simulation** — judges can run 6 scenarios and watch BEFORE/AFTER maps update in < 2 seconds.

8. **Reproducible synthetic benchmark** — 1,200 rows generated from real hotspot coordinates and realistic ISP profiles with a fixed seed.

9. **No fake data from external services** — TinyFish calls are live or return a clear error; Gemini fallbacks are labelled; when the Overpass API is down, the 6 curated nodes are labelled `curated`.

### Known limitations (disclosed honestly)

| Limitation | Detail |
|---|---|
| iCloud Private Relay users | Routed through Apple relay IPs — may be penalised by L1 ISP check |
| Physical SIM-farm attacks | Real Jio SIMs with phone-shaker kinematic variance slip through — 18 of 400 fakes in the benchmark |
| False suppression rate | 3.1% in the benchmark (25 of 800 genuine reports quarantined: 7 hard VPN cases + 18 normal users swept into clusters with fakes) |
| Genuine crowd right after a bot raid | If genuine reports arrive at the same spot within 5 minutes of a bot raid, DBSCAN groups them with the bots and quarantines some of them (e.g. running *campus surge* right after *VPS jitter raid* quarantines 10 of 15 students; on a fresh map all 15 pass) |
| Google Maps tiles | The maps load tiles straight from `mt1.google.com` without a key; Google's terms expect its Maps APIs, so a production build should switch to a licensed tile provider |
| MCP endpoint is public | No authentication on `/mcp`, same as the REST API; `verify_safety_report` writes to the live map unless `save_to_map=false` |
| In-memory state | Reports and trust scores lost on server restart (Render free tier sleeps after inactivity) |
| TinyFish Web Agent latency | Browser runs take ~30 s to a few minutes; `verify-osint` waits up to `TINYFISH_AGENT_MAX_WAIT` (75 s) then returns the `run_id` |
| Civic complaints not auto-filed | The Web Agent deliberately does not submit forms on government portals, so no real ticket numbers are produced |

---

## Changelog

| Date | Change | Commit |
|---|---|---|
| 2026-10-23 | Initial TinyFish OSINT integration + 5-layer pipeline | (earlier) |
| 2026-10-23 | Fix: filter social domains from TinyFish Search API display | `093acbd` |
| 2026-10-23 | Fix: update README — frontend now on Render | `093acbd` |
| 2026-10-23 | Add: `log.md` initial Mandatory Technical Disclosure Log | `57ba570` |
| 2026-10-23 | Add: **Real MCP server** (`mcp` 2.3.0, 6 tools, Streamable HTTP) | `b5066e1` |
| 2026-10-23 | Add: **Skills Registry** (`skills/` package — 4 skills with typed schemas) | `b5066e1` |
| 2026-10-23 | Add: **ReAct Agent Runtime** (`agent.py` — THINK→ACT→OBS loop, pre-defined plans) | `b5066e1` |
| 2026-10-23 | Add: `/api/skills`, `/api/skills/{name}/run`, `/api/agent/run`, `/api/agent/plans` endpoints | `b5066e1` |
| 2026-10-23 | Update: hackathon name → Prompt-ae-thon; update log.md to reflect real MCP/skills/agent | `b5066e1` |
| 2026-10-23 | Add: `ai_reasoner` skill — **Gemini Flash LLM** explains verdicts, routes agent, recommends civic action | `73eec72` |
| 2026-10-23 | Add: 7th MCP tool `analyze_and_explain` — calls Gemini Flash via `ai_reasoner` skill | `73eec72` |
| 2026-10-23 | Add: `google-generativeai>=0.7.0` to `requirements.txt` | `73eec72` |
| 2026-10-23 | Fix: **TinyFish now uses real API calls only** — removed hardcoded fallback data, fake source URLs and random ticket IDs; fixed `Bearer` → `X-API-Key` auth and too-short timeouts; verdict now uses live web evidence; Web Agent runs async and is read-only; added `/api/tinyfish/health` and `/api/tinyfish/agent-run/{id}` | `03c975f` |
| 2026-10-23 | Fix: **MCP server** — start the session manager in the FastAPI lifespan (every request returned 500 before), serve at exactly `/mcp` (was `/mcp/mcp`), stateless JSON mode, host allowlist for Render; `verify_safety_report` now uses the real pipeline instead of a simplified copy with a random DBSCAN step; `get_system_metrics` uses dashboard numbers | this commit |
| 2026-10-23 | Fix: **Gemini** — `gemini-1.5-flash` is shut down, so calls always failed; switched to `gemini-flash-latest` via the `google-genai` SDK; added `GET /api/ai/health`, "Explain with Gemini" button, honest `llm_powered` flag in agent runs | this commit |
| 2026-10-23 | Fix: benchmark labelled as synthetic (was "Kaggle"), CSV renamed to `delhi_synthetic_benchmark_1200.csv`; removed hidden floors in map-accuracy (≥ 90%) and corrected RMSE formula; docs updated with real results | this commit |
| 2026-10-23 | Remove: unused frontend components (`BenchmarkModal`, `Firehose`, `SimulatorPanel`, `UseCasesModal`) and old Netlify configs (frontend is on Render) | this commit |
