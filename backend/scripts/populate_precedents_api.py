"""
Indian Kanoon API Precedent Scraper & Chroma DB Populator

This script fetches landmark Indian legal cases from Indian Kanoon API
and populates the Chroma DB vector database for RAG retrieval.

Usage:
    python -m scripts.populate_precedents_api

Requirements:
    - INDIAN_KANOON_API_KEY in .env file
    - Get your API key from: https://api.indiankanoon.org/
"""

import sys
import time
import requests
from pathlib import Path
import os
from dotenv import load_dotenv

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from services.rag import get_chroma_collection

load_dotenv()

# Indian Kanoon API configuration
INDIAN_KANOON_API_KEY = os.environ.get("INDIAN_KANOON_API_KEY")
INDIAN_KANOON_SEARCH_URL = "https://api.indiankanoon.org/search/"

# Search queries covering common contract dispute areas
SEARCH_QUERIES = [
    "employment contract termination",
    "breach of contract damages",
    "confidentiality agreement violation",
    "non-compete clause enforceability",
    "indemnity clause liability",
    "force majeure contract",
    "payment dispute contract",
    "service agreement breach",
    "rental agreement termination",
    "software development contract dispute",
    "intellectual property contract",
    "partnership agreement dissolution",
    "loan agreement default",
    "sale agreement breach",
    "arbitration clause enforcement"
]

def fetch_cases_from_indian_kanoon_api(query: str, max_results: int = 20) -> list[dict]:
    """
    Fetch cases from Indian Kanoon API using proper authentication.
    
    Returns list of case dictionaries with: id, title, court, year, summary, url
    """
    if not INDIAN_KANOON_API_KEY:
        print(f"  ⚠️  INDIAN_KANOON_API_KEY not found in .env file")
        return []
    
    print(f"Searching Indian Kanoon API for: '{query}'...")
    
    try:
        # Correct API format according to documentation (POST method required)
        response = requests.post(
            INDIAN_KANOON_SEARCH_URL,
            params={
                "formInput": query,
                "pagenum": 0
            },
            headers={
                "Authorization": f"Token {INDIAN_KANOON_API_KEY}",
                "Accept": "application/json"
            },
            timeout=30
        )
        
        if response.status_code == 403:
            print(f"  ⚠️  API authentication failed (403). Check your API key.")
            return []
        
        if response.status_code != 200:
            print(f"  ⚠️  API returned status {response.status_code}")
            print(f"  Response: {response.text[:200]}")
            return []
        
        data = response.json()
        docs = data.get("docs", [])
        
        if not docs:
            print(f"  ⚠️  No results found for query: {query}")
            return []
        
        cases = []
        for doc in docs[:max_results]:
            try:
                # Extract case details from API response
                doc_id = doc.get("tid", "")
                title = doc.get("title", "Unknown Case")
                
                # Extract court from docsource or title
                docsource = doc.get("docsource", "")
                court = "Unknown Court"
                
                if "Supreme Court" in docsource or "Supreme Court" in title:
                    court = "Supreme Court of India"
                elif "High Court" in docsource or "High Court" in title:
                    # Try to extract specific high court
                    for hc in ["Delhi", "Bombay", "Kolkata", "Chennai", "Allahabad", 
                              "Karnataka", "Gujarat", "Madras", "Punjab", "Rajasthan"]:
                        if hc in docsource or hc in title:
                            court = f"{hc} High Court"
                            break
                    if court == "Unknown Court":
                        court = "High Court"
                elif "Tribunal" in docsource or "Tribunal" in title:
                    court = "Tribunal"
                elif "District Court" in docsource:
                    court = "District Court"
                
                # Extract year from title or docsource
                year = 2000
                import re
                year_match = re.search(r'\b(19|20)\d{2}\b', title + " " + docsource)
                if year_match:
                    year = int(year_match.group(0))
                
                # Get summary from headline
                summary = doc.get("headline", "")
                if not summary:
                    # Fallback to docfragment
                    summary = doc.get("docfragment", "")[:500]
                
                if not summary:
                    summary = f"Case regarding {query}"
                
                # Clean HTML tags from summary
                import re
                summary = re.sub(r'<[^>]+>', '', summary)
                summary = re.sub(r'\s+', ' ', summary).strip()
                
                # Construct URL
                url = f"https://indiankanoon.org/doc/{doc_id}/"
                
                cases.append({
                    "id": f"ik_api_{doc_id}",
                    "title": title,
                    "court": court,
                    "year": year,
                    "summary": summary,
                    "url": url,
                    "query": query
                })
                
            except Exception as e:
                print(f"  ⚠️  Error parsing case: {e}")
                continue
        
        print(f"  ✓ Found {len(cases)} cases")
        return cases
        
    except Exception as e:
        print(f"  ✗ Error fetching from Indian Kanoon API: {e}")
        return []

def populate_chroma_db(cases: list[dict]):
    """Add cases to Chroma DB collection."""
    collection = get_chroma_collection()
    
    if not collection:
        print("✗ Failed to initialize Chroma DB")
        return
    
    print(f"\nAdding {len(cases)} cases to Chroma DB...")
    
    added = 0
    skipped = 0
    
    for case in cases:
        try:
            # Check if case already exists
            existing = collection.get(ids=[case["id"]])
            if existing and existing["ids"]:
                skipped += 1
                continue
            
            # Add to collection
            collection.add(
                ids=[case["id"]],
                documents=[case["summary"]],
                metadatas=[{
                    "title": case["title"],
                    "court": case["court"],
                    "year": case["year"],
                    "url": case["url"],
                    "query": case["query"]
                }]
            )
            added += 1
            
            # Progress indicator
            if added % 10 == 0:
                print(f"  Added {added} cases...")
            
        except Exception as e:
            print(f"  ⚠️  Error adding case {case['id']}: {e}")
            continue
    
    print(f"\n✓ Successfully added {added} new cases")
    print(f"  (Skipped {skipped} duplicates)")
    print(f"  Total cases in DB: {collection.count()}")

def main(force: bool = False):
    """
    Main execution function.
    
    Args:
        force: If True, update regardless of last update time
    """
    print("=" * 60)
    print("Indian Kanoon API Precedent Scraper")
    print("=" * 60)
    
    if not INDIAN_KANOON_API_KEY:
        print("\n✗ ERROR: INDIAN_KANOON_API_KEY not found in .env file")
        print("\nPlease add your API key to backend/.env:")
        print("  INDIAN_KANOON_API_KEY=your_api_key_here")
        print("\nGet your API key from: https://api.indiankanoon.org/")
        return
    
    
    all_cases = []
    
    # Fetch cases for each query
    for i, query in enumerate(SEARCH_QUERIES, 1):
        print(f"\n[{i}/{len(SEARCH_QUERIES)}] Processing query: {query}")
        
        cases = fetch_cases_from_indian_kanoon_api(query, max_results=20)
        all_cases.extend(cases)
        
        # Rate limiting: wait 2 seconds between requests
        if i < len(SEARCH_QUERIES):
            print("  ⏳ Waiting 2s (rate limiting)...")
            time.sleep(2)
    
    print(f"\n{'=' * 60}")
    print(f"Total cases fetched: {len(all_cases)}")
    print(f"{'=' * 60}")
    
    if all_cases:
        populate_chroma_db(all_cases)
        print(f"\n✓ Precedents successfully populated.")
    else:
        print("\n⚠️  No cases fetched. Check your API key and internet connection.")
    
    print("\n✓ Done!")

if __name__ == "__main__":
    import sys
    force_update = "--force" in sys.argv
    main(force=force_update)
