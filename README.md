<div align="center">

# 🛰️ NGO AI Command Center

### _Autonomous Mission Intelligence for Disaster Response & Volunteer Triage_

[![Python](https://img.shields.io/badge/Python-3.12%2B-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-Backend-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Streamlit](https://img.shields.io/badge/Streamlit-Dashboard-FF4B4B?style=for-the-badge&logo=streamlit&logoColor=white)](https://streamlit.io/)
[![NVIDIA NIM](https://img.shields.io/badge/NVIDIA-NIM%20API-76B900?style=for-the-badge&logo=nvidia&logoColor=white)](https://developer.nvidia.com/nim)
[![ChromaDB](https://img.shields.io/badge/ChromaDB-Vector%20Search-FF6F00?style=for-the-badge)](https://www.trychroma.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

---

**A full-stack AI platform that transforms chaotic disaster field reports into structured missions, then automatically deploys the best-matched volunteer squads — all in seconds.**

</div>

---

## 📖 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Folder Structure](#-folder-structure)
- [Prerequisites](#-prerequisites)
- [Installation & Setup](#-installation--setup)
- [Configuration](#-configuration)
- [Running the Platform](#-running-the-platform)
- [API Reference](#-api-reference)
- [Usage Notes](#-usage-notes)
- [Project Roadmap](#-project-roadmap)
- [Contributing](#-contributing)
- [License](#-license)
- [Credits](#-credits)

---

## 🌟 Overview

**NGO AI Command Center** is an enterprise-grade coordination platform purpose-built to modernize disaster response and volunteer logistics. It tackles two critical bottlenecks in crisis management:

1. **Unstructured Field Reports** — Autonomous multi-agent CrewAI pipelines parse messy, unstructured incident reports (text or PDF) into clean, actionable mission JSON objects, complete with severity scoring, victim counts, category classification, and multi-lingual translations.

2. **Inefficient Volunteer Deployment** — A ChromaDB-powered semantic vector search replaces brittle keyword matching, finding the best available volunteers based on skill relevance, geographic proximity, and current energy levels to prevent burnout.

The result is a unified, real-time command platform with two concurrent frontends — a **Streamlit Mission Control dashboard** and an **HTML/JS web interface** — backed by a **FastAPI REST API** and an **offline fallback engine** for resilient operation without cloud connectivity.

---

## ✨ Key Features

| Feature | Description |
|---|---|
| 🤖 **Multi-Agent AI Extraction** | CrewAI agents powered by NVIDIA NIM (Llama 3.1 8B Instruct) parse unstructured text and PDF reports into structured mission data |
| 🗺️ **Semantic Volunteer Matching** | ChromaDB + Sentence-Transformers (all-MiniLM-L6-v2) finds the right volunteers via 384-dimensional skill embeddings |
| 📍 **Proximity-First Triage** | Distance-aware ranking identifies the fastest responders based on geographic coordinates |
| 🦅 **Mega-Squad Assembly** | Incidents with 40+ victims automatically split response into dual-leadership **Team Alpha / Team Beta** |
| ⚡ **Energy & Fatigue Tracking** | Gamified volunteer health system (0–100%) prevents burnout and ensures sustainable deployments |
| 🌍 **Auto-Translation** | Missions are auto-translated to Spanish and French for international responder teams |
| 📄 **PDF Intelligence Upload** | Drag-and-drop PDF damage reports are processed by AI extraction agents automatically |
| 📊 **Live Analytics Dashboard** | Plotly gauges, pie charts, and area graphs track system strain, efficiency metrics, and roster status |
| 🔌 **Offline Fallback Engine** | Regex-based local intelligence kicks in when the NVIDIA API is unavailable |
| 🚀 **Premium CLI Launcher** | Node.js launcher manages both servers, detects port conflicts, and provides live health monitoring |

---

## 🏗️ Architecture

```text
┌──────────────────────────────────────────────────────────────────────┐
│                        NGO COMMAND PLATFORM                          │
│                                                                      │
│  ┌─────────────────────────────┐   ┌──────────────────────────────┐  │
│  │   Streamlit Dashboard        │   │  HTML/JS Web Interface       │  │
│  │   (app.py / dashboard.py)    │   │  (frontend/index.html)       │  │
│  │  • Mission Control          │   │  • Chat-style mission input  │  │
│  │  • Volunteer Roster         │   │  • Live roster + maps        │  │
│  │  • Real-time Analytics      │   │  • Inventory tracking        │  │
│  │  • PDF Upload & Extract     │   │  • Activity visualizations   │  │
│  └─────────────┬───────────────┘   └──────────────┬───────────────┘  │
│                │                                   │                  │
│                └────────────────┬──────────────────┘                  │
│                                 ▼                                     │
│                  ┌──────────────────────────────┐                    │
│                  │     FastAPI REST API          │                    │
│                  │     (src/api/server.py)       │                    │
│                  │  POST /process                │                    │
│                  │  GET  /volunteers             │                    │
│                  │  GET  /inventory              │                    │
│                  └──────────────┬───────────────┘                    │
│                                 ▼                                     │
│            ┌────────────────────────────────────────┐                │
│            │          AI Intelligence Core           │                │
│            │  ┌──────────────┐  ┌─────────────────┐ │                │
│            │  │ CrewAI Agents│  │ ChromaDB Vector  │ │                │
│            │  │ (crew.py)    │  │ (vector_db.py)   │ │                │
│            │  └──────┬───────┘  └────────┬────────┘ │                │
│            │         │                   │          │                │
│            │         ▼                   ▼          │                │
│            │   NVIDIA NIM API     Sentence-          │                │
│            │   Llama 3.1 8B       Transformers       │                │
│            │   (classifier.py)    all-MiniLM-L6-v2   │                │
│            └────────────────────────────────────────┘                │
└──────────────────────────────────────────────────────────────────────┘
```

### AI Processing Pipeline

```text
Incident Report (Text / PDF)
          │
          ▼
  CrewAI Extraction Agents   ──── NVIDIA NIM (Llama 3.1 8B)
          │
          ▼
  Structured JSON Mission
  (Severity, Category, Victim Count, Translations)
          │
          ▼
  Sentence-Transformers Embedding
          │
          ▼
  ChromaDB Semantic Similarity Search
          │
          ▼
  Proximity + Energy Scoring
          │
          ▼
  ┌──── < 40 victims ──────┐     ┌──── 40+ victims ────────────┐
  │   Standard Squad       │     │  Mega-Squad (Alpha + Beta)  │
  │   (precision team)     │     │  (dual-leadership response) │
  └────────────────────────┘     └─────────────────────────────┘
```

---

## 🛠️ Tech Stack

### Python Backend
| Technology | Role |
|---|---|
| **FastAPI** | High-performance async REST API |
| **Uvicorn** | ASGI server for FastAPI |
| **Streamlit** | Mission Control dashboard UI |
| **CrewAI** | Multi-agent task orchestration |
| **ChromaDB** | Persistent local vector database |
| **Sentence-Transformers** | 384-dim skill embeddings (`all-MiniLM-L6-v2`) |
| **NVIDIA NIM API** | Cloud LLM inference (Llama 3.1 8B Instruct) |
| **Plotly** | Interactive charts and gauges |
| **Folium** | Interactive geospatial maps |
| **Pandas** | Data manipulation and analytics |
| **PyPDF2** | PDF intelligence extraction |
| **Pydantic** | Settings management and data validation |
| **python-dotenv** | Environment variable loading |

### Frontend & Launcher
| Technology | Role |
|---|---|
| **Vanilla JS / HTML5 / CSS3** | Web interface (`frontend/`) |
| **Leaflet.js** (via CDN) | Map rendering in the web frontend |
| **Node.js** | Premium CLI launcher (`launch.js`) |
| **chalk / ora / boxen** | CLI UI enhancements |

---

## 📁 Folder Structure

```text
ai-nigo-dashboard/
│
├── 📄 app.py                     ← Streamlit Mission Control (main entry)
├── 📄 launch.js                  ← Node.js premium launcher
├── 📄 requirements.txt           ← Python dependencies
├── 📄 package.json               ← Node.js launcher dependencies
├── 📄 .env.example               ← Environment variable template
├── 📄 setup_fedora.sh            ← Automated Linux setup script
├── 📄 LICENSE                    ← MIT License
│
├── 📂 config/
│   └── settings.py               ← Pydantic settings (NVIDIA API config)
│
├── 📂 src/
│   ├── 📂 api/
│   │   ├── server.py             ← FastAPI REST API endpoints
│   │   └── dashboard.py          ← Streamlit alternate dashboard
│   ├── 📂 core/
│   │   ├── engine.py             ← Mission pipeline orchestrator
│   │   ├── service.py            ← Volunteer service logic
│   │   ├── scorer.py             ← Priority & severity scoring
│   │   ├── matcher.py            ← Distance & semantic ranking
│   │   ├── gamifier.py           ← Fatigue & energy tracking
│   │   ├── offline_engine.py     ← Regex-based offline fallback
│   │   └── inventory_service.py  ← Resource inventory management
│   ├── 📂 nlp/
│   │   ├── classifier.py         ← NVIDIA NIM LLM interface
│   │   ├── crew.py               ← CrewAI agent definitions
│   │   ├── summarizer.py         ← Context summarization
│   │   └── vector_db.py          ← ChromaDB operations & embeddings
│   └── 📂 repository/            ← Data access layer
│
├── 📂 frontend/
│   ├── index.html                ← Web dashboard entry point
│   ├── app.js                    ← Frontend application logic
│   └── style.css                 ← Dashboard styles
│
├── 📂 data/
│   ├── 📂 vectordb/              ← ChromaDB persistent storage
│   ├── missions.json             ← Mission persistence
│   ├── volunteers.json           ← Volunteer roster
│   ├── inventory.json            ← Resource inventory
│   ├── sample_tasks.json         ← Sample test data
│   └── volunteer_stats.json      ← Energy/fatigue persistence
│
├── 📂 docs/                      ← Additional documentation
└── 📂 tests/                     ← Unit & integration tests
```

---

## ✅ Prerequisites

| Requirement | Version | Notes |
|---|---|---|
| **Python** | ≥ 3.12 | Required for all backend services |
| **pip** | Latest | Python package manager |
| **Node.js** | ≥ 18 LTS | Required only for the premium CLI launcher |
| **npm** | ≥ 9 | Bundled with Node.js |
| **NVIDIA NIM API Key** | — | Free tier available at [build.nvidia.com](https://build.nvidia.com) |
| **Git** | Any | Version control |

> **Note:** The platform runs without a GPU — all LLM inference is handled by the NVIDIA NIM cloud API. An offline fallback engine is available when API access is unavailable.

---

## 🚀 Installation & Setup

### Option A — Automated Linux Setup (Fedora / Ubuntu)

```bash
# Clone the repository
git clone https://github.com/noobcoder1982/ai-nigo-dashboard.git
cd ai-nigo-dashboard

# Run the automated setup script
chmod +x setup_fedora.sh
./setup_fedora.sh

# Activate the virtual environment
source venv_linux/bin/activate
```

### Option B — Manual Setup (Windows / macOS / Linux)

```bash
# 1. Clone the repository
git clone https://github.com/noobcoder1982/ai-nigo-dashboard.git
cd ai-nigo-dashboard

# 2. Create and activate a Python virtual environment
python -m venv venv

# Windows
.\venv\Scripts\activate

# macOS / Linux
source venv/bin/activate

# 3. Install Python dependencies
pip install -r requirements.txt

# 4. Configure environment variables (see Configuration section)
cp .env.example .env
# Open .env and add your NVIDIA API key

# 5. (Optional) Install Node.js launcher dependencies
npm run install:deps
```

---

## ⚙️ Configuration

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

```env
# .env
NVIDIA_API_KEY=your_nvidia_api_key_here
```

| Variable | Required | Description |
|---|---|---|
| `NVIDIA_API_KEY` | ✅ Yes | API key for NVIDIA NIM (Llama 3.1 8B Instruct). Get one free at [build.nvidia.com](https://build.nvidia.com). |

> **Security:** `.env` is excluded by `.gitignore`. Never commit your API key. Use `.env.example` as the committed reference template.

---

## ▶️ Running the Platform

### 🟢 Recommended — Premium Node.js Launcher

The built-in CLI launcher starts both the frontend HTTP server and the FastAPI backend simultaneously, handles port conflicts, and displays a live health monitor.

```bash
# Start the full platform
npm run launch
```

Controls while running:
- Press **`R`** — Restart all services
- Press **`Q`** — Quit and stop all processes

**Access points after launch:**
- 🌐 Web Dashboard: [http://localhost:3000](http://localhost:3000)
- 🔌 REST API: [http://localhost:8000](http://localhost:8000)
- 📚 API Docs (Swagger): [http://localhost:8000/docs](http://localhost:8000/docs)

---

### 🔵 Streamlit Mission Control Dashboard

```bash
# Run the full-featured Streamlit command center
streamlit run app.py
```

Access at: [http://localhost:8501](http://localhost:8501)

---

### 🟡 Manual Launch (Two Terminals)

**Terminal 1 — Frontend HTTP Server:**
```bash
python -m http.server 3000 -d frontend
```

**Terminal 2 — FastAPI Backend:**
```bash
uvicorn src.api.server:app --reload --port 8000
```

---

## 📡 API Reference

The FastAPI backend exposes its full interactive documentation at **[http://localhost:8000/docs](http://localhost:8000/docs)** (Swagger UI) once running.

### `POST /process`

Process an incident report and receive a full triage plan with matched volunteers.

**Request Body:**
```json
{
  "task": {
    "task_id": "MISSION_001",
    "description": "Flooding in Sector Beta, 50 people stranded, medical assistance required.",
    "people_count": 50,
    "location_coords": [12.9716, 77.5946]
  },
  "volunteers": [
    {
      "id": "V1",
      "name": "Jane Smith",
      "skills": ["Medical", "First Aid"],
      "location_coords": [12.9800, 77.5900],
      "available": true
    }
  ]
}
```

**Response fields include:** `intent`, `message`, `mission`, `assigned_squad`, `team_alpha`, `team_beta` (for mega-squad events), `translations`.

### `GET /volunteers`

Returns the current volunteer roster with energy levels and availability.

### `GET /inventory`

Returns the current resource/inventory status.

---

## 💡 Usage Notes

### Streamlit Dashboard (`app.py`)

Navigate the sidebar to access:

| Section | Description |
|---|---|
| **Command Center** | Overview of active missions, system readiness gauge, and map |
| **Mission Lab** | Create missions manually or by uploading a PDF field report |
| **Volunteer Roster** | Browse available volunteers, energy levels, and skills |
| **Analytics** | Plotly charts for mission categories, response efficiency, and team strain |
| **Settings** | Configure operational parameters |

**Workflow example:**
1. Open the **Mission Lab** tab
2. Type or paste a field report (e.g., _"Flood in Sector Beta, 50 people stranded, need medical teams urgently"_) — or upload a PDF damage report
3. Click **Generate Mission Plan**
4. The AI extracts the mission and presents severity, category, victim count, and a recommended squad

### Web Interface (`frontend/`)

The HTML/JS interface communicates with the FastAPI backend at `http://127.0.0.1:8000`. Make sure the backend is running before using the web frontend.

### Screenshots

> _Screenshots coming soon. Run the platform locally to see the dark command-center UI in action._

---

## 🗺️ Project Roadmap

### ✅ Completed
- [x] Multi-agent CrewAI extraction pipeline (Llama 3.1 via NVIDIA NIM)
- [x] Semantic volunteer matching with ChromaDB + Sentence-Transformers
- [x] Streamlit Command Center with custom dark/gold theme and Plotly analytics
- [x] Proximity-first scoring and gamified fatigue/energy tracking
- [x] Automatic Mega-Squad assembly for 40+ victim incidents
- [x] PDF intelligence extraction (PyPDF2)
- [x] Multi-lingual translation (Spanish, French) via CrewAI agents
- [x] Offline fallback engine (regex-based, no API required)
- [x] HTML/JS web frontend with map, roster, and inventory views
- [x] Node.js premium CLI launcher with health monitoring
- [x] FastAPI REST backend with CORS support and Swagger docs

### 🚀 Future Vision
- [ ] Interactive live deployment map with Folium route tracking
- [ ] Live traffic overlay integration for dynamic re-routing
- [ ] WhatsApp/SMS volunteer notification simulation
- [ ] Predictive resource forecasting with time-series AI
- [ ] Mobile-responsive PWA version of the web frontend

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

1. **Fork** this repository
2. **Create a branch:** `git checkout -b feature/your-feature-name`
3. **Make your changes** and write clear commit messages
4. **Run tests:** `python -m pytest tests/`
5. **Push your branch:** `git push origin feature/your-feature-name`
6. **Open a Pull Request** describing what you changed and why

Please follow the existing code style and keep changes focused. For significant changes, open an issue first to discuss your proposal.

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for full details.

```
MIT License — Copyright (c) 2026 AI Intelligence Team
```

---

## 🙌 Credits

- **AI Inference** — [NVIDIA NIM](https://developer.nvidia.com/nim) powering Llama 3.1 8B Instruct
- **Agent Orchestration** — [CrewAI](https://www.crewai.com/) multi-agent framework
- **Vector Search** — [ChromaDB](https://www.trychroma.com/) + [Sentence-Transformers](https://www.sbert.net/)
- **Dashboard UI** — [Streamlit](https://streamlit.io/) + [Plotly](https://plotly.com/) + [Folium](https://python-visualization.github.io/folium/)
- **API Framework** — [FastAPI](https://fastapi.tiangolo.com/)

---

<div align="center">

Built with ❤️ for faster disaster response, smarter triage, and more sustainable NGO operations.

</div>
