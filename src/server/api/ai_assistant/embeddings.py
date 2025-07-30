import os
import sys
script_dir = os.path.dirname(os.path.abspath(__file__))
if script_dir not in sys.path:
    sys.path.insert(0, script_dir)
from log_gen import get_logger

class EmbeddingGenerator:
    def __init__(self, model):
        """
        Initializes the embedding model.

        :param model_name: Name of the pre-trained embedding model.
        :param logger: Logger instance for logging messages.
        """
        self.logger = get_logger()
        try:
            self.logger.info(f"Initializing the embedding model")
            self.model = model
            self.logger.info("Model initialized successfully.")
        except Exception as e:
            self.logger.error(f"Error initializing model: {e}")
            raise

    def get_embedding(self, data: str):
        """
        Generates vector embeddings for the given data.

        :param data: Input text for which embeddings need to be generated.
        :return: List of vector embeddings.
        """
        try:
            self.logger.info(f"Generating embedding for data: {data[:50]}...")  # Log first 50 characters
            embedding = self.model.encode(data,normalize_embeddings=True)
            self.logger.info("Embedding generated successfully.")
            return embedding.tolist()
        except Exception as e:
            self.logger.error(f"Error generating embedding: {e}")
            raise


# Example usage
# if __name__ == "__main__":
#     logger = get_logger()  # Centralized logger instance
#     logger.info("Starting the application...")
#

