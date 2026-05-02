<div align="center">

# ⚖️ NyayaLens

### AI-Powered Legal Contract Risk Analysis for Indian Law

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/Frontend-React_19-61DAFB?style=flat-square&logo=react)](https://react.dev/)
[![InLegalBERT](https://img.shields.io/badge/ML-InLegalBERT-orange?style=flat-square)](https://huggingface.co/law-ai/InLegalBERT)
[![Groq](https://img.shields.io/badge/LLM-Llama--3.3_70B-purple?style=flat-square)](https://groq.com/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker)](https://docs.docker.com/compose/)
[![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](LICENSE)

NyayaLens is a full-stack platform that ingests Indian legal contracts in any of 22 official languages and returns clause-level risk scores, SHAP word attributions, regulatory citations, case-law precedents, AI-generated safer rewrites, and cross-clause conflict detection — all in one API call.

<br/>

<div align="center">
  <video src="https://github.com/Samar23dev/NyayLens/raw/master/Files/demo.mp4" controls width="100%" style="border-radius: 10px;"></video>
</div>

</div>

---

## 📋 Table of Contents

- [Features](#-features)
- [Architecture](#-architecture)
- [ML Pipeline](#-ml-pipeline)
- [ChromaDB Collections](#-chromadb-collections)
- [Project Structure](#-project-structure)
- [Quick Start](#-quick-start)
- [Docker Setup](#-docker-setup)
- [Environment Variables](#-environment-variables)
- [API Reference](#-api-reference)
- [Frontend Pages](#-frontend-pages)
- [Scripts](#-scripts)
- [Tech Stack](#-tech-stack)

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| **InLegalBERT Classification** | Trained on 5.4M Indian legal cases (1950–2019). Hybrid with keyword heuristics for robustness |
| **Groq / Llama-3.3 70B** | Borderline clause validation, AI rewrites, RAG chat, and document summaries |
| **SHAP Explainability** | Perturbation-based word-level attribution scores show *why* a clause is risky |
| **RAG Precedents** | ChromaDB `indian_precedents` collection with Indian Kanoon case law |
| **Semantic Document Search** | ChromaDB `document_clauses` collection — HNSW vector search across all analyzed documents |
| **Conflict Detection** | Cross-clause cosine similarity + negation heuristics to surface legal contradictions |
| **Regulatory Mapping** | Keyword matching against 10 Indian legal bodies (BNS, SEBI, RBI, Companies Act, IT Act, etc.) |
| **AI Clause Rewriting** | Llama-3.3 70B rewrites high-risk clauses into balanced legal language |
| **DOCX Report Export** | Professional audit report with cover page, summary, conflicts, and per-clause deep-dives |
| **Document Versioning** | Approved rewrites persisted as v2, v3 … with MongoDB caching |
| **22 Indian Languages** | Indic-font language picker (Noto Sans); Google Cloud Translate for non-English contracts |
| **OCR Support** | Google Cloud Vision API for scanned PDFs and images |
| **RAG Chatbot** | Context-aware chat against the uploaded contract using LangChain + Groq |
| **Docker Support** | One-command full-stack setup with `docker compose up --build` |

---

## 🏗️ Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                     Frontend (Vite + React 19)                  │
│   HomePage → DashboardPage → DocumentViewer → ClauseAnalysis    │
│   ConflictsPage → RegulationsPage → HistoryPage (Semantic Search)│
│                         Chatbot (RAG)                           │
└──────────────────────────────┬─────────────────────────────────┘
                               │ HTTP / JSON
┌──────────────────────────────▼─────────────────────────────────┐
│                    FastAPI Backend (Python)                      │
│                                                                  │
│  POST /api/analyze  ──► full ML pipeline + ChromaDB indexing    │
│  POST /api/search   ──► semantic search via ChromaDB HNSW       │
│  POST /api/rewrite  POST /api/chat   POST /api/export           │
│  POST /api/approve  GET  /api/health DELETE /api/reset          │
└──────────┬──────────────────┬────────────────────┬─────────────┘
           │                  │                    │
    ┌──────▼──────┐   ┌──────▼──────┐   ┌────────▼────────┐
    │  MongoDB     │   │  ChromaDB   │   │  Groq API       │
    │  (cache)     │   │  (2 colls)  │   │  (Llama-3.3)    │
    └─────────────┘   └─────────────┘   └─────────────────┘
```

---

## 🧠 ML Pipeline

### Analysis Flow (`POST /api/analyze`)

```
Upload (PDF / DOCX / Image)
        │
        ▼
  SHA-256 Hash ──► MongoDB cache hit? ──► Return cached result
        │ (cache miss)
        ▼
  Text Extraction
  ├── PDF     → pdfplumber
  ├── DOCX    → python-docx
  └── Image   → Google Cloud Vision OCR
        │
        ▼
  Translation (if non-English)
  └── Google Cloud Translate API
        │
        ▼
  Segmentation → spaCy en_core_web_sm
        │
        ▼
  Per-Clause Classification (hybrid, 3-tier):
  ├── 1. InLegalBERT (law-ai/InLegalBERT)
  │      Prototype cosine similarity → semantic risk score
  ├── 2. Groq / Llama-3.3 70B (borderline clauses: score 35–75)
  │      Structured JSON response → validated risk label
  └── 3. Keyword heuristics (always)
         Final = 50% BERT + 30% Groq (if used) + 20% keywords
        │
        ▼
  SHAP Explainability
  └── Perturbation: mask each word → Δ risk score → top-15 attributions
        │
        ▼
  RAG Precedent Retrieval (high/medium clauses only)
  └── ChromaDB `indian_precedents` → cosine similarity → relevance > 0.3
        │
        ▼
  Regulatory Mapping
  └── Keyword matching → BNS, SEBI, RBI, Companies Act, IT Act,
      Indian Contract Act, Arbitration Act, Consumer Protection,
      Specific Relief Act, Limitation Act
        │
        ▼
  Conflict Detection
  └── SentenceTransformer (all-MiniLM-L6-v2)
      Pairwise cosine + negation heuristic
      > 0.75 = critical, 0.60–0.75 = warning
        │
        ▼
  Summary Generation → Groq / Llama-3.3 70B
        │
        ▼
  Cache result → MongoDB
        │
        ▼
  Index clause embeddings → ChromaDB `document_clauses`  ← NEW
        │
        ▼
  Return AnalysisResult JSON
```

---

## 🗄️ ChromaDB Collections

NyayaLens uses **two separate ChromaDB collections**:

| Collection | Contents | Used by |
|-----------|----------|---------|
| `indian_precedents` | Indian case law summaries (seeded by scripts) | Clause analysis — per-clause precedent cards |
| `document_clauses` | Every clause from every analyzed document (auto-indexed) | `POST /api/search` — semantic HNSW search |

> The `document_clauses` collection is populated **automatically** every time a new document is analyzed. Documents analyzed before upgrading to v2.2 need to be re-uploaded once to be indexed.

---

## 📁 Project Structure

```
Project/
├── README.md
├── .gitignore                         ← Root-level (covers both backend + frontend)
├── docker-compose.yml                 ← Full-stack Docker orchestration
│
├── backend/
│   ├── main.py                        ← 8 REST endpoints
│   ├── Dockerfile
│   ├── .dockerignore
│   ├── .env.example                   ← Copy to .env and fill in keys
│   ├── pyproject.toml                 ← uv-managed dependencies
│   │
│   ├── models/
│   │   └── schemas.py
│   │
│   ├── services/
│   │   ├── extractor.py               ← PDF / DOCX / OCR
│   │   ├── segmenter.py               ← spaCy clause segmentation
│   │   ├── classifier.py              ← InLegalBERT + Groq + keywords
│   │   ├── explainer.py               ← SHAP perturbation attribution
│   │   ├── rag.py                     ← ChromaDB (precedents + doc search)
│   │   ├── regulations.py             ← 10 Indian legal bodies
│   │   ├── conflict.py                ← Cross-clause contradiction detection
│   │   ├── rewriter.py                ← Llama-3.3 70B clause rewriting
│   │   ├── translator.py              ← Google Cloud Translate
│   │   ├── embeddings.py              ← SentenceTransformer singleton
│   │   ├── exporter.py                ← DOCX audit report generation
│   │   └── document_cache.py          ← MongoDB SHA-256 caching
│   │
│   ├── data/
│   │   ├── regulations.json
│   │   ├── sample_precedents.json
│   │   ├── chroma_db/                 ← ChromaDB store (gitignored)
│   │   └── analysis_cache/
│   │
│   └── scripts/
│       ├── populate_precedents.py
│       └── populate_precedents_api.py
│
├── LegalDocs/
│   ├── Dockerfile
│   ├── .dockerignore
│   ├── nginx.conf                     ← SPA routing + /api proxy
│   ├── .env.example
│   ├── src/
│   │   ├── App.tsx                    ← 7 routes
│   │   ├── pages/
│   │   │   ├── HomePage.tsx           ← Upload + Indic language picker
│   │   │   ├── DashboardPage.tsx      ← Risk gauge + charts
│   │   │   ├── DocumentViewerPage.tsx ← Heatmap + rewrite toggle
│   │   │   ├── ClauseAnalysisPage.tsx ← SHAP + rewrites + precedents
│   │   │   ├── RegulationsPage.tsx    ← 10 Indian legal bodies
│   │   │   ├── ConflictsPage.tsx      ← Contradiction pairs
│   │   │   └── HistoryPage.tsx        ← History + dual-mode search
│   │   ├── lib/
│   │   │   ├── api.ts                 ← Backend fetch client (incl. searchDocuments)
│   │   │   ├── AnalysisContext.tsx
│   │   │   ├── ThemeContext.tsx       ← Dark/light (html.light class)
│   │   │   ├── storageService.ts
│   │   │   ├── chatUtils.ts
│   │   │   └── utils.ts               ← Theme-aware risk color helpers
│   │   ├── index.css                  ← Design tokens + light/dark utilities
│   │   └── data/mockData.ts           ← 22 supported languages
│   └── tailwind.config.js
│
└── Files/                             ← Sample Indian legal PDFs
```

---

## 🚀 Quick Start

### Prerequisites

- Python ≥ 3.11
- Node.js ≥ 18
- [`uv`](https://docs.astral.sh/uv/)
- MongoDB (local or Atlas)
- Groq API key — free at [console.groq.com](https://console.groq.com)

### 1. Clone & set up backend

```bash
cd backend
uv sync
.\.venv\Scripts\activate       # Windows
# source .venv/bin/activate    # macOS/Linux
python -m spacy download en_core_web_sm
cp .env.example .env           # Fill in GROQ_API_KEY and MONGODB_URI
```

### 2. Seed ChromaDB precedents (optional but recommended)

```bash
python -m scripts.populate_precedents       # Uses sample data, no API key needed
# python -m scripts.populate_precedents_api # Real cases from Indian Kanoon API
```

### 3. Start the backend

```bash
uvicorn main:app --reload
# API: http://localhost:8000
# Docs: http://localhost:8000/docs
```

### 4. Start the frontend

```bash
cd LegalDocs
npm install
npm run dev
# App: http://localhost:5173
```

---

## 🐳 Docker Setup

One command to run the entire stack (MongoDB + backend + Nginx frontend):

```bash
cp backend/.env.example backend/.env
# Fill in GROQ_API_KEY in backend/.env

docker compose up --build
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost |
| Backend API | http://localhost:8000 |
| API Docs | http://localhost:8000/docs |

> **Note:** First build downloads InLegalBERT (~400MB) and spaCy models. Subsequent starts use cached Docker volumes and are instant.

---

## 🔑 Environment Variables

`backend/.env` (copy from `backend/.env.example`):

```env
# Required
GROQ_API_KEY=gsk_...
MONGODB_URI=mongodb://localhost:27017

# For OCR (scanned PDFs)
GOOGLE_API_KEY=AIza...
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json

# For live precedents from Indian Kanoon
INDIAN_KANOON_API_KEY=...
```

> **⚠️ Never commit `.env`** — it is listed in both `.gitignore` files.

---

## 📡 API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | System status — models, DB, GPU |
| `POST` | `/api/analyze` | Full ML pipeline. `multipart/form-data`: `file`, `language` |
| `POST` | `/api/search` | Semantic search. `{ query, top_k? }` → ChromaDB HNSW |
| `POST` | `/api/rewrite` | AI clause rewrite. `{ text, context }` |
| `POST` | `/api/chat` | RAG chatbot. `{ message, context }` |
| `POST` | `/api/export` | DOCX report. `{ analysis: AnalysisResult }` |
| `POST` | `/api/approve` | Save approved version. `{ analysis, parentDocumentId }` |
| `DELETE` | `/api/reset` | Clear MongoDB cache (dev only) |

### Examples

```bash
# Analyze a document
curl -X POST http://localhost:8000/api/analyze \
  -F "file=@contract.pdf" -F 'language={"code":"en","name":"English","nativeName":"English"}'

# Semantic search
curl -X POST http://localhost:8000/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "termination without notice", "top_k": 5}'
```

---

## 🖥️ Frontend Pages

| Route | Page | Description |
|-------|------|-------------|
| `/` | **Home** | Drag-and-drop upload, Indic language picker, recent history |
| `/dashboard` | **Dashboard** | Risk gauge, pie chart, bar chart, top risky clauses |
| `/document` | **Document Viewer** | Colour-coded heatmap, rewrite toggle, DOCX export |
| `/clauses` | **Clause Analysis** | SHAP force plot, AI rewrite generator, precedents tab |
| `/regulations` | **Regulations** | 10 Indian law citations, filterable by body |
| `/conflicts` | **Conflicts** | Contradiction pairs with severity badges |
| `/history` | **History** | Instant search (localStorage) + Semantic search (ChromaDB) |

---

## 📜 Scripts

### `scripts/populate_precedents.py`
Seeds the `indian_precedents` ChromaDB collection from `data/sample_precedents.json`.

```bash
python -m scripts.populate_precedents
```

### `scripts/populate_precedents_api.py`
Fetches real landmark Indian cases from the **Indian Kanoon API**.

```bash
python -m scripts.populate_precedents_api
python -m scripts.populate_precedents_api --force   # Force refresh
```

---

## 🛠️ Tech Stack

### Backend

| Layer | Technology |
|-------|------------|
| Framework | FastAPI + Uvicorn |
| ML — Classification | `law-ai/InLegalBERT` via `sentence-transformers` |
| ML — LLM | Llama-3.3 70B via Groq API + LangChain |
| ML — Embeddings | `all-MiniLM-L6-v2` via `sentence-transformers` |
| ML — Explainability | Perturbation-based SHAP (custom) |
| Vector Store | ChromaDB (2 collections: precedents + documents) |
| Database | MongoDB (analysis cache + versioning) |
| NLP | spaCy `en_core_web_sm` |
| Extraction | pdfplumber, python-docx |
| OCR | Google Cloud Vision API |
| Translation | Google Cloud Translate API |
| Reports | python-docx |
| Package Manager | `uv` + `pyproject.toml` |

### Frontend

| Layer | Technology |
|-------|------------|
| Framework | React 19 + Vite |
| Styling | Tailwind CSS + custom design tokens |
| Fonts | Inter + Noto Sans (all 22 Indian scripts) |
| UI Primitives | Radix UI |
| Animations | Framer Motion |
| Charts | Recharts |
| Icons | Lucide React |
| State | React Context (`AnalysisContext`, `ThemeContext`) |
| Persistence | LocalStorage via `storageService` |
| Deployment | Vercel (`vercel.json`) / Docker + Nginx |

---

## 📄 License

MIT — see [LICENSE](LICENSE).

---

<div align="center">
Built for India's 22 official languages · InLegalBERT × Llama-3.3 × SHAP · NyayaLens v2.2
</div>
