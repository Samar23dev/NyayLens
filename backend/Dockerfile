# ── Backend — FastAPI + InLegalBERT ──────────────────────────────────────────
FROM python:3.11-slim

# System deps
# - build-essential  : compiles C extensions (numpy, scipy)
# - libmagic1        : python-magic file type detection
# - libpoppler-cpp-dev, poppler-utils : pdfplumber PDF parsing on Linux
# - curl             : healthcheck probe
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
        libmagic1 \
        libpoppler-cpp-dev \
        poppler-utils \
        curl \
    && rm -rf /var/lib/apt/lists/*

# Install uv (fast Python package manager)
RUN pip install uv --no-cache-dir

WORKDIR /app

# Copy dependency manifests first — Docker layer cache means this
# layer is only rebuilt when dependencies actually change.
COPY pyproject.toml uv.lock ./

# Install all Python dependencies (frozen for reproducibility)
RUN uv sync --frozen --no-dev

# Download spaCy model
RUN uv run python -m spacy download en_core_web_sm

# Copy application source (after deps to keep cache efficient)
COPY . .

# Create data directories so ChromaDB/cache volumes mount cleanly
RUN mkdir -p data/chroma_db data/analysis_cache

EXPOSE 8000

# Healthcheck — used by docker-compose depends_on condition
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=5 \
  CMD curl -f http://localhost:8000/api/health || exit 1

# ML models lazy-load on first request — startup is instant
CMD ["uv", "run", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
