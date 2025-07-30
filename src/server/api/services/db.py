from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import os
import certifi
import logging
from logging.handlers import RotatingFileHandler

# Configure logging with rotation
log_dir = os.path.join(os.path.dirname(__file__), "logs")
os.makedirs(log_dir, exist_ok=True)
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)
handler = RotatingFileHandler(os.path.join(log_dir, "db.log"), maxBytes=10_000_000, backupCount=5)
formatter = logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s")
handler.setFormatter(formatter)
logger.addHandler(handler)

# Load environment variables
env_path = os.path.join(os.path.dirname(__file__), "..", "..", ".env")
logger.info(f"Looking for .env file at: {env_path}")
if not os.path.exists(env_path):
    logger.error(f"Error: .env file not found at {env_path}")
    raise FileNotFoundError(f"Error: .env file not found at {env_path}")

load_dotenv(dotenv_path=env_path)

# Retrieve environment variables
MONGODB_URI = os.getenv("MONGODB_URI")
MONGODB_DB_NAME = os.getenv("MONGODB_DB_NAME", "fignos")
RAG_DB_NAME = os.getenv("RAG_DB_NAME", "fda_510k_index")
RAG_COLLECTION = os.getenv("RAG_COLLECTION", "documents")

if not MONGODB_URI:
    logger.error("Error: MONGODB_URI not found in environment variables")
    logger.error(f"Current working directory: {os.getcwd()}")
    logger.error(f"Available environment variables: {dict(os.environ)}")
    raise ValueError("MONGODB_URI not set in environment variables")

# Initialize MongoDB client
client = AsyncIOMotorClient(MONGODB_URI, tls=True, tlsCAFile=certifi.where())
db = client.get_database(MONGODB_DB_NAME)
rag_db = client.get_database(RAG_DB_NAME)

# Define collections
submissions_collection = db.submissions
checklist_collection = db.checklist_prompts
document_hub_collection = db.document_hub
rag_collection = rag_db[RAG_COLLECTION]  # Used for both RAG documents and chat history

logger.info("MongoDB client initialized with collections: submissions, checklist_prompts, document_hub, rag_collection")