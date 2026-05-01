import os
from langchain_groq import ChatGroq
from langchain_core.prompts import PromptTemplate
from dotenv import load_dotenv

load_dotenv()

# Initialize the LangChain Groq LLM
api_key = os.environ.get("GROQ_API_KEY")
if api_key:
    llm = ChatGroq(
        groq_api_key=api_key,
        model_name="llama-3.3-70b-versatile",  # Better quality for legal rewrites
        temperature=0.2,  # Lower temperature for more consistent legal language
        max_tokens=2048  # Allow longer rewrites for complex clauses
    )
else:
    print("Warning: GROQ_API_KEY not found in environment.")
    llm = None

def generate_rewrite(clause_text: str, context: str = "") -> str:
    """
    Takes a high-risk clause and uses LangChain + Llama-3.3 70B via Groq to rewrite it
    into safer, standard, and balanced legal language.
    
    Args:
        clause_text: The original high-risk clause to rewrite
        context: Additional context about the document (optional)
        
    Returns:
        Rewritten clause text or error message
    """
    if not llm:
        return "Error: Groq API key not configured. Cannot rewrite clause."
    
    if not clause_text or len(clause_text.strip()) < 10:
        return "Error: Clause text is too short to rewrite."

    # Build context-aware prompt
    context_section = f"\n\nDocument Context: {context}" if context else ""

    prompt_template = PromptTemplate.from_template("""You are an expert legal drafter specializing in Indian contract law.

The following contract clause has been flagged as HIGH-RISK due to unfair or aggressive terms.

Your task: Rewrite this clause to be legally fair, balanced, and compliant with Indian Contract Act 1872 and other relevant laws.

Guidelines:
1. Remove or modify highly aggressive terms:
   - "Unlimited liability" → Add reasonable caps
   - "Immediate termination without notice" → Add notice period (30 days minimum)
   - "Sole discretion" → Add "reasonable" qualifier
   - "Irrevocable" → Make revocable with proper notice
   - "Hold harmless" → Limit to direct damages only

2. Maintain the core intent but make it fair to BOTH parties
3. Use standard Indian legal terminology
4. Keep the rewrite concise and clear
5. Ensure compliance with Indian Contract Act principles{context_section}

Original High-Risk Clause:
"{clause_text}"

Provide ONLY the rewritten clause text. Do not include explanations, introductions, or meta-commentary.""")

    try:
        chain = prompt_template | llm
        response = chain.invoke({
            "context_section": context_section,
            "clause_text": clause_text
        })
        
        rewritten = response.content.strip()
        
        # Validate the rewrite
        if not rewritten or len(rewritten) < 20:
            return "Error: Generated rewrite is too short. Please try again."
        
        # Remove common unwanted prefixes
        unwanted_prefixes = [
            "Here is the rewritten clause:",
            "Rewritten clause:",
            "Here's the rewritten version:",
            "The rewritten clause is:",
        ]
        
        for prefix in unwanted_prefixes:
            if rewritten.lower().startswith(prefix.lower()):
                rewritten = rewritten[len(prefix):].strip()
        
        return rewritten
        
    except Exception as e:
        error_msg = str(e)
        
        # Handle specific error types
        if "rate_limit" in error_msg.lower():
            return "Error: API rate limit exceeded. Please wait a moment and try again."
        elif "timeout" in error_msg.lower():
            return "Error: Request timed out. Please try again."
        elif "authentication" in error_msg.lower():
            return "Error: API authentication failed. Please check your Groq API key."
        else:
            print(f"LangChain Groq API Error: {e}")
            return f"Error generating rewrite: {error_msg}"
