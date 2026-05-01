import io
import os
import pdfplumber
import docx
from google.cloud import vision
from google.api_core.client_options import ClientOptions
from dotenv import load_dotenv

load_dotenv()

def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extract text from text-based PDFs."""
    text = ""
    try:
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            for page in pdf.pages:
                extracted = page.extract_text()
                if extracted:
                    text += extracted + "\n\n"
    except Exception as e:
        print(f"Error extracting PDF: {e}")
    return text.strip()

def extract_text_from_docx(file_bytes: bytes) -> str:
    """Extract text from Microsoft Word documents."""
    text = ""
    try:
        doc = docx.Document(io.BytesIO(file_bytes))
        for para in doc.paragraphs:
            text += para.text + "\n"
    except Exception as e:
        print(f"Error extracting DOCX: {e}")
    return text.strip()

def extract_text_from_image_vision(file_bytes: bytes) -> str:
    """Use Google Cloud Vision API for OCR on an image."""
    try:
        api_key = os.environ.get("GOOGLE_API_KEY")
        if not api_key:
            print("Vision OCR Warning: GOOGLE_API_KEY not found in .env")
            return ""
            
        client_options = ClientOptions(api_key=api_key)
        client = vision.ImageAnnotatorClient(client_options=client_options)
        
        image = vision.Image(content=file_bytes)
        response = client.document_text_detection(image=image)
        if response.error.message:
            raise Exception(response.error.message)
        return response.full_text_annotation.text
    except Exception as e:
        print(f"Vision API Error: {e}")
        return ""

async def process_document(filename: str, file_bytes: bytes) -> str:
    """Main extraction router based on file extension."""
    ext = filename.split('.')[-1].lower() if '.' in filename else ''
    
    if ext == 'pdf':
        text = extract_text_from_pdf(file_bytes)
        # Fallback: If it's a scanned PDF, pdfplumber will return very little/no text.
        # In a production app, we would convert PDF pages to images here using `pdf2image` 
        # and send them to Google Cloud Vision. For now, we return what we have.
        if len(text.strip()) < 50:
            print("Warning: PDF appears to be scanned or empty. Full OCR implementation required.")
        return text
    
    elif ext in ['doc', 'docx']:
        return extract_text_from_docx(file_bytes)
    
    elif ext in ['txt', 'md']:
        return file_bytes.decode('utf-8', errors='ignore')
    
    elif ext in ['png', 'jpg', 'jpeg']:
        return extract_text_from_image_vision(file_bytes)
    
    else:
        # Fallback: attempt raw text decode
        return file_bytes.decode('utf-8', errors='ignore')
