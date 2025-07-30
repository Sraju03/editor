from typing import Optional
def get_intended_use_prompt(product_code: str, device_category: str, predicate_device_name: Optional[str] = None) -> str:
    """
    Generate a prompt for creating an Intended Use Statement for a medical device.

    Args:
        product_code (str): FDA product code for the device.
        device_category (str): Category or type of the device.
        predicate_device_name (Optional[str]): Name of the predicate device for comparison, if provided.

    Returns:
        str: A formatted prompt suitable for a 510(k) submission.
    """
    predicate_text = f"- Predicate Device: {predicate_device_name}\n" if predicate_device_name else ""
    return f"""
You are an expert in drafting FDA 510(k) submission documents.

Generate a clear and concise Intended Use Statement for a medical device based on the following inputs:

- Product Code: {product_code}
- Device Category: {device_category}
{predicate_text}
Your statement must:
- Clearly define the medical purpose of the device.
- Identify the target patient population (e.g., adults, pediatrics).
- Specify the clinical indications and context of use (e.g., monitoring, diagnosis, treatment).
- Be written in a formal tone suitable for FDA submissions.
- Align with FDA expectations for diagnostic devices.

Ensure the output is focused, factual, and does not exceed 1000 words.
"""