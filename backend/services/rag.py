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

# Chroma DB client (lazy initialization)
chroma_client = None
precedents_collection = None

def get_chroma_collection():
    """Lazy initialization of Chroma DB collection."""
    global chroma_client, precedents_collection
    
    if precedents_collection is not None:
        return precedents_collection
    
    try:
        # Create data directory if it doesn't exist
        CHROMA_PATH.mkdir(parents=True, exist_ok=True)
        
        # Initialize Chroma client with persistent storage
        chroma_client = chromadb.PersistentClient(
            path=str(CHROMA_PATH),
            settings=Settings(
                anonymized_telemetry=False,
                allow_reset=True
            )
        )
        
        # Get or create collection for Indian legal precedents
        precedents_collection = chroma_client.get_or_create_collection(
            name="indian_precedents",
            metadata={"hnsw:space": "cosine"}  # Use cosine similarity
        )
        
        count = precedents_collection.count()
        print(f"Chroma DB initialized successfully. Collection has {count} precedents.")
        
        return precedents_collection
        
    except Exception as e:
        print(f"Chroma DB initialization error: {e}")
        return None

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
