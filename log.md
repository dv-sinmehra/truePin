# Mandatory Technical Disclosure Log — truePin (Hack@BVP)

> **Project:** truePin — 5-Layer Adversarial Trust Engine for Women's Safety Maps  
> **Team:** Divij Singh Mehra  
> **Live site:** https://truepin-frontend.onrender.com  
> **Backend API:** https://truepin.onrender.com  
> **GitHub:** https://github.com/dv-sinmehra/truePin (branch: `main`)  
> **Last updated:** 2026-10-23

---

## ✅ Disclosure Checklist

| # | Item | Status |
|---|---|---|
| 1 | Agent skill and capabilities | ✅ Disclosed |
| 2 | GitHub repositories | ✅ Disclosed |
| 3 | MCP servers and integration | ✅ Disclosed |
| 4 | APIs and external services | ✅ Disclosed |
| 5 | Technology stack | ✅ Disclosed |
| 6 | AI model | ✅ Disclosed |
| 7 | Model harnesses and development platforms | ✅ Disclosed |
| 8 | Product and software | ✅ Disclosed |
| 9 | Additional development | ✅ Disclosed |

---

## 1. Agent Skill and Capabilities

**truePin runs a 5-Layer Adversarial Trust Engine** that autonomously validates or rejects crowdsourced safety pin-drops on a Delhi women-safety map.

| Layer | Name | What it does |
|---|---|---|
| **L1** | Network & Kinematic Fingerprinting | Scores by ISP type (MOBILE_ISP vs DATACENTER_VPS), GPS breadcrumbs, kinematic variance (phone motion sensor delta), and account age |
| **L2** | Spatial Cluster Anomaly Detection (DBSCAN) | Detects coordinated fake-report floods — clusters of ≥ 3 pins within ε = 0.001° (~111 m) trigger quarantine |
| **L3** | Temporal Divergence Analysis | Flags inhuman report velocity (> 20 reports/min from same user or subnet) |
| **L4** | Isolation Forest Anomaly Scoring | ML model trained on 15 real civic-infrastructure baseline nodes; flags statistically outlier lat/lng/trust triples |
| **L5** | Proximity Boost | +15 trust reward for genuine reports near verified police stations or metro entrances |

**Output verdicts:** `VERIFIED` (shown on clean map) · `SOFT_ALERT` (visible but flagged) · `QUARANTINED` (blocked from public map)

**Autonomous capabilities:**
- Real-time per-user trust score tracking in memory
- Live-web OSINT corroboration via TinyFish (Search + Fetch + Web Agent)
- Auto-filing of civic patrol dispatch tickets on MCD / Delhi Police portals
- Benchmark self-evaluation on 1,200-row Delhi synthetic dataset
- 5 live adversarial attack simulation scenarios (triggerable by judges)

---

## 2. GitHub Repositories

| Repository | Branch | Purpose |
|---|---|---|
| [github.com/dv-sinmehra/truePin](https://github.com/dv-sinmehra/truePin) | `main` | hack@bvp production code — **this submission** |
| [github.com/dv-sinmehra/truePin](https://github.com/dv-sinmehra/truePin) | `ignite-round2` | ig-nite hackathon variant (completely separate, uses Prune AI instead of TinyFish) |

**Key source files (main branch):**

| File | Description |
|---|---|
| `backend/main.py` | Full 5-layer pipeline + all REST API endpoints (~1,410 lines) |
| `frontend/src/pages/TinyFishPage.jsx` | TinyFish OSINT live-web agent panel |
| `frontend/src/pages/ApiPage.jsx` | REST API reference + B2B revenue model |
| `frontend/src/components/DualMaps.jsx` | Leaflet BEFORE / AFTER dual map |
| `backend/delhi_kaggle_osm_benchmark_1200.csv` | 1,200-row auto-generated Delhi benchmark dataset |
| `log.md` | **This file** — Mandatory Technical Disclosure Log |

---

## 3. MCP Servers and Integration

No custom MCP server is implemented in this repository. The project integrates with external web-intelligence services through standard HTTPS APIs rather than an MCP transport layer.

### TinyFish (MCP-style agentic workflow)

TinyFish is used as the live-web AI agent layer (equivalent in capability to an MCP tool-call chain):

| TinyFish API | Endpoint | Role in truePin |
|---|---|---|
| **Search API** | `api.search.tinyfish.ai` | Searches the live web for Delhi-zone civic alerts, news, business density, and safety signals |
| **Fetch API** | `api.fetch.tinyfish.ai` | Fetches and extracts AI-ready structured content from MCD portal, Safetipin, and Delhi Police pages |
| **Web Agent** | `agent.tinyfish.ai/v1/automation/run` | Autonomously navigates civic portals and files patrol dispatch tickets (like a human assistant taking browser actions) |

**truePin endpoint:** `POST /api/tinyfish/verify-osint`  
**Result:** `CORROBORATED_HAZARD` → +18 trust boost · `DEFAMATION_MISMATCH` → −30 trust penalty + civic ticket ID

**Fallback behaviour:** If the TinyFish API key is absent or rate-limited, the system falls back to a deterministic zone-based civic data response using real Delhi ward data — the product never crashes or returns an error to the frontend.

---

## 4. APIs and External Services

| Service | Provider | What We Use It For | Auth |
|---|---|---|---|
| **TinyFish Search API** | TinyFish AI | Live web search for Delhi zone civic data | `TINYFISH_API_KEY` (Bearer) |
| **TinyFish Fetch API** | TinyFish AI | Structured content extraction from civic pages | `TINYFISH_API_KEY` (Bearer) |
| **TinyFish Web Agent** | TinyFish AI | Auto-file patrol dispatch tickets on civic portals | `TINYFISH_API_KEY` (Bearer) |
| **OpenStreetMap Overpass API** | OpenStreetMap Foundation | Fetch real police stations & metro entrances in Central Delhi for Layer 5 proximity scoring | No key (public) |
| **Google Maps Tile API** | Google | Street map tiles for BEFORE/AFTER Leaflet maps | No key (public tiles) |
| **Render.com** | Render | Backend hosting (`truepin.onrender.com`) + frontend hosting (`truepin-frontend.onrender.com`) | N/A |
| **GitHub** | Microsoft | Source control, CI/CD trigger for Render auto-deploy | SSH deploy key |

**Environment variables required (set in Render dashboard):**

```
TINYFISH_API_KEY=<redacted — set in Render backend service env vars>
```

---

## 5. Technology Stack

### Backend (Python)

| Technology | Version | Purpose |
|---|---|---|
| **Python** | 3.11+ | Core language |
| **FastAPI** | ≥ 0.111.0 | REST API framework with automatic OpenAPI docs |
| **Uvicorn** | ≥ 0.29.0 | ASGI production server |
| **scikit-learn** | ≥ 1.3.2 | DBSCAN (Layer 2) + IsolationForest (Layer 4) |
| **NumPy** | ≥ 1.26.0 | Numerical scoring operations |
| **httpx** | ≥ 0.27.0 | Async HTTP client for TinyFish + OSM API calls |
| **Pydantic v2** | ≥ 2.7.0 | Request/response data validation and serialisation |
| **python-dotenv** | ≥ 1.0.0 | Local `.env` file loading |
| **python-multipart** | ≥ 0.0.9 | CSV file upload support for benchmark runs |

### Frontend (React)

| Technology | Version | Purpose |
|---|---|---|
| **React** | 18 | UI component framework |
| **Vite** | 5 | Build tool and dev server |
| **Tailwind CSS** | 3 | Utility-first styling |
| **React-Leaflet** | 4 | Interactive BEFORE/AFTER map component |
| **Leaflet.js** | 1.9.4 | Map rendering engine |
| **Lucide React** | latest | Icon library |

### Infrastructure

| Service | Purpose |
|---|---|
| **Render.com** | Backend API + SPA frontend hosting (free tier, auto-deploy from `main` branch push) |
| **GitHub** | Source control and CI/CD webhook to Render |

---

## 6. AI Model

### IsolationForest (scikit-learn) — Layer 4

| Property | Value |
|---|---|
| **Type** | Unsupervised anomaly detection (ensemble of isolation trees) |
| **Training data** | 15 baseline civic-infrastructure nodes (police stations, metro entrances in Connaught Place area) |
| **Features used** | `[latitude, longitude, trust_score_proxy]` |
| **Contamination** | 12% (tuned for Delhi urban density) |
| **Role** | Flags reports with statistically anomalous geospatial coordinates |
| **Model storage** | Trained in-memory at startup — no saved `.pkl` file |

### DBSCAN Clustering (scikit-learn) — Layer 2

| Property | Value |
|---|---|
| **Type** | Density-Based Spatial Clustering of Applications with Noise |
| **Parameters** | ε = 0.001° (~111 m), minPts = 3 |
| **Role** | Detects coordinated fake-report clusters (organised defamation raids) |

### TinyFish LLM Web Agent — Layer OSINT

| Property | Value |
|---|---|
| **Type** | Live-web AI agent with Search + Fetch + browser-action capabilities |
| **Training** | External — provided and maintained by TinyFish AI platform |
| **Role** | Corroborates safety reports against real civic, news, and business data; auto-files patrol tickets |
| **Output** | Structured JSON verdict with trust delta and civic ticket ID |

> No custom LLM was trained or fine-tuned for this project. No model checkpoint (`.pt`, `.pkl`, `.onnx`) is committed to the repository. Classical scikit-learn models are reconstructed in-memory on each server start.

---

## 7. Model Harnesses and Development Platforms

| Platform | Role |
|---|---|
| **TinyFish AI** (withprune.com/bvest) | Live-web AI agent harness — Search, Fetch, and Web Agent APIs for OSINT corroboration |
| **Render.com** | Deployment harness — auto-builds backend Docker container and frontend static site from GitHub push |
| **Vite** | Frontend build harness and local dev server |
| **GitHub / Git** | Source control; each push to `main` auto-triggers Render deployment |
| **Antigravity (Google DeepMind)** | AI pair-programming assistant used during development for code generation, debugging, and architectural decisions |

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
| **API Docs** | 🔌 | Full REST reference with live test button + B2B SaaS revenue model |

### B2B SaaS Revenue Model

| Tier | Price | Target | Volume |
|---|---|---|---|
| Civic & Campus Starter | ₹14,999 / month | NGOs, RWAs, campus SOS apps | 50,000 verifications/mo |
| Navigation & Safety Apps | ₹74,999 / month | Safetipin, Rapido, Google Maps | 500,000 verifications/mo |
| Smart City & Police Enterprise | ₹12L–25L / year | Dial-112, Himmat Plus, State Portals | Unlimited |

**TAM:** ₹4,200 Cr India civic-safety API market (2026)  
**SAM:** ₹620 Cr — 50 municipal corps + 200 navigation/ride-hailing apps in Tier-1/2 cities  
**SOM (Year 1):** ₹18 Cr — Delhi NCR: 3 enterprise + 15 Tier-2 API customers

---

## 9. Additional Development

### What makes truePin technically unique

1. **Additive, not sequential pipeline** — all 5 layers run independently and scores compound. No single-point-of-failure; removing any one layer degrades performance gracefully rather than breaking it.

2. **Metrics honesty** — fake detection rate and genuine suppression rate are calculated from ground-truth labels embedded in the benchmark CSV. The system openly self-reports its false-positive rate in the Benchmark tab.

3. **Live adversarial simulation** — judges can inject any of 5 real attack scenarios (VPS Jitter Raid, SIM Farm Surge, Slow Drip Sleeper, Campus Wi-Fi Surge, Zero-Day Drift) and watch BEFORE/AFTER maps update live in < 2 seconds.

4. **Programmatically generated benchmark** — the 1,200-row Delhi CSV is generated on server start from real Delhi crime-hotspot coordinates, realistic ISP profiles, and synthetic adversarial labels. No manual data entry, no data leakage.

5. **Graceful degradation** — if TinyFish API or OSM Overpass is unavailable, the system falls back to deterministic zone-based civic data. The frontend never sees an error state.

6. **Live-deployed, always-on** — both frontend and backend on Render free tier. Judges can interact with the live system without any local setup.

7. **Social-domain filter on Search API** — the TinyFish Search card filters out Facebook, Instagram, YouTube, Twitter, and TikTok results to only surface actual civic/news sources (fix applied: commit `093acbd`).

### Known limitations (disclosed honestly)

| Limitation | Detail |
|---|---|
| iCloud Private Relay users | Routed through Apple's relay IPs — classified as DATACENTER by ISP check; may be falsely penalised |
| Physical SIM-farm attacks | Real Jio SIMs with phone-shaker kinematic variance — may slip through as `SOFT_ALERT` (~18 cases in benchmark) |
| False suppression rate | ~0.9% — within the < 1% target but not zero |
| In-memory state | Reports and trust scores are lost on server restart (Render free tier sleeps after inactivity) |

---

## Changelog

| Date | Change | Commit |
|---|---|---|
| 2026-10-23 | Initial TinyFish OSINT integration + 5-layer pipeline | (earlier) |
| 2026-10-23 | Fix: filter social domains from TinyFish Search API display card | `093acbd` |
| 2026-10-23 | Fix: update README — frontend now on Render, not Netlify | `093acbd` |
| 2026-10-23 | Add: `log.md` Mandatory Technical Disclosure Log to repository | this commit |
