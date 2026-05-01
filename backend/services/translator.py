from google.cloud import translate_v2 as translate

# Translation disabled per user request
translate_client = None

def translate_text_to_english(text: str, source_lang_code: str) -> str:
    """
    Translates text to English using Google Cloud Translation API.
    If the source language is already English or if the client fails,
    returns the original text.
    """
    if not text or not text.strip():
        return text
        
    # If it's already English, don't bother hitting the API
    if source_lang_code.lower() == "en":
        return text

    if not translate_client:
        print("Translation skipped: Client not initialized.")
        return text

    try:
        # Translate the text to target language "en"
        result = translate_client.translate(
            text, target_language="en", source_language=source_lang_code
        )
        return result["translatedText"]
    except Exception as e:
        print(f"Translation Error: {e}")
        return text
