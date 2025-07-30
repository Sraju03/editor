
import logging
from ..db import client

logger = logging.getLogger(__name__)

async def seed_checklist_templates():
    logger.info("Seeding checklist templates in MongoDB")
    db = client.fignos
    collection = db.checklist_templates

    # Clear existing templates
    await collection.delete_many({})

    # Define 510(k) template
    template_510k = {
  "_id": "510k_v1",
  "submissionType": "510k",
  "version": "1.0",
  "title": "FDA 510(k) Submission Template",
  "createdAt": "2025-07-10T23:32:00.423483",
  "sections": [
    {
      "id": "A",
      "title": "Device Description",
      "required": True,
      "subsections": [
        {
          "id": "A1",
          "title": "Executive Summary",
          "required": True,
          "checklist": [
            {
              "id": "chk_101",
              "question": "Does the summary describe the device purpose and function?"
            },
            {
              "id": "chk_102",
              "question": "Does it include a high-level overview of the technology?"
            },
            {
              "id": "chk_103",
              "question": "Is the target population or environment mentioned?"
            }
          ]
        },
        {
          "id": "A2",
          "title": "Intended Use Statement",
          "required": True,
          "checklist": [
            {
              "id": "chk_102",
              "question": "Is the intended use clearly stated?"
            },
            {
              "id": "chk_103",
              "question": "Is the indication for use population defined?"
            },
            {
              "id": "chk_104",
              "question": "Are the conditions or diseases treated identified?"
            }
          ]
        },
        {
          "id": "A3",
          "title": "Device Specifications",
          "required": True,
          "checklist": [
            {
              "id": "chk_103",
              "question": "Are key specifications like dimensions, power, and materials listed?"
            },
            {
              "id": "chk_104",
              "question": "Is the performance range or tolerances provided?"
            }
          ]
        }
      ]
    },
    {
      "id": "B",
      "title": "Substantial Equivalence",
      "required": True,
      "subsections": [
        {
          "id": "B1",
          "title": "Predicate Device Comparison",
          "required": True,
          "checklist": [
            {
              "id": "chk_101",
              "question": "Is a valid predicate device listed with 510(k) number?"
            },
            {
              "id": "chk_102",
              "question": "Are similarities and differences clearly described?"
            }
          ]
        },
        {
          "id": "B2",
          "title": "Substantial Equivalence Summary",
          "required": True,
          "checklist": [
            {
              "id": "chk_102",
              "question": "Is the summary consistent with comparison table?"
            },
            {
              "id": "chk_103",
              "question": "Does it address technology and indication similarities?"
            }
          ]
        },
        {
          "id": "B3",
          "title": "Performance Comparison Table",
          "required": True,
          "checklist": [
            {
              "id": "chk_103",
              "question": "Are performance metrics side-by-side with predicate?"
            },
            {
              "id": "chk_104",
              "question": "Are test methods referenced and results compared?"
            }
          ]
        },
        {
          "id": "B4",
          "title": "Risk Assessment Comparison",
          "required": True,
          "checklist": [
            {
              "id": "chk_104",
              "question": "Are risks and mitigations for differences discussed?"
            },
            {
              "id": "chk_105",
              "question": "Is the analysis aligned with ISO 14971 principles?"
            }
          ]
        }
      ]
    },
    {
      "id": "C",
      "title": "Software",
      "required": False,
      "subsections": [
        {
          "id": "C1",
          "title": "Software Documentation",
          "required": True,
          "checklist": [
            {
              "id": "chk_101",
              "question": "Is software architecture described?"
            },
            {
              "id": "chk_102",
              "question": "Are software levels of concern defined?"
            }
          ]
        },
        {
          "id": "C2",
          "title": "Cybersecurity Documentation",
          "required": True,
          "checklist": [
            {
              "id": "chk_102",
              "question": "Are cybersecurity risks and controls documented?"
            },
            {
              "id": "chk_103",
              "question": "Does it comply with FDA cybersecurity guidance?"
            }
          ]
        },
        {
          "id": "C3",
          "title": "Software Validation Report",
          "required": True,
          "checklist": [
            {
              "id": "chk_103",
              "question": "Are software test plans and results included?"
            },
            {
              "id": "chk_104",
              "question": "Does it demonstrate conformance to specifications?"
            }
          ]
        }
      ]
    },
    {
      "id": "D",
      "title": "Biocompatibility",
      "required": False,
      "subsections": [
        {
          "id": "D1",
          "title": "Biocompatibility Evaluation",
          "required": True,
          "checklist": [
            {
              "id": "chk_101",
              "question": "Is a biological risk assessment provided?"
            },
            {
              "id": "chk_102",
              "question": "Does it identify patient-contacting materials?"
            }
          ]
        },
        {
          "id": "D2",
          "title": "ISO 10993 Testing Report",
          "required": True,
          "checklist": [
            {
              "id": "chk_102",
              "question": "Are ISO 10993 tests identified and justified?"
            },
            {
              "id": "chk_103",
              "question": "Are test results summarized with conclusions?"
            }
          ]
        }
      ]
    },
    {
      "id": "E",
      "title": "Bench Testing",
      "required": False,
      "subsections": [
        {
          "id": "E1",
          "title": "Analytical Performance Studies",
          "required": True,
          "checklist": [
            {
              "id": "chk_101",
              "question": "Are performance parameters clearly defined?"
            },
            {
              "id": "chk_102",
              "question": "Do methods align with FDA-recognized standards?"
            }
          ]
        },
        {
          "id": "E2",
          "title": "Precision Studies",
          "required": True,
          "checklist": [
            {
              "id": "chk_102",
              "question": "Is repeatability evaluated under various conditions?"
            },
            {
              "id": "chk_103",
              "question": "Is reproducibility tested across operators and lots?"
            }
          ]
        },
        {
          "id": "E3",
          "title": "Accuracy Studies",
          "required": True,
          "checklist": [
            {
              "id": "chk_103",
              "question": "Are accuracy claims supported with evidence?"
            },
            {
              "id": "chk_104",
              "question": "Is reference method properly described?"
            }
          ]
        },
        {
          "id": "E4",
          "title": "Stability Testing",
          "required": True,
          "checklist": [
            {
              "id": "chk_104",
              "question": "Are real-time or accelerated tests included?"
            },
            {
              "id": "chk_105",
              "question": "Is shelf-life supported by data?"
            }
          ]
        },
        {
          "id": "E5",
          "title": "Interference Studies",
          "required": True,
          "checklist": [
            {
              "id": "chk_105",
              "question": "Are interfering substances identified?"
            },
            {
              "id": "chk_106",
              "question": "Is device robustness shown under variable conditions?"
            }
          ]
        }
      ]
    },
    {
      "id": "F",
      "title": "Labeling",
      "required": True,
      "subsections": [
        {
          "id": "F1",
          "title": "Device Labeling",
          "required": True,
          "checklist": [
            {
              "id": "chk_101",
              "question": "Does label include manufacturer info and device name?"
            },
            {
              "id": "chk_102",
              "question": "Are symbols and warnings compliant with FDA guidelines?"
            }
          ]
        },
        {
          "id": "F2",
          "title": "Instructions for Use (IFU)",
          "required": True,
          "checklist": [
            {
              "id": "chk_102",
              "question": "Does IFU describe setup and operation clearly?"
            },
            {
              "id": "chk_103",
              "question": "Are contraindications and precautions listed?"
            }
          ]
        },
        {
          "id": "F3",
          "title": "Package Insert",
          "required": True,
          "checklist": [
            {
              "id": "chk_103",
              "question": "Is insert content consistent with labeling and IFU?"
            },
            {
              "id": "chk_104",
              "question": "Is language appropriate for end users?"
            }
          ]
        }
      ]
    },
    {
      "id": "G",
      "title": "Clinical Performance",
      "required": False,
      "subsections": [
        {
          "id": "G1",
          "title": "Clinical Study Protocol",
          "required": True,
          "checklist": [
            {
              "id": "chk_101",
              "question": "Does the protocol define endpoints and populations?"
            },
            {
              "id": "chk_102",
              "question": "Is the study design appropriate for claims made?"
            }
          ]
        },
        {
          "id": "G2",
          "title": "Clinical Study Report",
          "required": True,
          "checklist": [
            {
              "id": "chk_102",
              "question": "Are subject demographics and safety data reported?"
            },
            {
              "id": "chk_103",
              "question": "Are results statistically analyzed and summarized?"
            }
          ]
        },
        {
          "id": "G3",
          "title": "Statistical Analysis Plan",
          "required": True,
          "checklist": [
            {
              "id": "chk_103",
              "question": "Are statistical methods defined in advance?"
            },
            {
              "id": "chk_104",
              "question": "Is sample size calculation justified?"
            }
          ]
        },
        {
          "id": "G4",
          "title": "Clinical Data Summary",
          "required": True,
          "checklist": [
            {
              "id": "chk_104",
              "question": "Are clinical findings summarized against endpoints?"
            },
            {
              "id": "chk_105",
              "question": "Are adverse events reported transparently?"
            }
          ]
        }
      ]
    },
    {
      "id": "H",
      "title": "Risk Analysis",
      "required": True,
      "subsections": [
        {
          "id": "H1",
          "title": "Risk Management File",
          "required": True,
          "checklist": [
            {
              "id": "chk_101",
              "question": "Is a risk file structured per ISO 14971?"
            },
            {
              "id": "chk_102",
              "question": "Are risk control measures traceable to hazards?"
            }
          ]
        },
        {
          "id": "H2",
          "title": "Risk-Benefit Analysis",
          "required": True,
          "checklist": [
            {
              "id": "chk_102",
              "question": "Is clinical benefit weighed against known risks?"
            },
            {
              "id": "chk_103",
              "question": "Does justification support market clearance?"
            }
          ]
        }
      ]
    },
    {
      "id": "I",
      "title": "Summary & Attachments",
      "required": True,
      "subsections": [
        {
          "id": "I1",
          "title": "510(k) Summary",
          "required": True,
          "checklist": [
            {
              "id": "chk_101",
              "question": "Does summary meet 21 CFR 807.92 requirements?"
            },
            {
              "id": "chk_102",
              "question": "Is the format aligned with FDA guidance?"
            }
          ]
        },
        {
          "id": "I2",
          "title": "Truthful and Accuracy Statement",
          "required": True,
          "checklist": [
            {
              "id": "chk_102",
              "question": "Is the statement signed and dated by responsible party?"
            },
            {
              "id": "chk_103",
              "question": "Does it affirm the accuracy of the submission?"
            }
          ]
        },
        {
          "id": "I3",
          "title": "Additional Supporting Documents",
          "required": False,
          "checklist": [
            {
              "id": "chk_103",
              "question": "Are referenced attachments clearly labeled?"
            },
            {
              "id": "chk_104",
              "question": "Do the documents support key claims or test results?"
            }
          ]
        }
      ]
    }
  ]
}

    # Insert template
    await collection.insert_one(template_510k)
    logger.info("Stored 510(k) checklist template in MongoDB")