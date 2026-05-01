"""
SHAP Explainer for Legal Clause Risk Analysis

Provides word-level attribution scores showing which words contribute to risk.
Uses InLegalBERT embeddings with SHAP-inspired perturbation analysis.
"""

import numpy as np
from services.classifier import get_model, classify_clause

def generate_shap_tokens(clause_text: str) -> list[dict]:
    """
    Generates word-level attribution scores using SHAP-inspired perturbation.
    
    Positive scores increase risk (red), negative scores decrease risk (green).
    
    Method:
    1. Get baseline risk score for full clause
    2. For each word, remove it and measure score change
    3. Score change = word's contribution to risk
    
    Returns list of dicts with: word, score
    """
    if not clause_text or len(clause_text.strip()) < 5:
        return []
    
    model = get_model()
    
    # If InLegalBERT not available, use keyword-based SHAP
    if model is None:
        return _generate_shap_keywords(clause_text)
    
    try:
        return _generate_shap_perturbation(clause_text)
    except Exception as e:
        print(f"Error in SHAP perturbation: {e}, falling back to keywords")
        return _generate_shap_keywords(clause_text)

def _generate_shap_perturbation(clause_text: str) -> list[dict]:
    """
    Real SHAP-inspired analysis using perturbation.
    
    For each word, we remove it and see how the risk score changes.
    The change in score is the word's SHAP value (contribution to risk).
    """
    # Get baseline risk score
    baseline_result = classify_clause(clause_text)
    baseline_score = baseline_result["risk_score"]
    
    # Split into words (preserve original words with punctuation)
    words = clause_text.split()
    
    if len(words) == 0:
        return []
    
    # For very short clauses, use keyword-based (not enough context for perturbation)
    if len(words) < 5:
        return _generate_shap_keywords(clause_text)
    
    tokens = []
    
    # For efficiency, only analyze clauses up to 50 words with perturbation
    # For longer clauses, use hybrid approach
    if len(words) > 50:
        # Use keyword-based for very long clauses (too slow)
        return _generate_shap_keywords(clause_text)
    
    # Analyze each word's contribution
    for i, word in enumerate(words):
        # Skip very short words (articles, prepositions) for efficiency
        clean_word = word.lower().strip(".,;:()[]\"'!?")
        if len(clean_word) <= 2 and clean_word not in ["no", "or", "at"]:
            continue
        
        # Create perturbed text without this word
        perturbed_words = words[:i] + words[i+1:]
        perturbed_text = " ".join(perturbed_words)
        
        if not perturbed_text.strip():
            continue
        
        try:
            # Get risk score without this word
            perturbed_result = classify_clause(perturbed_text)
            perturbed_score = perturbed_result["risk_score"]
            
            # SHAP value = baseline - perturbed
            # If removing word decreases risk, word was contributing positively to risk
            shap_value = (baseline_score - perturbed_score) / 100.0  # Normalize to -1 to 1
            
            # Only include words with meaningful contribution (threshold: 0.02)
            if abs(shap_value) >= 0.02:
                tokens.append({
                    "word": word,
                    "score": round(float(shap_value), 3)
                })
        except Exception as e:
            # If classification fails for this word, skip it
            continue
    
    # If perturbation didn't find any tokens, fall back to keywords
    if not tokens:
        return _generate_shap_keywords(clause_text)
    
    # Sort by absolute score (most impactful first)
    tokens.sort(key=lambda x: abs(x["score"]), reverse=True)
    
    # Return top 15 most impactful words (reduced from 20 for cleaner UI)
    return tokens[:15]

def _generate_shap_keywords(clause_text: str) -> list[dict]:
    """
    Keyword-based SHAP approximation (fast fallback).
    
    Assigns pre-defined scores to known risky/safe keywords.
    """
    tokens = []
    
    # Split text into words to analyze
    words = clause_text.split()
    
    # Define risk keywords with scores
    high_risk_keywords = {
        "unlimited": 0.50,
        "sole": 0.45,
        "discretion": 0.45,
        "irrevocable": 0.50,
        "immediate": 0.40,
        "hold": 0.35,
        "harmless": 0.35,
        "perpetuity": 0.50,
        "waiver": 0.40,
        "without": 0.30,  # Often paired with "without notice"
    }
    
    medium_risk_keywords = {
        "liability": 0.30,
        "indemnify": 0.30,
        "breach": 0.25,
        "penalty": 0.30,
        "terminate": 0.25,
        "arbitration": 0.20,
        "liquidated": 0.25,
        "exclusive": 0.20,
        "damages": 0.25,
    }
    
    safe_keywords = {
        "notice": -0.25,
        "governing": -0.15,
        "severability": -0.15,
        "amendment": -0.20,
        "mutual": -0.25,
        "reasonable": -0.30,
        "cap": -0.30,
        "limited": -0.30,
        "written": -0.20,
        "consent": -0.20,
    }
    
    for word in words:
        # Clean punctuation for matching
        clean_word = word.lower().strip(".,;:()[]\"'!?")
        score = 0.0
        
        # Check high risk keywords
        if clean_word in high_risk_keywords:
            score = high_risk_keywords[clean_word]
        # Check medium risk keywords
        elif clean_word in medium_risk_keywords:
            score = medium_risk_keywords[clean_word]
        # Check safe keywords
        elif clean_word in safe_keywords:
            score = safe_keywords[clean_word]
            
        # Only attach scores to flagged words to keep payload small and UI clean
        if score != 0.0:
            tokens.append({"word": word, "score": score})
            
    # Sort tokens by absolute score so the most impactful words appear first
    tokens.sort(key=lambda x: abs(x["score"]), reverse=True)
    
    # Return top 15 tokens
    return tokens[:15]
