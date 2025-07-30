
import os
import sys
import re
from motor.motor_asyncio import AsyncIOMotorCollection
from sentence_transformers import SentenceTransformer
from typing import List, Dict, Optional
import logging

# Ensure script path is included
script_dir = os.path.dirname(os.path.abspath(__file__))
if script_dir not in sys.path:
    sys.path.insert(0, script_dir)

from configparser import ConfigParser
from embeddings import EmbeddingGenerator
from log_gen import get_logger

logger = get_logger("./logs/retrieval.log")

class HybridRetriever:
    def __init__(
        self,
        collection: AsyncIOMotorCollection,
        model: SentenceTransformer,
        index_name: str,
        logger: logging.Logger = logger
    ):
        """
        :param collection: Async MongoDB collection handle
        :param model: SentenceTransformer model instance
        :param index_name: Name of MongoDB Atlas vector index
        :param logger: Logger instance
        """
        self.collection = collection
        self.model = model
        self.logger = logger
        self.index_name = index_name

    def encode_query(self, query_text: str) -> List[float]:
        embedder = EmbeddingGenerator(model=self.model)
        return embedder.get_embedding(query_text)

    def build_pipeline(self, query_text: str, filters: Dict = None, top_k: int = 5) -> List[Dict]:
        query_vector = self.encode_query(query_text)
        keyword_terms = re.findall(r'\w+', query_text.lower())

        pipeline = [
            {
                "$vectorSearch": {
                    "index": self.index_name,
                    "path": "embedding",
                    "queryVector": query_vector,
                    "numCandidates": 100,
                    "limit": top_k
                }
            }
        ]

        if filters:
            pipeline.append({"$match": filters})

        pipeline.extend([
            {
                "$addFields": {
                    "keyword_overlap": {
                        "$size": {
                            "$setIntersection": ["$keywords", keyword_terms]
                        }
                    }
                }
            },
            {
                "$project": {
                    "title": 1,
                    "content": 1,
                    "topic": 1,
                    "area": 1,
                    "score": {"$meta": "vectorSearchScore"},
                    "keyword_overlap": 1,
                    "hybrid_score": {
                        "$add": [
                            {"$meta": "vectorSearchScore"},
                            {"$multiply": ["$keyword_overlap", 0.05]}
                        ]
                    }
                }
            },
            {
                "$sort": {"hybrid_score": -1}
            }
        ])

        return pipeline

    async def retrieve(self, query_text: str, filters: Dict = None, top_k: int = 5) -> List[Dict]:
        """
        Performs hybrid retrieval with vector + keyword match.

        :param query_text: User's natural language query
        :param filters: Optional MongoDB filters (e.g. {"topic": "consent"})
        :param top_k: Number of results to return
        :return: List of documents
        """
        self.logger.info(f"Hybrid search: '{query_text}' | Filters: {filters}")
        try:
            pipeline = self.build_pipeline(query_text, filters, top_k)
            cursor = self.collection.aggregate(pipeline)
            results = await cursor.to_list(length=top_k)
            self.logger.info(f"{len(results)} results found")
            return results
        except Exception as e:
            self.logger.error(f"Error in hybrid retrieval: {e}", exc_info=True)
            return []