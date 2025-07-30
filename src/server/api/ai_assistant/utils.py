from pymongo import MongoClient

def connect_to_mongo(usr, pwd, cluster_url, db_name, logger):
    """
    Connects to MongoDB and returns the database object.

    :param usr: Username for MongoDB authentication.
    :param pwd: Password for MongoDB authentication.
    :param cluster_url: MongoDB cluster URL.
    :param db_name: Database name.
    :param logger: Logger instance for logging.
    :return: MongoDB database object.
    """
    try:
        logger.info("Connecting to MongoDB...")
        mongo_uri = f'mongodb+srv://{usr}:{pwd}@{cluster_url}/?retryWrites=true&w=majority'
        client = MongoClient(mongo_uri)
        db = client[db_name]
        logger.info("Connected to MongoDB successfully.")
        return db
    except Exception as e:
        logger.error(f"Error connecting to MongoDB: {e}")
        raise