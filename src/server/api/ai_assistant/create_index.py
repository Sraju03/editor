from pymongo.operations import SearchIndexModel

def create_vector_search_index(collection, embed_column, similarity_metric, logger,index_name, filtercolumn=None, num_dimensions=768):
    """
    Creates a vector search index on a MongoDB collection.

    :param collection: The MongoDB collection to which the index should be applied.
    :param index_name: Name of the search index.
    :param num_dimensions: Number of dimensions for the vector field.
    :param logger: Logger instance for logging. If None, a default logger will be used.
    """

    try:
        logger.info(f"Starting creation of vector search index: {index_name}")

        # Define the search index model
        if filtercolumn is None:
            search_index_model = SearchIndexModel(
                definition={
                    "fields": [
                        {
                            "type": "vector",
                            "path": embed_column,
                            "similarity": similarity_metric,
                            "numDimensions": num_dimensions,
                        }
                    ]
                },
                name=index_name,
                type="vectorSearch",
            )
        else:
            search_index_model = SearchIndexModel(
                definition={
                    "fields": [
                        {
                            "type": "vector",
                            "path": embed_column,
                            "similarity": similarity_metric,
                            "numDimensions": num_dimensions,
                        },
                        {
                            "type": "filter",
                            "path": filtercolumn
                        }
                    ]
                },
                name=index_name,
                type="vectorSearch",
            )

        # Create the search index
        collection.create_search_index(model=search_index_model)
        logger.info(f"Successfully created vector search index: {index_name}")
    except Exception as e:
        logger.error(f"Error creating vector search index: {e}")
        raise