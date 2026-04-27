import os
import json

class InventoryService:
    def __init__(self):
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        self.inventory_path = os.path.join(base_dir, 'data', 'inventory.json')

    def _load_data(self):
        if not os.path.exists(self.inventory_path):
            return {}
        with open(self.inventory_path, 'r', encoding='utf-8') as f:
            return json.load(f)

    def get_all_items(self):
        data = self._load_data()
        return data.get('categories', {})

    def get_stats(self):
        data = self._load_data()
        categories = data.get('categories', {})
        stats = {
            "total_items": 0,
            "low_stock": 0,
            "categories": len(categories),
            "critical_items": 0
        }
        
        # Flatten and count (Simplified for display)
        for cat, content in categories.items():
            for item_key, item_val in content.items():
                if isinstance(item_val, list):
                    stats["total_items"] += len(item_val)
                elif isinstance(item_val, dict):
                    if "qty" in item_val:
                        stats["total_items"] += item_val["qty"]
                        if item_val["qty"] < 5: stats["low_stock"] += 1
                    elif "stock_count" in item_val:
                        stats["total_items"] += item_val["stock_count"]
                    elif "stock" in item_val:
                        stats["total_items"] += item_val["stock"]
        
        return stats

    def infer_recommendations(self, mission_description):
        description = mission_description.lower()
        recommendations = []
        
        # Real-world command center heuristics
        mapping = [
            {"keys": ["flood", "water", "drown"], "items": ["Zodiac Boat", "Life Jackets", "Water Filters", "Rope"]},
            {"keys": ["medical", "injury", "sick", "doctor", "health"], "items": ["First Aid Kit", "Oxygen Tanks", "Medical Gloves", "N95 Respirators"]},
            {"keys": ["night", "dark", "subterranean", "shaft", "tunnel"], "items": ["Tactical Flashlights", "Batteries", "Power Banks"]},
            {"keys": ["fire", "toxic", "smoke", "chemical", "leak"], "items": ["Hazmat Suits", "Respirators", "Gas Sensors"]},
            {"keys": ["rescue", "trapped", "contractors", "builders", "sealed"], "items": ["Hydraulic Spreader", "Shoring Struts", "Rope", "Plasma Cutter"]},
            {"keys": ["food", "hungry", "distribution"], "items": ["MRE Rations", "Water Bottles"]},
            {"keys": ["comm", "signal", "radio", "phone"], "items": ["Satellite Uplink", "Digital Radios"]}
        ]
        
        for rule in mapping:
            if any(k in description for k in rule["keys"]):
                for item in rule["items"]:
                    if item not in recommendations:
                        recommendations.append(item)
        
        # Cross-check availability (Mock values for now based on data structure)
        data = self._load_data()
        final_list = []
        for rec_name in recommendations:
            qty = 12 # Default mock
            if "Hazmat" in rec_name: qty = 2
            if "Zodiac" in rec_name: qty = 1
            if "Rations" in rec_name: qty = 5000
            
            final_list.append({
                "name": rec_name,
                "status": "Ready" if qty > 0 else "Out of Stock",
                "qty": qty
            })
            
        return final_list
