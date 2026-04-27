import re

def offline_intelligence_mode(description):
    """
    Local-first fallback engine using regex and keyword matching.
    Returns a JSON-compatible dict matching the LLM output schema.
    """
    desc = description.lower()
    
    # Category detection
    categories = {
        "Health": ["medical", "doctor", "injured", "hospital", "medicine", "health", "nurse"],
        "Relief": ["food", "water", "supplies", "shelter", "blankets", "kit", "ration"],
        "Logistics": ["transport", "truck", "delivery", "path", "road", "blocked", "bridge"],
        "Safety": ["fire", "hazard", "threat", "danger", "police", "security", "safe"],
        "Mental Health": ["trauma", "counseling", "stress", "anxiety", "psychological"],
        "Environment": ["flood", "spill", "pollution", "waste", "cleaning", "storm"]
    }
    
    detected_cat = "General"
    for cat, keywords in categories.items():
        if any(kw in desc for kw in keywords):
            detected_cat = cat
            break
            
    # Urgency detection
    urgencies = {
        "Critical": ["immediate", "urgent", "dying", "bleeding", "explosion", "trapped", "critical"],
        "High": ["severe", "fast", "needed now", "serious", "high"],
        "Medium": ["soon", "important", "moderate"],
        "Low": ["eventually", "monitor", "routine"]
    }
    
    detected_urgency = "Low"
    for urg, keywords in urgencies.items():
        if any(kw in desc for kw in keywords):
            detected_urgency = urg
            break
            
    # People count extraction
    people_match = re.search(r'(\d+)\s*(people|persons|individuals|victims|injured)', desc)
    people_count = int(people_match.group(1)) if people_match else 1
    
    return {
        "intent": "REPORT",
        "category": detected_cat,
        "urgency": detected_urgency,
        "people_count": people_count,
        "understood_reasoning": "Offline mode active. Categorized via heuristic pattern matching.",
        "thought_process": "Fallback engine activated due to API unavailability. Used keyword scanning and regex extraction.",
        "conversational_response": "Offline mode enabled. Mission data processed via local heuristics."
    }
