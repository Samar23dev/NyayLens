"""
Indian Legal Precedents Populator for Chroma DB

This script populates the Chroma DB vector database with curated Indian legal precedents.

Usage:
    python -m scripts.populate_precedents

Note: Uses a curated list of landmark Indian Supreme Court and High Court cases
covering common contract dispute areas. For production, consider integrating with
Indian Kanoon API (requires paid subscription) or other legal databases.
"""

import sys
import json
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from services.rag import get_chroma_collection

DATA_DIR = Path(__file__).parent.parent / "data"
SAMPLE_PRECEDENTS_FILE = DATA_DIR / "sample_precedents.json"

def load_sample_precedents() -> list[dict]:
    """Load curated Indian legal precedents from JSON file."""
    print("Loading curated Indian legal precedents...")
    
    try:
        if not SAMPLE_PRECEDENTS_FILE.exists():
            print(f"  ✗ Sample precedents file not found: {SAMPLE_PRECEDENTS_FILE}")
            return []
        
        with open(SAMPLE_PRECEDENTS_FILE, 'r', encoding='utf-8') as f:
            precedents = json.load(f)
        
        print(f"  ✓ Loaded {len(precedents)} precedents from file")
        
        # Format for Chroma DB
        formatted_cases = []
        for p in precedents:
            formatted_cases.append({
                "id": p["id"],
                "title": p["title"],
                "court": p["court"],
                "year": p["year"],
                "summary": p["summary"],
                "url": f"https://indiankanoon.org/search/?formInput={p['keywords'].replace(' ', '+')}",
                "query": p.get("keywords", "")
            })
        
        return formatted_cases
        
    except Exception as e:
        print(f"  ✗ Error loading precedents: {e}")
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
            if added % 5 == 0:
                print(f"  Added {added} cases...")
            
        except Exception as e:
            print(f"  ⚠️  Error adding case {case['id']}: {e}")
            continue
    
    print(f"\n✓ Successfully added {added} new cases")
    print(f"  (Skipped {skipped} duplicates)")
    print(f"  Total cases in DB: {collection.count()}")

def main():
    """Main execution function."""
    print("=" * 60)
    print("Indian Legal Precedents Populator")
    print("=" * 60)
    
    # Load curated precedents from JSON file
    all_cases = load_sample_precedents()
    
    print(f"\n{'=' * 60}")
    print(f"Total precedents loaded: {len(all_cases)}")
    print(f"{'=' * 60}")
    
    if all_cases:
        populate_chroma_db(all_cases)
        print(f"\n✓ Precedents successfully populated in Chroma DB.")
    else:
        print("\n⚠️  No precedents loaded. Check sample_precedents.json file.")
    
    print("\n✓ Done!")
    print("\n💡 Tip: To add more precedents, edit backend/data/sample_precedents.json")
    print("   or integrate with Indian Kanoon API (requires paid subscription)")

if __name__ == "__main__":
    main()
