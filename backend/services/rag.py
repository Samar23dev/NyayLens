import os
import json
from pathlib import Path
import chromadb
from chromadb.config import Settings
from models.schemas import Precedent
from langchain_groq import ChatGroq
from langchain_core.prompts import PromptTemplate
from dotenv import load_dotenv

load_dotenv()

api_key = os.environ.get("GROQ_API_KEY")
if api_key:
    chat_llm = ChatGroq(
        groq_api_key=api_key,
        model_name="llama-3.3-70b-versatile",
        temperature=0.2
    )
else:
    chat_llm = None

DATA_DIR = Path(__file__).parent.parent / "data"
CHROMA_PATH = DATA_DIR / "chroma_db"

# Chroma DB client and collections (lazy initialization)
chroma_client = None
precedents_collection = None
document_clauses_collection = None  # For semantic document search

def _get_chroma_client():
    """Shared lazy-initialized ChromaDB persistent client."""
    global chroma_client
    if chroma_client is not None:
        return chroma_client
    CHROMA_PATH.mkdir(parents=True, exist_ok=True)
    chroma_client = chromadb.PersistentClient(
        path=str(CHROMA_PATH),
        settings=Settings(anonymized_telemetry=False, allow_reset=True)
    )
    return chroma_client

def get_chroma_collection():
    """Lazy initialization of the indian_precedents ChromaDB collection."""
    global precedents_collection
    if precedents_collection is not None:
        return precedents_collection
    try:
        client = _get_chroma_client()
        precedents_collection = client.get_or_create_collection(
            name="indian_precedents",
            metadata={"hnsw:space": "cosine"}
        )
        print(f"ChromaDB precedents ready — {precedents_collection.count()} entries.")
        return precedents_collection
    except Exception as e:
        print(f"ChromaDB precedents init error: {e}")
        return None

def get_document_clauses_collection():
    """Lazy initialization of the document_clauses ChromaDB collection."""
    global document_clauses_collection
    if document_clauses_collection is not None:
        return document_clauses_collection
    try:
        client = _get_chroma_client()
        document_clauses_collection = client.get_or_create_collection(
            name="document_clauses",
            metadata={"hnsw:space": "cosine"}
        )
        print(f"ChromaDB document_clauses ready — {document_clauses_collection.count()} entries.")
        return document_clauses_collection
    except Exception as e:
        print(f"ChromaDB document_clauses init error: {e}")
        return None

def index_document_clauses(analysis_result: dict) -> int:
    """
    Indexes all clauses of an analyzed document into the document_clauses
    ChromaDB collection so they can be found via semantic search later.

    Called automatically after a successful analysis.
    Returns number of clauses indexed.
    """
    from services.embeddings import get_sentence_transformer
    collection = get_document_clauses_collection()
    if collection is None:
        return 0

    model = get_sentence_transformer()
    if model is None:
        return 0

    doc_id   = analysis_result.get("documentId", "")
    filename = analysis_result.get("fileName", "")
    risk     = str(analysis_result.get("overallRiskScore", 0))
    uploaded = analysis_result.get("uploadedAt", "")
    lang     = analysis_result.get("language", {}) or {}
    lang_name = lang.get("name", "English") if isinstance(lang, dict) else "English"

    clauses = analysis_result.get("clauses", []) or []
    if not clauses:
        return 0

    ids, documents, metadatas = [], [], []
    for clause in clauses:
        clause_id = clause.get("id", "")
        text      = clause.get("text", "").strip()
        if not text:
            continue
        unique_id = f"{doc_id}___{clause_id}"
        ids.append(unique_id)
        documents.append(text)
        metadatas.append({
            "documentId":    doc_id,
            "fileName":      filename,
            "clauseTitle":   clause.get("title", ""),
            "riskLevel":     clause.get("riskLevel", "safe"),
            "riskScore":     str(clause.get("riskScore", 0)),
            "category":      clause.get("category", ""),
            "overallRisk":   risk,
            "uploadedAt":    uploaded,
            "language":      lang_name,
        })

    if not ids:
        return 0

    try:
        # Upsert so re-analyzing the same doc doesn't duplicate entries
        embeddings = model.encode(documents).tolist()
        collection.upsert(ids=ids, documents=documents, metadatas=metadatas, embeddings=embeddings)
        print(f"Indexed {len(ids)} clauses from '{filename}' into document_clauses.")
        return len(ids)
    except Exception as e:
        print(f"ChromaDB indexing error: {e}")
        return 0

def search_documents_semantic(query: str, top_k: int = 5) -> list[dict]:
    """
    Semantic search over all indexed document clauses using ChromaDB HNSW.
    Returns top-K results grouped by document, with the best matching clause
    snippet and relevance score.
    """
    from services.embeddings import get_sentence_transformer
    collection = get_document_clauses_collection()
    if collection is None or collection.count() == 0:
        return []

    model = get_sentence_transformer()
    if model is None:
        return []

    try:
        query_embedding = model.encode([query])[0].tolist()
        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=min(top_k * 3, collection.count()),  # Fetch more, then group
            include=["documents", "metadatas", "distances"]
        )
    except Exception as e:
        print(f"ChromaDB search error: {e}")
        return []

    # Group by document, keep best clause match per document
    seen: dict[str, dict] = {}
    ids_list      = results["ids"][0]
    docs_list     = results["documents"][0]
    metas_list    = results["metadatas"][0]
    dists_list    = results["distances"][0]

    for uid, text, meta, dist in zip(ids_list, docs_list, metas_list, dists_list):
        # cosine distance [0,2] → relevance [0,1]
        relevance = round(max(0.0, 1.0 - dist / 2.0), 3)
        if relevance < 0.25:
            continue
        doc_id = meta.get("documentId", "")
        if doc_id not in seen or relevance > seen[doc_id]["relevanceScore"]:
            seen[doc_id] = {
                "documentId":         doc_id,
                "fileName":           meta.get("fileName", "Unknown"),
                "overallRiskScore":   int(meta.get("overallRisk", 0)),
                "uploadedAt":         meta.get("uploadedAt", ""),
                "language":           meta.get("language", "English"),
                "relevanceScore":     relevance,
                "matchedClauseTitle": meta.get("clauseTitle", ""),
                "matchedSnippet":     text[:200] + ("…" if len(text) > 200 else ""),
                "matchedRiskLevel":   meta.get("riskLevel", "safe"),
            }

    ranked = sorted(seen.values(), key=lambda r: -r["relevanceScore"])
    return ranked[:top_k]

def get_precedents_for_clause(
    clause_text: str, 
    top_k: int = 2,
    court_filter: str = None,
    year_min: int = None
) -> list[Precedent]:
    """
    Retrieves the most semantically similar case law for a given clause.
    
    Args:
        clause_text: The clause text to search for
        top_k: Number of results to return
        court_filter: Optional filter by court name (e.g., "Supreme Court")
        year_min: Optional minimum year filter (e.g., 2015)
    """
    collection = get_chroma_collection()
    
    if not collection:
        return []
    
    # Check if collection is empty
    if collection.count() == 0:
        print("Warning: Precedents collection is empty. Run populate_precedents.py to add cases.")
        return []
    
    try:
        # Build metadata filter
        where_filter = {}
        if court_filter:
            where_filter["court"] = {"$eq": court_filter}
        if year_min:
            where_filter["year"] = {"$gte": year_min}
        
        # Query Chroma
        results = collection.query(
            query_texts=[clause_text],
            n_results=top_k,
            where=where_filter if where_filter else None,
            include=["documents", "metadatas", "distances"]
        )
        
        # Convert to Precedent objects
        precedents = []
        if results and results["ids"] and len(results["ids"][0]) > 0:
            for i in range(len(results["ids"][0])):
                metadata = results["metadatas"][0][i]
                distance = results["distances"][0][i]
                
                # Convert cosine distance to relevance score (0-1, higher is better)
                # Cosine distance ranges from 0 (identical) to 2 (opposite)
                relevance_score = max(0.0, 1.0 - (distance / 2.0))
                
                # Only include if relevance is above threshold
                if relevance_score > 0.3:
                    precedents.append(Precedent(
                        id=results["ids"][0][i],
                        title=metadata.get("title", "Unknown Case"),
                        court=metadata.get("court", "Unknown Court"),
                        year=int(metadata.get("year", 2000)),
                        summary=results["documents"][0][i],
                        relevanceScore=round(relevance_score, 2)
                    ))
        
        return precedents
        
    except Exception as e:
        print(f"Error querying precedents: {e}")
        return []

def chat_with_document(message: str, context: str) -> str:
    """RAG Chatbot using LangChain and Groq Llama-3."""
    if not chat_llm:
        return "LangChain Groq API not configured. Cannot process chat."
        
    prompt = PromptTemplate.from_template("""You are NyayaLens, an expert AI Legal Assistant. 
    Answer the user's question based strictly on the provided document context.
    If you quote or reference a specific part of the contract, you MUST provide an inline citation (e.g., [Source: Section 4 - Termination]).
    Keep your answer concise, helpful, and legally accurate. Do not make up information outside the context.
    
    Document Context:
    {context}
    
    User Question:
    {message}""")
    
    try:
        chain = prompt | chat_llm
        response = chain.invoke({"context": context, "message": message})
        return response.content.strip()
    except Exception as e:
        print(f"LangChain Chat API Error: {e}")
        return "Sorry, I encountered an error processing your question."
