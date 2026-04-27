from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Tuple
import uvicorn
import sys
import os

# Set standard paths
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Import our AI logic from main.py
from src.core.service import VolunteerService
from src.core.inventory_service import InventoryService

# Initialize Services
vol_service = VolunteerService()
inv_service = InventoryService()

app = FastAPI(
    title="AI Intelligence Layer API",
    description="Hackathon AI system for task classification, scoring, and volunteer matching.",
    version="1.0.0",
    servers=[{"url": "http://127.0.0.1:8000", "description": "Local Development Server"}]
)

# --- CORS SETUP ---
# This allows your frontend team (React/Vue/etc) to call your API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allows all origins
    allow_credentials=True,
    allow_methods=["*"], # Allows all methods (GET, POST, etc)
    allow_headers=["*"], # Allows all headers
)

# --- DATA MODELS ---

class TaskInput(BaseModel):
    task_id: str
    description: str
    people_count: Optional[int] = 1
    location_coords: Optional[Tuple[float, float]] = (0.0, 0.0)

class VolunteerInput(BaseModel):
    id: str
    name: str
    skills: List[str]
    location_coords: Tuple[float, float]
    available: bool

class MatchRequest(BaseModel):
    task: TaskInput
    volunteers: List[VolunteerInput]

from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

# --- ENDPOINTS ---

# Mount static files from frontend directory
app.mount("/static", StaticFiles(directory="frontend"), name="static")

@app.get("/")
def home():
    return FileResponse("frontend/index.html")

@app.get("/style.css")
def get_css():
    return FileResponse("frontend/style.css")

@app.get("/app.js")
def get_js():
    return FileResponse("frontend/app.js")

@app.post("/process")
def process_ai_request(data: MatchRequest):
    """
    Main AI Endpoint:
    1. Classifies the task (Category + Urgency)
    2. Calculates Priority Score
    3. Ranks Volunteers based on distance, skill, and availability
    """
    # Convert Pydantic models to dictionaries
    task_dict = data.task.model_dump()
    
    # If no volunteers are provided, use the master list from our service
    if not data.volunteers:
        volunteers_list = vol_service.get_all_volunteers()
    else:
        volunteers_list = [v.model_dump() for v in data.volunteers]
    
    # Run the intelligence layer logic
    result = process_new_task(task_dict, volunteers_list)
    
    return result

@app.get("/roster")
def get_roster():
    """Returns the full volunteer roster with live stats."""
    return vol_service.get_all_volunteers()

@app.get("/inventory")
def get_inventory():
    """Returns the full inventory data."""
    return inv_service.get_all_items()

@app.get("/inventory/stats")
def get_inventory_stats():
    """Returns inventory overview metrics."""
    return inv_service.get_stats()

@app.post("/recommend-gear")
def recommend_gear(data: dict):
    """Infers recommended gear based on mission description."""
    description = data.get("description", "")
    return inv_service.infer_recommendations(description)

@app.get("/activities")
def get_activities():
    """Returns the list of nearby NGO/community activities."""
    path = "data/nearby_activities.json"
    if os.path.exists(path):
        with open(path, "r") as f:
            return json.load(f)
    return []

if __name__ == "__main__":
    print("Starting AI Layer Server on http://127.0.0.1:8000")
    uvicorn.run(app, host="127.0.0.1", port=8000)
