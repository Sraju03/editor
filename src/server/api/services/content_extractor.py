import logging
from pathlib import Path
import PyPDF2

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def extract_content(file_id: str) -> str:
    logger.info(f"Extracting content from file {file_id}")
    try:
        file_path = Path(f"uploads/{file_id}")
        if not file_path.exists():
            logger.error(f"File {file_path} does not exist")
            raise FileNotFoundError(f"File {file_id} not found")
        
        with open(file_path, "rb") as file:
            reader = PyPDF2.PdfReader(file)
            text = ""
            for page in reader.pages:
                text += page.extract_text() or ""
            if not text.strip():
                logger.warning(f"No text extracted from {file_id}")
                return "No content extracted"
            logger.info(f"Extracted {len(text)} characters from {file_id}")
            return text.strip()
    except Exception as e:
        logger.error(f"Failed to extract content from {file_id}: {str(e)}")
        raise