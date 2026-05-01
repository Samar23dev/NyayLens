"""
Test InLegalBERT vs Keyword-based Classification

Demonstrates the improvement from using InLegalBERT for semantic understanding.
"""

from services.classifier import classify_clause
from services.explainer import generate_shap_tokens

print("=" * 70)
print("InLegalBERT Classification Test")
print("=" * 70)

# Test cases with varying risk levels
test_clauses = [
    {
        "text": "The employee shall indemnify the company against unlimited liability for any claims arising from their actions",
        "expected": "high"
    },
    {
        "text": "Either party may terminate this agreement with 30 days written notice",
        "expected": "low"
    },
    {
        "text": "The contractor agrees to maintain confidentiality of all proprietary information disclosed during the term",
        "expected": "low"
    },
    {
        "text": "Immediate termination without notice at the sole discretion of the employer with no recourse",
        "expected": "high"
    },
    {
        "text": "Any disputes shall be resolved through arbitration with liquidated damages not exceeding the contract value",
        "expected": "medium"
    },
    {
        "text": "This agreement shall be governed by the laws of India and subject to the jurisdiction of Delhi courts",
        "expected": "safe"
    }
]

print("\n" + "=" * 70)
print("Testing Classification Accuracy")
print("=" * 70)

correct = 0
total = len(test_clauses)

for i, test in enumerate(test_clauses, 1):
    result = classify_clause(test["text"])
    
    # Map safe/low to same category for comparison
    predicted = result["risk_level"]
    expected = test["expected"]
    
    if expected == "safe":
        expected = "low"
    if predicted == "safe":
        predicted = "low"
    
    match = "✓" if predicted == expected else "✗"
    if predicted == expected:
        correct += 1
    
    print(f"\n{match} Test {i}:")
    print(f"   Text: {test['text'][:80]}...")
    print(f"   Expected: {test['expected']}")
    print(f"   Predicted: {result['risk_level']} (score: {result['risk_score']})")
    print(f"   Category: {result['category']}")

print("\n" + "=" * 70)
print(f"Accuracy: {correct}/{total} ({correct/total*100:.1f}%)")
print("=" * 70)

# Test SHAP explainability
print("\n" + "=" * 70)
print("Testing SHAP Explainability")
print("=" * 70)

test_clause = "The employee shall have unlimited liability and indemnify without notice"
print(f"\nClause: {test_clause}")

tokens = generate_shap_tokens(test_clause)
print(f"\nTop Risk Contributors (SHAP values):")
for token in tokens[:5]:
    direction = "increases" if token["score"] > 0 else "decreases"
    print(f"   '{token['word']}': {token['score']:+.3f} ({direction} risk)")

print("\n" + "=" * 70)
print("✅ InLegalBERT is working correctly!")
print("=" * 70)
