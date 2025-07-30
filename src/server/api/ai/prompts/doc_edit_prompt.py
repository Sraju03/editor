def build_fda_prompt(user_intent: str, fda_guideline: str, user_input: str, selected_text: str = "") -> str:
    if fda_guideline == "SOP":
        # Extract procedure type from user_input
        procedure_info = user_input.lower()
        procedure_type = "laboratory procedure"
        if "pcr" in procedure_info:
            procedure_type = "PCR (Polymerase Chain Reaction)"
        elif "western blot" in procedure_info:
            procedure_type = "Western blot analysis"
        elif "elisa" in procedure_info:
            procedure_type = "ELISA (Enzyme-Linked Immunosorbent Assay)"
        # Add more procedure types as needed

        if user_intent == "full_document":
            return f"""You are an expert in laboratory Standard Operating Procedures (SOPs).
                       Generate a complete SOP document for the procedure described below:
                       Procedure Info: {user_input}
                       Follow this structure in markdown format:
                       # Standard Operating Procedure (SOP): [Procedure Title]
                       ## Purpose
                       ## Scope
                       ## Materials
                       - **Reagents**
                       - **Consumables**
                       - **Equipment**
                       ## Procedure
                       ### [Subsection 1]
                       ### [Subsection 2]
                       ## Quality Control
                       ## Safety Considerations
                       ## References
                       ## Revision History
                       Constraints:
                       - Use the exact markdown structure above, with `#` for the title, `##` for main sections, and `###` for procedure subsections.
                       - Format materials as bulleted lists (`-`) with bolded categories (e.g., **Reagents**).
                       - Format procedure steps as numbered lists (`1.`) with indented substeps using `-`.
                       - Tailor the SOP to the specified procedure ({procedure_type}) based on provided details.
                       - Use best practices for the procedure, ensuring accurate materials, equipment, and conditions.
                       - If specific reagents, equipment, or conditions are mentioned, incorporate them precisely (e.g., primer sequences, enzyme units).
                       - If the input is vague, use standard laboratory protocols for the procedure type.
                       - Verify all quantities (e.g., reaction volumes, enzyme units) for technical accuracy.
                       - Include specific quality control measures (e.g., negative/positive controls, expected results, validation metrics like A260/A280 for PCR).
                       - Ensure safety considerations address all hazardous materials (e.g., ethidium bromide for PCR) and include precautions (e.g., filter tips, waste disposal).
                       - Avoid placeholders (e.g., '[Insert Date]'); use the current date (July 27, 2025) for creation.
                       - Prevent future dates in revision history; only include the creation date with author 'Grok 3, xAI'.
                       - Include URLs or DOIs for all references, prioritizing practical guides (e.g., Thermo Fisher).
                       - Use precise, professional language, avoiding vague terms.
                       Ensure strict adherence to markdown syntax, technical accuracy, and laboratory standards."""
        elif user_intent == "section":
            return f"""You are an expert in laboratory Standard Operating Procedures (SOPs).
                       Generate or edit the specific SOP section described below:
                       Section Input: {user_input}
                       Constraints:
                       - Tailor the section to the specified procedure ({procedure_type}).
                       - Use markdown syntax (e.g., `##` for section header, `-` for lists, `1.` for steps).
                       - Format lists and steps consistently with the full SOP structure.
                       - Use best practices, ensuring technical accuracy.
                       - Incorporate specific reagents or conditions mentioned.
                       - Verify quantities for accuracy.
                       - Address safety and quality control if relevant.
                       - Avoid placeholders and future dates.
                       Ensure clarity, professional formatting, and markdown syntax."""
        elif user_intent == "selected_text":
            return f"""You are an expert in laboratory Standard Operating Procedures (SOPs).
                       The user has selected this section of the SOP:
                       "{selected_text}"
                       Their instruction is:
                       "{user_input}"
                       Update or rewrite the selected section using markdown, maintaining SOP formatting and technical accuracy.
                       Constraints:
                       - Tailor the section to the specified procedure ({procedure_type}).
                       - Use markdown syntax (e.g., `##`, `-`, `1.`).
                       - Format lists and steps consistently.
                       - Use best practices, ensuring technical accuracy.
                       - Incorporate specific reagents or conditions mentioned.
                       - Verify quantities for accuracy.
                       - Avoid placeholders and future dates.
                       Ensure professional formatting and laboratory standards."""
    else:
        default_guideline = fda_guideline or "510(k)"
        if user_intent == "full_document":
            return f"""You are an expert in FDA {default_guideline} regulatory writing.
                       Generate a complete FDA-compliant submission document for the device below:
                       Device Info: {user_input}
                       Follow this structure:
                       1. Cover Sheet
                       2. Table of Contents
                       3. Device Description
                       4. Intended Use
                       5. Predicate Device Comparison
                       6. Substantial Equivalence Discussion
                       7. Non-Clinical Testing
                       8. Clinical Testing (if applicable)
                       9. Labeling
                       10. Summary and Certifications
                       Ensure professional formatting and technical accuracy."""
        elif user_intent == "section":
            return f"""You are an FDA documentation expert.
                       Generate or edit the specific section described below for a device submission.
                       Section Input: {user_input}
                       Guideline: {default_guideline}
                       Follow proper formatting and regulatory expectations."""
        elif user_intent == "selected_text":
            return f"""You are an FDA regulatory editor.
                       The user has selected this section of the document:
                       "{selected_text}"
                       Their instruction is:
                       "{user_input}"
                       Update or rewrite the selected section according to FDA {default_guideline} standards.
                       Maintain formatting and technical correctness."""