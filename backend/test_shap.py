"""
Test SHAP Explainer Functionality
"""

print("=" * 70)
print("SHAP Explainer Test")
print("=" * 70)

from services.explainer import generate_shap_tokens
from services.classifier import classify_clause, get_model

# Check if InLegalBERT is available
print("\n1. Checking InLegalBERT availability...")
model = get_model()
if model:
    print("   ✓ InLegalBERT model loaded")
else:
    print("   ⚠ InLegalBERT not available, will use keyword fallback")

# Test cases
test_clauses = [
    {
        "name": "High Risk - Unlimited Liability",
        "text": "The employee shall indemnify the company against unlimited liability for any claims"
    },
    {
        "name": "High Risk - Immediate Termination",
        "text": "The company may terminate immediately without notice at sole discretion"
    },
    {
        "name": "Medium Risk - Standard Termination",
        "text": "Either party may terminate this agreement with 30 days written notice"
    },
    {
        "name": "Low Risk - Governing Law",
        "text": "This agreement shall be governed by the laws of India with mutual consent"
    },
    {
        "name": "Complex Clause",
        "text": "The contractor agrees to indemnify and hold harmless the company from unlimited liability arising from breach of confidentiality obligations, subject to reasonable limitations and governing law provisions"
    }
]

print("\n2. Testing SHAP Token Generation...")
print("-" * 70)

for test in test_clauses:
    print(f"\n📝 {test['name']}")
    print(f"   Text: {test['text']}")
    
    # Get classification
    classification = classify_clause(test['text'])
    print(f"   Risk: {classification['risk_level']} (score: {classification['risk_score']})")
    
    # Get SHAP tokens
    try:
        tokens = generate_shap_tokens(test['text'])
        
        if not tokens:
            print("   ⚠ No SHAP tokens generated")
        else:
            print(f"   ✓ Generated {len(tokens)} SHAP tokens")
            
            # Show top 5 tokens
            print("   Top contributing words:")
            for i, token in enumerate(tokens[:5], 1):
                direction = "↑ increases" if token["score"] > 0 else "↓ decreases"
                print(f"      {i}. '{token['word']}': {token['score']:+.3f} ({direction} risk)")
    
    except Exception as e:
        print(f"   ✗ Error: {e}")
        import traceback
        traceback.print_exc()

# Test edge cases
print("\n" + "=" * 70)
print("3. Testing Edge Cases...")
print("-" * 70)

edge_cases = [
    {"name": "Empty string", "text": ""},
    {"name": "Single word", "text": "liability"},
    {"name": "Very short", "text": "The company"},
    {"name": "No risky words", "text": "This is a standard agreement between parties"},
    {"name": "All risky words", "text": "unlimited liability immediate termination sole discretion irrevocable"},
]

for test in edge_cases:
    print(f"\n📝 {test['name']}: '{test['text']}'")
    try:
        tokens = generate_shap_tokens(test['text'])
        print(f"   ✓ Generated {len(tokens)} tokens")
        if tokens:
            print(f"   Top token: '{tokens[0]['word']}' ({tokens[0]['score']:+.3f})")
    except Exception as e:
        print(f"   ✗ Error: {e}")

# Test performance
print("\n" + "=" * 70)
print("4. Testing Performance...")
print("-" * 70)

import time

long_clause = "The employee shall indemnify and hold harmless the company from any and all claims, damages, liabilities, costs and expenses arising from or related to the employee's performance of duties under this agreement, including but not limited to claims of negligence, breach of contract, or violation of applicable laws and regulations."

print(f"\nClause length: {len(long_clause)} characters, {len(long_clause.split())} words")

start = time.time()
tokens = generate_shap_tokens(long_clause)
elapsed = time.time() - start

print(f"✓ Generated {len(tokens)} tokens in {elapsed:.2f} seconds")
print(f"  Average: {elapsed/len(tokens):.3f}s per token" if tokens else "  No tokens generated")

print("\n" + "=" * 70)
print("Test Complete!")
print("=" * 70)

print("\n💡 Expected Behavior:")
print("   - High risk clauses should have positive SHAP scores")
print("   - Safe words should have negative SHAP scores")
print("   - Scores should be between -1.0 and +1.0")
print("   - Top 20 most impactful words returned")
print("   - Clauses >100 words use keyword fallback")
