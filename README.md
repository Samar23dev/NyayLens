<div align="center">

# ⚖️ NyayaLens

### AI-Powered Legal Contract Risk Analysis for Indian Law

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/Frontend-React_19-61DAFB?style=flat-square&logo=react)](https://react.dev/)
[![InLegalBERT](https://img.shields.io/badge/ML-InLegalBERT-orange?style=flat-square)](https://huggingface.co/law-ai/InLegalBERT)
[![Groq](https://img.shields.io/badge/LLM-Llama--3.3_70B-purple?style=flat-square)](https://groq.com/)
[![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](LICENSE)

NyayaLens is a full-stack platform that ingests Indian legal contracts in any of 22 official languages and returns clause-level risk scores, SHAP word attributions, regulatory citations, case-law precedents, AI-generated safer rewrites, and cross-clause conflict detection — all in one API call.

</div>

---

## 📋 Table of Contents

- [Features](#-features)
- [Architecture](#-architecture)
- [ML Pipeline](#-ml-pipeline)
- [Project Structure](#-project-structure)
- [Quick Start](#-quick-start)
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
| **Groq / Llama-3.3 70B** | Used for borderline clause validation, AI rewrites, RAG chat, and document summaries |
| **SHAP Explainability** | Perturbation-based word-level attribution scores show *why* a clause is risky |
| **RAG Precedents** | ChromaDB vector store with Indian Kanoon case law; retrieves relevant precedents per clause |
| **Conflict Detection** | Cross-clause cosine similarity + negation heuristics to surface legal contradictions |
| **Regulatory Mapping** | Keyword matching against 10 Indian legal bodies (BNS, SEBI, RBI, Companies Act, IT Act, etc.) |
| **AI Clause Rewriting** | Llama-3.3 70B rewrites high-risk clauses into balanced legal language |
| **DOCX Report Export** | Professional styled audit report with cover page, summary, conflicts, and per-clause deep-dives |
| **Document Versioning** | Approved rewrites are persisted as v2, v3 … with MongoDB caching |
| **22 Indian Languages** | Language picker UI; Google Cloud Translate integration for non-English contracts |
| **OCR Support** | Google Cloud Vision API for scanned PDFs and images |
| **RAG Chatbot** | Context-aware chat against the uploaded contract using LangChain + Groq |

---

## 🏗️ Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                     Frontend (Vite + React 19)                  │
│   HomePage → DashboardPage → DocumentViewer → ClauseAnalysis    │
│        ConflictsPage → RegulationsPage → HistoryPage            │
│                         Chatbot (RAG)                           │
└──────────────────────────────┬─────────────────────────────────┘
                               │ HTTP / JSON
┌──────────────────────────────▼─────────────────────────────────┐
│                    FastAPI Backend (Python)                      │
│                                                                  │
│  POST /api/analyze ──► Extract ──► Translate ──► Segment        │
│                        Classify ──► SHAP ──► RAG                │
│                        Regulations ──► Conflicts ──► Summary    │
│                                                                  │
│  POST /api/rewrite   POST /api/chat   POST /api/export           │
│  POST /api/approve   GET  /api/health DELETE /api/reset          │
└──────────┬──────────────────┬────────────────────┬─────────────┘
           │                  │                    │
    ┌──────▼──────┐   ┌──────▼──────┐   ┌────────▼────────┐
    │  MongoDB     │   │  ChromaDB   │   │  Groq API       │
    │  (cache)     │   │  (vectors)  │   │  (Llama-3.3)    │
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
  ├── 2. Groq / Llama-3.3 70B (borderline clauses only: score 35–75)
  │      Structured JSON response → validated risk label
  └── 3. Keyword heuristics (always)
         Final = 50% BERT + 30% Groq (if used) + 20% keywords
        │
        ▼
  SHAP Explainability
  └── Perturbation: remove each word → measure Δ risk score
      → top-15 word attributions returned per clause
        │
        ▼
  RAG Precedent Retrieval (high/medium clauses only)
  └── ChromaDB query → cosine similarity → relevance > 0.3
        │
        ▼
  Regulatory Mapping
  └── Keyword matching → BNS, SEBI, RBI, Companies Act, IT Act,
      Indian Contract Act, Arbitration Act, Consumer Protection Act,
      Specific Relief Act, Limitation Act
        │
        ▼
  Conflict Detection
  └── SentenceTransformer (all-MiniLM-L6-v2)
      Pairwise cosine similarity + negation heuristic
      Threshold: > 0.75 = critical, 0.60–0.75 = warning
        │
        ▼
  Summary Generation → Groq / Llama-3.3 70B
        │
        ▼
  Cache result → MongoDB
        │
        ▼
  Return AnalysisResult JSON
```

---

## 📁 Project Structure

```
Project/
├── README.md                          ← You are here
│
├── backend/                           ← FastAPI + Python ML
│   ├── main.py                        ← 7 REST endpoints
│   ├── pyproject.toml                 ← uv-managed dependencies
│   ├── .env                           ← API keys (never commit!)
│   ├── .gitignore
│   │
│   ├── models/
│   │   └── schemas.py                 ← Pydantic models
│   │
│   ├── services/
│   │   ├── extractor.py               ← PDF / DOCX / OCR extraction
│   │   ├── segmenter.py               ← spaCy clause segmentation
│   │   ├── classifier.py              ← InLegalBERT + Groq + keywords
│   │   ├── explainer.py               ← SHAP perturbation attribution
│   │   ├── rag.py                     ← ChromaDB precedent retrieval
│   │   ├── regulations.py             ← Indian law keyword matching
│   │   ├── conflict.py                ← Cross-clause contradiction detection
│   │   ├── rewriter.py                ← Llama-3.3 70B clause rewriting
│   │   ├── translator.py              ← Google Cloud Translate
│   │   ├── embeddings.py              ← SentenceTransformer singleton
│   │   ├── exporter.py                ← DOCX report generation
│   │   └── document_cache.py          ← MongoDB SHA-256 caching
│   │
│   ├── data/
│   │   ├── regulations.json           ← Indian law database
│   │   ├── sample_precedents.json     ← Curated case law seeds
│   │   ├── chroma_db/                 ← ChromaDB persistent store
│   │   └── analysis_cache/            ← Local JSON fallback cache
│   │
│   └── scripts/
│       ├── populate_precedents.py     ← Seed ChromaDB from JSON
│       └── populate_precedents_api.py ← Seed from Indian Kanoon API
│
├── LegalDocs/                         ← Vite + React 19 frontend
│   ├── src/
│   │   ├── App.tsx                    ← Router (7 routes)
│   │   ├── pages/
│   │   │   ├── HomePage.tsx           ← Upload + language picker
│   │   │   ├── DashboardPage.tsx      ← Risk gauge + charts
│   │   │   ├── DocumentViewerPage.tsx ← Heatmap + rewrite toggle
│   │   │   ├── ClauseAnalysisPage.tsx ← SHAP + rewrites + precedents
│   │   │   ├── RegulationsPage.tsx    ← Indian law mapping
│   │   │   ├── ConflictsPage.tsx      ← Contradiction visualization
│   │   │   └── HistoryPage.tsx        ← LocalStorage history
│   │   ├── components/
│   │   │   ├── Layout.tsx             ← App shell + sidebar
│   │   │   ├── Chatbot.tsx            ← Floating RAG chatbot
│   │   │   ├── AnalysisProgress.tsx   ← Pipeline step indicator
│   │   │   └── ui/                    ← Button, Card, Badge, Progress…
│   │   ├── lib/
│   │   │   ├── api.ts                 ← Backend fetch client
│   │   │   ├── AnalysisContext.tsx    ← Global analysis state
│   │   │   ├── ThemeContext.tsx       ← Dark / light theme
│   │   │   ├── storageService.ts      ← LocalStorage history (max 10)
│   │   │   ├── chatUtils.ts           ← Chatbot ↔ backend bridge
│   │   │   └── utils.ts               ← cn, formatDate, risk helpers
│   │   ├── types/index.ts             ← TypeScript type definitions
│   │   └── data/mockData.ts           ← 22 supported languages
│   ├── package.json
│   ├── tailwind.config.js
│   └── vercel.json                    ← Vercel deployment config
│
└── Files/                             ← 14 sample Indian legal PDFs
```

---

## 🚀 Quick Start

### Prerequisites

- Python ≥ 3.11
- Node.js ≥ 18
- [`uv`](https://docs.astral.sh/uv/) (Python package manager)
- MongoDB (local or Atlas)
- Groq API key (free tier available at [console.groq.com](https://console.groq.com))

### 1. Clone & set up backend

```bash
cd backend

# Install dependencies with uv
uv sync

# Activate virtual environment
.\.venv\Scripts\activate       # Windows
# source .venv/bin/activate    # macOS/Linux

# Install spaCy model
python -m spacy download en_core_web_sm

# Copy and fill in your API keys
cp .env.example .env
```

### 2. Seed the precedents database (optional but recommended)

```bash
# Seed from curated sample data (no API key needed)
python -m scripts.populate_precedents

# Or seed from Indian Kanoon API (requires INDIAN_KANOON_API_KEY)
python -m scripts.populate_precedents_api
```

### 3. Start the backend

```bash
uvicorn main:app --reload
# API available at http://localhost:8000
# Docs at        http://localhost:8000/docs
```

### 4. Set up and start the frontend

```bash
cd LegalDocs
npm install
npm run dev
# App available at http://localhost:5173
```

---

## 🔑 Environment Variables

Create `backend/.env` with the following keys:

```env
# ── Required ──────────────────────────────────────────────────────
GROQ_API_KEY=gsk_...           # Llama-3.3 70B inference (free tier available)
MONGODB_URI=mongodb://...      # MongoDB connection string

# ── For OCR (scanned PDFs) ────────────────────────────────────────
GOOGLE_API_KEY=AIza...
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json

# ── For live precedents ───────────────────────────────────────────
INDIAN_KANOON_API_KEY=...      # https://api.indiankanoon.org/
```

> **⚠️ Never commit `.env` to version control.** It is listed in `backend/.gitignore`.

---

## 📡 API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | System status — models loaded, DB connected, GPU info |
| `POST` | `/api/analyze` | Full ML pipeline. Body: `multipart/form-data` (`file`, `language`) |
| `POST` | `/api/rewrite` | Rewrite a single clause. Body: `{ text, context }` |
| `POST` | `/api/chat` | RAG chatbot. Body: `{ message, context }` |
| `POST` | `/api/export` | Generate DOCX report. Body: `{ analysis: AnalysisResult }` |
| `POST` | `/api/approve` | Save approved rewrites as new version. Body: `{ analysis }` |
| `DELETE` | `/api/reset` | Clear MongoDB cache (dev only) |

### Example: Analyze a document

```bash
curl -X POST http://localhost:8000/api/analyze \
  -F "file=@contract.pdf" \
  -F "language=en"
```

### Example: Generate a rewrite

```bash
curl -X POST http://localhost:8000/api/rewrite \
  -H "Content-Type: application/json" \
  -d '{"text": "The party may terminate immediately at sole discretion.", "context": "Employment Agreement"}'
```

---

## 🖥️ Frontend Pages

| Route | Page | Description |
|-------|------|-------------|
| `/` | **Home** | Drag-and-drop upload, 22-language picker, recent history |
| `/dashboard` | **Dashboard** | Risk gauge, pie chart, bar chart, risk trend line, top clauses |
| `/document` | **Document Viewer** | Color-coded heatmap, "Show Safe Rewrites" toggle, DOCX export |
| `/clauses` | **Clause Analysis** | Per-clause SHAP force plot, AI rewrite generator, case law tab |
| `/regulations` | **Regulations** | Indian law citations per clause, filterable by legal body |
| `/conflicts` | **Conflicts** | Contradiction pairs with severity badges and recommended actions |
| `/history` | **History** | LocalStorage-persisted analysis history with aggregate stats |

---

## 📜 Scripts

### `scripts/populate_precedents.py`
Seeds ChromaDB from the curated `data/sample_precedents.json`. Run this first to have precedents available without needing an API key.

```bash
python -m scripts.populate_precedents
```

### `scripts/populate_precedents_api.py`
Fetches real landmark Indian cases from the **Indian Kanoon API** across 15 search queries (employment, breach, indemnity, force majeure, etc.) and adds them to ChromaDB. Requires `INDIAN_KANOON_API_KEY`.

```bash
python -m scripts.populate_precedents_api          # Skip if DB < 7 days old
python -m scripts.populate_precedents_api --force  # Always update
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
| Vector Store | ChromaDB (local persistent) |
| Database | MongoDB (analysis cache) |
| NLP | spaCy `en_core_web_sm` |
| Extraction | pdfplumber, python-docx |
| OCR | Google Cloud Vision API |
| Translation | Google Cloud Translate API |
| Reports | python-docx |
| Dep. Management | `uv` + `pyproject.toml` |

### Frontend

| Layer | Technology |
|-------|------------|
| Framework | React 19 + Vite |
| Styling | Tailwind CSS |
| UI Primitives | Radix UI |
| Animations | Framer Motion |
| Charts | Recharts |
| Icons | Lucide React |
| State | React Context (`AnalysisContext`) |
| Persistence | LocalStorage via `storageService` |
| Deployment | Vercel (`vercel.json`) |

---

## 📄 License

MIT — see [LICENSE](LICENSE).

---

<div align="center">
Built for India's 22 official languages · InLegalBERT × Llama-3.3 × SHAP · NyayaLens v2.1
</div>
