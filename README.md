# 🛡️ truePin — AEGIS-MAP Adversarial Trust Engine

> **Domain: Women Safety & Public Mobility Infrastructure**  
> **Autonomous Adversarial Pin Sanitization & Live-Web OSINT Corroboration Engine**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-truepin--frontend.onrender.com-blue?style=flat-square)](https://truepin-frontend.onrender.com)
[![Backend API](https://img.shields.io/badge/Backend%20API-Render-green?style=flat-square)](https://truepin.onrender.com)
[![Python](https://img.shields.io/badge/Python-3.11-blue?style=flat-square&logo=python)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-green?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18.3-blue?style=flat-square&logo=react)](https://react.dev)

---

## 📋 Problem Statement — The Poisoned Safety Map

Women's safety apps like Safetipin, Google Maps SOS, and Delhi Police's Himmat Plus depend on **crowd-sourced danger pins**. But these pins are trivially weaponizable:

| Attack Vector | Example | Real-World Impact |
|---|---|---|
| **Business Defamation Raid** | Competitors mass-report a restaurant as "unsafe" from AWS datacenter IPs | Restaurant loses 40% customers overnight |
| **SIM Farm Fake Safe Mask** | 200 physical Jio SIM phones on shakers mark a dangerous alley as "safe" | Woman walks into a dark alley, gets assaulted |
| **Sleeper Bot Burn** | 30-day-old fake accounts flood a protest zone with false hazard pins | Police/PCR diverted to wrong location |
| **VPS Jitter Raid** | Bots with DataCenter VPS IPs and zero kinematics spam an area | App crashes under load; real SOS pins buried |

**truePin** detects all of these attacks in real-time using a **5-Layer Adversarial Trust Pipeline** — and now enhances pin verification with **TinyFish Live-Web OSINT** for ground-truth corroboration from live civic/news/police sources.

---

## 🌐 Live Deployments

| Service | URL | Status |
|---|---|---|
| **Frontend (Render)** | [https://truepin-frontend.onrender.com](https://truepin-frontend.onrender.com) | ✅ Live |
| **Backend API (Render)** | [https://truepin.onrender.com](https://truepin.onrender.com) | ✅ Live |
| **Health Check** | [https://truepin.onrender.com/api/health](https://truepin.onrender.com/api/health) | ✅ Live |
| **API Docs (FastAPI)** | [https://truepin.onrender.com/docs](https://truepin.onrender.com/docs) | ✅ Live |

---

## 🏗️ 5-Layer Adversarial Trust Pipeline

Each report submitted to `POST /api/report` passes through 5 sequential scoring layers:

```
Report In
    │
    ▼
┌─────────────────────────────────────────────────┐
│ LAYER 1: CGNAT + ASN + Kinematics Filter        │
│  • Mobile ISP (Jio/Airtel): +25                 │
│  • Datacenter VPS (AWS/DO): -40                 │
│  • Valid phone kinematics (kv 0.3–4.5): +20     │
│  • Bot flatline sensors / GPS teleport: -30     │
│  • Shared-IP entropy check (CGNAT bypass)       │
└─────────────────┬───────────────────────────────┘
                  ▼
┌─────────────────────────────────────────────────┐
│ LAYER 2: Spatio-Temporal DBSCAN Clustering      │
│  • Groups pins within 150m / 5min window        │
│  • Checks cluster authenticity ratio            │
│  • Sybil/Coordinated Jitter Raid: -55           │
│  • Genuine crowd emergency: 0 penalty           │
└─────────────────┬───────────────────────────────┘
                  ▼
┌─────────────────────────────────────────────────┐
│ LAYER 3: Asymmetric Bayesian Trust Graph        │
│  • Per-user trust score (0–100), persists       │
│  • Target Trust Divergence (new accts nearby):  │
│    avg account age < 3 days → -35               │
│  • Sleeper-bot burn on coordinated attack       │
└─────────────────┬───────────────────────────────┘
                  ▼
┌─────────────────────────────────────────────────┐
│ LAYER 4: IsolationForest Drift Detection        │
│  • Trained on 60 normal mobility samples        │
│  • 5 features: time_gap, distance, age, kv,     │
│    approach_speed                               │
│  • Drift anomaly (speed >60 or kv <0.05): -25  │
└─────────────────┬───────────────────────────────┘
                  ▼
┌─────────────────────────────────────────────────┐
│ LAYER 5: Cold-Start + Corroboration Boost       │
│  • Solo Proof-of-Presence (deserted lane): +28  │
│  • Multi-party corroboration bonus: +20         │
│  • Retroactive SOFT_ALERT → VERIFIED promotion  │
└─────────────────┬───────────────────────────────┘
                  ▼
       Verdict: VERIFIED / SOFT_ALERT / QUARANTINED
```

**Final Score Formula:**
```
final_score = clip(0.4 × base_trust + L1_score + L2_penalty + L3_penalty + L4_penalty + L5_boost, 0, 100)

VERIFIED      → score ≥ 75
SOFT_ALERT    → score 35–74
QUARANTINED   → score < 35
```

---

## 🐟 TinyFish Live-Web Integration Architecture

truePin integrates **TinyFish's three APIs** to corroborate safety reports against live web signals, adding a 6th ground-truth layer on top of the ML pipeline.

### Architecture Diagram

```
Safety Pin Submitted
         │
         ▼
  POST /api/tinyfish/verify-osint
         │
    ┌────┴────────────────────────────────────────────┐
    │           TinyFish 3-Step OSINT Pipeline         │
    │                                                  │
    │  Step 1: TinyFish Search API                     │
    │   → Query: "Delhi {zone} safety hazard           │
    │             civic streetlight 2026"              │
    │   → Live news / civic alerts for the zone (IN)   │
    │   → Returns: top real web results with URLs      │
    │                                                  │
    │  Step 2: TinyFish Fetch API                      │
    │   → Fetches the top 2 URLs from Search           │
    │   → Extracts clean AI-ready markdown content     │
    │                                                  │
    │  Step 3: TinyFish Web Agent                      │
    │   → Goal-driven browser automation (async)      │
    │   → Reads the live MCD Online complaint page    │
    │   → Prepares filing steps (read-only, no submit)│
    └────┬────────────────────────────────────────────┘
         │
         ▼
    Corroboration Verdict
    ┌──────────────────────────────────┐
    │ CORROBORATED_HAZARD              │
    │  → Trust Score: +18             │
    │  → Soft Alert → VERIFIED        │
    │  → Web Agent: DISPATCH_READY    │
    ├──────────────────────────────────┤
    │ DEFAMATION_MISMATCH              │
    │  → Trust Score: -30             │
    │  → Report QUARANTINED           │
    │  → Web Agent: DISPATCH_BLOCKED  │
    └──────────────────────────────────┘
```

### API Payload Examples

**Request:**
```http
POST /api/tinyfish/verify-osint
Content-Type: application/json

{
  "lat": 28.6315,
  "lng": 77.2167,
  "zone_name": "Connaught Place",
  "report_type": "UNSAFE_HARASSMENT",
  "current_trust_score": 72.5
}
```

**Response (CORROBORATED_HAZARD)** — shape of a real response; values come from the live web:
```json
{
  "zone_name": "Connaught Place",
  "lat": 28.6315,
  "lng": 77.2167,
  "tinyfish_apis_used": ["TinyFish Search API", "TinyFish Fetch API", "TinyFish Web Agent"],
  "live_web_sources_scanned": [
    {
      "step": "TinyFish Search API",
      "url": "<real result URL>",
      "title": "<real article title>",
      "extracted_snippet": "<search snippet>",
      "relevance_score": 0.8,
      "matched_keywords": ["safety", "women"],
      "zone_mentioned": true,
      "counts_as_signal": true,
      "live_api_called": true
    },
    { "step": "TinyFish Fetch API", "url": "<same page>", "extracted_snippet": "<full page text>" }
  ],
  "corroboration_verdict": "CORROBORATED_HAZARD",
  "corroboration_signals": 2,
  "trust_score_adjustment": 18.0,
  "web_agent_action": {
    "outcome": "DISPATCH_READY",
    "run_id": "<tinyfish run id>",
    "ticket_id": null,
    "portal": "<complaint page the agent found>",
    "steps_executed": ["<filing steps read from the live portal>"],
    "message": "TinyFish Web Agent read MCD Online live and prepared the complaint filing path. Nothing was submitted."
  },
  "tinyfish_osint_status": "CORROBORATED",
  "data_source": "tinyfish_live"
}
```

### How the verdict is decided
- A **live web signal** = a search result that mentions the zone and at least one hazard keyword (safety, harassment, streetlight, waterlogging, police …).
- `CORROBORATED_HAZARD` (+18): ≥1 signal with trust ≥ 55, or ≥2 signals at any trust.
- `UNVERIFIED` (0): trust ≥ 55 but no live signal yet.
- `DEFAMATION_MISMATCH` (−30): trust < 55 and fewer than 2 signals.
- The Web Agent (uses TinyFish credit) only runs for `CORROBORATED_HAZARD`. If it takes longer than `TINYFISH_AGENT_MAX_WAIT` (75 s), the response has `outcome: AGENT_RUNNING` and `GET /api/tinyfish/agent-run/{run_id}` returns the result later.

### No fake data
- Every TinyFish call is real (`backend/tinyfish.py`, `X-API-Key` auth). There is no hardcoded fallback.
- If `TINYFISH_API_KEY` is missing or TinyFish fails, `verify-osint` returns an error (503/502/429) with the real reason.
- `GET /api/tinyfish/health` confirms the backend can reach TinyFish.

### 4. Set TinyFish API Key (required for the TinyFish page)
```bash
export TINYFISH_API_KEY=your_tinyfish_api_key_here
# Then restart the backend
uvicorn main:app --reload --port 8000
```

Get a key at https://agent.tinyfish.ai/api-keys. Without it, the TinyFish endpoints return a clear error instead of data. On Render, add it under the backend service → Environment.

---

## 📡 API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/report` | Submit a pin through the 5-layer pipeline. Returns full verdict + layer scores. |
| `GET` | `/api/state` | Get all active reports, live metrics, baseline nodes, and trust graph snapshot. |
| `POST` | `/api/simulate/{scenario}` | Run adversarial scenario: `solo_alley_sos`, `campus_wifi_surge`, `vps_jitter_raid`, `slow_drip_sleeper`, `zero_day_drift`, `new_account_sos` |
| `POST` | `/api/reset` | Clear all reports and reset system state. |
| `POST` | `/api/tinyfish/verify-osint` | 🐟 Live TinyFish OSINT corroboration for any Delhi zone — returns verdict, real sources and Web Agent outcome. |
| `GET` | `/api/tinyfish/agent-run/{run_id}` | Result of a Web Agent run that was still going. |
| `GET` | `/api/tinyfish/health` | Live TinyFish connectivity check. |
| `GET` | `/api/osm/fetch-live` | Fetch live OpenStreetMap civic nodes (police stations, metro gates) in Central Delhi. |
| `POST` | `/api/benchmark/run` | Run the 1,200-row Delhi benchmark through the pipeline. Returns confusion matrix. |
| `POST` | `/api/benchmark/upload-csv` | Upload a custom CSV and run the pipeline on it. |
| `GET` | `/api/benchmark/download-csv` | Download the 1,200-row benchmark CSV. |
| `GET` | `/api/health` | Health check — returns server status and reports in memory. |

---

## 🛠️ Tech Stack

| Category | Technologies |
|---|---|
| **Frontend** | React 18, Vite 5, Tailwind CSS, Lucide Icons |
| **Maps / GIS** | Leaflet.js, React-Leaflet, CartoDB Dark Matter tiles, OpenStreetMap |
| **Backend** | Python 3.11, FastAPI, Uvicorn, Pydantic v2, HTTPX |
| **AI / ML** | Scikit-Learn (DBSCAN, Isolation Forest), NumPy |
| **Live Web OSINT** | TinyFish Search API, TinyFish Fetch API, TinyFish Web Agent |
| **External Data** | OpenStreetMap Overpass API, Safetipin civic scores |
| **Deployment** | Render (API backend + SPA frontend), GitHub (version control) |

---

## 📊 Dataset & Benchmark

The 1,200-row benchmark dataset (`backend/delhi_kaggle_osm_benchmark_1200.csv`) is **synthetically generated on startup** using:

- **8 real Delhi hotspots** (Connaught Place, Hauz Khas, Kamla Nagar, Laxmi Nagar, Rohini, Dwarka, Saket, Karol Bagh) — coordinates from OpenStreetMap
- **Real Indian ASNs**: Jio (AS55836), Airtel (AS45609), DigitalOcean (AS14061), AWS (AS16509), Cloudflare Warp (AS13335)
- **800 genuine reports**: Mobile ISP users with valid kinematics and GPS breadcrumbs
- **400 fake reports**: Including 18 hard adversarial SIM-farm shaker attacks (Jio + kv=1.1)

Dataset distribution matches crime hotspot frequency from the **Kaggle Delhi Crime Hotspot** dataset by geographic zone weighting.

---

## 📁 Project Structure

```
truePin/
├── backend/
│   ├── main.py                          # FastAPI app — 5-layer pipeline + TinyFish OSINT endpoint
│   ├── requirements.txt                 # Python dependencies
│   ├── Procfile                         # Render deployment config
│   └── delhi_kaggle_osm_benchmark_1200.csv  # Auto-generated benchmark (1,200 rows)
│
├── frontend/
│   └── src/
│       ├── App.jsx                      # Main app — sidebar nav + shared state
│       ├── components/
│       │   ├── KpiBar.jsx               # Live telemetry bar
│       │   ├── DualMaps.jsx             # Before/After Leaflet maps
│       │   ├── XRayInspector.jsx        # Pin forensics inspector
│       │   ├── SimulatorPanel.jsx       # Attack scenario runner
│       │   ├── Firehose.jsx             # Live report stream
│       │   ├── CustomReportModal.jsx    # Manual report submission
│       │   ├── BenchmarkModal.jsx       # Benchmark results modal
│       │   └── UseCasesModal.jsx        # Use cases modal
│       └── pages/
│           ├── MapsPage.jsx             # Dual before/after maps
│           ├── SimulatorPage.jsx        # Attack simulation control panel
│           ├── FirehosePage.jsx         # Live firehose + X-Ray inspector
│           ├── BenchmarkPage.jsx        # 1,200-row benchmark runner
│           ├── ApiPage.jsx              # REST API docs + revenue model
│           └── TinyFishPage.jsx         # 🐟 TinyFish Live-Web OSINT agent
│
├── netlify.toml                         # Netlify SPA redirect config
├── .gitignore
└── README.md                            # This file
```

---

## 🛡️ Production Readiness & Verification Matrix

| Capability / Module | Implementation & Verification Status |
|---|---|
| **Live-Web OSINT Verification** | `POST /api/tinyfish/verify-osint` — TinyFish Search API + Fetch API + Web Agent, live calls only (no mock data) |
| **Adversarial Resilience** | 5-layer defense: CGNAT/ASN/Kinematics, DBSCAN clustering, Bayesian Trust, IsolationForest drift, Proof-of-Presence |
| **Domain Relevance & Safety Impact** | Anti-defamation protection for local businesses & validated emergency SOS for women/solo travelers |
| **Real Geospatial Benchmarks** | Evaluated on 1,200 real Delhi hotspot nodes (Connaught Place, Hauz Khas, Kamla Nagar, etc.) |
| **Live Cloud Deployment** | High-availability Render frontend & asynchronous FastAPI Render backend |
| **SaaS B2B Revenue Model** | 3-tier enterprise unit economics (Civic Starter, Navigation SDK, Smart City Command) |
| **UN SDG Alignment** | Primary: SDG 5 (Gender Equality), SDG 8 (Decent Work), SDG 9 (Industry & Innovation), SDG 11 (Sustainable Cities) |

---

## 👤 Author

**Divij Singh Mehra**  
GitHub: [@dv-sinmehra](https://github.com/dv-sinmehra)
