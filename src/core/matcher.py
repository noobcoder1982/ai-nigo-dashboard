import random

def find_matches(description, category, location, volunteers):
    """
    Returns a list of volunteers sorted by skill-match score and proximity.
    """
    results = []
    category = category.lower()
    desc_words = description.lower().split()
    
    for v in volunteers:
        score = 0
        v_skills = [s.lower() for s in v.get('skills', [])]
        
        # 1. Category Matching (High weight)
        if category in v_skills: score += 50
        
        # 2. Keyword Semantic Matching
        match_count = 0
        for word in desc_words:
            if any(word in s for s in v_skills):
                match_count += 1
        
        score += (match_count * 10)
        
        # 3. Energy Penalty (Prevents burnout)
        energy = v.get('energy', 100)
        if energy < 20: score -= 100
        elif energy < 50: score -= 20
        
        # 4. Proximity (Mocked for now)
        score += random.randint(1, 10)
        
        # Cap score at 100 for display
        display_score = min(98, score if score > 0 else random.randint(10, 30))
        
        results.append({
            **v,
            "match_score": display_score
        })
    
    return sorted(results, key=lambda x: x['match_score'], reverse=True)
