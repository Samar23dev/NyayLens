try:
    from sklearn.metrics.pairwise import cosine_similarity
except Exception:
    pass

from services.embeddings import get_sentence_transformer as get_model

from models.schemas import ConflictPair

def has_negation(text: str) -> bool:
    """
    Improved negation detection for conflict analysis.
    Checks for various forms of negation in legal text.
    """
    negation_patterns = [
        " not ", " no ", " never ", " neither ", " nor ",
        " cannot ", " can't ", " won't ", " doesn't ", " don't ",
        " isn't ", " aren't ", " wasn't ", " weren't ",
        " without ", " none ", " nothing ", " nobody ",
        " hardly ", " barely ", " scarcely ", " shall not "
    ]
    # Add spaces around text for word boundary matching
    text_padded = f" {text.lower()} "
    return any(neg in text_padded for neg in negation_patterns)

def detect_conflicts(clauses: list[dict]) -> list[ConflictPair]:
    """
    Detects semantic contradictions between different clauses in the same document.
    Uses sentence embeddings to find semantically similar clauses, then checks for negation mismatches.
    """
    mod = get_model()
    if not mod or len(clauses) < 2:
        return []
        
    conflicts = []
    texts = [c["text"] for c in clauses]
    
    try:
        # Compute embeddings for all clauses
        embeddings = mod.encode(texts)
        sim_matrix = cosine_similarity(embeddings)
    except Exception as e:
        print(f"Error computing embeddings for conflict detection: {e}")
        return []
    
    # Semantic heuristic:
    # If two clauses are highly similar (talking about the same topic)
    # but one contains negation and the other doesn't, flag as potential conflict
    for i in range(len(clauses)):
        for j in range(i + 1, len(clauses)):
            score = sim_matrix[i][j]
            
            # Only check semantically related clauses
            if score > 0.60:
                text_i = texts[i]
                text_j = texts[j]
                
                # Check for negation mismatch using improved detection
                not_in_i = has_negation(text_i)
                not_in_j = has_negation(text_j)
                
                if not_in_i != not_in_j:
                    conflicts.append(ConflictPair(
                        clauseAId=clauses[i]["id"],
                        clauseBId=clauses[j]["id"],
                        clauseATitle=clauses[i]["title"],
                        clauseBTitle=clauses[j]["title"],
                        description=f"Potential contradiction detected regarding similar topics. One clause restricts while the other permits.",
                        severity="warning" if score < 0.75 else "critical"
                    ))
                    
    return conflicts
