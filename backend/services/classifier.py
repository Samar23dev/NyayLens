"""
Clause Risk Classifier using InLegalBERT

Uses law-ai/InLegalBERT - trained on 5.4M Indian legal cases (1950-2019)
Hybrid approach: InLegalBERT embeddings + keyword heuristics for speed and accuracy
"""

import re
import numpy as np
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity

# Lazy load InLegalBERT model
_inlegalbert_model = None
_model_loaded = False

def _load_inlegalbert():
    """Lazy load InLegalBERT model for semantic analysis."""
    global _inlegalbert_model, _model_loaded
    
    if _model_loaded:
        return _inlegalbert_model
    
    try:
        print("Loading InLegalBERT model (law-ai/InLegalBERT)...")
        # InLegalBERT is available via sentence-transformers
        _inlegalbert_model = SentenceTransformer('law-ai/InLegalBERT')
        print("✓ InLegalBERT loaded successfully")
        _model_loaded = True
        return _inlegalbert_model
    except Exception as e:
        print(f"Warning: Could not load InLegalBERT: {e}")
        print("Falling back to keyword-only classification")
        _model_loaded = True
        return None

# Risk prototype embeddings (pre-computed for speed)
# These represent typical high/medium/low risk clause patterns
RISK_PROTOTYPES = {
    "high_risk": [
        "The party shall have unlimited liability and indemnify without any cap or limitation",
        "Immediate termination without notice at sole discretion of one party",
        "Irrevocable waiver of all rights in perpetuity with no recourse",
        "Hold harmless clause with unlimited indemnification obligations"
    ],
    "medium_risk": [
        "Either party may terminate upon breach with liquidated damages",
        "Arbitration clause with exclusive jurisdiction in specific location",
        "Indemnification obligations limited to direct damages only",
        "Confidentiality obligations with reasonable exceptions"
    ],
    "low_risk": [
        "Either party may terminate with 30 days written notice",
        "Governing law and jurisdiction mutually agreed upon",
        "Standard severability and entire agreement clauses",
        "Reasonable amendment procedures with mutual consent"
    ]
}

# Cache for prototype embeddings
_prototype_embeddings = None

def _get_prototype_embeddings():
    """Get or compute prototype embeddings for risk levels."""
    global _prototype_embeddings
    
    if _prototype_embeddings is not None:
        return _prototype_embeddings
    
    model = _load_inlegalbert()
    if model is None:
        return None
    
    try:
        _prototype_embeddings = {
            "high": model.encode(RISK_PROTOTYPES["high_risk"]),
            "medium": model.encode(RISK_PROTOTYPES["medium_risk"]),
            "low": model.encode(RISK_PROTOTYPES["low_risk"])
        }
        return _prototype_embeddings
    except Exception as e:
        print(f"Error computing prototype embeddings: {e}")
        return None

RISK_KEYWORDS = {
    "high": ["unlimited liability", "sole discretion", "irrevocable", "without notice", "immediate termination", "hold harmless", "perpetuity", "no liability"],
    "medium": ["indemnify", "breach", "penalty", "terminate", "arbitration", "jurisdiction", "liquidated damages"],
    "low": ["notice", "governing law", "severability", "entire agreement", "amendment"]
}

CATEGORIES = {
    "Termination": ["terminate", "termination", "expire", "cancellation"],
    "Liability": ["liability", "indemnify", "damage", "warrant", "breach"],
    "Confidentiality": ["confidential", "disclose", "secret", "proprietary"],
    "Payment": ["pay", "payment", "fee", "invoice", "compensation"],
    "General": []
}

def _classify_with_keywords(clause_text: str) -> dict:
    """Keyword-based classification (fallback method)."""
    text_lower = clause_text.lower()
    
    risk_score = 10  # Base score
    
    # Calculate score based on keywords
    high_matches = sum(1 for kw in RISK_KEYWORDS["high"] if kw in text_lower)
    med_matches = sum(1 for kw in RISK_KEYWORDS["medium"] if kw in text_lower)
    
    risk_score += (high_matches * 30) + (med_matches * 15)
    
    # Cap score at 100
    risk_score = min(risk_score, 100)
    
    # Determine Level
    if risk_score >= 70:
        risk_level = "high"
    elif risk_score >= 40:
        risk_level = "medium"
    elif risk_score >= 20:
        risk_level = "low"
    else:
        risk_level = "safe"
    
    return {
        "risk_level": risk_level,
        "risk_score": risk_score,
        "method": "keywords"
    }

def _classify_with_inlegalbert(clause_text: str) -> dict:
    """InLegalBERT-based semantic classification."""
    model = _load_inlegalbert()
    prototypes = _get_prototype_embeddings()
    
    if model is None or prototypes is None:
        return None
    
    try:
        # Encode the clause
        clause_embedding = model.encode([clause_text])[0].reshape(1, -1)
        
        # Compute similarity to each risk level prototype
        similarities = {}
        for risk_level, prototype_embeds in prototypes.items():
            # Average similarity to all prototypes of this risk level
            sims = cosine_similarity(clause_embedding, prototype_embeds)[0]
            similarities[risk_level] = float(np.mean(sims))
        
        # Determine risk level based on highest similarity
        max_risk = max(similarities, key=similarities.get)
        max_similarity = similarities[max_risk]
        
        # Convert similarity to risk score (0-100)
        # High similarity to high-risk prototypes = high score
        if max_risk == "high":
            base_score = 70
        elif max_risk == "medium":
            base_score = 40
        else:  # low
            base_score = 15
        
        # Adjust based on similarity strength
        risk_score = int(base_score + (max_similarity * 30))
        risk_score = min(max(risk_score, 0), 100)
        
        # Determine final risk level
        if risk_score >= 70:
            risk_level = "high"
        elif risk_score >= 40:
            risk_level = "medium"
        elif risk_score >= 20:
            risk_level = "low"
        else:
            risk_level = "safe"
        
        return {
            "risk_level": risk_level,
            "risk_score": risk_score,
            "method": "inlegalbert",
            "similarities": similarities
        }
    except Exception as e:
        print(f"Error in InLegalBERT classification: {e}")
        return None

def classify_clause(clause_text: str) -> dict:
    """
    Classifies a clause to determine its risk level, risk score, and category.
    
    Uses hybrid approach:
    1. Try InLegalBERT semantic classification
    2. Combine with keyword heuristics
    3. Fallback to keywords-only if model unavailable
    
    Returns a dict with: risk_level, risk_score, category.
    """
    text_lower = clause_text.lower()
    
    # Try InLegalBERT classification
    bert_result = _classify_with_inlegalbert(clause_text)
    keyword_result = _classify_with_keywords(clause_text)
    
    # Hybrid approach: combine both methods
    if bert_result is not None:
        # Weight: 70% InLegalBERT, 30% keywords
        risk_score = int(bert_result["risk_score"] * 0.7 + keyword_result["risk_score"] * 0.3)
        method = "hybrid"
    else:
        # Fallback to keywords only
        risk_score = keyword_result["risk_score"]
        method = "keywords"
    
    # Determine final risk level
    if risk_score >= 70:
        risk_level = "high"
    elif risk_score >= 40:
        risk_level = "medium"
    elif risk_score >= 20:
        risk_level = "low"
    else:
        risk_level = "safe"
    
    # Determine Category (keyword-based, works well)
    category = "General"
    max_cat_matches = 0
    for cat, keywords in CATEGORIES.items():
        if cat == "General":
            continue
        matches = sum(1 for kw in keywords if kw in text_lower)
        if matches > max_cat_matches:
            max_cat_matches = matches
            category = cat

    return {
        "risk_level": risk_level,
        "risk_score": risk_score,
        "category": category
    }

def get_model():
    """Get the loaded InLegalBERT model (for SHAP explainer)."""
    return _load_inlegalbert()
