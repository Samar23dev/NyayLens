"""
Test Segmentation and Rewrite Functionality
"""

print("=" * 70)
print("Segmentation & Rewrite Test")
print("=" * 70)

# Test 1: Segmentation with different formats
print("\n1. Testing Segmentation...")
print("-" * 70)

from services.segmenter import segment_into_clauses

test_documents = [
    {
        "name": "Numbered Sections",
        "text": """1. Employment Terms
The employee shall work full-time for the company.

2. Confidentiality
The employee agrees to maintain confidentiality of all proprietary information.

3. Termination
Either party may terminate this agreement with 30 days written notice."""
    },
    {
        "name": "Lettered Sections",
        "text": """(a) The contractor shall provide services as described.

(b) Payment shall be made within 30 days of invoice.

(c) Either party may terminate with notice."""
    },
    {
        "name": "Article Format",
        "text": """Article 1: Definitions
For purposes of this agreement, the following terms shall have the meanings set forth below.

Article 2: Scope of Work
The contractor agrees to provide the services described in Exhibit A.

Article 3: Compensation
The company shall pay the contractor as specified."""
    },
    {
        "name": "Mixed Format",
        "text": """1. General Provisions
This agreement is entered into between the parties.

1.1 Definitions
Terms used herein shall have their ordinary meaning.

2. Obligations
(a) The first party shall perform duties.
(b) The second party shall provide payment."""
    },
    {
        "name": "No Numbering (Paragraphs)",
        "text": """This is the first paragraph of the agreement.

This is the second paragraph with more details.

This is the third paragraph concluding the section."""
    }
]

for test in test_documents:
    print(f"\n📄 Test: {test['name']}")
    clauses = segment_into_clauses(test['text'])
    print(f"   Extracted {len(clauses)} clauses:")
    for i, clause in enumerate(clauses, 1):
        preview = clause[:60] + "..." if len(clause) > 60 else clause
        print(f"   {i}. {preview}")

# Test 2: Rewrite Functionality
print("\n" + "=" * 70)
print("2. Testing Rewrite Functionality...")
print("-" * 70)

from services.rewriter import generate_rewrite

test_clauses = [
    {
        "name": "Unlimited Liability",
        "text": "The employee shall indemnify the company against unlimited liability for any claims arising from their actions.",
        "context": "Employment Agreement"
    },
    {
        "name": "Immediate Termination",
        "text": "The company may terminate this agreement immediately without notice at its sole discretion.",
        "context": "Service Agreement"
    },
    {
        "name": "Irrevocable Rights",
        "text": "The contractor grants irrevocable and perpetual rights to all work product with no compensation.",
        "context": "Contractor Agreement"
    }
]

for test in test_clauses:
    print(f"\n📝 Test: {test['name']}")
    print(f"   Original: {test['text'][:80]}...")
    
    rewrite = generate_rewrite(test['text'], test['context'])
    
    if rewrite.startswith("Error"):
        print(f"   ✗ {rewrite}")
    else:
        print(f"   ✓ Rewritten: {rewrite[:80]}...")
        print(f"   Full rewrite: {rewrite}")

print("\n" + "=" * 70)
print("Test Complete!")
print("=" * 70)

print("\n💡 Notes:")
print("   - Segmentation now handles (a), (b), (c) lettered sections")
print("   - Segmentation handles documents starting with numbers")
print("   - Chunk size reduced from 800 to 600 chars for better granularity")
print("   - Rewriter upgraded to Llama-3.3 70B for better quality")
print("   - Rewriter includes Indian Contract Act compliance")
print("   - Better error handling for API rate limits")
