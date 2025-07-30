import logging
from typing import List, Dict

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def validate_checklist(content: str, checklist: List[Dict]) -> List[Dict]:
    logger.info("Validating checklist")
    validation_results = []

    keyword_rules = {
        "Does the summary describe the device purpose and function?": ["purpose", "function"],
        "Does it include a high-level overview of the technology?": ["technology", "overview"],
        "Is the target population or environment mentioned?": ["population", "environment"],
        "Is the intended use clearly stated?": ["intended use"],
        "Is the indication for use population defined?": ["indication", "population"],
        "Are the conditions or diseases treated identified?": ["condition", "disease"],
        "Are key specifications like dimensions, power, and materials listed?": ["dimensions", "power", "materials"],
        "Is the performance range or tolerances provided?": ["performance", "tolerances"],
        "Is a valid predicate device listed with 510(k) number?": ["predicate", "510(k)"],
        "Are similarities and differences clearly described?": ["similarities", "differences"],
        "Is the summary consistent with comparison table?": ["summary", "comparison"],
        "Does it address technology and indication similarities?": ["technology", "indication"],
        "Are performance metrics side-by-side with predicate?": ["performance", "predicate"],
        "Are test methods referenced and results compared?": ["test methods", "results"],
        "Are risks and mitigations for differences discussed?": ["risks", "mitigations"],
        "Is the analysis aligned with ISO 14971 principles?": ["ISO 14971", "risk"],
        "Is software architecture described?": ["software", "architecture"],
        "Are software levels of concern defined?": ["software", "level of concern"],
        "Are cybersecurity risks and controls documented?": ["cybersecurity", "risks"],
        "Does it comply with FDA cybersecurity guidance?": ["cybersecurity", "FDA"],
        "Are software test plans and results included?": ["test plans", "results"],
        "Does it demonstrate conformance to specifications?": ["conformance", "specifications"],
        "Does the evaluation address all patient-contacting materials?": ["biocompatibility", "materials"],
        "Is the duration and type of contact specified?": ["contact", "duration"],
        "Are test results for relevant ISO 10993 endpoints included?": ["ISO 10993", "test results"],
        "Does the report justify the selection of tests performed?": ["tests", "justification"],
        "Are analytical performance test methods described?": ["analytical", "test methods"],
        "Do results meet predefined acceptance criteria?": ["results", "acceptance criteria"],
        "Are precision studies conducted under controlled conditions?": ["precision", "controlled"],
        "Are repeatability and reproducibility data provided?": ["repeatability", "reproducibility"],
        "Are accuracy studies compared to a reference standard?": ["accuracy", "reference standard"],
        "Are statistical measures of accuracy included?": ["statistical", "accuracy"],
        "Are stability test conditions and duration specified?": ["stability", "duration"],
        "Do results confirm device performance over shelf life?": ["shelf life", "performance"],
        "Are potential interferents identified and tested?": ["interferents", "tested"],
        "Do results show minimal interference impact?": ["interference", "impact"],
        "Does the labeling include intended use and warnings?": ["labeling", "intended use"],
        "Is the labeling consistent with FDA requirements?": ["labeling", "FDA"],
        "Are instructions clear and user-friendly?": ["instructions", "user-friendly"],
        "Do they include safety and handling information?": ["safety", "handling"],
        "Does the insert include indications and contraindications?": ["indications", "contraindications"],
        "Is it aligned with the intended use statement?": ["intended use", "aligned"],
        "Is the study design and methodology described?": ["study design", "methodology"],
        "Are inclusion and exclusion criteria defined?": ["inclusion", "exclusion"],
        "Are study results summarized with statistical analysis?": ["statistical", "results"],
        "Do results support safety and effectiveness?": ["safety", "effectiveness"],
        "Is the statistical methodology clearly outlined?": ["statistical", "methodology"],
        "Are endpoints and hypotheses defined?": ["endpoints", "hypotheses"],
        "Does the summary integrate all clinical findings?": ["clinical", "findings"],
        "Is it consistent with the study report?": ["study report", "consistent"],
        "Are all potential risks identified and assessed?": ["risks", "assessed"],
        "Is the file compliant with ISO 14971?": ["ISO 14971", "compliant"],
        "Does the analysis justify benefits outweighing risks?": ["benefits", "risks"],
        "Are residual risks clearly documented?": ["residual risks", "documented"],
        "Does the summary include all required elements per 21 CFR 807.92?": ["21 CFR 807.92", "summary"],
        "Is it concise and consistent with other sections?": ["concise", "consistent"],
        "Is the statement signed and dated?": ["signed", "dated"],
        "Does it confirm the accuracy of the submission?": ["accuracy", "submission"],
        "Are all relevant supporting documents included?": ["supporting documents", "included"],
        "Are documents organized and clearly referenced?": ["organized", "referenced"],
    }

    for item in checklist:
        question = item.get("question", "")
        keywords = keyword_rules.get(question, [])
        validated = False
        comments = "No matching rule found"

        for keyword in keywords:
            if keyword.lower() in content.lower():
                validated = True
                comments = f"Validated by keyword: {keyword}"
                break

        validation_results.append({
            "question": question,
            "validated": validated,
            "comments": comments
        })

    logger.info(f"Checklist validation completed with {len(validation_results)} results")
    return validation_results