import streamlit as st
import pandas as pd
import folium
from streamlit_folium import st_folium
import plotly.graph_objects as go
import json
import os
import time
import re
import logging
from datetime import datetime
from PyPDF2 import PdfReader
import requests
from src.core.offline_engine import offline_intelligence_mode
from src.nlp.classifier import call_llm
from config.settings import settings

# --- LOGGING SETUP ---
if not os.path.exists('logs'):
    os.makedirs('logs')

logging.basicConfig(
    filename='logs/system.log',
    level=logging.INFO,
    format='[%(asctime)s] %(message)s',
    datefmt='%H:%M:%S'
)

def log_event(msg):
    logging.info(msg)
    if 'system_logs' not in st.session_state:
        st.session_state.system_logs = []
    st.session_state.system_logs.append(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}")

# --- PAGE CONFIG ---
st.set_page_config(
    page_title="NGO AI | Mission Intelligence System",
    page_icon="🛰️",
    layout="wide",
    initial_sidebar_state="expanded"
)

# --- CUSTOM CSS (DARK COMMAND CENTER) ---
st.markdown("""
<style>
    :root {
        --bg-dark: #0E1117;
        --card-bg: #1A1C23;
        --accent-blue: #0070F3;
        --accent-red: #FF4B4B;
        --text-gray: #888888;
    }
    
    .main {
        background-color: var(--bg-dark);
    }
    
    .stApp {
        background-color: var(--bg-dark);
    }
    
    [data-testid="stSidebar"] {
        background-color: #11141A;
        border-right: 1px solid #2D2D2D;
    }
    
    .metric-card {
        background: #1A1C23;
        padding: 20px;
        border-radius: 10px;
        border: 1px solid #2D2D2D;
        text-align: center;
    }
    
    .code-red {
        background-color: #3B0000 !important;
        border: 1px solid #FF0000 !important;
        animation: pulse-red 2s infinite;
    }
    
    @keyframes pulse-red {
        0% { box-shadow: 0 0 0 0 rgba(255, 75, 75, 0.4); }
        70% { box-shadow: 0 0 0 10px rgba(255, 75, 75, 0); }
        100% { box-shadow: 0 0 0 0 rgba(255, 75, 75, 0); }
    }
    
    .stButton>button {
        width: 100%;
        border-radius: 5px;
        font-weight: 600;
    }
    
    .status-badge {
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: bold;
    }
</style>
""", unsafe_allow_html=True)

# --- DATABASE LAYER ---
DATA_DIR = 'data'
FILES = {
    'volunteers': 'data/volunteers.json',
    'missions': 'data/missions.json',
    'reports': 'data/ngo_reports.json',
    'deployments': 'data/deployments.json',
    'settings': 'data/settings.json',
    'inventory': 'data/inventory.json'
}

def load_data(key):
    if not os.path.exists(FILES[key]):
        return []
    with open(FILES[key], 'r') as f:
        return json.load(f)

def save_data(key, data):
    with open(FILES[key], 'w') as f:
        json.dump(data, f, indent=4)

# --- STATE INITIALIZATION ---
if 'initialized' not in st.session_state:
    st.session_state.initialized = True
    st.session_state.start_time = datetime.now()
    st.session_state.system_logs = []
    log_event("App started: AI Mission Intelligence Layer active.")
    st.session_state.ai_mode = "Cloud (NVIDIA NIM)"
    st.session_state.api_status = "Online"

# --- CORE LOGIC: MISSION GENERATION ---
def generate_mission(description, source="Manual Entry"):
    log_event(f"Processing mission request from: {source}")
    
    try:
        # Try Primary AI
        res = call_llm(description)
        # If the response indicates fallback (from my previous edit)
        if "Fallback mode" in res.get("understood_reasoning", ""):
            raise Exception("API Fallback Triggered")
        st.session_state.ai_mode = "Cloud (NVIDIA NIM)"
    except Exception as e:
        # Switch to Offline Fallback
        res = offline_intelligence_mode(description)
        st.session_state.ai_mode = "Offline (Local Heuristics)"
        log_event(f"API failure. Switched to offline mode. Error: {str(e)}")

    mission = {
        "id": f"M-{int(time.time())}",
        "title": res.get("category", "General Request") + " Operation",
        "category": res.get("category", "General"),
        "priority": res.get("urgency", "Medium"),
        "location": "Sector " + chr(65 + (int(time.time()) % 4)), # Mock sector for now
        "volunteers_needed": res.get("people_count", 3),
        "assigned_volunteers": [],
        "status": "Pending",
        "source_documents": source,
        "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "ai_analysis": res
    }
    
    missions = load_data('missions')
    missions.insert(0, mission)
    save_data('missions', missions)
    log_event(f"Mission created: {mission['title']} ({mission['priority']})")
    return mission

# --- UI COMPONENTS: GAUGE ---
def render_readiness_gauge(avg_energy):
    color = "green"
    if avg_energy < 30: color = "red"
    elif avg_energy < 50: color = "orange"
    elif avg_energy < 80: color = "yellow"

    fig = go.Figure(go.Indicator(
        mode = "gauge+number",
        value = avg_energy,
        title = {'text': "Total NGO Readiness"},
        gauge = {
            'axis': {'range': [0, 100]},
            'bar': {'color': color},
            'steps': [
                {'range': [0, 30], 'color': "red"},
                {'range': [30, 40], 'color': "orange"},
                {'range': [40, 60], 'color': "yellow"},
                {'range': [60, 80], 'color': "lime"},
                {'range': [80, 100], 'color': "green"},
            ],
            'threshold': {
                'line': {'color': "white", 'width': 4},
                'thickness': 0.75,
                'value': 30
            }
        }
    ))
    fig.update_layout(paper_bgcolor='rgba(0,0,0,0)', font={'color': "white", 'family': "Arial"}, height=300)
    return fig

# --- UI COMPONENTS: MAP ---
def render_map(missions, volunteers):
    # Center on a neutral point (e.g., Delhi coordinates)
    m = folium.Map(location=[28.6139, 77.2090], zoom_start=12, tiles='CartoDB dark_matter')
    
    # Mock coordinates for sectors
    sectors = {
        "Sector Alpha": [28.62, 77.21],
        "Sector Beta": [28.60, 77.19],
        "Sector Gamma": [28.63, 77.23],
        "Sector Delta": [28.61, 77.18]
    }

    # Add Mission Markers (Red Pulse)
    for mission in missions:
        if mission['status'] == "Pending":
            loc = sectors.get(mission['location'], sectors['Sector Alpha'])
            folium.Marker(
                location=loc,
                popup=f"MISSION: {mission['title']}\nPriority: {mission['priority']}",
                icon=folium.Icon(color='red', icon='info-sign')
            ).add_to(m)
            # Pulse effect (simulated with a circle)
            folium.Circle(
                location=loc,
                radius=500,
                color='red',
                fill=True,
                fill_opacity=0.3
            ).add_to(m)

    # Add Volunteer Markers (Blue)
    for v in volunteers:
        if v['availability']:
            # Jitter slightly for visual clarity
            base_loc = sectors.get(v['location'], sectors['Sector Alpha'])
            loc = [base_loc[0] + (hash(v['id']) % 100) / 10000, base_loc[1] + (hash(v['name']) % 100) / 10000]
            folium.Marker(
                location=loc,
                popup=f"VOLUNTEER: {v['name']}\nEnergy: {v['energy']}%",
                icon=folium.Icon(color='blue', icon='user')
            ).add_to(m)

    return m

# --- SIDEBAR NAVIGATION ---
with st.sidebar:
    st.image("https://cdn-icons-png.flaticon.com/512/1042/1042680.png", width=80)
    st.title("COMMAND CENTER")
    menu = st.radio("Navigation", ["Dashboard", "Mission Lab", "Volunteer Roster", "Map Intelligence", "Inventory & Logistics", "System Health", "Logs"])
    
    st.divider()
    st.write("🌍 **NGO Intelligence Layer**")
    st.write(f"📡 AI Mode: **{st.session_state.ai_mode}**")
    if st.session_state.ai_mode.startswith("Offline"):
        st.warning("Offline Intelligence Active")

# --- DATABASE LOADING ---
volunteers = load_data('volunteers')
missions = load_data('missions')
avg_readiness = sum(v['energy'] for v in volunteers) / len(volunteers) if volunteers else 0

# --- CODE RED CHECK ---
is_code_red = avg_readiness < 30

# --- MAIN DASHBOARD ---
if menu == "Dashboard":
    if is_code_red:
        st.error("🚨 CODE RED: VOLUNTEER CAPACITY CRITICALLY LOW")
        log_event("CODE RED TRIGGERED: Readiness below 30%")

    col1, col2, col3, col4 = st.columns(4)
    with col1:
        st.markdown(f'<div class="metric-card {"code-red" if is_code_red else ""}"><h3>Active Missions</h3><h1>{len([m for m in missions if m["status"] == "Pending"])}</h1></div>', unsafe_allow_html=True)
    with col2:
        st.markdown(f'<div class="metric-card"><h3>Ready Personnel</h3><h1>{len([v for v in volunteers if v["availability"] and v["energy"] > 30])}</h1></div>', unsafe_allow_html=True)
    with col3:
        st.markdown(f'<div class="metric-card"><h3>Readiness</h3><h1>{int(avg_readiness)}%</h1></div>', unsafe_allow_html=True)
    with col4:
        st.markdown(f'<div class="metric-card"><h3>Alerts</h3><h1>{"CRITICAL" if is_code_red else "STABLE"}</h1></div>', unsafe_allow_html=True)

    st.divider()
    
    m_col, g_col = st.columns([2, 1])
    with m_col:
        st.subheader("Live Deployment Map")
        map_obj = render_map(missions, volunteers)
        st_folium(map_obj, width=None, height=400)
        
    with g_col:
        st.subheader("System Readiness")
        st.plotly_chart(render_readiness_gauge(avg_readiness), use_container_width=True)

    st.divider()
    
    st.subheader("Active Mission Queue")
    if not missions:
        st.info("No active missions. Awaiting intelligence input.")
    else:
        for m in missions[:5]:
            with st.expander(f"{m['title']} - {m['priority']} Urgency"):
                st.write(f"**Location:** {m['location']} | **Volunteers Required:** {m['volunteers_needed']}")
                st.write(f"**Source:** {m['source_documents']}")
                if st.button("Assign Nearest Squad", key=f"btn_{m['id']}"):
                    st.success(f"Squad dispatched to {m['location']}")
                    log_event(f"Deployment initiated for {m['title']}")

elif menu == "Mission Lab":
    st.title("Mission Intelligence Lab")
    
    tab1, tab2 = st.tabs(["Neural Input", "PDF Extraction"])
    
    with tab1:
        st.subheader("Manual Crisis Report")
        desc = st.text_area("Describe the incident (e.g. 'Flood in Sector Beta, 50 people stranded')")
        if st.button("Generate Mission Plan"):
            if desc:
                with st.spinner("AI Synthesizing coordinates..."):
                    new_mission = generate_mission(desc)
                    st.success(f"Mission {new_mission['id']} created successfully!")
                    st.json(new_mission['ai_analysis'])
            else:
                st.warning("Please enter a description.")

    with tab2:
        st.subheader("PDF Intelligence Upload")
        uploaded_file = st.file_uploader("Upload NGO Damage Report (PDF)", type="pdf")
        if uploaded_file:
            log_event(f"PDF Uploaded: {uploaded_file.name}")
            with st.spinner("Extracting tactical data..."):
                reader = PdfReader(uploaded_file)
                full_text = ""
                for page in reader.pages:
                    full_text += page.extract_text()
                
                # Simple split by common NGO report markers or just summary
                st.info(f"Extracted {len(full_text)} characters. Initializing AI analysis...")
                new_mission = generate_mission(full_text[:1000], source=f"PDF: {uploaded_file.name}")
                st.success("Mission plan extracted from document.")
                st.write(new_mission['ai_analysis'].get('understood_reasoning', 'No reasoning provided.'))

elif menu == "Volunteer Roster":
    st.title("Strategic Volunteer Roster")
    
    df = pd.DataFrame(volunteers)
    # Energy coloring logic
    def color_energy(val):
        color = 'red'
        if val >= 80: color = 'green'
        elif val >= 60: color = 'lime'
        elif val >= 40: color = 'yellow'
        elif val >= 20: color = 'orange'
        return f'color: {color}'

    st.dataframe(df[['id', 'name', 'role', 'rank', 'energy', 'xp', 'location', 'status']].style.applymap(color_energy, subset=['energy']))
    
    if st.button("Initiate Recovery Cycle (+5% Energy All)"):
        for v in volunteers:
            v['energy'] = min(100, v['energy'] + 5)
        save_data('volunteers', volunteers)
        log_event("Global energy recovery cycle initiated.")
        st.rerun()

elif menu == "Map Intelligence":
    st.title("Full Map Intelligence")
    map_obj = render_map(missions, volunteers)
    st_folium(map_obj, width=1200, height=700)

elif menu == "Inventory & Logistics":
    st.title("Inventory & Strategic Logistics")
    inventory = load_data('inventory')
    
    if not inventory:
        st.warning("No inventory data found. Please initialize data/inventory.json")
    else:
        # Summary row
        col1, col2, col3 = st.columns(3)
        with col1:
            st.metric("Warehouse ID", inventory['metadata']['warehouse_id'])
        with col2:
            st.metric("Total Tents", inventory['categories']['survival_sustenance']['shelter_systems']['winter_tents_10p'])
        with col3:
            st.metric("Active Satellites", len([s for s in inventory['categories']['logistics_comms']['satellite_uplinks'] if s['active']]))

        st.divider()
        
        cat_tab1, cat_tab2, cat_tab3, cat_tab4 = st.tabs(["Medical", "Rescue", "Survival", "Logistics"])
        
        with cat_tab1:
            st.subheader("Tier 1 Trauma Kits")
            trauma = inventory['categories']['medical']['tier_1_trauma_kit']
            st.write(f"**Available Units:** {trauma['base_units']}")
            st.table(trauma['contents'])
            
            st.subheader("Hazmat Assets")
            st.table(inventory['categories']['medical']['ppe_hazmat']['heavy_duty_suits'])
            
        with cat_tab2:
            st.subheader("Water Rescue Fleet")
            boats = inventory['categories']['rescue']['water_rescue']['zodiac_boats']
            st.table(boats)
            
        with cat_tab3:
            st.subheader("Sustenance Stock")
            mres = inventory['categories']['survival_sustenance']['food_rations']
            st.write("**MRE high protein:**", mres['mre_high_protein']['stock'], "Units")
            st.write("**Emergency Blankets:**", inventory['categories']['survival_sustenance']['shelter_systems']['emergency_blankets_thermal'], "Units")
            
        with cat_tab4:
            st.subheader("Communications & ISR")
            st.write("**Satellites:**")
            st.table(inventory['categories']['logistics_comms']['satellite_uplinks'])
            st.write("**Drone Fleet:**")
            st.table(inventory['categories']['logistics_comms']['drones'])

        st.divider()
        st.subheader("Mission-Ready Kits")
        for kit_name, details in inventory['mission_specific_kits'].items():
            with st.expander(f"Config: {kit_name.replace('_', ' ').title()}"):
                st.write("**Total Estimated Weight:**", details['total_weight_est_kg'], "kg")
                st.write("**Allocated Assets:**")
                st.write(", ".join(details['items']))

elif menu == "System Health":
    st.title("System Health & Telemetry")
    col1, col2, col3 = st.columns(3)
    uptime = datetime.now() - st.session_state.start_time
    with col1:
        st.metric("System Uptime", f"{uptime.seconds // 3600}h {(uptime.seconds % 3600) // 60}m")
    with col2:
        st.metric("API Gateway", st.session_state.api_status)
    with col3:
        st.metric("AI Intelligence", st.session_state.ai_mode.split()[0])
        
    st.subheader("Live Telemetry")
    st.code("\n".join(st.session_state.system_logs[-10:]))

elif menu == "Logs":
    st.title("Operational Logs")
    if os.path.exists('logs/system.log'):
        with open('logs/system.log', 'r') as f:
            log_content = f.readlines()
        st.text_area("Full System Log", value="".join(log_content[::-1]), height=600)
    else:
        st.info("No logs found.")
