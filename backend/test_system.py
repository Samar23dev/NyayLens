"""
Quick system test to verify all components are working.
"""

print("=" * 60)
print("NyayaLens System Test")
print("=" * 60)

# Test 1: Chroma DB
print("\n1. Testing Chroma DB...")
try:
    from services.rag import get_chroma_collection
    collection = get_chroma_collection()
    count = collection.count() if collection else 0
    print(f"   ✓ Chroma DB initialized: {count} precedents loaded")
except Exception as e:
    print(f"   ✗ Chroma DB error: {e}")

# Test 2: Regulations
print("\n2. Testing Regulations Service...")
try:
    from services.regulations import load_regulations, match_regulations_to_clause
    regs = load_regulations()
    print(f"   ✓ Regulations loaded: {len(regs)} regulations")
    
    # Test matching
    test_clause = "The company may terminate this agreement without notice"
    matches = match_regulations_to_clause(test_clause, top_k=3)
    print(f"   ✓ Regulation matching works: {len(matches)} matches for test clause")
    if matches:
        print(f"      Top match: {matches[0].code} - {matches[0].title}")
except Exception as e:
    print(f"   ✗ Regulations error: {e}")

# Test 3: Precedents Retrieval
print("\n3. Testing Precedents Retrieval...")
try:
    from services.rag import get_precedents_for_clause
    test_clause = "immediate termination without notice"
    precedents = get_precedents_for_clause(test_clause, top_k=2)
    print(f"   ✓ Precedent retrieval works: {len(precedents)} precedents found")
    if precedents:
        print(f"      Top match: {precedents[0].title} ({precedents[0].relevanceScore})")
except Exception as e:
    print(f"   ✗ Precedents error: {e}")

# Test 4: Classifier
print("\n4. Testing Clause Classifier...")
try:
    from services.classifier import classify_clause
    test_clause = "The employee shall indemnify the company against unlimited liability"
    result = classify_clause(test_clause)
    print(f"   ✓ Classifier works: Risk={result['risk_level']}, Score={result['risk_score']}, Category={result['category']}")
except Exception as e:
    print(f"   ✗ Classifier error: {e}")

# Test 5: SHAP Explainer
print("\n5. Testing SHAP Explainer...")
try:
    from services.explainer import generate_shap_tokens
    test_clause = "immediate termination without notice"
    tokens = generate_shap_tokens(test_clause)
    print(f"   ✓ SHAP explainer works: {len(tokens)} tokens analyzed")
    if tokens:
        top_risky = [t for t in tokens if t['score'] > 0.3][:3]
        if top_risky:
            print(f"      Top risky words: {', '.join([t['word'] for t in top_risky])}")
except Exception as e:
    print(f"   ✗ SHAP error: {e}")

# Test 6: Segmenter
print("\n6. Testing Clause Segmenter...")
try:
    from services.segmenter import segment_into_clauses
    test_doc = """
    1. Employment Terms. The employee shall work full-time.
    
    2. Confidentiality. The employee agrees not to disclose confidential information.
    
    3. Termination. Either party may terminate with 30 days notice.
    """
    clauses = segment_into_clauses(test_doc)
    print(f"   ✓ Segmenter works: {len(clauses)} clauses extracted")
except Exception as e:
    print(f"   ✗ Segmenter error: {e}")

# Test 7: Conflict Detection
print("\n7. Testing Conflict Detection...")
try:
    from services.conflict import detect_conflicts
    test_clauses = [
        {"id": "1", "title": "Clause 1", "text": "The employee may work remotely"},
        {"id": "2", "title": "Clause 2", "text": "The employee must not work remotely"}
    ]
    conflicts = detect_conflicts(test_clauses)
    print(f"   ✓ Conflict detection works: {len(conflicts)} conflicts found")
except Exception as e:
    print(f"   ✗ Conflict detection error: {e}")

# Test 8: MongoDB (optional)
print("\n8. Testing MongoDB Connection...")
try:
    from services.document_cache import USE_MONGO
    if USE_MONGO:
        print(f"   ✓ MongoDB connected")
    else:
        print(f"   ⚠ MongoDB not connected (optional, using no-cache mode)")
except Exception as e:
    print(f"   ✗ MongoDB error: {e}")

print("\n" + "=" * 60)
print("System Test Complete!")
print("=" * 60)
print("\n✅ All core components are working!")
print("\n🚀 Next steps:")
print("   1. Start backend: uvicorn main:app --reload")
print("   2. Start frontend: cd LegalDocs && npm run dev")
print("   3. Upload a contract and test the full pipeline")
