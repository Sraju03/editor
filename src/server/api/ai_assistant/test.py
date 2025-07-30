import os
import sys
script_dir = os.path.dirname(os.path.abspath(__file__))
if script_dir not in sys.path:
    sys.path.insert(0, script_dir)

from retrieve import HybridRetriever
from utils import connect_to_mongo
from log_gen import get_logger
from configparser import ConfigParser
from sentence_transformers import SentenceTransformer


# === Setup ===
config = ConfigParser()
config.read("./config/config.ini")

db = connect_to_mongo(
    usr=config["MongoDB"]["user"],
    pwd=config["MongoDB"]["password"],
    cluster_url=config["MongoDB"]["cluster_url"],
    db_name=config["MongoDB"]["db_name"]
)

collection = db[config["MongoDB"]["collection"]]
model = SentenceTransformer(config["Model"]["name"], trust_remote_code=True)
logger = get_logger("./logs/retrieval.log")

# === Use Retriever ===
retriever = HybridRetriever(collection, model, logger, index_name=config["MongoDB"]["vector_index"])
results = retriever.retrieve("510k new submission", filters={"topic": {"$regex": "submission", "$options": "i"}})

for r in results:
    print(f"\nTitle: {r['title']}")
    print(f"Hybrid Score: {r['hybrid_score']:.4f}")
    print(r['content'][:300], "...")
