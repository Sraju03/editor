def get_predicate_suggest_prompt(product_code: str, description: str = "") -> str:
    return f"""
    Suggest up to 4 FDA-cleared predicate devices for a medical device with:
    - FDA Product Code: {product_code}
    - Description: {description or 'No description provided'}
    
    For each device, provide:
    - Device Name
    - K-number (e.g., K123456)
    - Manufacturer
    - Clearance Date
    - Confidence score (0.0 to 1.0)
    
    Return the results in a structured JSON format.
    """