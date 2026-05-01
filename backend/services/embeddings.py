model = None

def get_sentence_transformer():
    """
    Singleton pattern for SentenceTransformer.
    Ensures that the 80MB model is only loaded once in memory, 
    and only when first needed (lazy loaded), sharing it across all services.
    """
    global model
    if model is None:
        try:
            from sentence_transformers import SentenceTransformer
            print("Loading SentenceTransformer model...")
            model = SentenceTransformer('all-MiniLM-L6-v2')
        except Exception as e:
            print(f"Warning: Failed to load sentence-transformers: {e}")
    return model
