RTA_RULES = {
    "purpose": lambda content: "intended for" in content.lower(),
    "population": lambda content: any(word in content.lower() for word in ["adult", "pediatric"]),
    "environment": lambda content: any(loc in content.lower() for loc in ["hospital", "clinic"]),
    "conditions": lambda content: any(cond in content.lower() for cond in ["disease", "condition", "diagnosis"])
}