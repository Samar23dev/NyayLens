import hashlib
from models.schemas import AnalysisResult
import os
from pymongo import MongoClient

# Use environment variable for MongoDB URI, default to local
MONGO_URI = os.environ.get("MONGODB_URI", "mongodb://localhost:27017/")

client = None
db     = None
collection = None
USE_MONGO = False
_init_attempted = False

def _init_mongo():
    """Lazy initialization of MongoDB connection to avoid blocking startup."""
    global client, db, collection, USE_MONGO, _init_attempted
    
    # If already successfully connected, return
    if client is not None and USE_MONGO:
        return
    
    # If we've tried and failed, retry anyway (MongoDB might have started)
    # This allows reconnection if MongoDB starts after the backend
    
    try:
        client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=2000)
        db = client["nyayalens"]
        collection = db["analysis_cache"]
        # Check connection
        client.admin.command('ping')
        
        if not _init_attempted:
            print("MongoDB Connected Successfully.")
        else:
            print("MongoDB Reconnected Successfully.")
        
        USE_MONGO = True
        _init_attempted = True
    except Exception as e:
        if not _init_attempted:
            print(f"MongoDB Connection Failed: {e}. Falling back to NO-CACHE mode.")
            _init_attempted = True
        USE_MONGO = False
        client = None
        db = None
        collection = None

def compute_document_hash(file_bytes: bytes) -> str:
    """Computes a SHA-256 hash of the file bytes to uniquely identify it."""
    return hashlib.sha256(file_bytes).hexdigest()

def get_cached_analysis(doc_hash: str) -> AnalysisResult | None:
    """Retrieves an existing analysis from MongoDB if available."""
    _init_mongo()  # Lazy init on first use
    
    if not USE_MONGO or collection is None:
        return None
        
    try:
        data = collection.find_one({"_id": doc_hash})
        if data:
            print(f"Cache HIT for document {doc_hash}")
            result_dict = data["result"]
            # ── Backward-compat migration ──────────────────────────────────────
            # Old cached documents predate the version/rewritesApplied fields.
            # Inject defaults so Pydantic validation doesn't fail.
            result_dict.setdefault("version", 1)
            result_dict.setdefault("rewritesApplied", 0)
            result_dict.setdefault("parentDocumentId", None)
            # ──────────────────────────────────────────────────────────────────
            return AnalysisResult(**result_dict)
    except Exception as e:
        print(f"MongoDB read error: {e}")
    
    return None

def save_analysis_to_cache(doc_hash: str, result: AnalysisResult):
    """Saves the analysis result to MongoDB using the hash as the ID."""
    _init_mongo()  # Lazy init on first use
    
    if not USE_MONGO or collection is None:
        return
        
    try:
        data = {
            "_id": doc_hash,
            "result": result.model_dump()
        }
        collection.update_one({"_id": doc_hash}, {"$set": data}, upsert=True)
    except Exception as e:
        print(f"MongoDB write error: {e}")
