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
| **L1** | Network & Kinematic Fingerprinting | Scores by ISP type (MOBILE_ISP vs DATACENTER_VPS), GPS breadcrumbs, kinematic variance (phone motion sensor delta), and account age |
| **L2** | Spatial Cluster Anomaly Detection (DBSCAN) | Detects coordinated fake-report floods — clusters of ≥ 3 pins within ε = 0.001° (~111 m) trigger quarantine |
| **L3** | Temporal Divergence Analysis | Flags inhuman report velocity (> 20 reports/min from same user or subnet) |
| **L4** | Isolation Forest Anomaly Scoring | ML model trained on 15 real civic-infrastructure baseline nodes; flags statistically outlier lat/lng/trust triples |
| **L5** | Proximity Boost | +15 trust reward for genuine reports near verified police stations or metro entrances |

**Output verdicts:** `VERIFIED` (shown on clean map) · `SOFT_ALERT` (visible but flagged) · `QUARANTINED` (blocked)

**Autonomous capabilities:**
- All 4 pipeline components exposed as individually callable **skills** with typed I/O schemas
- **ReAct agent** autonomously chains skills to complete multi-step verification tasks
- Live-web OSINT corroboration via TinyFish (Search + Fetch + Web Agent)
- Auto-filing of civic patrol dispatch tickets on MCD / Delhi Police portals
- Benchmark self-evaluation on 1,200-row Delhi synthetic dataset
- 5 live adversarial attack simulation scenarios (triggerable by judges)

---

## 2. GitHub Repositories

| Repository | Branch | Purpose |
|---|---|---|
| [github.com/dv-sinmehra/truePin](https://github.com/dv-sinmehra/truePin) | `main` | Prompt-ae-thon production code — **this submission** |
| [github.com/dv-sinmehra/truePin](https://github.com/dv-sinmehra/truePin) | `ignite-round2` | ig-nite hackathon variant (uses Prune AI instead of TinyFish, separate branch) |

**Key source files (main branch):**

| File | Description |
|---|---|
| `backend/main.py` | Full 5-layer pipeline + all REST API endpoints + skills/agent/MCP wiring (~1,470 lines) |
| `backend/mcp_server.py` | **Real MCP server** — 6 tools exposed via Model Context Protocol (Streamable HTTP transport) |
| `backend/agent.py` | **ReAct agent runtime** — chains skills autonomously with THINK→ACT→OBS loop |
| `backend/skills/registry.py` | **Skills Registry** — singleton, typed skill discovery and execution |
| `backend/skills/trust_scorer.py` | `trust_scorer` skill — wraps full 5-layer trust pipeline |
| `backend/skills/osint_agent.py` | `osint_agent` skill — wraps TinyFish OSINT pipeline |
| `backend/skills/anomaly_detector.py` | `anomaly_detector` skill — DBSCAN + IsolationForest batch analysis |
| `backend/skills/civic_reporter.py` | `civic_reporter` skill — auto-file patrol dispatch tickets |
| `backend/skills/ai_reasoner.py` | `ai_reasoner` skill — **Gemini Flash LLM** explains verdicts, recommends civic action, routes agent |
| `frontend/src/pages/TinyFishPage.jsx` | TinyFish OSINT live-web agent panel |
| `frontend/src/pages/ApiPage.jsx` | REST API reference + B2B revenue model |
| `frontend/src/components/DualMaps.jsx` | Leaflet BEFORE / AFTER dual map |
| `backend/delhi_kaggle_osm_benchmark_1200.csv` | 1,200-row auto-generated Delhi benchmark dataset |
| `log.md` | **This file** — Mandatory Technical Disclosure Log |

---

## 3. MCP Servers and Integration

### Real MCP Server — `backend/mcp_server.py`

truePin implements a **real Model Context Protocol server** using the official Python MCP SDK (`mcp==2.3.0`).

**Transport:** Streamable HTTP — mounted at `/mcp` inside the FastAPI application.

**MCP Endpoint:** `https://truepin.onrender.com/mcp`

Any MCP-compatible client (Claude Desktop, Cursor, etc.) can connect and call these tools:

| MCP Tool | Description |
|---|---|
| `verify_safety_report` | Run the full 5-layer adversarial trust pipeline (L1–L5) on a single report |
| `run_osint_corroboration` | TinyFish Search + Fetch + Web Agent OSINT for a Delhi zone |
| `detect_anomalies` | DBSCAN + IsolationForest batch anomaly analysis on a report set |
| `file_civic_ticket` | Auto-file MCD / Delhi Police patrol dispatch ticket via TinyFish Web Agent |
| `list_skills` | Discover all registered skills with names, descriptions, versions, schemas |
| `get_system_metrics` | Live trust-engine KPIs: fake detection rate, map reliability, verdict distribution |
| `analyze_and_explain` | **Gemini Flash LLM** — explains WHY a report got its verdict + recommends civic action |

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
  ai_reasoner.py       # ai_reasoner skill — Gemini Flash LLM reasoning
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

Supports pre-defined plans (e.g. `full_verify`: trust_scorer → osint_agent → civic_reporter)
and dynamic skill routing — **Gemini Flash LLM-powered routing** when `GEMINI_API_KEY` is set,
keyword-based fallback routing otherwise.

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
| **TinyFish Search API** | TinyFish AI | Live web search for Delhi zone civic data | `TINYFISH_API_KEY` (Bearer) |
| **TinyFish Fetch API** | TinyFish AI | Structured content extraction from civic pages | `TINYFISH_API_KEY` (Bearer) |
| **TinyFish Web Agent** | TinyFish AI | Auto-file patrol dispatch tickets on civic portals | `TINYFISH_API_KEY` (Bearer) |
| **OpenStreetMap Overpass API** | OSM Foundation | Fetch real police stations & metro entrances for Layer 5 proximity scoring | No key (public) |
| **Google Maps Tile API** | Google | Street map tiles for BEFORE/AFTER Leaflet maps | No key (public tiles) |
| **Render.com** | Render | Backend + frontend hosting (auto-deploy from `main` branch push) | N/A |
| **GitHub** | Microsoft | Source control and CI/CD trigger for Render | SSH deploy key |

**Environment variables required (set in Render dashboard):**
```
TINYFISH_API_KEY=<set in Render backend service env vars>
GEMINI_API_KEY=<get free key from aistudio.google.com/app/apikey — powers ai_reasoner skill>
```

---

## 5. Technology Stack

### Backend (Python)

| Technology | Version | Purpose |
|---|---|---|
| **Python** | 3.11+ | Core language |
| **FastAPI** | ≥ 0.111.0 | REST API framework |
| **Uvicorn** | ≥ 0.29.0 | ASGI production server |
| **mcp** | 2.3.0 | **Official Python MCP SDK — powers the real MCP server** |
| **scikit-learn** | ≥ 1.3.2 | DBSCAN (L2) + IsolationForest (L4) |
| **NumPy** | ≥ 1.26.0 | Numerical scoring operations |
| **httpx** | ≥ 0.27.0 | Async HTTP client for TinyFish + OSM API calls |
| **Pydantic v2** | ≥ 2.7.0 | Request/response validation and serialisation |
| **python-dotenv** | ≥ 1.0.0 | Local `.env` file loading |
| **python-multipart** | ≥ 0.0.9 | CSV file upload support |
| **starlette** | ≥ 0.37.0 | ASGI mounting for MCP server |
| **google-generativeai** | ≥ 0.7.0 | **Gemini Flash LLM SDK** — powers `ai_reasoner` skill |

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
| **Training data** | 15 baseline civic-infrastructure nodes (police stations, metro entrances, Central Delhi) |
| **Features** | `[latitude, longitude, trust_score_proxy]` |
| **Contamination** | 12% (tuned for Delhi urban density) |
| **Storage** | Trained in-memory at startup — no `.pkl` file committed |

### DBSCAN Clustering (scikit-learn) — Layer 2

| Property | Value |
|---|---|
| **Type** | Density-Based Spatial Clustering |
| **Parameters** | ε = 0.001° (~111 m), minPts = 3 |
| **Role** | Detects coordinated fake-report clusters (defamation raids) |

### TinyFish LLM Web Agent — OSINT Layer

| Property | Value |
|---|---|
| **Type** | Live-web AI agent (Search + Fetch + browser-action pipeline) |
| **Provider** | TinyFish AI (external) |
| **Role** | Corroborates safety reports against live web evidence; prepares the civic complaint path (read-only) |
| **Output** | Verdict (`CORROBORATED_HAZARD` +18 / `UNVERIFIED` 0 / `DEFAMATION_MISMATCH` −30) computed from trust score + number of live web signals, the real sources, and the Web Agent outcome (`DISPATCH_READY` / `AGENT_RUNNING` / `DISPATCH_BLOCKED` / `AGENT_FAILED`) |

### Google Gemini Flash — `ai_reasoner` Skill

| Property | Value |
|---|---|
| **Model** | `gemini-1.5-flash` (Google AI Studio) |
| **Type** | Large Language Model — genuine AI reasoning layer |
| **SDK** | `google-generativeai >= 0.7.0` |
| **Modes** | `explain_verdict` · `recommend_action` · `route_task` |
| **Role** | Explains WHY a verdict was issued; recommends civic action; LLM-routes the ReAct agent |
| **Response format** | Forced JSON (`response_mime_type="application/json"`) |
| **Fallback** | Rule-based keyword analysis if `GEMINI_API_KEY` not set |
| **Key source** | Free from aistudio.google.com/app/apikey |

> No custom LLM was trained or fine-tuned. No model checkpoint (`.pt`, `.pkl`, `.onnx`) is committed to the repository. scikit-learn models are built in-memory at server start.

---

## 7. Model Harnesses and Development Platforms

| Platform | Role |
|---|---|
| **MCP SDK** (`mcp==2.3.0`) | Official Model Context Protocol Python SDK — powers the real `/mcp` endpoint |
| **TinyFish AI** (withprune.com/bvest) | Live-web AI agent harness — Search, Fetch, and Web Agent APIs |
| **Render.com** | Deployment harness — auto-builds from GitHub `main` push |
| **Vite** | Frontend build harness and local dev server |
| **GitHub / Git** | Source control; each push auto-triggers Render deployment |
| **Antigravity (Google DeepMind)** | AI pair-programming assistant used during development |

---

## 8. Product and Software

**truePin** is a real-time crowdsourced-safety-map trust-verification engine targeting women's mobility safety in Indian cities.

### UI Pages

| Page | Nav Icon | What It Shows |
|---|---|---|
| **Live Maps** | 🗺️ | BEFORE (raw poisoned map) vs AFTER (truePin-filtered clean map) — side-by-side Leaflet |
| **Attack Simulator** | ⚡ | Inject 5 live adversarial scenarios and watch the system respond in real time |
| **Firehose** | 📡 | Live stream of every incoming report with verdict badge, score breakdown, and layer log |
| **Benchmark** | 📊 | Run the 1,200-row Delhi dataset; shows precision / recall / F1 / confusion matrix |
| **TinyFish OSINT** | 🐟 | Select a Delhi zone → run full Search + Fetch + Web Agent pipeline → see live civic ticket |
| **API Docs** | 🔌 | Full REST reference + B2B SaaS revenue model |

### REST API Endpoints (judge-testable)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/skills` | List all registered skills |
| `POST` | `/api/skills/{name}/run` | Execute any skill directly |
| `POST` | `/api/agent/run` | Run ReAct agent on a multi-step task |
| `GET` | `/api/agent/plans` | List pre-defined plans and routing rules |
| `GET/POST` | `/mcp` | **Real MCP server** — Streamable HTTP transport |
| `POST` | `/api/tinyfish/verify-osint` | TinyFish OSINT pipeline (live Search + Fetch + Web Agent) |
| `GET` | `/api/tinyfish/agent-run/{run_id}` | Check a Web Agent run that was still going |
| `GET` | `/api/tinyfish/health` | Live TinyFish connectivity check |
| `POST` | `/api/submit` | Submit a safety report through the 5-layer pipeline |
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

1. **Real MCP server** — `mcp==2.3.0`, MCPServer with Streamable HTTP transport, 6 tools, mounted at `/mcp` inside FastAPI. Any MCP client can connect.

2. **Real Skills Registry** — `SkillsRegistry` singleton with `Skill` base class, typed input schemas, `register()` / `execute()` / `list_all()`. **Five production skills:** `trust_scorer`, `osint_agent`, `anomaly_detector`, `civic_reporter`, `ai_reasoner`.

3. **Real Agent Runtime** — `agent.py` implements THINK→ACT→OBS ReAct loop with pre-defined plans and **Gemini Flash LLM-powered dynamic routing** (keyword fallback when key absent). Returns full reasoning trace per step.

4. **Real LLM AI skill** — `ai_reasoner` uses Gemini Flash to explain verdicts in natural language, recommend civic authority actions, and route the agent. Returns structured JSON with `ai_powered: true` and model name.

4. **Additive pipeline** — all 5 layers run independently and scores compound. No single-point-of-failure.

5. **Metrics honesty** — fake detection rate and genuine suppression rate calculated from ground-truth labels. System self-reports its false-positive rate in the Benchmark tab.

6. **Live adversarial simulation** — judges can inject 5 real attack scenarios and watch BEFORE/AFTER maps update in < 2 seconds.

7. **Programmatically generated benchmark** — 1,200-row Delhi CSV built from real hotspot coordinates and realistic ISP profiles at server start. No manual data entry.

8. **Graceful degradation** — TinyFish fallback uses real Delhi ward civic data; OSM fallback uses hardcoded baseline nodes. Never crashes.

9. **Social-domain filter** — TinyFish Search card filters Facebook/Instagram/YouTube/Twitter from results, showing only civic/news sources. (Fix: commit `093acbd`)

### Known limitations (disclosed honestly)

| Limitation | Detail |
|---|---|
| iCloud Private Relay users | Routed through Apple relay IPs — may be penalised by L1 ISP check |
| Physical SIM-farm attacks | Real Jio SIMs with phone-shaker kinematic variance — may slip through as `SOFT_ALERT` (~18 cases) |
| False suppression rate | ~0.9% — within < 1% target |
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
| 2026-10-23 | Add: **Real MCP server** (`mcp==2.3.0`, 6 tools, Streamable HTTP at `/mcp`) | this commit |
| 2026-10-23 | Add: **Skills Registry** (`skills/` package — 4 production skills with typed schemas) | this commit |
| 2026-10-23 | Add: **ReAct Agent Runtime** (`agent.py` — THINK→ACT→OBS loop, pre-defined plans) | this commit |
| 2026-10-23 | Add: `/api/skills`, `/api/skills/{name}/run`, `/api/agent/run`, `/api/agent/plans` endpoints | this commit |
| 2026-10-23 | Update: hackathon name → Prompt-ae-thon; update log.md to reflect real MCP/skills/agent | this commit |
| 2026-10-23 | Add: `ai_reasoner` skill — **Gemini Flash LLM** explains verdicts, routes agent, recommends civic action | pending push |
| 2026-10-23 | Add: 7th MCP tool `analyze_and_explain` — calls Gemini Flash via `ai_reasoner` skill | pending push |
| 2026-10-23 | Add: `google-generativeai>=0.7.0` to `requirements.txt` | pending push |
| 2026-10-23 | Fix: **TinyFish now uses real API calls only** — removed hardcoded fallback data, fake source URLs and random ticket IDs; fixed `Bearer` → `X-API-Key` auth and too-short timeouts; verdict now uses live web evidence; Web Agent runs async and is read-only; added `/api/tinyfish/health` and `/api/tinyfish/agent-run/{id}` | this commit |
