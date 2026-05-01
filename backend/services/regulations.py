"""
Regulations Matching Service

Maps contract clauses to relevant Indian legal regulations including:
- Bharatiya Nyaya Sanhita (BNS) 2023
- Indian Contract Act, 1872
- SEBI Regulations
- RBI Guidelines
- Companies Act, 2013
- IT Act, 2000
- Arbitration Act, 1996
- Consumer Protection Act, 2019
- Specific Relief Act, 1963
- Limitation Act, 1963
"""

import json
from pathlib import Path
from typing import List
from models.schemas import Regulation

# Lazy load regulations database
_regulations_db = None
_regulations_loaded = False

DATA_DIR = Path(__file__).parent.parent / "data"
REGULATIONS_FILE = DATA_DIR / "regulations.json"

def load_regulations():
    """Load regulations from JSON file (lazy loading)."""
    global _regulations_db, _regulations_loaded
    
    if _regulations_loaded:
        return _regulations_db
    
    try:
        if not REGULATIONS_FILE.exists():
            print(f"Warning: Regulations file not found: {REGULATIONS_FILE}")
            _regulations_db = []
            _regulations_loaded = True
            return _regulations_db
        
        with open(REGULATIONS_FILE, 'r', encoding='utf-8') as f:
            _regulations_db = json.load(f)
        
        print(f"Loaded {len(_regulations_db)} regulations from database")
        _regulations_loaded = True
        return _regulations_db
        
    except Exception as e:
        print(f"Error loading regulations: {e}")
        _regulations_db = []
        _regulations_loaded = True
        return _regulations_db

def match_regulations_to_clause(clause_text: str, top_k: int = 3) -> List[Regulation]:
    """
    Match a clause to relevant Indian legal regulations using keyword matching.
    
    Args:
        clause_text: The contract clause text
        top_k: Maximum number of regulations to return
        
    Returns:
        List of Regulation objects with relevance scores
    """
    regulations_db = load_regulations()
    
    if not regulations_db:
        return []
    
    clause_lower = clause_text.lower()
    matches = []
    
    for reg in regulations_db:
        # Calculate relevance score based on keyword matches
        keywords = reg.get("keywords", [])
        if not keywords:
            continue
            
        matches_count = sum(1 for keyword in keywords if keyword.lower() in clause_lower)
        
        if matches_count > 0:
            # Calculate relevance score (0-1)
            # Give more weight to multiple keyword matches
            relevance = min(1.0, (matches_count / len(keywords)) * 1.5)
            
            # Apply threshold (use a lower default if not specified)
            threshold = reg.get("relevance_threshold", 0.3)
            if relevance >= threshold:
                matches.append({
                    "regulation": reg,
                    "relevance": relevance
                })
    
    # Sort by relevance (highest first)
    matches.sort(key=lambda x: x["relevance"], reverse=True)
    
    # Convert to Regulation objects
    results = []
    for match in matches[:top_k]:
        reg = match["regulation"]
        results.append(Regulation(
            id=reg["id"],
            code=reg["code"],
            title=reg["title"],
            section=reg["section"],
            body=reg["body"],
            relevance=round(match["relevance"], 2)
        ))
    
    return results

def get_regulation_by_id(regulation_id: str) -> dict | None:
    """Get a specific regulation by its ID."""
    regulations_db = load_regulations()
    
    for reg in regulations_db:
        if reg["id"] == regulation_id:
            return reg
    
    return None

def get_regulations_by_body(body: str) -> List[dict]:
    """
    Get all regulations from a specific legal body.
    
    Args:
        body: Legal body name (e.g., "BNS", "SEBI", "RBI", "Companies Act", "IT Act")
    """
    regulations_db = load_regulations()
    
    return [reg for reg in regulations_db if reg["body"] == body]

def search_regulations(query: str, top_k: int = 5) -> List[Regulation]:
    """
    Search regulations by query string.
    
    Args:
        query: Search query
        top_k: Maximum number of results
        
    Returns:
        List of matching Regulation objects
    """
    regulations_db = load_regulations()
    
    if not regulations_db:
        return []
    
    query_lower = query.lower()
    matches = []
    
    for reg in regulations_db:
        # Search in title, description, and keywords
        score = 0
        
        if query_lower in reg["title"].lower():
            score += 3
        
        if query_lower in reg.get("description", "").lower():
            score += 2
        
        for keyword in reg.get("keywords", []):
            if query_lower in keyword.lower():
                score += 1
        
        if score > 0:
            matches.append({
                "regulation": reg,
                "score": score
            })
    
    # Sort by score
    matches.sort(key=lambda x: x["score"], reverse=True)
    
    # Convert to Regulation objects
    results = []
    for match in matches[:top_k]:
        reg = match["regulation"]
        # Normalize score to 0-1 range
        relevance = min(1.0, match["score"] / 5.0)
        results.append(Regulation(
            id=reg["id"],
            code=reg["code"],
            title=reg["title"],
            section=reg["section"],
            body=reg["body"],
            relevance=round(relevance, 2)
        ))
    
    return results
