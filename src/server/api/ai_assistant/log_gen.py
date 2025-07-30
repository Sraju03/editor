import logging
import os

def get_logger(log_file: str = ".\\logs\\application.log"):
    """
    Sets up and returns a logger instance that writes to a specified log file.
    Creates the logs directory if it doesn't exist.

    :param log_file: Name of the log file.
    :return: Configured logger instance.
    """
    # Extract the directory path from the log file
    log_dir = os.path.dirname(log_file)

    # Create the directory if it doesn't exist
    if log_dir and not os.path.exists(log_dir):
        os.makedirs(log_dir)

    logger = logging.getLogger("ApplicationLogger")
    logger.setLevel(logging.DEBUG)

    # Avoid adding multiple handlers if the logger is already configured
    if not logger.handlers:
        # File handler
        file_handler = logging.FileHandler(log_file)
        file_handler.setLevel(logging.DEBUG)

        # Formatter
        formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
        file_handler.setFormatter(formatter)

        # Add handler to logger
        logger.addHandler(file_handler)

    return logger
