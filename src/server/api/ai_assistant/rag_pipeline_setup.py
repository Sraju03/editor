import os
import sys
script_dir = os.path.dirname(os.path.abspath(__file__))
if script_dir not in sys.path:
    sys.path.insert(0, script_dir)
from configparser import ConfigParser
from sentence_transformers import SentenceTransformer
from log_gen import get_logger
from create_index import create_vector_search_index
from update_embedding import SectionProcessor
from utils import connect_to_mongo
from embeddings import EmbeddingGenerator


# === Initialize logger ===
logger = get_logger("./logs/rag_pipeline.log")

# === Load configuration ===
def load_config(file_path: str):
    config = ConfigParser()
    config.read(file_path)
    return config

config_path = "./config/config.ini"
conf = load_config(config_path)

# === MongoDB connection details ===
db_user = conf["MongoDB"]["user"]
db_pass = conf["MongoDB"]["password"]
cluster_url = conf["MongoDB"]["cluster_url"]
db_name = conf["MongoDB"]["db_name"]
collection_name = conf["MongoDB"]["collection"]
index_name = conf["MongoDB"]["vector_index"]


model_name = "nomic-ai/nomic-embed-text-v1"
model = SentenceTransformer(model_name, trust_remote_code=True)

# === RAG pipeline execution ===
def run_pipeline(input_folder: str):
    # Initialize embedding model

    embedder = EmbeddingGenerator(model=model)

    # Connect to MongoDB
    db = connect_to_mongo(db_user, db_pass, cluster_url, db_name, logger)

    # Initialize section processor
    processor = SectionProcessor(
        db=db,
        collection_name=collection_name,
        embedder=embedder,
        logger=logger
    )

    # Collect files
    csv_files = [os.path.join(input_folder, f) for f in os.listdir(input_folder) if f.endswith(".csv")]
    pdf_files = [os.path.join(input_folder, f) for f in os.listdir(input_folder) if f.endswith(".pdf")]

    # Process CSV files
    for csv_path in csv_files:
        processor.process_csv_and_pdfs(csv_path=csv_path, pdf_paths=[])

    # Process PDF files
    if pdf_files:
        processor.process_csv_and_pdfs(csv_path="", pdf_paths=pdf_files)

    # Create vector index if not already present
    collection = db[collection_name]
    try:
        index_exists = any(
            idx["name"] == "rag_embedding_index" for idx in collection.list_search_indexes()
        )
        if not index_exists:
            create_vector_search_index(
                collection=collection,
                index_name="510_index",
                embed_column="embedding",
                similarity_metric="cosine",
                logger=logger,
                filtercolumn="keywords",  # or adjust to your filtering field
                num_dimensions=768
            )
            logger.info("Vector search index created successfully.")
        else:
            logger.info("Vector search index already exists.")
    except Exception as e:
        logger.error(f"Failed to create vector search index: {e}")

# === Entry Point ===
if __name__ == "__main__":
    input_folder = "./input"
    run_pipeline(input_folder)
