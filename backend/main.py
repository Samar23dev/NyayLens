from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
import time
import json
from datetime import datetime

# Import Schemas
from models.schemas import AnalysisResult, Clause, Language, RiskBreakdown

# Import Services
from services.document_cache import compute_document_hash, get_cached_analysis, save_analysis_to_cache
from services.extractor import process_document
from services.translator import translate_text_to_english
from services.segmenter import segment_into_clauses
from services.classifier import classify_clause
from services.explainer import generate_shap_tokens
from services.rewriter import generate_rewrite
from services.rag import get_precedents_for_clause, chat_with_document, index_document_clauses, search_documents_semantic
from services.conflict import detect_conflicts
from services.exporter import generate_report

class RewriteRequest(BaseModel):
    text: str
    context: str = ""

class ChatRequest(BaseModel):
    message: str
    context: str

class ExportRequest(BaseModel):
    analysis: dict  # Full AnalysisResult as a plain dict from frontend

class ApproveRequest(BaseModel):
    analysis: dict        # Current analysis with rewrites applied
    parentDocumentId: str # Original v1 documentId

app = FastAPI(
    title="NyayaLens API",
    description="AI-powered legal contract analysis backend."
)

# Allow CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
async def health_check():
    """Health check endpoint to verify backend status."""
    from services.document_cache import USE_MONGO, _init_mongo
    from services.rag import get_chroma_collection
    from services.embeddings import get_sentence_transformer
    from services.classifier import get_model
    import spacy
    import torch
    
    # Try to reconnect to MongoDB if not connected
    _init_mongo()
    
    spacy_ok = False
    try:
        spacy.load("en_core_web_sm")
        spacy_ok = True
    except Exception:
        pass
    
    # Check if sentence transformer is available
    st_model = get_sentence_transformer()
    
    # Check if InLegalBERT is available
    inlegalbert_model = get_model()
    
    # Check Chroma DB
    chroma_collection = get_chroma_collection()
    chroma_count = chroma_collection.count() if chroma_collection else 0
    
    # Check GPU availability
    gpu_available = torch.cuda.is_available()
    
    return {
        "status": "ok",
        "message": "NyayaLens Backend is running.",
        "models": {
            "chromadb": chroma_collection is not None,
            "precedents_count": chroma_count,
            "sentence_transformer": st_model is not None,
            "inlegalbert": inlegalbert_model is not None,
            "spacy": spacy_ok,
            "mongodb": USE_MONGO,
        },
        "gpu": gpu_available
    }

@app.post("/api/analyze", response_model=AnalysisResult)
async def analyze_document(file: UploadFile = File(...), language: str = Form(...)):
    """
    Main pipeline to analyze a contract.
    Flow: Validate -> Deduplicate -> Extract -> Translate -> Segment -> Classify -> SHAP -> Save Cache.
    """
    start_time = time.time()
    
    # 1. Read file bytes
    file_bytes = await file.read()
    
    # Validation: File size
    MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB
    if len(file_bytes) == 0:
        raise HTTPException(status_code=400, detail="Empty file uploaded.")
    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File too large. Maximum size: 50MB")
    
    # Validation: File type
    ALLOWED_EXTENSIONS = {'.pdf', '.docx', '.doc', '.txt', '.png', '.jpg', '.jpeg'}
    import os
    file_ext = os.path.splitext(file.filename)[1].lower() if file.filename else ''
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {file_ext}. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
        )
        
    # 2. Hash & Check Cache (Deduplication)
    file_hash = compute_document_hash(file_bytes)
    cached_result = get_cached_analysis(file_hash)
    if cached_result:
        print(f"Cache hit for {file.filename}. Returning cached analysis.")
        return cached_result
        
    print(f"Processing new file: {file.filename}")
    
    # Parse language JSON from frontend
    try:
        lang_data = json.loads(language)
        lang_code = lang_data.get("code", "en")
        lang_obj = Language(**lang_data)
    except Exception:
        lang_code = "en"
        lang_obj = Language(code="en", name="English", nativeName="English")
    
    # 3. Extraction (PDF / DOCX / Image OCR)
    raw_text = await process_document(file.filename, file_bytes)
    if not raw_text.strip():
        raise HTTPException(status_code=400, detail="Could not extract text from document. Ensure it's not a scanned image without text.")
        
    # 4. Translation (if non-English; Google Cloud client is disabled by default)
    english_text = translate_text_to_english(raw_text, lang_code)
    
    # 5. Segmentation (spaCy)
    raw_clauses = segment_into_clauses(english_text)
    
    # 6. Classification & Explainability (Legal-BERT / SHAP)
    processed_clauses = []
    overall_score = 0
    breakdown = {"high": 0, "medium": 0, "low": 0, "safe": 0}
    
    for i, text in enumerate(raw_clauses):
        # Classify Risk
        classification = classify_clause(text)
        risk_level = classification["risk_level"]
        risk_score = classification["risk_score"]
        
        # Explainer (SHAP Tokens)
        shap_tokens = generate_shap_tokens(text)
        
        # Track aggregated stats
        overall_score += risk_score
        breakdown[risk_level] += 1
        
        # Phase 4: Precedents
        precedents = []
        if risk_level in ["high", "medium"]:
            precedents = get_precedents_for_clause(text)
        
        # Phase 4: Regulations
        from services.regulations import match_regulations_to_clause
        regulations = match_regulations_to_clause(text, top_k=3)
            
        processed_clauses.append(Clause(
            id=f"clause-{i}",
            index=i,
            title=f"Section {i+1}",
            text=text,
            translatedText=text if lang_code != "en" else None,
            riskLevel=risk_level,
            riskScore=risk_score,
            category=classification["category"],
            shapTokens=shap_tokens,
            rewrite=None,              # Triggered via /api/rewrite
            regulations=regulations,   # Phase 4: Regulations matching
            conflicts=None,            
            retrievedPrecedents=precedents 
        ))
        
    # Phase 4: Conflict Detection
    clause_dicts = [{"id": c.id, "title": c.title, "text": c.text} for c in processed_clauses]
    detected_conflicts = detect_conflicts(clause_dicts)
        
    # Aggregate Final Stats
    total_clauses = len(processed_clauses)
    avg_score = int(overall_score / total_clauses) if total_clauses > 0 else 0
    
    summary = f"Successfully extracted and analyzed {total_clauses} clauses. "
    if avg_score >= 70:
        summary += "The document contains multiple high-risk clauses requiring immediate legal review."
    elif avg_score >= 40:
        summary += "The document contains some concerning terms. Proceed with caution."
    else:
        summary += "The document appears relatively standard with no major red flags."
        
    # Construct Final Result matching Pydantic Schema
    result = AnalysisResult(
        documentId=f"doc-{file_hash[:8]}",
        fileName=file.filename,
        language=lang_obj,
        uploadedAt=datetime.utcnow().isoformat() + "Z",
        processingTime=round(time.time() - start_time, 2),
        overallRiskScore=avg_score,
        clauses=processed_clauses,
        conflicts=detected_conflicts,
        summary=summary,
        riskBreakdown=RiskBreakdown(**breakdown)
    )
    
    # 7. Cache result in MongoDB
    save_analysis_to_cache(file_hash, result)

    # 8. Index clause embeddings in ChromaDB for semantic search
    try:
        n = index_document_clauses(result.model_dump())
        if n:
            print(f"Indexed {n} clauses into ChromaDB document_clauses.")
    except Exception as e:
        print(f"Warning: ChromaDB indexing skipped: {e}")

    return result

@app.post("/api/rewrite")
async def rewrite_clause(req: RewriteRequest):
    """Phase 4 Endpoint: AI Clause Rewriter"""
    rewrite = generate_rewrite(req.text, req.context)
    return {"rewrite": rewrite}

@app.delete("/api/reset")
async def reset_cache():
    """
    DEV ONLY: Drops the entire MongoDB analysis_cache collection for clean testing.
    """
    from services.document_cache import collection as cache_col, USE_MONGO
    if not USE_MONGO or cache_col is None:
        return {"status": "skipped", "message": "MongoDB not connected — nothing to clear."}
    try:
        result = cache_col.delete_many({})
        return {
            "status": "ok",
            "message": f"Cleared {result.deleted_count} cached document(s) from MongoDB."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Reset failed: {str(e)}")

@app.post("/api/export")
async def export_document(req: ExportRequest):
    """
    Generates a beautifully styled .docx legal audit report.
    Accepts the full analysis JSON (with any AI rewrites applied) from the frontend.
    Returns a downloadable .docx file.
    """
    import traceback
    from fastapi.responses import Response
    try:
        docx_bytes = generate_report(req.analysis)
        file_name = req.analysis.get("fileName", "NyayaLens_Report").replace(".pdf", "").replace(".docx", "")
        return Response(
            content=docx_bytes,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={"Content-Disposition": f'attachment; filename="NyayaLens_{file_name}.docx"'}
        )
    except Exception as e:
        traceback.print_exc()  # Prints full stack trace to uvicorn terminal
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")

@app.post("/api/approve", response_model=AnalysisResult)
async def approve_document(req: ApproveRequest):
    """
    Saves an AI-approved document as a new version (v2, v3, ...) chained to the parent.
    The approved clauses (with rewrites) replace the originals and the doc is re-cached.
    """
    from datetime import datetime
    analysis_data = req.analysis
    parent_id     = req.parentDocumentId

    # Count how many clauses have rewrites applied
    rewrites_count = sum(1 for c in analysis_data.get("clauses", []) if c.get("rewrite"))
    
    # Determine version: fetch parent from cache to look up its version number
    parent_cached = None
    try:
        from services.document_cache import collection as cache_col, USE_MONGO
        if USE_MONGO and cache_col is not None:
            parent_doc = cache_col.find_one({"result.documentId": parent_id})
            if parent_doc:
                parent_cached = parent_doc.get("result", {})
    except Exception:
        pass

    parent_version = parent_cached.get("version", 1) if parent_cached else 1
    new_version = parent_version + 1

    # Build the approved v2 analysis object
    # For each clause, if rewrite exists, swap the text with the rewrite
    approved_clauses = []
    for c in analysis_data.get("clauses", []):
        clause_copy = dict(c)
        if clause_copy.get("rewrite"):
            # Swap: original text becomes translatedText, rewrite becomes the main text
            clause_copy["translatedText"] = clause_copy.get("text", "")
            clause_copy["text"] = clause_copy["rewrite"]
            # Rewrites are safer — reduce riskScore and potentially riskLevel
            clause_copy["riskScore"] = max(0, clause_copy.get("riskScore", 50) - 30)
            if clause_copy["riskScore"] < 40:
                clause_copy["riskLevel"] = "low"
            if clause_copy["riskScore"] < 20:
                clause_copy["riskLevel"] = "safe"
        approved_clauses.append(clause_copy)

    # Recalculate overall risk score
    total = len(approved_clauses)
    new_overall = int(sum(c.get("riskScore", 0) for c in approved_clauses) / total) if total > 0 else 0
    new_breakdown = {"high": 0, "medium": 0, "low": 0, "safe": 0}
    for c in approved_clauses:
        lvl = c.get("riskLevel", "safe")
        if lvl in new_breakdown:
            new_breakdown[lvl] += 1

    # Construct the v2 result
    v2_result = AnalysisResult(
        documentId=f"doc-v{new_version}-{parent_id[4:12] if len(parent_id) > 8 else parent_id}",
        fileName=analysis_data.get("fileName", "Document"),
        language=Language(**analysis_data.get("language", {"code": "en", "name": "English", "nativeName": "English"})),
        uploadedAt=datetime.utcnow().isoformat() + "Z",
        processingTime=analysis_data.get("processingTime", 0),
        overallRiskScore=new_overall,
        clauses=[Clause(**c) for c in approved_clauses],
        conflicts=[],
        summary=f"Version {new_version}: AI-approved revision with {rewrites_count} clause(s) rewritten. Overall risk reduced from {analysis_data.get('overallRiskScore', 0)} → {new_overall}.",
        riskBreakdown=RiskBreakdown(**new_breakdown),
        version=new_version,
        parentDocumentId=parent_id,
        rewritesApplied=rewrites_count
    )

    # Cache the v2 result in MongoDB (new unique hash based on v2 documentId)
    new_hash = compute_document_hash(v2_result.documentId.encode())
    save_analysis_to_cache(new_hash, v2_result)

    return v2_result

@app.post("/api/chat")
async def chat_interaction(req: ChatRequest):
    """Phase 4 Endpoint: RAG Chatbot"""
    reply = chat_with_document(req.message, req.context)
    return {"reply": reply}


class SearchRequest(BaseModel):
    query: str
    top_k: int = 5

@app.post("/api/search")
async def semantic_search(req: SearchRequest):
    """
    Semantic search across all indexed document clauses via ChromaDB HNSW.
    Documents are indexed automatically after each analysis.
    Falls back to MongoDB scan if ChromaDB has no entries yet.
    """
    if not req.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty.")

    try:
        results = search_documents_semantic(req.query, req.top_k)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")

    return {"query": req.query, "results": results}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
