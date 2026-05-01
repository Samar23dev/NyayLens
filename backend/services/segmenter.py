import re
import spacy

# We need to ensure the spacy model is downloaded. 
# Usually done via: python -m spacy download en_core_web_sm
try:
    nlp = spacy.load("en_core_web_sm")
except OSError:
    print("Warning: 'en_core_web_sm' not found. We will use fallback regex segmentation.")
    nlp = None

def segment_into_clauses(text: str) -> list[str]:
    """
    Segments a full contract text into individual clauses/paragraphs.
    Handles numbered sections, lettered sections, articles, and double newlines.
    Uses spaCy for cleaning up sentence boundaries if needed.
    """
    if not text:
        return []

    # Basic cleanup
    text = text.replace('\r', '')
    text = text.strip()
    
    # 1. First try to split by numbered/lettered sections (common in legal documents)
    # Patterns: 
    # - "1.", "2.", "3." (at start or after newline)
    # - "1.1", "1.2" (hierarchical)
    # - "(a)", "(b)", "(c)" (lettered)
    # - "Article 1", "Section 1", "ARTICLE I", etc.
    numbered_pattern = r'\n(?=(?:\d+\.(?:\d+\.?)?|\([a-z]\)|Article\s+[IVX\d]+|Section\s+\d+|ARTICLE\s+[IVX\d]+|SECTION\s+\d+)[\s:])'
    
    # Also check if document starts with a number (no leading newline)
    starts_with_number = re.match(r'^(?:\d+\.(?:\d+\.?)?|\([a-z]\)|Article\s+[IVX\d]+|Section\s+\d+)', text)
    
    # Try numbered split first
    numbered_splits = re.split(numbered_pattern, text)
    
    # If we got meaningful splits (more than 1 section), use those
    if len(numbered_splits) > 1 or starts_with_number:
        raw_paragraphs = [p.strip() for p in numbered_splits if p.strip()]
    else:
        # Fallback: Split by double newlines to get rough paragraphs
        raw_paragraphs = [p.strip() for p in re.split(r'\n\s*\n', text) if p.strip()]
    
    clauses = []
    
    for para in raw_paragraphs:
        # Ignore very short lines (e.g., page numbers, empty artifacts, headers)
        if len(para) < 20:
            continue
        
        # If a paragraph is extremely long (>1500 chars) and contains multiple sentences,
        # it might be a dense block that needs further splitting
        if len(para) > 1500 and nlp:
            try:
                doc = nlp(para)
                sentences = list(doc.sents)
                
                # If we have many sentences, try to group them into logical chunks
                if len(sentences) > 5:
                    current_chunk = []
                    current_length = 0
                    
                    for sent in sentences:
                        sent_text = sent.text.strip()
                        sent_len = len(sent_text)
                        
                        # Start a new chunk if current one is getting long (>600 chars)
                        if current_length > 600 and current_chunk:
                            clauses.append(' '.join(current_chunk))
                            current_chunk = []
                            current_length = 0
                        
                        current_chunk.append(sent_text)
                        current_length += sent_len
                    
                    # Add remaining chunk
                    if current_chunk:
                        clauses.append(' '.join(current_chunk))
                else:
                    # Not too many sentences, keep as one clause
                    clauses.append(para)
            except Exception as e:
                # If spaCy fails, just keep the paragraph as-is
                print(f"Warning: spaCy processing failed for paragraph: {e}")
                clauses.append(para)
        else:
            # Normal-sized paragraph, keep intact
            clauses.append(para)
    
    return clauses
